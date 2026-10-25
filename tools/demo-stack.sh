#!/usr/bin/env bash
# One command to click through a demo school on THIS machine, with nothing touching your real Firebase project:
#   npm run demo
# It starts the Firebase Auth and Data Connect EMULATORS, the gateway on port 3100 pointed at them, makes the demo school
# (tools/seed-demo-school.mjs) and starts web-admin on 3102 and saas-admin on 3101 pointed at the emulators. Ctrl-C stops it all.
# The emulators keep their data in memory only: stopping them throws the demo away; run this again for a fresh one.
#
# Next.js allows ONE dev server per app folder, so stop your normal `npm run dev` for web-admin and saas-admin first (the gateway on
# 3000 can stay: the demo gateway uses 3100). Your .env.local is not changed: values set here win over it for these processes only.
set -u
set -o pipefail
cd "$(dirname "$0")/.."
AUTH=127.0.0.1:9099
DC=127.0.0.1:9399
LOGS="$(mktemp -d -t oru-demo.XXXXXX)"
PIDS=()
cleanup() {
  echo; echo "stopping the demo..."
  for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null; done
  pkill -f "emulators:start --only dataconnect,auth --project demo-oruschools" 2>/dev/null
  for port in 3100 3101 3102; do lsof -ti ":$port" 2>/dev/null | xargs kill 2>/dev/null; done
  true
}
trap cleanup EXIT INT TERM

for port in 3100 3101 3102 9099 9399; do
  if lsof -ti ":$port" >/dev/null 2>&1; then
    echo "error: port $port is already in use. Stop whatever uses it (for web-admin and saas-admin: your normal dev servers, which share a folder with the demo ones) and run again."
    exit 1
  fi
done

echo "starting the emulators..."
rm -rf dataconnect/.dataconnect/pgliteData   # the emulator's own scratch data, never your real database
NO_COLOR=1 npx firebase emulators:start --only dataconnect,auth --project demo-oruschools >"$LOGS/emulators.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 1 120); do grep -q "All emulators ready" "$LOGS/emulators.log" && break; sleep 1; done
grep -q "All emulators ready" "$LOGS/emulators.log" || { echo "the emulators did not start:"; tail -15 "$LOGS/emulators.log"; exit 1; }

echo "building and starting the gateway on 3100..."
npx turbo run build --filter=api-gateway >"$LOGS/build.log" 2>&1 || { tail -20 "$LOGS/build.log"; exit 1; }
(cd apps/api-gateway && PORT=3100 NODE_ENV=development FIREBASE_AUTH_EMULATOR_HOST=$AUTH DATA_CONNECT_EMULATOR_HOST=$DC FIREBASE_PROJECT_ID=demo-oruschools GCLOUD_PROJECT=demo-oruschools GOOGLE_CLOUD_PROJECT=demo-oruschools \
  THROTTLE_LIMIT=2000 THROTTLE_STRICT_LIMIT=2000 CORS_ORIGINS="http://localhost:3101,http://*.localhost:3102" node dist/main.js >"$LOGS/gateway.log" 2>&1) &
PIDS+=($!)
for _ in $(seq 1 60); do curl -s localhost:3100/health >/dev/null && break; sleep 1; done
curl -s localhost:3100/health >/dev/null || { echo "the gateway did not start:"; tail -15 "$LOGS/gateway.log"; exit 1; }

echo "making the demo school..."
# Whatever project your shell or .env.local names, the emulators run as demo-oruschools: say so for every process that talks to them.
GATEWAY_URL=http://localhost:3100 FIREBASE_AUTH_EMULATOR_HOST=$AUTH FIREBASE_PROJECT_ID=demo-oruschools GCLOUD_PROJECT=demo-oruschools GOOGLE_CLOUD_PROJECT=demo-oruschools \
  node tools/seed-demo-school.mjs 2>&1 | tee "$LOGS/seed.log" || { echo; echo "the demo school could not be made (see above; the log is $LOGS/seed.log). Nothing else was started."; exit 1; }
curl -sf localhost:3100/v1/public/schools/by-subdomain/greenfield >/dev/null || { echo "the demo school is not there after the seed ran: $LOGS/seed.log, $LOGS/gateway.log"; exit 1; }

DEMO_ENV=(NEXT_PUBLIC_API_URL=http://localhost:3100 NEXT_PUBLIC_FIREBASE_API_KEY=demo-not-a-real-key NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-oruschools NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=$AUTH NEXT_PUBLIC_BASE_DOMAIN=localhost)
(cd apps/web-admin && env "${DEMO_ENV[@]}" npx next dev -p 3102 >"$LOGS/web-admin.log" 2>&1) &
PIDS+=($!)
(cd apps/saas-admin && env "${DEMO_ENV[@]}" npx next dev -p 3101 >"$LOGS/saas-admin.log" 2>&1) &
PIDS+=($!)
echo
echo "The apps are starting (the first page takes a few seconds to compile)."
echo "  school:               http://greenfield.localhost:3102"
echo "  platform owner app:   http://localhost:3101"
echo "  logs:                 $LOGS"
echo "Press Ctrl-C to stop everything."
wait
