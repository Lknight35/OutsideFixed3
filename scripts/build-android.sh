#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f /workspace/.outside-native-toolchain/activate.sh ]]; then
  source /workspace/.outside-native-toolchain/activate.sh
fi
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17}"
cd "$repo_dir/mobile"
variant="${OUTSIDE_ANDROID_VARIANT:-release}"
case "$variant" in
  release) task=assembleRelease; artifact=outside-review.apk; export NODE_ENV=production ;;
  debug) task=assembleDebug; artifact=outside-debug.apk; export NODE_ENV=development ;;
  *) printf 'OUTSIDE_ANDROID_VARIANT must be release or debug\n' >&2; exit 2 ;;
esac
# Explicitly opt into private-network HTTP only for the internal review build.
export OUTSIDE_ALLOW_LOCAL_HTTP="${OUTSIDE_ALLOW_LOCAL_HTTP:-1}"
export CI=1 EXPO_NO_TELEMETRY=1
npx expo prebuild --platform android --no-install
wrapper=android/gradle/wrapper/gradle-wrapper.properties
version="$(sed -n 's/.*gradle-\([0-9.]*\)-bin.zip/\1/p' "$wrapper")"
checksum_file="$(mktemp)"
trap 'rm -f "$checksum_file"' EXIT
curl --fail --silent --show-error --location "https://services.gradle.org/distributions/gradle-$version-bin.zip.sha256" -o "$checksum_file"
checksum="$(cat "$checksum_file")"
[[ "$checksum" =~ ^[a-f0-9]{64}$ ]]
if ! rg -q '^distributionSha256Sum=' "$wrapper"; then
  printf '\ndistributionSha256Sum=%s\n' "$checksum" >> "$wrapper"
fi
./android/gradlew -p android ":app:$task" -PreactNativeArchitectures="${OUTSIDE_ANDROID_ARCHITECTURES:-arm64-v8a,x86_64}" --max-workers="${OUTSIDE_BUILD_WORKERS:-3}" -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1024m'
mkdir -p "$repo_dir/artifacts"
cp "android/app/build/outputs/apk/$variant/app-$variant.apk" "$repo_dir/artifacts/$artifact"
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose "$repo_dir/artifacts/$artifact"
(cd "$repo_dir/artifacts" && sha256sum "$artifact" > "$artifact.sha256")
printf 'Internal development-signed %s APK: %s/artifacts/%s\n' "$variant" "$repo_dir" "$artifact"
if [[ "$variant" == debug ]]; then
  printf 'Debug needs Metro: run npm start in mobile/ and adb reverse tcp:8081 tcp:8081. The review APK bundles JavaScript for phone testing.\n'
fi
