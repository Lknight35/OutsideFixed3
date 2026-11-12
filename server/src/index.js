import { createApp } from "./app.js";
const backend = createApp();
const port = Number(process.env.PORT || 8787),
  host = process.env.HOST || "0.0.0.0";
const server = backend.app.listen(port, host, () =>
  console.log(JSON.stringify({ event: "outside_api_listening", host, port })),
);
async function shutdown() {
  server.close(async () => {
    await backend.close();
    process.exit(0);
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
