# Outside delivery

This is a connected local-development implementation, not a store-ready release. The original Claude browser prototype remains intact; the native app and persistent backend are separate additions.

## Installable build status

**Both Android APKs have been produced and their signatures verified. Installation/launch verification is in progress. No iOS IPA has been produced.** The network rules for `repo.reactnative.dev` and `tile.openstreetmap.org` are now applied. Both the standalone review and debug Gradle builds pass. Android 15 software emulation encountered restarting system services; runtime testing is continuing on Android 11.

Reproduce the builds with:

```sh
cd /workspace/OutsideFixed3
npm run build:android
npm run build:android:debug
```

The script verifies the Gradle distribution checksum, generates the native Android project, builds arm64 and x86_64, verifies the APK signature, and places the results at `artifacts/outside-review.apk` and `artifacts/outside-debug.apk`, each with a SHA-256 file. These are development-signed internal builds with explicitly enabled local-network HTTP, not Play Store releases. The review APK includes JavaScript and needs no Metro server; the debug APK requires Metro on port 8081.

The generated iOS project and its JavaScript bundle validate here. Its unused push entitlement has been removed. Free local iPhone testing can use Xcode on a Mac and a free Apple ID/Personal Team, as described in the mobile instructions. Neither Xcode nor Apple signing is available in this Linux task.

## Implemented

- A shared dark/purple native design, responsive phone/tablet layouts, accessible navigation and real empty states.
- Persistent accounts, secure native session storage, profile-photo upload/removal and password-confirmed account deletion.
- Genuine OpenStreetMap search, searches over authorized recent recording captions/place text, feed filters, place pages and saved places/videos/searches.
- Rear-camera recording code, foreground GPS permission/freshness checks, server-issued capture tickets, bounded authenticated uploads, FFmpeg conversion/thumbnails, private media range delivery, retry/restart recovery and operator moderation.
- Mutual friend requests, private friend activity/maps, hidden-location controls, invitations with individual responses and private one-to-one chats expiring 24 hours after the outing ends.
- Discover Around with accurate coordinates and interactive maps, private Next Move sharing, Outside Signal, notification inbox and granular preferences.
- Backend-earned contribution credit: three approved distinct place/day updates grant 30 days of advanced access. Public clients cannot self-approve or grant entitlements.

The reference image's group chat, gallery video uploads, follower/popularity counts and paid subscription controls are excluded in accordance with the written specification.

## Verified

| Check                                                                       | Result                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved installer from both lockfiles, then checks                            | Passed                                                                                                                                                                   |
| Backend automated suite                                                     | 16 passed; zero failed/skipped                                                                                                                                           |
| Client URL/session/geographic tests                                         | 6 passed; zero failed/skipped                                                                                                                                            |
| Map hostile-label/coordinate/callback regression                            | Passed in Chromium                                                                                                                                                       |
| Connected browser flows, phone and tablet                                   | Passed: account, live geocoder search, saves, mutual friends, private invitation/chat/Next Move, map marker interaction, earned progress, settings, avatars and deletion |
| Delayed previous-session success/401 responses                              | Passed; no cross-account replacement or logout                                                                                                                           |
| TypeScript                                                                  | Passed                                                                                                                                                                   |
| Android and iOS JavaScript/Hermes exports                                   | Passed; under `artifacts/android-bundle` and `artifacts/ios-bundle`                                                                                                      |
| iOS native-project generation                                               | Passed; no native compilation claimed                                                                                                                                    |
| Preserved Vite prototype build                                              | Passed                                                                                                                                                                   |
| Backend dependency audit                                                    | Zero known advisories                                                                                                                                                    |
| Mobile dependency audit                                                     | Zero high/critical; 12 moderate and 1 low advisories remain in the Expo configuration/build dependency graph                                                             |
| Android native packaging                                                    | Review and debug APKs built; signatures verified; installation/launch testing in progress                                                                                 |
| Physical camera/GPS, native permission lifecycle and installed-app behavior | Not verified on a device                                                                                                                                                 |

Media tests use isolated databases and explicit test fixtures. They exercise actual decoding, transcoding, moderation, byte-range delivery and authorization revocation; they do not establish the authenticity of real-world footage. Browser smoke accounts are deleted after testing. Existing unrelated local accounts/data are preserved. No runtime database, uploaded media, credentials or development signing keys are included in the source archive.

## Remaining work

1. Finish APK installation/launch and native camera/GPS, media upload and permission/background testing. Genuine map imagery, marker behavior and attribution are now verified in Chromium using the existing managed CA trust; native map imagery is not yet verified.
2. Produce and test a signed iOS build on appropriate Apple tooling.
3. Provision a phone-reachable HTTPS backend, production storage/backups, account email verification/recovery, push-delivery credentials and moderation operations before public use. The current API is a real local service with SQLite and disk media, not an externally deployed service.
4. Add stronger device attestation/abuse controls for public capture claims. Current checks reject stale, distant, inaccurate and reported-mocked fixes; GPS and client declarations cannot prove authenticity.
5. Implement the advanced recommendation/planning tools themselves. Earned entitlement accounting is real; the app clearly identifies those tools as unavailable. There are no fabricated AI summaries or paid subscriptions.
6. Complete the Expo SDK/tooling dependency upgrade and release hardening, including application identifiers and production signing.

## Run and review

See [mobile instructions](../mobile/README.md), [backend instructions](../server/README.md), [architecture](architecture.md), [API](api.md) and [source audit](source-audit.md).

The cloud's tested Node 22 installation is `/workspace/.outsidefixed3/node-v22.23.5-linux-x64/bin`. The API runs on port 8787. A physical phone must reach the server on your own network; it cannot automatically reach this cloud machine. No paid accounts or services were provisioned.

For repeatable browser validation, start the API and `npx expo start --web --offline --port 8082` in `mobile/`, then run `npm --prefix mobile run test:ui`. The root package supplies Playwright, and `CHROMIUM_PATH` can select a local browser. `node mobile/scripts/session-race.cjs` exercises the session race regression. Validation logs and screenshots are retained under `artifacts/`.
