#!/usr/bin/env bash
# One click for testing everything on THIS machine (local emulators only, nothing touches your real Firebase project):
#   ./start-all.sh            # or: bash start-all.sh
# 1. starts the stack from tools/demo-stack.sh: Auth + Data Connect emulators, the gateway (3100), the demo school,
#    web-admin (http://greenfield.localhost:3102) and saas-admin (http://localhost:3101);
# 2. boots an iOS simulator;
# 3. builds the four Flutter apps (teacher, staff, parent, driver) against that gateway, installs them on the simulator and launches
#    the Teacher app.
# Ctrl-C stops the stack (the demo data disappears with it). Demo accounts: documentation/demo-school.md (password demo-pass-2027).
#
# Settings (environment variables, all optional):
#   FLUTTER=/path/to/flutter   the Flutter to use (default: flutter on PATH). If native packages fail to build with
#                              "gen_kernel_aot is not an AOT snapshot", use the repaired clone described in documentation/environment.md.
#   SIM=<name or id>           the simulator (default: the booted one, else the first iPhone)
#   APPS="teacher staff"       which apps to install (default: teacher staff parent driver)
#   LAUNCH=teacher             which app to open at the end (default: teacher; none = open nothing)
#   NO_WEB=1                   do not open the browser tabs
#   KEEP_BUILDS=1              keep the builds of earlier runs (by default they are deleted first, to free disk space; builds are slower then)
set -u
set -o pipefail
cd "$(dirname "$0")"

FLUTTER="${FLUTTER:-flutter}"
APPS="${APPS:-teacher staff parent driver}"
LAUNCH="${LAUNCH:-teacher}"
GATEWAY=http://127.0.0.1:3100
AUTH=127.0.0.1:9099
LOGS="$(mktemp -d -t oru-all.XXXXXX)"
STACK_PID=""
echo "Logs: $LOGS"

cleanup() {
  echo; echo "stopping the stack..."
  [ -n "$STACK_PID" ] && kill "$STACK_PID" 2>/dev/null   # tools/demo-stack.sh stops the emulators, gateway and web apps itself
  wait 2>/dev/null
  true
}
trap cleanup EXIT INT TERM

export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"
command -v node >/dev/null || { echo "error: node was not found (the project uses Node 22)"; exit 1; }
command -v "$FLUTTER" >/dev/null 2>&1 || [ -x "$FLUTTER" ] || { echo "error: Flutter was not found; set FLUTTER=/path/to/flutter"; exit 1; }
command -v xcrun >/dev/null || { echo "error: Xcode command line tools were not found"; exit 1; }

# --- 0. a Flutter that can build the native packages --------------------------------------------------------------------------
# Some Flutter installs lack bin/cache/dart-sdk/bin/snapshots/gen_kernel_aot.dart.snapshot, and then drift, secure storage and the other
# native packages cannot build ("gen_kernel_aot.dart.snapshot is not an AOT snapshot"). The fix needs no change to your install: a
# copy-on-write clone in ~/flutter_fixed plus that one file from the matching standalone Dart SDK (about 225 MB, downloaded once).
FLUTTER_BIN="$(command -v "$FLUTTER" 2>/dev/null || echo "$FLUTTER")"
FLUTTER_ROOT_DIR="$(cd "$(dirname "$(readlink -f "$FLUTTER_BIN" 2>/dev/null || echo "$FLUTTER_BIN")")/.." && pwd)"
SNAP_REL="bin/cache/dart-sdk/bin/snapshots/gen_kernel_aot.dart.snapshot"
if [ ! -f "$FLUTTER_ROOT_DIR/$SNAP_REL" ]; then
  FIXED="$HOME/flutter_fixed"
  if [ ! -f "$FIXED/$SNAP_REL" ]; then
    echo "[0/3] your Flutter lacks gen_kernel_aot.dart.snapshot; making a repaired copy in $FIXED (once)..."
    DART_VERSION="$("$FLUTTER_ROOT_DIR/bin/cache/dart-sdk/bin/dart" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
    ARCH=arm64; [ "$(uname -m)" = x86_64 ] && ARCH=x64
    [ -n "$DART_VERSION" ] || { echo "error: could not read the Dart version of $FLUTTER_ROOT_DIR"; exit 1; }
    rm -rf "$FIXED"; cp -cR "$FLUTTER_ROOT_DIR" "$FIXED" || { echo "error: could not copy $FLUTTER_ROOT_DIR"; exit 1; }
    TMPZ="$(mktemp -d)"
    curl -fL -o "$TMPZ/dart.zip" "https://storage.googleapis.com/dart-archive/channels/stable/release/$DART_VERSION/sdk/dartsdk-macos-$ARCH-release.zip" || { echo "error: could not download Dart $DART_VERSION"; exit 1; }
    unzip -q -o "$TMPZ/dart.zip" 'dart-sdk/bin/snapshots/gen_kernel_aot.dart.snapshot' -d "$TMPZ" && \
      cp "$TMPZ/dart-sdk/bin/snapshots/gen_kernel_aot.dart.snapshot" "$FIXED/$SNAP_REL" || { echo "error: could not take the snapshot from the Dart SDK"; exit 1; }
    rm -rf "$TMPZ"
  fi
  FLUTTER="$FIXED/bin/flutter"
  echo "      using the repaired Flutter at $FIXED"
