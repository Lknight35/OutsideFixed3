import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { createApp } from "../src/app.js";
import { iso } from "../src/domain.js";

const exec = promisify(execFile);
test("real FFmpeg pipeline validates, transcodes, requires review, serves ranges, rejects disguised playlists and retries safely", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "outside-media-"));
  let now = Date.now();
  const backend = createApp({ dataDirectory: directory, now: () => now });
  const server = backend.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
    await rm(directory, { recursive: true, force: true });
  });
  async function request(path, token, method = "GET", body, headers = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    return response;
  }
  const owner = (
    await (
      await request("/auth/register", null, "POST", {
        email: "media-owner@example.test",
        name: "Media Owner",
        password: "media-test-password",
      })
    ).json()
  ).data;
  const stranger = (
    await (
      await request("/auth/register", null, "POST", {
        email: "media-viewer@example.test",
        name: "Media Viewer",
        password: "media-test-password",
      })
    ).json()
  ).data;
  const placeId = "osm:node:media-test-only";
  backend.db
    .prepare(
      "INSERT INTO places(id,name,address,lat,lng,category,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      placeId,
      "Media test fixture",
      "Never runtime seed data",
      40,
      -73,
      "food",
      iso(now),
    );
  const clipPath = join(directory, "source.mp4");
  await exec("ffmpeg", [
    "-nostdin",
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=320x240:rate=20",
    "-t",
    "3",
    "-pix_fmt",
    "yuv420p",
    "-c:v",
    "libx264",
    "-threads",
    "1",
    clipPath,
  ]);
  async function upload(bytes) {
    const evidence = () => ({
      placeId,
      lat: 40,
      lng: -73,
      accuracyMeters: 10,
      locationTimestamp: iso(now),
    });
    const ticket = (
      await (
        await request("/capture/tickets", owner.token, "POST", evidence())
      ).json()
    ).data;
    now += 4000;
    const form = new FormData();
    for (const [key, value] of Object.entries({
      ...evidence(),
      cameraFacing: "back",
    }))
      form.set(key, String(value));
    form.set(
      "video",
      new Blob([bytes], { type: "video/mp4" }),
      "native-recording.mp4",
    );
    const response = await request(
      ticket.uploadUrl.replace("/api", ""),
      owner.token,
      "POST",
      form,
    );
    assert.equal(response.status, 202);
    const video = (await response.json()).data;
    await backend.media.idle();
    return {
      video: backend.db
        .prepare("SELECT * FROM videos WHERE id=?")
        .get(video.id),
      ticket,
    };
  }
  const { video } = await upload(await readFile(clipPath));
  assert.equal(video.status, "pending", video.failure_reason);
  assert.ok(video.duration_seconds >= 2.9 && video.duration_seconds <= 3.1);
  assert.ok((await stat(video.media_path)).size > 100);
  assert.ok((await stat(video.thumbnail_path)).size > 100);
  assert.equal(
    (await request(`/videos/${video.id}`, stranger.token)).status,
    404,
  );
  assert.equal(
    (await (await request("/feed", stranger.token)).json()).data.length,
    0,
  );
  backend.domain.moderate(video.id, "approve");
  assert.equal(
    (await (await request("/feed", stranger.token)).json()).data[0].id,
    video.id,
  );
  const media = await request(
    `/videos/${video.id}/media`,
    stranger.token,
    "GET",
    undefined,
    { Range: "bytes=0-99" },
  );
  assert.equal(media.status, 206);
  assert.equal((await media.arrayBuffer()).byteLength, 100);
  assert.match(media.headers.get("content-type"), /video\/mp4/);
  const thumb = await request(`/videos/${video.id}/thumbnail`, stranger.token);
  assert.equal(thumb.status, 200);
  assert.match(thumb.headers.get("content-type"), /image\/jpeg/);
  const hidden = await request(
    `/map/places/${encodeURIComponent(placeId)}/privacy`,
    owner.token,
    "PUT",
    { hidden: true },
  );
  assert.equal(hidden.status, 200);
  assert.equal(
    (
      await request(
        `/videos/${video.id}/media`,
        stranger.token,
        "GET",
        undefined,
        { Range: "bytes=0-99" },
      )
    ).status,
    404,
  );
  assert.equal(
    (await request(`/videos/${video.id}/media`, owner.token)).status,
    200,
  );

  const playlist = Buffer.from(
    `ffconcat version 1.0\nfile '${video.media_path}'\n${"#".repeat(200)}`,
  );
  const bad = await upload(playlist);
  assert.equal(bad.video.status, "failed");
  assert.equal(bad.video.media_path, null);
  assert.equal(
    (await request(`/videos/${bad.video.id}/retry`, stranger.token, "POST", {}))
      .status,
    404,
  );
  const retry = await request(
    `/videos/${bad.video.id}/retry`,
    owner.token,
    "POST",
    {},
  );
  assert.equal(retry.status, 202);
  await backend.media.idle();
  assert.equal(
    backend.db.prepare("SELECT status FROM videos WHERE id=?").get(bad.video.id)
      .status,
    "failed",
  );
  assert.equal(
    backend.db
      .prepare("SELECT COUNT(*) AS n FROM videos WHERE ticket_id=?")
      .get(bad.ticket.id).n,
    1,
  );
});

