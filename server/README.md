# Outside API

Requires Node 22.13–22.x, FFmpeg and FFprobe. No paid service credentials are required for local development. The database starts without accounts or activity.

```sh
cd server
npm ci
npm test
npm start
```

`GET http://127.0.0.1:8787/healthz` verifies the running service and SQLite connection. On this cloud machine, prepend `/workspace/.outsidefixed3/node-v22.23.5-linux-x64/bin` to PATH. A phone needs a reachable server hostname/IP; its localhost is not this server. HTTP is for a local development network only.

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
