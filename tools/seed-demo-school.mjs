#!/usr/bin/env node
// Makes a DEMO SCHOOL on your own machine, with people to sign in as, so you can click through the whole ERP: classes, students with
// guardians, staff and salaries, admissions at every stage, fee structures, invoices, payments (one reversed), receipts and a paid
// pay run, and the Phase 3 academic engine: bell schedule, timetable, a month of attendance, exams with marks and a report card, leave in every
// state, a substitution, and the notices they cause. Everything goes through the REAL gateway, so the data obeys the same rules as real data.
//
// LOCAL EMULATORS ONLY. Every demo account shares one password that is written down in the project hub, so this script REFUSES to
// run unless the Firebase Auth emulator is configured: it can never create those accounts in a real project.
//
//   1. npx firebase emulators:start --only dataconnect,auth --project demo-oruschools
//   2. the gateway with the emulators (one copy):
//        FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 DATA_CONNECT_EMULATOR_HOST=127.0.0.1:9399 FIREBASE_PROJECT_ID=demo-oruschools npm run start:dev -w api-gateway
//   3. FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tools/seed-demo-school.mjs
//   4. web-admin with NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (and a placeholder NEXT_PUBLIC_FIREBASE_API_KEY), open http://greenfield.localhost:3002
//
// Run again and it says the school already exists and prints the logins; stop the emulators to start over.
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  DEMO_PHRASE, DEMO_PEOPLE, DEMO_SCHOOL_NAME, DEMO_SUBDOMAIN, FIRST_NAMES, LAST_NAMES, LEVELS_WITH_CLASSES, METHODS, SECTIONS, STAFF, SUBJECTS,
  dobFor, loginTable, paymentPlan, payMonths, phoneFor, schoolYear, termAmount, termDates,
  exceptionFor, futureWorkingDay, marksText, markFor, pastWorkingDays, rotationSubject, schoolToday, thisMonthWorkingDay,
} from "./lib/demo-school.mjs";

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!AUTH_HOST) {
  console.error("error: this script only runs against the local Firebase Auth emulator (set FIREBASE_AUTH_EMULATOR_HOST, for example 127.0.0.1:9099).\nIt gives every demo account the same published password, so it must never touch a real project.");
  process.exit(2);
}
if (process.env.NODE_ENV === "production") {
  console.error("error: refusing to run with NODE_ENV=production.");
  process.exit(2);
}
const GATEWAY = (process.env.GATEWAY_URL ?? "http://localhost:3000").replace(/\/+$/, "");
// The emulators run as this project. NEVER take it from the environment: a shell that exports FIREBASE_PROJECT_ID=<your real project>
// would create the accounts under another project inside the emulator, where sign-in cannot find them ("could not find school").
const PROJECT = "demo-oruschools";
const auth = getAuth(getApps()[0] ?? initializeApp({ projectId: PROJECT }));
const log = (m) => console.log(m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(email) {
  // Changing a password revokes older tokens at the second it happens; wait it out so the new token is accepted.
  await sleep(1100);
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: DEMO_PHRASE, returnSecureToken: true }) });
  const body = await res.json();
  if (!body.idToken) throw new Error(`could not sign ${email} in: ${JSON.stringify(body).slice(0, 200)}`);
  return body.idToken;
}

/** One call to the gateway. Waits and retries when the per-user rate limit says slow down. */
async function call(method, path, { token, school, body, ok = [200, 201, 204] } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GATEWAY}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(school ? { "x-school-id": school } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 429 && attempt < 8) { await sleep(5000); continue; }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!ok.includes(res.status)) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
    return json;
  }
}

