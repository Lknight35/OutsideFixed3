# Install and test Outside

## Android phone: standalone review build

1. Download `artifacts/outside-review.apk` to your Android phone and open it. Allow installation from that browser/file manager when Android asks. This is an internal, development-signed APK, not a Play Store release. Its JavaScript is included; Metro is not required.
2. On your computer, check out `development/outside-native` from `Lknight35/OutsideFixed3`. Install Node 22 and FFmpeg/FFprobe, then run:

   ```sh
   npm --prefix server ci
   npm --prefix server start
   ```

3. Keep the computer and phone on the same Wi-Fi network. Allow the phone to reach TCP port 8787 on the computer. Find the computer's private LAN address in its network settings.
4. Open Outside and enter `http://YOUR-COMPUTER-LAN-IP:8787`, for example `http://192.168.1.20:8787`. Use your actual address. `localhost` on the phone means the phone itself. The cloud workspace is not a hosted backend that a phone can automatically reach.
5. Create an account, search for a real place and save it. Saved items are inside Search. Create another account on a second device to test mutual friends and private invitations/chats.
6. At a real place, open its page and choose **Record here**. Allow camera, microphone and location while using the app. Capture at least three seconds and remain at the place while uploading. Precise, fresh location is required; mocked locations are rejected.

The feed and personal map begin empty. Saving a place does not claim you visited it. Uploaded recordings remain pending until reviewed. To review your own local test submissions, use the operator commands in [server instructions](../server/README.md), then approve only footage you have checked. No demo activity is inserted.

The API is a real local SQLite/media service. Public deployment, backups, email recovery and push delivery have not been provisioned. Public server URLs require HTTPS; local HTTP is explicitly enabled only in these internal APKs.

## Android developer build

`artifacts/outside-debug.apk` is the debug variant and requires Metro. Install it instead of the standalone APK; both use the same app identifier. With the phone connected to your computer over USB and USB debugging enabled:

```sh
npm --prefix mobile ci
npm --prefix mobile start
# In another terminal with Android platform-tools:
adb install -r artifacts/outside-debug.apk
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8787 tcp:8787
```

Keep Metro and the backend running. With USB forwarding, the app can use `http://127.0.0.1:8787`. Run these commands on the computer connected to the phone. In this cloud test environment, the isolated validation API used port 8788; that address is not embedded in either APK.

The locked installation includes a guarded Metro compatibility patch: Metro 0.83.3 supplies file paths, while the security-fixed image-size 2.0.3 parser requires bytes. The postinstall script adapts that boundary, and the asset regression test checks the actual development bundler path. Do not skip lifecycle scripts when installing mobile dependencies.

## iPhone

No signed IPA is supplied. The free local path needs a Mac with Xcode, a free Apple ID/Personal Team, and a paired iPhone with Developer Mode enabled. See [the exact iPhone steps](../mobile/README.md#free-local-iphone-testing). No paid Apple membership or EAS account is needed for local Personal Team testing; distribution and TestFlight are separate.

## Verification limits

See [delivery evidence](delivery.md) for the exact APK installation and test results. Emulated camera preview is not proof of physical capture quality. The Android test image lacks Google location services, so physical GPS verification and a complete native capture/upload still require a phone. Notification inboxes work; OS push delivery and advanced recommendation/planning tools remain unfinished.
