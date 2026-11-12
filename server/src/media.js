import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

function command(binary, args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
    child.stdout.on("data", (chunk) => {
      if (stdout.length < 1048576) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 32768) stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(stdout)
        : reject(
            new Error(`${binary} failed (${code}): ${stderr.slice(-500)}`),
          );
    });
  });
}
async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export function createMediaProcessor(db, directory) {
  let active = false,
    closed = false;
  const queue = new Set();
  const processed = join(directory, "processed");
  async function processVideo(videoId) {
    const row = db.prepare("SELECT * FROM videos WHERE id=?").get(videoId);
    if (!row || row.status !== "processing") return;
    const temp = join(processed, `${videoId}.working.mp4`),
      target = join(processed, `${videoId}.mp4`),
      thumb = join(processed, `${videoId}.jpg`);
    try {
      await mkdir(processed, { recursive: true, mode: 0o700 });
      const size = (await stat(row.raw_path)).size;
      if (size < 100 || size > 41943040)
        throw new Error("Clip must be between 100 bytes and 40 MB.");
      const probe = JSON.parse(
        await command(
          process.env.FFPROBE_PATH || "ffprobe",
          [
            "-v",
            "error",
            "-protocol_whitelist",
            "file,pipe",
            "-format_whitelist",
            "mov,matroska,webm",
            "-show_format",
            "-show_streams",
            "-of",
            "json",
            row.raw_path,
          ],
          15000,
        ),
      );
      const video = probe.streams.find((s) => s.codec_type === "video");
      const duration = Number(probe.format.duration);
      if (
        !/^(mov,mp4,m4a,3gp,3g2,mj2|matroska,webm)$/.test(
          probe.format.format_name,
        )
      )
        throw new Error("Use an MP4, MOV or WebM camera recording.");
      if (
        !video ||
        !Number.isFinite(duration) ||
        duration < 2 ||
        duration > 61 ||
        video.width > 4096 ||
        video.height > 4096 ||
        video.width < 64 ||
        video.height < 64
      )
        throw new Error("Use a 2–60 second camera video, up to 4K resolution.");
      if (
        probe.streams.filter((s) => s.codec_type === "video").length !== 1 ||
        probe.streams.length > 3
      )
        throw new Error("Unexpected media streams.");
      const elapsed =
        (new Date(row.created_at) - new Date(row.recorded_at)) / 1000;
      if (duration > elapsed + 3)
        throw new Error("Clip length does not match its capture window.");
      const contentHash = await sha256(row.raw_path);
      await command(process.env.FFMPEG_PATH || "ffmpeg", [
        "-nostdin",
        "-y",
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-format_whitelist",
        "mov,matroska,webm",
        "-i",
        row.raw_path,
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-vf",
        "scale='min(720,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "25",
        "-threads",
        "2",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-movflags",
        "+faststart",
        "-map_metadata",
        "-1",
        "-t",
        "60",
        temp,
      ]);
      await rename(temp, target);
      await command(
        process.env.FFMPEG_PATH || "ffmpeg",
        [
          "-nostdin",
          "-y",
          "-v",
          "error",
          "-i",
          target,
          "-frames:v",
          "1",
          "-vf",
          "scale=360:-2",
          thumb,
        ],
        15000,
      );
      db.prepare(
        "UPDATE videos SET status='pending',duration_seconds=?,media_path=?,thumbnail_path=?,content_hash=?,failure_reason=NULL WHERE id=?",
      ).run(duration, target, thumb, contentHash, row.id);
    } catch (error) {
      await rm(temp, { force: true });
      db.prepare(
        "UPDATE videos SET status='failed',failure_reason=? WHERE id=?",
      ).run(
        error.message.startsWith("ff")
          ? "Video processing failed. Retry or record a new clip."
          : error.message,
        row.id,
      );
      console.warn(
        JSON.stringify({
          event: "media_processing_failed",
          videoId,
          message: error.message.slice(0, 200),
        }),
      );
    }
  }
  async function drain() {
    if (active || closed) return;
    active = true;
    while (queue.size && !closed) {
      const videoId = queue.values().next().value;
      queue.delete(videoId);
      await processVideo(videoId);
    }
    active = false;
  }
  function enqueue(videoId) {
    queue.add(videoId);
    void drain();
  }
  function recover() {
    db.prepare(
      "UPDATE capture_tickets SET state='open' WHERE state='uploading'",
    ).run();
    for (const row of db
      .prepare("SELECT id FROM videos WHERE status='processing'")
      .all())
      enqueue(row.id);
  }
  return {
    enqueue,
    recover,
    close: async () => {
      closed = true;
      while (active) await new Promise((r) => setTimeout(r, 20));
    },
    idle: async () => {
      while (active || queue.size) await new Promise((r) => setTimeout(r, 20));
    },
  };
}