/** The bell schedule, teachers, timetable, a month of attendance, exams with marks and grade bands, leave in every state, a substitution and the notices they cause. */
/** Phase 5: transport (two buses, a morning and an afternoon route with stops, students seated) and a parent linked to one student who rides it. */
async function phase5({ as, students, staff, people }) {
  const driver = staff.find((s) => s.spec.account === "driver");
  const bus = await call("POST", "/v1/transport/vehicles", { ...as("transport"), body: { registration: "KA-01-AB-1234", label: "Bus 3", capacity: 40 } });
  const van = await call("POST", "/v1/transport/vehicles", { ...as("transport"), body: { registration: "KA-01-CD-5678", label: "Van 1", capacity: 14 } });
  const north = await call("POST", "/v1/transport/routes", { ...as("transport"), body: { name: "North loop", direction: "MORNING", startTime: "07:15", vehicleId: bus.id, driverId: driver.id } });
  const back = await call("POST", "/v1/transport/routes", { ...as("transport"), body: { name: "North loop, home", direction: "AFTERNOON", startTime: "15:30", vehicleId: bus.id, driverId: driver.id } });
  await call("POST", "/v1/transport/routes", { ...as("transport"), body: { name: "South loop", direction: "MORNING", startTime: "07:30", vehicleId: van.id } });
  const stops = (r, list) => call("PUT", `/v1/transport/routes/${r.id}/stops`, { ...as("transport"), body: { stops: list.map(([name, arrivalTime]) => ({ name, arrivalTime })) } });
  const northStops = await stops(north, [["Lake Road", "07:20"], ["Market", "07:35"], ["School gate", "07:50"]]);
  const backStops = await stops(back, [["School gate", "15:30"], ["Market", "15:45"], ["Lake Road", "16:00"]]);
  const seat = (s, r, stop) => call("PUT", `/v1/transport/students/${s.id}/seat`, { ...as("transport"), body: { routeId: r.id, stopId: stop.id } });
  for (const [i, s] of students.slice(0, 8).entries()) {
    await seat(s, north, northStops.stops[i % 2]);
    await seat(s, back, backStops.stops[1 + (i % 2)]);
  }
  // the parent of the first student (who is in the first class and so has attendance, a timetable and a seat)
  await call("POST", `/v1/students/${students[0].id}/parent-accounts`, { ...as("academic"), body: { userId: people.parent.uid, relationship: "MOTHER" } });
  log("Transport: 2 buses, 3 routes with stops, 8 students seated; a parent linked to one of them");
}

