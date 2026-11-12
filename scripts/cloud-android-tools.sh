#!/usr/bin/env bash
# Installs a user-owned, checksum-verified native toolchain for the managed Linux workspace.
set -euo pipefail
native_tools=/workspace/.outside-native-toolchain
mkdir -p "$native_tools/downloads" "$native_tools/gradle" "$native_tools/android-user" "$native_tools/avd"
jdk_dir="$native_tools/jdk-17.0.21+9"
if [[ ! -x "$jdk_dir/bin/javac" ]]; then
  base_url='https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.21%2B9'
  artifact=OpenJDK17U-jdk_x64_linux_hotspot_17.0.21_9.tar.gz
  curl --fail --silent --show-error --location --retry 2 "$base_url/$artifact.sha256.txt" -o "$native_tools/downloads/jdk17.sha256"
  curl --fail --silent --show-error --location --retry 2 "$base_url/$artifact" -o "$native_tools/downloads/jdk17.tar.gz"
  checksum="$(cut -d ' ' -f 1 "$native_tools/downloads/jdk17.sha256")"
  printf '%s  %s\n' "$checksum" "$native_tools/downloads/jdk17.tar.gz" | sha256sum --check --strict -
  tar -xzf "$native_tools/downloads/jdk17.tar.gz" -C "$native_tools"
fi
sdk_dir="$native_tools/android-sdk"
if [[ ! -x "$sdk_dir/cmdline-tools/latest/bin/sdkmanager" ]]; then
  curl --fail --silent --show-error --location --retry 2 https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip -o "$native_tools/downloads/android-tools.zip"
  # Published in Google's HTTPS repository2-1.xml for this exact archive.
  printf '%s  %s\n' e025545c62a8e64c7559119566a569fb1dec5f60 "$native_tools/downloads/android-tools.zip" | sha1sum --check --strict -
  mkdir -p "$sdk_dir/cmdline-tools"
  unzip -q "$native_tools/downloads/android-tools.zip" -d "$sdk_dir/cmdline-tools"
  mv "$sdk_dir/cmdline-tools/cmdline-tools" "$sdk_dir/cmdline-tools/latest"
fi
if [[ ! -f "$native_tools/java-cacerts" ]]; then
  cp "$jdk_dir/lib/security/cacerts" "$native_tools/java-cacerts"
  if [[ -n "${CODEX_PROXY_CERT:-}" ]]; then
    "$jdk_dir/bin/keytool" -importcert -noprompt -alias codex-cloud -file "$CODEX_PROXY_CERT" -keystore "$native_tools/java-cacerts" -storepass changeit
  fi
fi
# Preserve the managed proxy and CA trust; never disable certificate validation.
python - <<'PY'
import os, pathlib, shlex, urllib.parse
root='/workspace/.outside-native-toolchain'
p=urllib.parse.urlparse(os.environ.get('HTTPS_PROXY',''))
options=f'-Djavax.net.ssl.trustStore={root}/java-cacerts -Djavax.net.ssl.trustStorePassword=changeit'
if p.hostname:
 options+=f' -Dhttps.proxyHost={p.hostname} -Dhttps.proxyPort={p.port or 80} -Dhttp.proxyHost={p.hostname} -Dhttp.proxyPort={p.port or 80} -Dhttp.nonProxyHosts=localhost|127.*|[::1]'
values={'JAVA_HOME':f'{root}/jdk-17.0.21+9','ANDROID_HOME':f'{root}/android-sdk','ANDROID_SDK_ROOT':f'{root}/android-sdk','ANDROID_USER_HOME':f'{root}/android-user','ANDROID_EMULATOR_HOME':f'{root}/android-user','ANDROID_AVD_HOME':f'{root}/avd','GRADLE_USER_HOME':f'{root}/gradle','JAVA_TOOL_OPTIONS':options,'EXPO_NO_TELEMETRY':'1','EXPO_OFFLINE':'1','__UNSAFE_EXPO_HOME_DIRECTORY':f'{root}/expo','npm_config_cache':'/workspace/.outsidefixed3/npm-cache'}
pathlib.Path(root+'/activate.sh').write_text('\n'.join('export '+k+'='+shlex.quote(v) for k,v in values.items())+'\nexport PATH="/workspace/.outsidefixed3/node-v22.23.5-linux-x64/bin:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"\n')
PY
source "$native_tools/activate.sh"
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
printf 'Toolchain ready. Activate with: source %s/activate.sh\n' "$native_tools"
