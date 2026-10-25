#!/usr/bin/env node
// Makes a DEMO SCHOOL on your own machine, with people to sign in as, so you can click through the whole ERP: classes, students with
// guardians, staff and salaries, admissions at every stage, fee structures, invoices, payments (one reversed), receipts and a paid
// pay run. Everything goes through the REAL gateway, so the data obeys the same rules as real data.
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
  for (const p of Object.values(people).filter((x) => x.role && x.key !== "admin")) {
    const made = await call("POST", "/v1/memberships/accounts", { token: admin.token, school: sid, body: { displayName: p.name, email: p.email, schoolRole: p.role } });
    await auth.updateUser(made.userId, { password: DEMO_PHRASE, emailVerified: true });
    p.uid = made.userId;
    p.token = await signIn(p.email);
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
  for (const [name, code] of SUBJECTS) await call("POST", "/v1/academics/subjects", { ...as("academic"), body: { name, code } });
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
    staff.push(s);
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

  log(`\nDone. Sign in as any of these:\n\n${loginTable()}`);
} catch (e) {
  console.error(`\nerror: ${e.message}`);
  process.exit(1);
}