fi

# --- 1. the stack -----------------------------------------------------------------------------------------------------------
echo "[1/3] starting the emulators, gateway, demo school and the two web apps (log: $LOGS/stack.log)..."
bash tools/demo-stack.sh >"$LOGS/stack.log" 2>&1 &
STACK_PID=$!
for _ in $(seq 1 240); do
  kill -0 "$STACK_PID" 2>/dev/null || { echo "the stack stopped:"; tail -15 "$LOGS/stack.log"; exit 1; }
  grep -q "Press Ctrl-C to stop everything" "$LOGS/stack.log" && break
  sleep 1
done
grep -q "Press Ctrl-C to stop everything" "$LOGS/stack.log" || { echo "the stack did not come up in time:"; tail -15 "$LOGS/stack.log"; exit 1; }
curl -sf "$GATEWAY/v1/public/schools/by-subdomain/greenfield" >/dev/null || { echo "the demo school is not there: $LOGS/stack.log"; exit 1; }
echo "      gateway $GATEWAY, school http://greenfield.localhost:3102, owner app http://localhost:3101"

# --- 2. the simulator -------------------------------------------------------------------------------------------------------
echo "[2/3] booting the simulator..."
if [ -n "${SIM:-}" ]; then
  UDID="$(xcrun simctl list devices available | grep -F "$SIM" | head -1 | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')"
else
  UDID="$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}' | head -1)"
  [ -n "$UDID" ] || UDID="$(xcrun simctl list devices available | grep -E 'iPhone' | head -1 | grep -oE '[0-9A-F]{8}(-[0-9A-F]{4}){3}-[0-9A-F]{12}')"
fi
[ -n "$UDID" ] || { echo "error: no iOS simulator found (install one in Xcode > Settings > Platforms)"; exit 1; }
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
open -a Simulator
echo "      simulator $UDID"

# --- 2b. clear what earlier runs left behind ---------------------------------------------------------------------------------
# The apps' build folders (iOS .app bundles and any APKs), Xcode's Runner build cache, and the four apps on the simulator.
# Everything here is rebuilt on demand and is not in git. It does not touch other projects, other simulators or Android emulators.
if [ -z "${KEEP_BUILDS:-}" ]; then
  before=$(df -k / | awk 'NR==2{print $4}')
  for d in apps/mobile-*; do rm -rf "$d/build"; done
  rm -rf "$HOME"/Library/Developer/Xcode/DerivedData/Runner-*
  for id in teacher staff parent driver; do xcrun simctl uninstall "$UDID" "com.oruschools.$id" >/dev/null 2>&1; done
  after=$(df -k / | awk 'NR==2{print $4}')
  echo "      cleared old builds, freed about $(( (after - before) / 1024 )) MB"
fi

# --- 3. the apps ------------------------------------------------------------------------------------------------------------
echo "[3/3] building and installing the apps (the first build of each takes a few minutes)..."
FAILED=""
for app in $APPS; do
  dir="apps/mobile-$app"
  [ -d "$dir" ] || { echo "      $app: no such app ($dir)"; FAILED="$FAILED $app"; continue; }
  echo "      $app: building..."
  (
    cd "$dir" && "$FLUTTER" pub get >/dev/null &&
      "$FLUTTER" build ios --simulator --debug \
        --dart-define=ORU_GATEWAY_URL="$GATEWAY" --dart-define=ORU_AUTH_EMULATOR="$AUTH"
  ) >"$LOGS/build-$app.log" 2>&1 || { echo "      $app: BUILD FAILED (see $LOGS/build-$app.log)"; FAILED="$FAILED $app"; continue; }
  bundle="$(grep -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]*' "$dir/ios/Runner.xcodeproj/project.pbxproj" | awk '{print $3}' | grep -v RunnerTests | head -1)"
  xcrun simctl install "$UDID" "$dir/build/ios/iphonesimulator/Runner.app" >>"$LOGS/build-$app.log" 2>&1 || { echo "      $app: install failed (see $LOGS/build-$app.log)"; FAILED="$FAILED $app"; continue; }
  echo "      $app: installed ($bundle)"
  if [ "$app" = "$LAUNCH" ]; then xcrun simctl launch "$UDID" "$bundle" >/dev/null 2>&1 && echo "      $app: launched"; fi
done

if [ -z "${NO_WEB:-}" ]; then
  open "http://greenfield.localhost:3102" 2>/dev/null
  open "http://localhost:3101" 2>/dev/null
fi

echo
echo "Ready. Sign in with teacher@demo.oruschools.example (Teacher app), hr@demo.oruschools.example (Staff app),"
echo "principal@demo.oruschools.example (web), owner@demo.oruschools.example (owner app); password demo-pass-2027."
[ -n "$FAILED" ] && echo "These apps did not install:$FAILED (logs in $LOGS)"
echo "Logs: $LOGS. Press Ctrl-C to stop everything."
wait "$STACK_PID"
