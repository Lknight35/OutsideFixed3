# Outside native application

Expo SDK 54 / React Native 0.81, shared native iOS and Android source. Real rear-camera recording, location permission handling, secure session storage, native video playback, and an actual persistent HTTP API. No camera-roll video uploads or fabricated social activity. The image picker is restricted to profile photos.

## Run locally

Use Node 22. Start the server from `../server` and install dependencies with `npm ci` here. Run `npm start`, then select an Android device/emulator or iOS simulator with the native modules installed. Expo Go has limitations, particularly for notification capabilities; a native development or release build is preferred.

The connection screen accepts a server URL. For an Android emulator use `http://10.0.2.2:8787`; for an iOS simulator use `http://localhost:8787`; on a physical phone use your development computer's private Wi-Fi IP and port 8787. The phone must be able to reach that machine. The cloud workspace address is not automatically reachable from a physical phone.

No external hosting or paid-service accounts are provisioned. Release hosting requires HTTPS, backups, production secrets/operations and a separate deployment decision.

## Native builds

```sh
# From the repository root, after installing mobile dependencies:
npm run build:android
# Optional developer APK, which requires Metro:
npm run build:android:debug
```

The review APK is `artifacts/outside-review.apk`; it includes its JavaScript bundle and does not need Metro. The debug APK is `artifacts/outside-debug.apk`; run `npm start` in `mobile/`, connect the Android device by USB, then run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:8787 tcp:8787`. With that USB forwarding, use `http://127.0.0.1:8787` in the connection screen. Both APKs use the same app identifier and development signing key; install one at a time.

Android needs JDK 17 (validated with JDK 17), Android SDK 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. The review build permits HTTP to a local development server when generated with `OUTSIDE_ALLOW_LOCAL_HTTP=1`. Public server URLs are required to use HTTPS in the app. Default production configuration does not enable cleartext traffic.

The generated Expo Android project uses a development signing key until a release signing configuration is supplied. Such an APK is suitable for review, not Play Store release. Preserve your own production signing keys outside source control.

### Free local iPhone testing

A Mac with supported Xcode, an iPhone running iOS 15.1 or later, and a free Apple ID are enough to test a locally signed native app on your own phone. No EAS account or paid Apple Developer membership is needed for this path. It has not been signed or installed on an iPhone in this workspace.

1. Install Xcode and its command-line tools. In Xcode Settings → Accounts, add your Apple ID. Connect and pair the iPhone, accept its Trust prompt, and enable Developer Mode on iOS 16 or later.
2. Run the backend on the Mac with Node 22 and FFmpeg/FFprobe available: in `server/`, run `npm ci` and `npm start`. Keep that process running.
3. In a second terminal, run `npm ci` in `mobile/`, then `npx expo run:ios --device` and select the paired phone. Expo generates the native project and installs its CocoaPods dependencies as needed.
4. If signing is not configured, open the generated `ios/Outside.xcworkspace` in Xcode, select the Outside target, enable automatic signing, and select your **Personal Team**. Use a unique bundle identifier if Xcode requires one, then rerun `npx expo run:ios --device`. Trust the developer app in the phone’s settings if prompted. Free personal-device signing normally expires after seven days and requires rebuilding/reinstalling.
5. Keep the Mac and phone on the same Wi-Fi network. In Outside, connect to `http://YOUR-MAC-LAN-IP:8787` (not `localhost`); allow local-network permission and permit the backend and Metro through the Mac’s firewall. The cloud workspace is not automatically reachable from your phone. Public servers require HTTPS.

The local app deliberately has **no APNs push entitlement**: its notifications currently use the private in-app inbox. Personal Team signing does not support the Push Notifications capability. If reusing an iOS project generated before this configuration change, regenerate it from the current Expo configuration or remove the old Push Notifications capability and `aps-environment` entitlement before signing. Keep other user changes when regenerating.

For the quickest preview without native signing, `npx expo start --lan` can open in **an Expo Go client compatible with SDK 54**, if that client is already available on the iPhone. The current App Store Expo Go may support a different SDK; an incompatible client cannot run this project. Use the Personal Team native path above in that case. Store distribution and TestFlight are separate signing/distribution workflows.

This Linux workspace cannot compile/sign an iOS IPA. `npm run export:ios` validates the iOS JavaScript bundle, not the native compiler, signing, or a device installation.

The Expo configuration uses provisional identifiers `app.outside.discovery`. Confirm final app identifiers before store submission.

## Checks

```sh
npm run typecheck
npm run export:android
npm run export:ios
```

Maps use genuine authorized place coordinates. iOS can use Apple Maps; Android can use Google Maps if a restricted Google Maps key is supplied, otherwise the keyless OpenStreetMap view. Leaflet is bundled locally with its license. OpenStreetMap attribution remains visible and tile use is online only. The accessible place list remains available when map imagery cannot load.

See the root delivery notes for the exact checks performed and remaining limitations. Do not mistake a successful JavaScript export for verified camera/GPS behavior on a physical phone.
