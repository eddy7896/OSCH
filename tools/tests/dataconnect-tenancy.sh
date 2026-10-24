#!/usr/bin/env bash
# Database-level tenant isolation tests for the Data Connect connector (E-TEN schema layer).
# Starts the Data Connect emulator (PGlite; no Java/Cloud SQL needed), runs operations as admin, stops it.
# Idempotent: every run uses fresh random ids, so it works against a persistent local DB.
#   npm run test:dataconnect
set -u
cd "$(dirname "$0")/../.."
PROJECT=demo-oruschools
export FIREBASE_DATA_CONNECT_EMULATOR_HOST=127.0.0.1:9399   # host:port only; `emulators:exec` sets it WITH a scheme, which the CLI double-prefixes
LOG="$(mktemp -t dc-emulator.XXXXXX)"
npx firebase emulators:start --only dataconnect --project "$PROJECT" >"$LOG" 2>&1 &
EMU=$!
cleanup() { kill "$EMU" 2>/dev/null; pkill -f dataconnect-emulator 2>/dev/null; true; }
trap cleanup EXIT

for _ in $(seq 1 240); do grep -q "All emulators ready" "$LOG" && break; sleep 1; done
annotate() { [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=dataconnect-test::$(printf '%s' "$1" | tr '\n' '|' | cut -c1-1500)"; true; }   # readable via the check-runs API without admin rights
grep -q "All emulators ready" "$LOG" || { echo "emulator did not start:"; tail -20 "$LOG"; annotate "emulator did not start: $(tail -12 "$LOG")"; exit 2; }

M=dataconnect/erp-connector/mutations.gql; Q=dataconnect/erp-connector/queries.gql
# CI sets FORCE_COLOR, which puts escape codes in the CLI output and breaks the ^Error: / code matching; strip them
run() { NO_COLOR=1 FORCE_COLOR=0 npx firebase dataconnect:execute --project "$PROJECT" --no-debug-details "$@" 2>&1 | sed $'s/\x1b\\[[0-9;]*m//g'; }
uid() { node -e 'console.log(crypto.randomUUID())'; }   # portable: uuidgen is not installed everywhere
A=$(uid); B=$(uid); TAG=$(echo "$A" | cut -c1-8)
PASS=0; FAIL=0
ok()  { echo "PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "FAIL  $1"; FAIL=$((FAIL+1)); [ "$FAIL" -le 3 ] && annotate "FAIL $1"; true; }
succeeded() { ! grep -q -E '^Error:' <<<"$1"; }                       # CLI prints "Error: ..." when ANY error occurred
check_ok()  { if succeeded "$2"; then ok "$1"; else bad "$1 :: $(grep -m1 -E '"message"|^Error' <<<"$2" | cut -c1-160)"; fi; }
check_rejected() { if ! succeeded "$2" && grep -q -E "$3" <<<"$2"; then ok "$1"; else bad "$1 :: expected rejection matching /$3/ got: $(tr '\n' ' ' <<<"$2" | cut -c1-200)"; fi; }
check_has() { if grep -q -F "$3" <<<"$2"; then ok "$1"; else bad "$1 :: missing '$3'"; fi; }
check_lacks() { if grep -q -F "$3" <<<"$2"; then bad "$1 :: unexpectedly contains '$3'"; else ok "$1"; fi; }
first_id() { grep -o '"id": *"[^"]*"' <<<"$1" | head -1 | sed 's/.*: *"\(.*\)"/\1/'; }

out=$(run "$M" CreateSchool --vars "{\"id\":\"$A\",\"name\":\"School A\",\"subDomain\":\"a-$TAG\"}"); check_ok "create school A" "$out"
out=$(run "$M" CreateSchool --vars "{\"id\":\"$B\",\"name\":\"School B\",\"subDomain\":\"b-$TAG\"}"); check_ok "create school B" "$out"
out=$(run "$M" CreateUser --vars "{\"id\":\"u-$TAG\",\"email\":\"$TAG@example.com\",\"globalRole\":\"USER\"}"); check_ok "create user (enum GlobalRole)" "$out"
out=$(run "$M" CreateSchoolMember --vars "{\"schoolId\":\"$A\",\"userId\":\"u-$TAG\",\"schoolRole\":\"PRINCIPAL\"}"); check_ok "create membership (enum SchoolRole)" "$out"
SID=$(uid); out=$(run "$M" CreateStudent --vars "{\"schoolId\":\"$A\",\"id\":\"$SID\",\"expectedSeq\":0,\"enrollmentId\":\"E-$TAG\",\"firstName\":\"Aarav\",\"lastName\":\"Mehta\",\"actorId\":\"u-$TAG\"}"); check_ok "create student in A" "$out"
out=$(run "$Q" ListStudents --vars "{\"schoolId\":\"$A\",\"limit\":50,\"offset\":0}"); grep -q "Aarav" <<<"$out" && ok "A lists its student" || bad "A lists no student"
out=$(run "$Q" ListStudents --vars "{\"schoolId\":\"$B\",\"limit\":50,\"offset\":0}"); check_lacks "B cannot list A's student" "$out" "Aarav"

out=$(run "$M" CreateInvoice --vars "{\"schoolId\":\"$A\",\"id\":\"$(uid)\",\"studentId\":\"$SID\",\"title\":\"Fee\",\"actorId\":\"u-$TAG\",\"amountMinor\":\"1240000\",\"dueDate\":\"2026-11-01\"}"); check_ok "invoice for A's student billed to A" "$out"
out=$(run "$Q" ListInvoices --vars "{\"schoolId\":\"$A\",\"limit\":50,\"offset\":0}"); check_has "A sees its invoice in minor units" "$out" "1240000"
[ "$(grep -c '"amountMinor"' <<<"$out")" = "1" ] && ok "exactly one invoice exists for A (the rejected one wrote nothing)" || bad "unexpected invoice count for A"
out=$(run "$Q" ListInvoices --vars "{\"schoolId\":\"$B\",\"limit\":50,\"offset\":0}"); check_lacks "B sees none of A's invoices" "$out" "amountMinor"
out=$(run "$M" CreateInvoice --vars "{\"schoolId\":\"$A\",\"id\":\"$(uid)\",\"title\":\"Fee\",\"actorId\":\"u-$TAG\",\"studentId\":\"00000000-0000-4000-8000-000000000000\",\"amountMinor\":\"1\",\"dueDate\":\"2026-11-01\"}"); check_rejected "invoice for a non-existent student is ABORTED" "$out" "ABORTED"

out=$(run "$M" CreateLeaveRequest --vars "{\"schoolId\":\"$A\",\"userId\":\"u-$TAG\",\"startDate\":\"2026-11-02\",\"endDate\":\"2026-11-03\",\"reason\":\"x\"}"); check_ok "create leave in A" "$out"
out=$(run "$Q" ListLeaveRequests --vars "{\"schoolId\":\"$A\"}"); LID=$(first_id "$out"); check_has "leave defaults to PENDING" "$out" "PENDING"
run "$M" UpdateLeaveRequest --vars "{\"schoolId\":\"$B\",\"id\":\"$LID\",\"status\":\"APPROVED\"}" >/dev/null
out=$(run "$Q" ListLeaveRequests --vars "{\"schoolId\":\"$A\"}"); check_has "cross-tenant leave update had NO effect" "$out" "PENDING"; check_lacks "cross-tenant leave NOT approved" "$out" "APPROVED"
run "$M" UpdateLeaveRequest --vars "{\"schoolId\":\"$A\",\"id\":\"$LID\",\"status\":\"APPROVED\"}" >/dev/null
out=$(run "$Q" ListLeaveRequests --vars "{\"schoolId\":\"$A\"}"); check_has "same-tenant leave update applied" "$out" "APPROVED"

out=$(run "$M" CreateAuditLog --vars "{\"actorId\":\"u-$TAG\",\"action\":\"school.create\",\"entityType\":\"School\",\"entityId\":\"$A\",\"details\":{\"note\":\"platform action\"}}"); check_ok "audit log accepts a null school (platform action)" "$out"
out=$(run "$M" CreateAuditLog --vars "{\"schoolId\":\"$A\",\"actorId\":\"u-$TAG\",\"action\":\"invoice.create\",\"entityType\":\"Invoice\"}"); check_ok "audit log accepts a school-scoped entry" "$out"
out=$(run "$M" CreateUser --vars "{\"id\":\"bad-$TAG\",\"email\":\"bad$TAG@example.com\",\"globalRole\":\"ROOT\"}"); check_rejected "invalid GlobalRole value is rejected" "$out" "INVALID_ARGUMENT"
out=$(run "$M" CreateSchoolMember --vars "{\"schoolId\":\"$A\",\"userId\":\"u-$TAG\",\"schoolRole\":\"SUPERUSER\"}"); check_rejected "invalid SchoolRole value is rejected" "$out" "INVALID_ARGUMENT"

# ---- Cross-tenant REFERENCES: a school must not attach another school's classroom/subject/user to its own rows. ----
UB="ub-$TAG"
out=$(run "$M" CreateUser --vars "{\"id\":\"$UB\",\"email\":\"ub$TAG@example.com\",\"globalRole\":\"USER\"}"); check_ok "create user that belongs to school B only" "$out"
out=$(run "$M" CreateSchoolMember --vars "{\"schoolId\":\"$B\",\"userId\":\"$UB\",\"schoolRole\":\"TEACHER\"}"); check_ok "make that user a member of B" "$out"
out=$(run "$M" CreateInvoice --vars "{\"schoolId\":\"$B\",\"id\":\"$(uid)\",\"studentId\":\"$SID\",\"title\":\"Fee\",\"actorId\":\"$UB\",\"amountMinor\":\"999\",\"dueDate\":\"2026-11-01\"}"); check_rejected "invoice for A's student billed to B is ABORTED" "$out" "ABORTED"
GLA=$(uid); GLB=$(uid)
out=$(run "$M" CreateGradeLevel --vars "{\"schoolId\":\"$A\",\"id\":\"$GLA\",\"name\":\"10-$TAG\",\"position\":10,\"actorId\":\"u-$TAG\"}"); check_ok "class level in A" "$out"
out=$(run "$M" CreateGradeLevel --vars "{\"schoolId\":\"$B\",\"id\":\"$GLB\",\"name\":\"10-$TAG\",\"position\":10,\"actorId\":\"$UB\"}"); check_ok "class level in B" "$out"
CA=$(uid); out=$(run "$M" CreateClassroom --vars "{\"schoolId\":\"$A\",\"id\":\"$CA\",\"gradeLevelId\":\"$GLA\",\"section\":\"A\",\"name\":\"ClassA-$TAG\",\"capacity\":30,\"actorId\":\"u-$TAG\"}"); check_ok "classroom in A" "$out"
CB=$(uid); out=$(run "$M" CreateClassroom --vars "{\"schoolId\":\"$B\",\"id\":\"$CB\",\"gradeLevelId\":\"$GLB\",\"section\":\"A\",\"name\":\"ClassB-$TAG\",\"capacity\":30,\"actorId\":\"$UB\"}"); check_ok "classroom in B" "$out"
SA=$(uid); out=$(run "$M" CreateSubject --vars "{\"schoolId\":\"$A\",\"id\":\"$SA\",\"name\":\"SubjA-$TAG\",\"code\":\"SA\",\"actorId\":\"u-$TAG\"}"); check_ok "subject in A" "$out"
SB=$(uid); out=$(run "$M" CreateSubject --vars "{\"schoolId\":\"$B\",\"id\":\"$SB\",\"name\":\"SubjB-$TAG\",\"code\":\"SB\",\"actorId\":\"$UB\"}"); check_ok "subject in B" "$out"
sched() { run "$M" CreateSchedule --vars "{\"schoolId\":\"$A\",\"classroomId\":\"$1\",\"subjectId\":\"$2\",\"teacherId\":\"$3\",\"dayOfWeek\":\"MONDAY\",\"startTime\":\"09:00\",\"endTime\":\"10:00\"}"; }
exam()  { run "$M" CreateExam --vars "{\"schoolId\":\"$A\",\"classroomId\":\"$1\",\"subjectId\":\"$2\",\"title\":\"T\",\"examDate\":\"2026-12-01\",\"maxScore\":50}"; }
check_ok       "schedule with A's classroom, A's subject, A's teacher" "$(sched "$CA" "$SA" "u-$TAG")"
check_rejected "schedule with B's classroom is ABORTED"          "$(sched "$CB" "$SA" "u-$TAG")" "ABORTED"
check_rejected "schedule with B's subject is ABORTED"            "$(sched "$CA" "$SB" "u-$TAG")" "ABORTED"
check_rejected "schedule with a teacher from school B is ABORTED" "$(sched "$CA" "$SA" "$UB")" "ABORTED"
out=$(run "$Q" ListSchedules --vars "{\"schoolId\":\"$A\"}")
[ "$(grep -c '"dayOfWeek"' <<<"$out")" = "1" ] && ok "exactly one schedule exists for A (rejected ones wrote nothing)" || bad "unexpected schedule count"
check_lacks "A's schedule list never exposes B's classroom/subject names or B user's email" "$out" "ClassB-$TAG"; check_lacks "no B subject name" "$out" "SubjB-$TAG"; check_lacks "no B user email" "$out" "ub$TAG@example.com"
check_ok       "exam with A's classroom and subject" "$(exam "$CA" "$SA")"
check_rejected "exam with B's classroom is ABORTED" "$(exam "$CB" "$SA")" "ABORTED"
check_rejected "exam with B's subject is ABORTED"   "$(exam "$CA" "$SB")" "ABORTED"
out=$(run "$Q" ListExams --vars "{\"schoolId\":\"$A\"}"); [ "$(grep -c '"maxScore"' <<<"$out")" = "1" ] && ok "exactly one exam exists for A" || bad "unexpected exam count"
out=$(run "$M" CreateLeaveRequest --vars "{\"schoolId\":\"$A\",\"userId\":\"$UB\",\"startDate\":\"2026-11-05\",\"endDate\":\"2026-11-06\"}"); check_rejected "leave request for a non-member is ABORTED" "$out" "ABORTED"
out=$(run "$M" UpdateLeaveRequest --vars "{\"schoolId\":\"$A\",\"id\":\"$LID\",\"status\":\"APPROVED\",\"substituteId\":\"$UB\"}"); check_rejected "substitute from another school is ABORTED" "$out" "ABORTED"
out=$(run "$Q" ListLeaveRequests --vars "{\"schoolId\":\"$A\"}"); check_lacks "B user's email never attached as substitute" "$out" "ub$TAG@example.com"
out=$(run "$M" UpdateLeaveRequest --vars "{\"schoolId\":\"$A\",\"id\":\"$LID\",\"status\":\"APPROVED\",\"substituteId\":\"u-$TAG\"}"); check_ok "substitute who is a member of A is accepted" "$out"
out=$(run "$M" UpdateLeaveRequest --vars "{\"schoolId\":\"$A\",\"id\":\"$LID\",\"status\":\"REJECTED\"}"); check_ok "no substitute (null) is still allowed" "$out"

# ---- Every role in packages/rbac is a valid SchoolRole value (schema enum == rbac ROLES), and junk is rejected. ----
for R in PRINCIPAL MANAGEMENT BURSAR ACADEMIC_ADMIN SYSTEM_ADMIN HR_MANAGER ACCOUNTANT ADMISSIONS_OFFICER TRANSPORT_MANAGER OPERATIONS_MANAGER TEACHER STAFF DRIVER PARENT; do
  RU="r-$R-$TAG"
  run "$M" CreateUser --vars "{\"id\":\"$RU\",\"email\":\"$(echo "$R" | tr 'A-Z_' 'a-z-')-$TAG@example.com\",\"globalRole\":\"USER\"}" >/dev/null
  out=$(run "$M" CreateSchoolMember --vars "{\"schoolId\":\"$A\",\"userId\":\"$RU\",\"schoolRole\":\"$R\"}"); check_ok "membership with role $R is accepted" "$out"
done
out=$(run "$M" CreateSchoolMember --vars "{\"schoolId\":\"$A\",\"userId\":\"u-$TAG\",\"schoolRole\":\"HR\"}"); check_rejected "unknown role 'HR' is rejected (must be HR_MANAGER)" "$out" "INVALID_ARGUMENT"

echo; echo "RESULT: $PASS passed, $FAIL failed"
if [ "$FAIL" != "0" ]; then echo "--- emulator log (tail) ---"; tail -40 "$LOG"; annotate "emulator log: $(tail -8 "$LOG")"; fi
[ "$FAIL" = "0" ]
