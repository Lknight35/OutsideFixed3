import { resolve } from "node:path";
import { openDatabase } from "./db.js";
import { createDomain } from "./domain.js";
const db = openDatabase(process.env.DATA_DIR || resolve("data"));
const domain = createDomain(db);
const [command, videoId, ...reason] = process.argv.slice(2);
try {
  if (command === "list")
    console.log(
      JSON.stringify(
        {
          pending: db
            .prepare(
              "SELECT id,user_id,place_id,caption,recorded_at,duration_seconds,media_path FROM videos WHERE status='pending' ORDER BY created_at",
            )
            .all(),
          reports: db
            .prepare(
              "SELECT id,video_id,reason,created_at FROM reports WHERE status='open'",
            )
            .all(),
        },
        null,
        2,
      ),
    );
  else if (["approve", "reject"].includes(command) && videoId)
    console.log(
      JSON.stringify(
        domain.moderate(videoId, command, reason.join(" ")),
        null,
        2,
      ),
    );
  else {
    console.error(
      "Usage: npm run moderate -- list | approve <video-id> | reject <video-id> <reason>",
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