async function phase3({ as, classes, students, subjects, staff }) {
  const today = schoolToday();
  const academic = as("academic");
  const subjectId = new Map(subjects.map((s, i) => [SUBJECTS[i][1], s.id]));
  const byName = new Map(staff.map((s) => [`${s.firstName} ${s.lastName}`, s]));

  // ---- bell schedule, who teaches what, class teachers
  await call("POST", "/v1/academics/schedule/template", { ...academic, body: { template: "STANDARD" } });
  const schedule = await call("GET", "/v1/academics/schedule", academic);
  const periods = schedule.periods.filter((p) => !p.isBreak);
  const days = schedule.workingDays;
  const pool = new Map();
  for (const m of staff) for (const code of m.spec.teaches ?? []) {
    await call("POST", `/v1/academics/teachers/${m.id}/subjects`, { ...academic, body: { subjectId: subjectId.get(code) } });
    pool.set(code, [...(pool.get(code) ?? []), m.id]);
  }
  const classTeachers = ["Tara Teacher", "Sunita Rao", "Vikram Chopra", "Farida Begum", "Rekha Pillai"];
  for (const [i, who] of classTeachers.entries()) await call("PUT", `/v1/academics/classes/${classes[i].id}/teacher`, { ...academic, body: { staffId: byName.get(who).id } });
  log(`Bell schedule (${periods.length} teaching periods, ${days.length} days), teachers' subjects, ${classTeachers.length} class teachers`);

  // ---- a timetable for the first four classes: the rotation picks the subject, and the gateway refuses a clash, so the next teacher of the subject is tried
  let lessons = 0;
  for (const [ci, klass] of classes.slice(0, 4).entries())
    for (const [di, day] of days.entries())
      for (const [pi, period] of periods.entries()) {
        const code = SUBJECTS[rotationSubject(SUBJECTS.length, ci, di, pi)][1];
        for (const teacher of pool.get(code) ?? []) {
          const res = await call("PUT", `/v1/academics/timetable/classes/${klass.id}/slots`, { ...academic, body: { day, periodId: period.id, subjectId: subjectId.get(code), staffId: teacher }, ok: [200, 409] });
          if (res && !res.error) { lessons += 1; break; }
        }
      }
  log(`Timetable: ${lessons} lessons in 4 classes`);

  // ---- a month of attendance for the first four classes (school-wide: the Academic administrator). Older days are locked; one is corrected.
  const past = pastWorkingDays(today, 20);
  const roster = (k) => students.filter((_, i) => i % classes.length === k);
  for (const [k, klass] of classes.slice(0, 4).entries()) {
    const kids = roster(k);
    for (const [di, date] of past.entries()) {
      const marks = kids.flatMap((st, n) => { const status = exceptionFor(n + k * 10, di); return status ? [{ studentId: st.id, status }] : []; });
      await call("PUT", `/v1/attendance/classes/${klass.id}/days/${date}`, { ...academic, body: { marks, lock: di < past.length - 5 } });
    }
  }
  const fixed = roster(0);
  await call("PUT", `/v1/attendance/classes/${classes[0].id}/days/${past[0]}/correction`, { ...academic, body: { marks: [{ studentId: fixed[0].id, status: "EXCUSED", note: "Medical note brought the next day" }] } });
  for (const [i, m] of staff.slice(0, 6).entries())
    for (const [off, date] of [[1, past.at(-1)], [0, today]]) {
      if (off === 0 && i === 5) continue; // one person is not in today
      await call("PUT", `/v1/attendance/staff/${m.id}/days/${date}`, { ...as("hr"), body: { checkIn: `${date}T03:${String(30 + i * 3).padStart(2, "0")}:00.000Z`, ...(off === 1 || i % 2 ? { checkOut: `${date}T11:00:00.000Z` } : {}) } });
    }
  log(`Attendance: ${past.length} days for 4 classes (older days locked, one corrected), staff times for 2 days`);

  // ---- grade bands, two terms, exams with marks (one student absent, one not yet marked)
  const bands = await call("GET", "/v1/grades/bands", academic);
  await call("PUT", "/v1/grades/bands", { ...academic, body: { bands: bands.template } });
  const term1 = await call("POST", "/v1/grades/terms", { ...academic, body: { name: "Term 1" } });
  await call("POST", "/v1/grades/terms", { ...academic, body: { name: "Term 2" } });
  let examNo = 0;
  for (const [k, klass] of classes.slice(0, 3).entries())
    for (const [title, code, max] of [["Unit test 1", "MATH", "50"], ["Unit test 1", "ENG", "50"], ["Half yearly", "SCI", "100"]]) {
      const exam = await call("POST", "/v1/grades/exams", { ...academic, body: { termId: term1.id, classId: klass.id, subjectId: subjectId.get(code), title, examDate: past[2], maxMarks: max } });
      const entries = roster(k).flatMap((st, n) => { const m = markFor(n, examNo % 3, Number(max) * 10); return m === null ? [] : m.absent ? [{ studentId: st.id, absent: true }] : [{ studentId: st.id, marks: marksText(m.tenths) }]; });
      await call("PUT", `/v1/grades/exams/${exam.id}/marks`, { ...academic, body: { entries } });
      examNo += 1;
    }
  log(`Grade bands (standard set), 2 terms, ${examNo} exams with marks`);

  // ---- leave: types, then requests in every state
  const type = {};
  for (const [name, paid, quotaDays] of [["Casual", true, "12"], ["Sick", true, "7.5"], ["Unpaid", false, undefined]])
    type[name] = (await call("POST", "/v1/leave/types", { ...as("hr"), body: { name, paid, ...(quotaDays ? { quotaDays } : {}) } })).id;
  const ask = (who, name, startDate, endDate, extra = {}) => call("POST", "/v1/leave/requests", { ...as(who), body: { leaveTypeId: type[name], startDate, endDate, ...extra } });
  const D = (n) => futureWorkingDay(today, n);
  const approve = (r) => call("POST", `/v1/leave/requests/${r.id}/approve`, { ...as("principal"), body: {} });

  await approve(await ask("sunita", "Casual", past[10], past[11], { reason: "Family wedding" })); // approved, in the past: the balance went down
  const vikram = await ask("vikram", "Casual", D(3), D(3), { reason: "Court date" });
  await approve(vikram); // approved, in the future: the lessons that day need cover
  const farida = await ask("farida", "Unpaid", thisMonthWorkingDay(today), thisMonthWorkingDay(today), { reason: "Personal work" });
  await approve(farida); // approved unpaid leave: a deduction is proposed in this month's draft pay run
  await ask("sunita", "Casual", D(8), D(9), { reason: "Travel" }); // pending
  await ask("teacher", "Sick", D(5), D(5), { half: "MORNING", reason: "Doctor's appointment" }); // pending, half a day
  const rej = await ask("teacher", "Casual", past[14], past[14], { reason: "Shopping" });
  await call("POST", `/v1/leave/requests/${rej.id}/reject`, { ...as("principal"), body: { note: "Examinations that day" } });
  const cancelled = await ask("teacher", "Casual", D(12), D(12));
  await call("POST", `/v1/leave/requests/${cancelled.id}/cancel`, as("teacher"));
  log("Leave: 3 types, requests approved (past, future, unpaid), pending, a half day, rejected and cancelled");

  // ---- substitution: the first lesson of Vikram's leave day gets a cover, the rest wait for the Academic administrator
  const needs = await call("GET", `/v1/substitutions/needs?from=${D(3)}&to=${D(3)}`, academic);
  if (needs.items.length > 0) {
    const first = needs.items[0];
    const sug = await call("GET", `/v1/substitutions/suggestions?entryId=${first.slot.entryId}&date=${first.date}`, academic);
    if (sug.candidates[0]) await call("PUT", "/v1/substitutions", { ...academic, body: { entryId: first.slot.entryId, date: first.date, substituteStaffId: sug.candidates[0].staff.id } });
  }
  log(`Substitution board: ${needs.items.length} lessons need cover on ${D(3)}, 1 chosen`);
}

