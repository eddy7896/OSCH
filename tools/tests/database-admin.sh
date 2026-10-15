#!/usr/bin/env bash
# Runtime proof that the gateway's data layer works: packages/database talks to the Data Connect emulator through the
# generated Admin SDK, NO_ACCESS operations run as admin, and database aborts map to DatabaseError (P1-2b).
#   npm run test:database
set -u
cd "$(dirname "$0")/../.."
PROJECT=demo-oruschools
export DATA_CONNECT_EMULATOR_HOST=127.0.0.1:9399   # host:port only, no scheme
LOG="$(mktemp -t dc-emulator.XXXXXX)"
NO_COLOR=1 npx firebase emulators:start --only dataconnect --project "$PROJECT" >"$LOG" 2>&1 &
EMU=$!
cleanup() { kill "$EMU" 2>/dev/null; pkill -f dataconnect-emulator 2>/dev/null; true; }
trap cleanup EXIT
for _ in $(seq 1 240); do grep -q "All emulators ready" "$LOG" && break; sleep 1; done
if ! grep -q "All emulators ready" "$LOG"; then
  echo "emulator did not start:"; tail -20 "$LOG"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=database-admin::emulator did not start: $(tail -8 "$LOG" | tr '\n' '|' | cut -c1-1200)"
  exit 2
fi
npm run test:integration -w @oruschools/database
