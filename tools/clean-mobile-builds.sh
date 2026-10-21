#!/usr/bin/env bash
# Frees disk space used by test builds of the Flutter apps. Everything it removes is rebuilt on demand and is not in git.
# Usage: tools/clean-mobile-builds.sh [--deep]     (--deep also removes the apps' .dart_tool; run `flutter pub get` afterwards)
set -u
cd "$(dirname "$0")/.."
before=$(df -k / | awk 'NR==2{print $4}')
pkill -f qemu-system 2>/dev/null          # an Android emulator left running holds its disk image open
for d in apps/mobile-*; do
  rm -rf "$d/build"
  [ "${1:-}" = "--deep" ] && rm -rf "$d/.dart_tool"
done
rm -rf ~/Library/Developer/Xcode/DerivedData/Runner-*
for id in teacher staff parent driver; do xcrun simctl uninstall booted "com.oruschools.$id" 2>/dev/null; done
rm -rf ~/.android/avd/*.avd/snapshots     # the emulator's saved snapshots (several GB); the emulator still boots, just cold
after=$(df -k / | awk 'NR==2{print $4}')
echo "freed about $(( (after - before) / 1024 )) MB; free now $(df -h / | awk 'NR==2{print $4}')"
