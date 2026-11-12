# Outside

Outside is a native iOS/Android app for real place discovery, verified capture, mutual friendships, and private outings. The original Claude Vite prototype is preserved at the repository root; the connected native implementation is in `mobile/`, with its persistent API in `server/`.

- [Native app and local build](mobile/README.md)
- [Backend and moderation](server/README.md)
- [Source audit and product map](docs/source-audit.md)
- [Architecture and security boundaries](docs/architecture.md)
- [Shared API contract](docs/api.md)

Use **Node 22**. The cloud setup installs it under `/workspace/.outsidefixed3/node-v22.23.5-linux-x64/bin`; prepend that directory to `PATH` when working in this environment.

```sh
npm --prefix server ci
npm --prefix mobile ci
npm run dev:server
# In a second terminal:
npm run dev:mobile
```

There are no seed users or fabricated videos. Create an account, search for a real place, connect a friend, and contribute a new recording. Captures require a nearby fresh GPS fix and remain pending until an operator approves them. Local code does not imply deployed hosting, device attestation, automated content review, or push delivery.

## Preserved browser prototype

```sh
npm install --package-lock=false
npm run dev
npm run build
```

The original Vercel settings remain: framework Vite, repository root, build `npm run build`, output `dist`. The native app and API are separate from that static deployment.
