#!/usr/bin/env bash
# Gateway integration tests against the real Firebase Auth emulator (no Java needed): the real AuthGuard and Admin SDK
# verifying emulator-issued tokens (P1-3a). Later milestones add the Data Connect emulator to the same run.
#   npm run test:gateway
set -u
cd "$(dirname "$0")/../.."
PROJECT=demo-oruschools
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099   # host:port only, no scheme
LOG="$(mktemp -t auth-emulator.XXXXXX)"
NO_COLOR=1 npx firebase emulators:start --only auth --project "$PROJECT" >"$LOG" 2>&1 &
EMU=$!
cleanup() { kill "$EMU" 2>/dev/null; pkill -f "emulators:start" 2>/dev/null; true; }
trap cleanup EXIT
for _ in $(seq 1 120); do grep -q "All emulators ready" "$LOG" && break; sleep 1; done
if ! grep -q "All emulators ready" "$LOG"; then
  echo "auth emulator did not start:"; tail -20 "$LOG"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=gateway-integration::auth emulator did not start: $(tail -8 "$LOG" | tr '\n' '|' | cut -c1-1200)"
  exit 2
fi
# The gateway imports @oruschools/database through its built output; a fresh checkout (CI) has none.
npm run build -w @oruschools/database --silent || exit 1
npm run test:integration -w api-gateway