try {
  const health = await fetch(`${GATEWAY}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`the gateway is not answering at ${GATEWAY}. Start it with the emulators (see the top of this file).`);

  const existing = await fetch(`${GATEWAY}/v1/public/schools/by-subdomain/${DEMO_SUBDOMAIN}`);
  if (existing.ok) {
    log(`The demo school already exists (${DEMO_SUBDOMAIN}). Nothing was changed.\n\n${loginTable()}`);
    process.exit(0);
  }

  // ---- the platform owner, the school, and the first System administrator
  const people = Object.fromEntries(DEMO_PEOPLE.map((p) => [p.key, { ...p }]));
  const owner = people.owner;
  const ownerUser = await auth.createUser({ email: owner.email, password: DEMO_PHRASE, emailVerified: true, displayName: owner.name }).catch(async (e) => (e.code === "auth/email-already-exists" ? auth.getUserByEmail(owner.email) : Promise.reject(e)));
  await auth.setCustomUserClaims(ownerUser.uid, { globalRole: "SUPER_ADMIN" });
  owner.uid = ownerUser.uid;
  owner.token = await signIn(owner.email);

  const school = await call("POST", "/v1/platform/schools", { token: owner.token, body: { name: DEMO_SCHOOL_NAME, subDomain: DEMO_SUBDOMAIN, defaultLanguage: "en" } });
  const sid = school.id;
  log(`School created: ${school.name} (${DEMO_SUBDOMAIN})`);
  const admin = people.admin;
  const first = await call("POST", `/v1/platform/schools/${sid}/admins`, { token: owner.token, body: { displayName: admin.name, email: admin.email } });
  await auth.updateUser(first.userId, { password: DEMO_PHRASE, emailVerified: true });
  admin.uid = first.userId;
  admin.token = await signIn(admin.email);

  // ---- everyone else, through the System administrator's account endpoint
  for (const p of Object.values(people).filter((x) => x.role && x.key !== "admin" && x.via !== "invitation")) {
    const made = await call("POST", "/v1/memberships/accounts", { token: admin.token, school: sid, body: { displayName: p.name, email: p.email, schoolRole: p.role } });
    await auth.updateUser(made.userId, { password: DEMO_PHRASE, emailVerified: true });
    p.uid = made.userId;
    p.token = await signIn(p.email);
  }
  // A parent cannot be made by the System Admin's account route (ADR-0011): the parent has their own sign-in and accepts an invitation, as a real parent would.
  for (const p of Object.values(people).filter((x) => x.via === "invitation")) {
    const user = await auth.createUser({ email: p.email, password: DEMO_PHRASE, emailVerified: true, displayName: p.name });
    p.uid = user.uid;
    const inv = await call("POST", "/v1/invitations", { token: admin.token, school: sid, body: { email: p.email, schoolRole: p.role } });
    p.token = await signIn(p.email);
    await call("POST", "/v1/invitations/accept", { token: p.token, body: { token: inv.token } });
  }
  log(`${Object.keys(people).length} accounts ready`);
  const as = (key) => ({ token: people[key].token, school: sid });

  // ---- academics
  const yr = schoolYear();
  const year = await call("POST", "/v1/academics/years", { ...as("academic"), body: { name: yr.name, startDate: yr.startDate, endDate: yr.endDate } });
  await call("POST", `/v1/academics/years/${year.id}/activate`, { ...as("academic") });
  const levels = (await call("GET", "/v1/academics/levels", as("academic"))).items;
  const levelByName = new Map(levels.map((l) => [l.name, l]));
  const classes = [];
  for (const name of LEVELS_WITH_CLASSES)
    for (const section of SECTIONS) classes.push({ level: name, ...(await call("POST", "/v1/academics/classes", { ...as("academic"), body: { gradeLevelId: levelByName.get(name).id, section, capacity: 40 } })) });
  const subjects = [];
  for (const [name, code] of SUBJECTS) subjects.push(await call("POST", "/v1/academics/subjects", { ...as("academic"), body: { name, code } }));
  log(`Academic year ${yr.name}, ${classes.length} classes, ${SUBJECTS.length} subjects`);

  // ---- students with guardians, placed in classes
  const students = [];
  for (let i = 0; i < 30; i++) {
    const cls = classes[i % classes.length];
    const first = FIRST_NAMES[i % FIRST_NAMES.length], last = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const s = await call("POST", "/v1/students", { ...as("academic"), body: { firstName: first, lastName: last, gender: i % 2 ? "FEMALE" : "MALE", dateOfBirth: dobFor(cls.level, i), classroomId: cls.id, address: `${10 + i} Lake Road, Srinagar` } });
    students.push({ ...s, level: cls.level });
    await call("POST", `/v1/students/${s.id}/guardians`, { ...as("academic"), body: { name: `${i % 2 ? "Rekha" : "Suresh"} ${last}`, relationship: i % 2 ? "MOTHER" : "FATHER", phone: phoneFor(i), isPrimary: true } });
    if (i % 3 === 0) await call("POST", `/v1/students/${s.id}/guardians`, { ...as("academic"), body: { name: `${i % 2 ? "Anil" : "Sunita"} ${last}`, relationship: i % 2 ? "FATHER" : "MOTHER", phone: phoneFor(i + 500) } });
  }
  log(`${students.length} students with guardians`);

  // ---- admissions at every stage
  const apps = [];
  for (const [i, [fn, ln, lvl]] of [["Aanya", "Kapoor", "1"], ["Faiz", "Lone", "2"], ["Hiral", "Shah", "3"], ["Neel", "Bose", "1"]].entries())
    apps.push(await call("POST", "/v1/admissions", { ...as("admissions"), body: { firstName: fn, lastName: ln, gradeLevelId: levelByName.get(lvl).id, guardianName: `${fn === "Faiz" ? "Tariq" : "Mahesh"} ${ln}`, guardianRelationship: "FATHER", guardianPhone: phoneFor(900 + i), academicYearId: year.id } }));
  await call("POST", `/v1/admissions/${apps[1].id}/decision`, { ...as("admissions"), body: { status: "UNDER_REVIEW" } });
  await call("POST", `/v1/admissions/${apps[2].id}/decision`, { ...as("admissions"), body: { status: "ACCEPTED", note: "Seat confirmed" } });
  await call("POST", `/v1/admissions/${apps[3].id}/decision`, { ...as("admissions"), body: { status: "ACCEPTED" } });
  await call("POST", `/v1/admissions/${apps[3].id}/admit`, { ...as("admissions"), body: { classroomId: classes.find((c) => c.level === "1").id } });
  log("4 admission applications (submitted, under review, accepted, admitted)");

  // ---- staff and salaries
  const staff = [];
  for (const [i, m] of STAFF.entries()) {
    const s = await call("POST", "/v1/staff", { ...as("hr"), body: { firstName: m.firstName, lastName: m.lastName, department: m.department, designation: m.designation, phone: phoneFor(2000 + i), dateOfJoining: "2022-06-01" } });
    staff.push({ ...s, spec: m });
    if (m.account) await call("PUT", `/v1/staff/${s.id}/account`, { ...as("hr"), body: { userId: people[m.account].uid } }); // the person who signs in as this teacher
    await call("POST", `/v1/payroll/staff/${s.id}/salary-lines`, { ...as("hr"), body: { kind: "EARNING", name: "Basic pay", amountMinor: String(m.basic) } });
    await call("POST", `/v1/payroll/staff/${s.id}/salary-lines`, { ...as("hr"), body: { kind: "EARNING", name: "House rent allowance", amountMinor: String(Math.round(m.basic * 0.2)) } });
    if (i % 4 === 0) await call("POST", `/v1/payroll/staff/${s.id}/salary-lines`, { ...as("hr"), body: { kind: "DEDUCTION", name: "Advance recovery", amountMinor: "250000" } });
  }
  log(`${staff.length} staff with salaries`);

  // ---- fees: a structure per class level, two concessions, invoices up to today, payments
  const terms = termDates(yr.startYear);
  const items = new Map();
  for (const name of LEVELS_WITH_CLASSES) {
    const st = await call("POST", "/v1/fees/structures", { ...as("bursar"), body: { gradeLevelId: levelByName.get(name).id, academicYearId: year.id } });
    const tuition = await call("POST", `/v1/fees/structures/${st.id}/items`, { ...as("bursar"), body: { name: "Tuition", instalments: terms.map((d, n) => ({ label: `Term ${n + 1}`, amountMinor: termAmount(name), dueDate: d })) } });
    await call("POST", `/v1/fees/structures/${st.id}/items`, { ...as("bursar"), body: { name: "Annual charges", instalments: [{ label: "Annual", amountMinor: "600000", dueDate: terms[0] }] } });
    items.set(name, tuition);
  }
  await call("POST", "/v1/fees/concessions", { ...as("bursar"), body: { studentId: students[1].id, name: "Sibling concession", kind: "PERCENT", basisPoints: 1000 } });
  await call("POST", "/v1/fees/concessions", { ...as("bursar"), body: { studentId: students[4].id, name: "Staff child", kind: "FIXED", amountMinor: "50000" } });
  const today = new Date().toISOString().slice(0, 10);
  const gen = await call("POST", "/v1/fees/invoices/generate", { ...as("bursar"), body: { academicYearId: year.id, dueOnOrBefore: today } });
  log(`Fee structures, 2 concessions, ${gen.created} invoices`);

  const invoices = [];
  for (let page = 1; ; page++) {
    const r = await call("GET", `/v1/fees/invoices?page=${page}&pageSize=100`, as("accountant"));
    invoices.push(...r.items);
    if (invoices.length >= r.total) break;
  }
  let paid = 0, reversed = false;
  for (const [n, inv] of invoices.entries()) {
    const plan = paymentPlan(n);
    if (plan === "NONE") continue;
    const amount = plan === "FULL" ? BigInt(inv.outstandingMinor) : BigInt(inv.outstandingMinor) / 2n;
    if (amount <= 0n) continue;
    const when = inv.dueDate > today ? today : inv.dueDate;
    const r = await call("POST", `/v1/fees/invoices/${inv.id}/payments`, { ...as("accountant"), body: { amountMinor: String(amount), method: METHODS[n % METHODS.length], paidOn: when, ...(n % 4 === 1 ? { reference: `REF-${1000 + n}` } : {}) } });
    paid++;
    if (!reversed && n === 3) {
      await call("POST", `/v1/fees/payments/${r.payments[0].id}/reverse`, { ...as("bursar"), body: { reason: "Entered against the wrong child" } });
      reversed = true;
    }
  }
  log(`${paid} payments recorded (one reversed), receipts numbered`);

  // ---- payroll: last month approved and paid, this month a draft
  const pm = payMonths();
  const run = await call("POST", "/v1/payroll/runs", { ...as("hr"), body: pm.last });
  await call("POST", `/v1/payroll/runs/${run.id}/approve`, { ...as("principal"), body: {} });
  await call("POST", `/v1/payroll/runs/${run.id}/pay`, { ...as("bursar"), body: { reference: "NEFT-DEMO-1", paidOn: today } });
  await call("POST", "/v1/payroll/runs", { ...as("hr"), body: pm.current });
  log(`Pay run ${pm.last.month}/${pm.last.year} approved and paid; ${pm.current.month}/${pm.current.year} left as a draft`);

  // ======================================================== Phase 3: the academic engine
  await phase3({ as, classes, students, subjects, staff });
  await phase5({ as, students, staff, people });

  log(`\nDone. Sign in as any of these:\n\n${loginTable()}`);
} catch (e) {
  console.error(`\nerror: ${e.message}`);
  process.exit(1);
}
