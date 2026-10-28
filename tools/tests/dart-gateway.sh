#!/usr/bin/env bash
# The generated Dart client against the REAL gateway on the Auth and Data Connect EMULATORS with the demo school in them:
#   bash tools/tests/dart-gateway.sh
# Starts the emulators and the gateway (port 3200, so a demo on 3100 is left alone), seeds the demo school, runs
# packages/flutter-core/test/real_gateway_test.dart and packages/flutter-sync/test/real_gateway_sync_test.dart (the sync engine:
# E-SYNC-1 to E-SYNC-5) and packages/flutter-auth/test/real_auth_test.dart (device sign-in), and stops what it started. Local emulators only; it refuses to run
# if the emulator ports are taken (it would be talking to someone else's data).
set -u
set -o pipefail
cd "$(dirname "$0")/../.."
AUTH=127.0.0.1:9099
DC=127.0.0.1:9399
PORT=3200
LOGS="$(mktemp -d -t oru-dart-gw.XXXXXX)"
PIDS=()
# The firebase wrapper starts child processes that outlive its pid, so stop what listens on the ports this script took (it
# refused to start if any was already taken, so these are its own).
cleanup() {
  for p in ${PIDS[@]+"${PIDS[@]}"}; do kill "$p" 2>/dev/null; done
  for port in 9099 9399 4000 4400 4500 5433 $PORT; do lsof -ti ":$port" 2>/dev/null | xargs kill 2>/dev/null; done
  true
}
trap cleanup EXIT INT TERM
for port in 9099 9399 $PORT; do
  lsof -ti ":$port" >/dev/null 2>&1 && { echo "error: port $port is in use; stop what uses it and run again"; exit 1; }
done
rm -rf dataconnect/.dataconnect/pgliteData
NO_COLOR=1 npx firebase emulators:start --only dataconnect,auth --project demo-oruschools >"$LOGS/emulators.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 120); do grep -q "All emulators ready" "$LOGS/emulators.log" && break; sleep 1; done
grep -q "All emulators ready" "$LOGS/emulators.log" || { echo "the emulators did not start:"; tail -15 "$LOGS/emulators.log"; exit 1; }
npx turbo run build --filter=api-gateway >"$LOGS/build.log" 2>&1 || { tail -20 "$LOGS/build.log"; exit 1; }
(cd apps/api-gateway && PORT=$PORT NODE_ENV=development FIREBASE_AUTH_EMULATOR_HOST=$AUTH DATA_CONNECT_EMULATOR_HOST=$DC FIREBASE_PROJECT_ID=demo-oruschools GCLOUD_PROJECT=demo-oruschools GOOGLE_CLOUD_PROJECT=demo-oruschools \
  THROTTLE_LIMIT=2000 THROTTLE_STRICT_LIMIT=2000 node dist/main.js >"$LOGS/gateway.log" 2>&1) &
PIDS+=($!)
for _ in $(seq 1 60); do curl -s localhost:$PORT/health >/dev/null && break; sleep 1; done
curl -s localhost:$PORT/health >/dev/null || { echo "the gateway did not start:"; tail -15 "$LOGS/gateway.log"; exit 1; }
GATEWAY_URL=http://localhost:$PORT FIREBASE_AUTH_EMULATOR_HOST=$AUTH FIREBASE_PROJECT_ID=demo-oruschools GCLOUD_PROJECT=demo-oruschools GOOGLE_CLOUD_PROJECT=demo-oruschools \
  node tools/seed-demo-school.mjs >"$LOGS/seed.log" 2>&1 || { echo "the demo school could not be made:"; tail -15 "$LOGS/seed.log"; exit 1; }
if [ "${ORU_KEEP:-}" = 1 ]; then echo "ready: gateway http://localhost:$PORT, auth $AUTH (Ctrl-C stops)"; wait; fi
(cd packages/flutter-core && ORU_GATEWAY_URL=http://localhost:$PORT ORU_AUTH_EMULATOR=$AUTH flutter test test/real_gateway_test.dart)
STATUS=$?
(cd packages/flutter-sync && ORU_GATEWAY_URL=http://localhost:$PORT ORU_AUTH_EMULATOR=$AUTH flutter test test/real_gateway_sync_test.dart) || STATUS=$?
(cd packages/flutter-auth && ORU_GATEWAY_URL=http://localhost:$PORT ORU_AUTH_EMULATOR=$AUTH flutter test test/real_auth_test.dart) || STATUS=$?
echo "logs: $LOGS"
exit $STATUS