test("restart preserves sessions and resumes interrupted processing plus queued account-file erasure", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "outside-recovery-"));
  let clock = Date.now(),
    backend = createApp({
      dataDirectory: directory,
      now: () => clock,
      processMedia: false,
    }),
    server;
  async function start() {
    server = backend.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    return `http://127.0.0.1:${server.address().port}/api`;
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
  }
  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });
  let base = await start();
  const response = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "recover@example.test",
      name: "Recovery fixture",
      password: "recovery-test-password",
    }),
  });
  const owner = (await response.json()).data;
  const headers = { Authorization: `Bearer ${owner.token}` };
  const placeId = "osm:node:recovery-fixture";
  backend.db
    .prepare(
      "INSERT INTO places(id,name,address,lat,lng,category,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      placeId,
      "Recovery fixture",
      "Not runtime data",
      40,
      -73,
      "food",
      iso(clock),
    );
  const evidence = () => ({
    placeId,
    lat: 40,
    lng: -73,
    accuracyMeters: 10,
    locationTimestamp: iso(clock),
  });
  const ticket = (
    await (
      await fetch(`${base}/capture/tickets`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(evidence()),
      })
    ).json()
  ).data;
  const clip = join(directory, "recovery-source.mp4");
  await exec("ffmpeg", [
    "-nostdin",
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=purple:s=160x120:r=15",
    "-t",
    "3",
    "-c:v",
    "libx264",
    "-threads",
    "1",
    clip,
  ]);
  clock += 4000;
  const form = new FormData();
  for (const [key, value] of Object.entries({
    ...evidence(),
    cameraFacing: "back",
  }))
    form.set(key, String(value));
  form.set(
    "video",
    new Blob([await readFile(clip)], { type: "video/mp4" }),
    "capture.mp4",
  );
  const uploaded = (
    await (
      await fetch(base.replace(/\/api$/, "") + ticket.uploadUrl, {
        method: "POST",
        headers,
        body: form,
      })
    ).json()
  ).data;
  assert.equal(uploaded.status, "processing");
  const interrupted = (
    await (
      await fetch(`${base}/capture/tickets`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(evidence()),
      })
    ).json()
  ).data;
  backend.db
    .prepare("UPDATE capture_tickets SET state='uploading' WHERE id=?")
    .run(interrupted.id);
  const erased = join(directory, "pending-private-erasure");
  await writeFile(erased, "A previously deleted account file");
  backend.db.prepare("INSERT INTO file_deletions VALUES(?)").run(erased);
  await stop();
  backend = createApp({ dataDirectory: directory, now: () => clock });
  base = await start();
  await backend.media.idle();
  const me = await fetch(`${base}/me`, { headers });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).data.user.id, owner.user.id);
  const recovered = (
    await (await fetch(`${base}/videos/${uploaded.id}`, { headers })).json()
  ).data;
  assert.equal(recovered.status, "pending");
  assert.ok(recovered.mediaUrl);
  assert.equal(
    backend.db
      .prepare("SELECT state FROM capture_tickets WHERE id=?")
      .get(interrupted.id).state,
    "open",
  );
  assert.equal(
    backend.db.prepare("SELECT COUNT(*) AS n FROM file_deletions").get().n,
    0,
  );
  await assert.rejects(stat(erased));
});
