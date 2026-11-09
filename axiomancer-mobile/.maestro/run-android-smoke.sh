#!/usr/bin/env bash
# Installs the preview APK on the booted emulator and runs the Android smoke
# flow (phase LG1i). Called by .github/workflows/android-smoke.yml from inside
# the emulator action, whose `script:` runs each line on its own, so the whole
# run lives here as one call.
#
#   bash axiomancer-mobile/.maestro/run-android-smoke.sh <apk> <out dir>
#
# Writes into <out dir>: maestro.log (the flow log), report.xml (JUnit),
# shots/ (the flow's own screenshots, a pass shot included), debug/ (Maestro's
# debug output, with its screenshot of a failing step), logcat.txt, and
# failure.png (the screen when the flow failed). Exits with Maestro's status.
set -uo pipefail

apk="${1:?usage: run-android-smoke.sh <apk> <out dir>}"
out="${2:?usage: run-android-smoke.sh <apk> <out dir>}"
flow="$(cd "$(dirname "$0")" && pwd)/android-smoke.yaml"
mkdir -p "$out/shots" "$out/debug"

adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'
adb install -r -g "$apk" || { echo "::error::adb install failed for $apk"; exit 1; }

adb logcat -c || true
adb logcat -v time > "$out/logcat.txt" 2>&1 &
logcat_pid=$!

status=0
(
  cd "$out/shots" &&
  maestro test "$flow" \
    --format junit --output "$out/report.xml" \
    --debug-output "$out/debug"
) > "$out/maestro.log" 2>&1 || status=$?
cat "$out/maestro.log"

if [ "$status" -ne 0 ]; then
  adb exec-out screencap -p > "$out/failure.png" || true
  echo "::error::the android-smoke flow failed (exit $status): see the android-smoke artifact"
fi

kill "$logcat_pid" 2>/dev/null || true
exit "$status"
