# Outside API

Requires Node 22.13–22.x, FFmpeg and FFprobe. No paid service credentials are required for local development. The database starts without accounts or activity.

```sh
cd server
npm ci
npm test
npm start
```

`GET http://127.0.0.1:8787/healthz` verifies the running service and SQLite connection. On this cloud machine, prepend `/workspace/.outsidefixed3/node-v22.23.5-linux-x64/bin` to PATH. A phone needs a reachable server hostname/IP; its localhost is not this server. HTTP is for a local development network only.

To connect a physical phone to the local development build:

1. Run the commands above on your own computer with Node 22, FFmpeg and FFprobe installed. Keep `npm start` running.
2. Put the phone and computer on the same Wi-Fi network and allow the phone to reach the computer's port 8787.
3. In Outside's **Connect server** screen, enter `http://<computer-LAN-IPv4>:8787`, for example `http://192.168.1.20:8787`. Use your computer's actual address.
4. Create an account, search for a real place and save it. An empty video feed is expected until real recordings are uploaded and approved.

For an Android emulator on the server computer, use `http://10.0.2.2:8787`; an iOS simulator on the server Mac can use `http://127.0.0.1:8787`. The Android internal review build enables local HTTP explicitly; production builds require a reachable HTTPS service. A phone cannot automatically reach this cloud workspace, and this task does not provision an externally hosted backend.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Listen interface |
| `PORT` | `8787` | Listen port |
| `DATA_DIR` | `./data` | Private persistent SQLite and media directory |
| `CORS_ORIGINS` | localhost / 127.0.0.1 ports 8081, 8082 | Comma-separated browser origins |
| `OSM_USER_AGENT` | OutsideDevelopment/0.1 | Identifying Nominatim user agent; set a deployment contact before release |
| `FFMPEG_PATH` / `FFPROBE_PATH` | Commands on PATH | Video tools |

Every recording is processed into private MP4/JPEG output, then awaits human review. A trusted local operator can inspect pending video files and make a quality/moderation decision:

```sh
npm run moderate -- list
npm run moderate -- approve VIDEO_ID
npm run moderate -- reject VIDEO_ID 'Reason for rejection'
```

Approval controls discovery and earned contribution credit; clients cannot self-approve. Use the same `DATA_DIR` for the service and CLI. No automatic content moderation or external push delivery is claimed. The service resumes interrupted processing on restart; owners can retry failed processing from the app.

See [API contracts](../docs/api.md) and [architecture, security boundaries and production gaps](../docs/architecture.md). Tests use disposable databases and test media; they never insert simulated activity in the running app.
