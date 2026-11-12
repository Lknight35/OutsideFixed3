#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node_setup=/workspace/.outsidefixed3
node_dir="$node_setup/node-v22.23.5-linux-x64"
mkdir -p "$node_setup"
if [[ ! -x "$node_dir/bin/node" ]]; then
  curl --fail --silent --show-error --location --retry 2 https://nodejs.org/dist/v22.23.5/node-v22.23.5-linux-x64.tar.xz -o "$node_setup/node-v22.23.5-linux-x64.tar.xz"
  printf '%s  %s\n' cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8 "$node_setup/node-v22.23.5-linux-x64.tar.xz" | sha256sum --check --strict -
  tar -xJf "$node_setup/node-v22.23.5-linux-x64.tar.xz" -C "$node_setup"
fi
export PATH="$node_dir/bin:$PATH"
export npm_config_cache="$node_setup/npm-cache"
export EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1
export __UNSAFE_EXPO_HOME_DIRECTORY=/workspace/.outside-native-toolchain/expo
# FFmpeg is provided by this cloud image. Install it through your OS package manager elsewhere.
command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null
npm --prefix "$repo_dir/server" ci --no-audit --no-fund
npm --prefix "$repo_dir/mobile" ci --no-audit --no-fund
npm --prefix "$repo_dir/server" test
npm --prefix "$repo_dir/mobile" run typecheck
npm --prefix "$repo_dir/mobile" test
# Keep the original browser prototype independently buildable; it intentionally has no lockfile.
(cd "$repo_dir" && npm install --package-lock=false --no-audit --no-fund && npm run build)
npm --prefix "$repo_dir/mobile" run test:map
printf 'JavaScript dependencies installed and checked. Android builds also need scripts/cloud-android-tools.sh.\n'
