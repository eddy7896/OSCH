#!/usr/bin/env bash
# Gateway integration tests against the REAL Firebase Auth and Data Connect emulators (no Java needed): real tokens through
# the real guards (P1-3a) and the cross-tenant / RBAC route matrix over the real database (P1-7).
#   npm run test:gateway
set -u
cd "$(dirname "$0")/../.."
PROJECT=demo-oruschools
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099   # host:port only, no scheme
export DATA_CONNECT_EMULATOR_HOST=127.0.0.1:9399
export ORU_REQUIRE_EMULATORS=1   # the harness must fail, never silently skip, if an emulator is missing
LOG="$(mktemp -t auth-emulator.XXXXXX)"
NO_COLOR=1 npx firebase emulators:start --only dataconnect,auth --project "$PROJECT" >"$LOG" 2>&1 &
EMU=$!
cleanup() { kill "$EMU" 2>/dev/null; pkill -f "emulators:start" 2>/dev/null; true; }
trap cleanup EXIT
for _ in $(seq 1 120); do grep -q "All emulators ready" "$LOG" && break; sleep 1; done
if ! grep -q "All emulators ready" "$LOG"; then
  echo "emulators did not start:"; tail -20 "$LOG"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=gateway-integration::emulators did not start: $(tail -8 "$LOG" | tr '\n' '|' | cut -c1-1200)"
  exit 2
fi
# The gateway imports workspace packages (database, rbac, ...) through their built output; a fresh checkout (CI) has none.
npx turbo run build --filter='api-gateway^...' || exit 1
npm run test:integration -w api-gateway
