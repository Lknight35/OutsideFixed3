# Outside delivery

The source is preserved and pushed to `development/outside-native` in `Lknight35/OutsideFixed3`. The original browser prototype remains intact. The app and backend are local-development software, not a store-ready release.

## Android artifacts

- `artifacts/outside-review.apk`: standalone, development-signed review build with JavaScript included; no Metro required. Installed and launched on the Android 11 x86_64 emulator. SHA256: `7b9b463295a0a7b33c103ff0cddf8d9b457e00c3458395704bbb428ab8f6ab53`.
- `artifacts/outside-debug.apk`: debug build requiring Metro on port 8081. Installed and launched on the Android 11 x86_64 emulator, with authenticated Home and the saved place restored.
- `artifacts/outside-review-initial-verified.apk`: earlier standalone checkpoint installed, launched and exercised on that emulator.

Both variants contain arm64 and x86_64 native code. Signature checks pass; each current APK has a `.sha256` file. Device-side APK hashes are compared with the delivered files in `artifacts/validation/*verification.json`. These builds permit local-network HTTP explicitly and use development signing; they are not Play Store releases.

The original `repo.reactnative.dev` network blocker is resolved. Android 15 software emulation had unstable startup services; native verification used Android 11. No physical Android device has been tested.

See [phone installation and testing](phone-testing.md) for the exact backend, APK, USB and Wi-Fi steps. The local API is not publicly hosted; a phone must reach a server running on its own network or a separately deployed HTTPS service.

## What was verified

| Check | Result |
| --- | --- |
| Backend tests | 16 passed; zero failed/skipped |
| Mobile tests | 7 passed; zero failed/skipped, including Metro development asset loading |
| TypeScript | Passed |
| Map security regression | Passed: hostile labels, invalid coordinates, selection callbacks and attribution |
| Session races | Passed: old success/401 responses cannot replace or sign out a newer account |
| Connected phone/tablet browser flows | Passed: register/login, real geocoder search, saves, mutual friends, private invitations/accepted one-to-one chat, Next Move, maps, earned progress, preferences, avatars and deletion |
| Genuine map imagery | Verified in Chromium with the existing managed CA trust; no TLS checks disabled |
| Native standalone app | Installed and launched; real account creation/authentication, search for Bryant Park, saved place and place details, camera/microphone permission dialogs, and emulated rear-camera preview exercised |
| Native debug app | Installed APK hash matched; Metro bundle loaded; authenticated Home and saved place restored |
| Android native compilation/signing | Review and debug builds passed |
| iOS JavaScript export and project generation | Passed; native iOS compilation/signing not available here |
| Original Vite prototype | Build passed; original `src/` unchanged |

The debug test exposed a compatibility issue between Metro's legacy image-path argument and the security-fixed image-size parser. A version-guarded postinstall patch adapts the argument to bytes. Its regression test failed before the fix and passes after a fresh `npm ci`; vulnerable parser versions were not restored.

Native testing also prompted Android keyboard avoidance, correct Back handling for the server-change overlay, and a shorter responsive camera preview to keep capture controls visible. The final standalone APK includes these changes, was reinstalled and launched, and displayed the capture controls within the tested viewport. Camera/GPS capture still needs physical-device testing.

Backend media tests use isolated fixtures and perform real decoding, FFmpeg conversion, thumbnail generation, moderation, range delivery and authorization revocation. Native test accounts use a separate API/database on port 8788. No fabricated activity is inserted into the normal service.

## iPhone

No signed IPA exists. The generated project no longer requests an unused APNs entitlement. The fastest free local path is a Mac with Xcode, a free Apple ID/Personal Team, and a paired iPhone with Developer Mode. [Mobile instructions](../mobile/README.md#free-local-iphone-testing) cover signing and connecting to the local backend. EAS/Apple/hosting accounts were not supplied; no paid services were provisioned.

## Remaining work and limits

1. Validate physical camera/GPS, complete native capture/upload, background/permission behavior and performance on actual Android/iPhone hardware. The AOSP test image has no Google location services; emulated preview does not prove physical capture quality or GPS authenticity.
2. Produce and test a signed iOS build using Apple tooling.
3. Provision phone-reachable HTTPS hosting, production storage/backups, email verification/recovery, moderation operations and OS push delivery before public use. The in-app notification inbox/preferences are functional; OS push is not implemented.
4. Implement advanced recommendation/planning tools. Contribution accounting is real: three approved distinct place/day updates earn 30 days. The app identifies the advanced tools as unavailable and has no paid subscriptions.
5. Complete release hardening, final application identifiers/signing, stronger capture attestation and Expo tooling upgrades. The backend audit has no known advisories; the mobile graph has no high/critical advisories but 12 moderate and 1 low tooling advisories remain.

The required navigation is Home · Search · Record · Friends · Profile, with Saved inside Search. Personal maps open separately from the profile; friend profiles have maps/recent places and no general message action. There are no public likes/comments, Past invitation tab, group chats, livestreaming, camera-roll video uploads or paid Premium controls.

Source archives exclude runtime databases, media, credentials, development signing keys, node_modules and build products. Build/test logs and native/browser screenshots are retained under `artifacts/`; that directory is ignored by Git.
