# Outside native application

Expo SDK 54 / React Native 0.81, shared native iOS and Android source. Real rear-camera recording, location permission handling, secure session storage, native video playback, and an actual persistent HTTP API. No gallery picker or fabricated social activity.

## Run locally

Use Node 22. Start the server from `../server` and install dependencies with `npm ci` here. Run `npm start`, then select an Android device/emulator or iOS simulator with the native modules installed. Expo Go has limitations, particularly for notification capabilities; a native development or release build is preferred.

The connection screen accepts a server URL. For an Android emulator use `http://10.0.2.2:8787`; for an iOS simulator use `http://localhost:8787`; on a physical phone use your development computer's private Wi-Fi IP and port 8787. The phone must be able to reach that machine. The cloud workspace address is not automatically reachable from a physical phone.

No external hosting or paid-service accounts are provisioned. Release hosting requires HTTPS, backups, production secrets/operations and a separate deployment decision.

## Native builds

```sh
npm ci
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Android needs JDK 17+ (validated with JDK 21), Android SDK 36, build-tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. The review build permits HTTP to a local development server when generated with `OUTSIDE_ALLOW_LOCAL_HTTP=1`. Public server URLs are required to use HTTPS in the app. Default production configuration does not enable cleartext traffic.

The generated Expo Android project uses a development signing key until a release signing configuration is supplied. Such an APK is suitable for review, not Play Store release. Preserve your own production signing keys outside source control.

For iOS use a macOS machine with Xcode (`npx expo run:ios`), or configure EAS and Apple Developer signing. This Linux workspace cannot produce a signed iOS IPA on its own. `npm run export:ios` validates the iOS JavaScript bundle, not the native compiler or a device installation.

The Expo configuration uses provisional identifiers `app.outside.discovery`. Confirm final app identifiers before store submission.

## Checks

```sh
npm run typecheck
npm run export:android
npm run export:ios
```

Maps use genuine authorized place coordinates. iOS can use Apple Maps; Android can use Google Maps if a restricted Google Maps key is supplied, otherwise the keyless OpenStreetMap view. Leaflet is bundled locally with its license. OpenStreetMap attribution remains visible and tile use is online only. The accessible place list remains available when map imagery cannot load.

See the root delivery notes for the exact checks performed and remaining limitations. Do not mistake a successful JavaScript export for verified camera/GPS behavior on a physical phone.
