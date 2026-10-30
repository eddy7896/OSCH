// Pure data and date rules for the demo school (tools/seed-demo-school.mjs). No network here, so the evals can test it.

/**
 * The one shared sign-in phrase of every demo account. It is deliberately PUBLIC (it is written in the project hub and the docs), so it is
 * not a secret and is not named like one. It is safe ONLY because the seed script refuses to run anywhere but the local emulators.
 */
export const DEMO_PHRASE = "demo-pass-2027"; // ggignore: a public demo value for local emulators, not a credential
export const DEMO_SUBDOMAIN = "greenfield";
export const DEMO_SCHOOL_NAME = "Greenfield Demo School";
const DOMAIN = "demo.oruschools.example";

/** Who can sign in, and as what. `role` is a school role, or null for the platform owner. */
export const DEMO_PEOPLE = [
  { key: "owner", role: null, name: "Olivia Owner", where: "saas-admin (the platform owner's app)" },
  { key: "admin", role: "SYSTEM_ADMIN", name: "Asha Admin", where: "web-admin" },
  { key: "principal", role: "PRINCIPAL", name: "Priya Principal", where: "web-admin" },
  { key: "management", role: "MANAGEMENT", name: "Manoj Management", where: "web-admin" },
  { key: "bursar", role: "BURSAR", name: "Bhavna Bursar", where: "web-admin" },
  { key: "accountant", role: "ACCOUNTANT", name: "Arjun Accountant", where: "web-admin" },
  { key: "academic", role: "ACADEMIC_ADMIN", name: "Anita Academic", where: "web-admin" },
  { key: "hr", role: "HR_MANAGER", name: "Hema HR", where: "web-admin" },
  { key: "admissions", role: "ADMISSIONS_OFFICER", name: "Imran Admissions", where: "web-admin" },
  { key: "teacher", role: "TEACHER", name: "Tara Teacher", where: "web-admin (shows the mobile-app notice; her leave and timetable are in the data)" },
  { key: "sunita", role: "TEACHER", name: "Sunita Rao", where: "web-admin (a teacher with leave asked for)" },
  { key: "vikram", role: "TEACHER", name: "Vikram Chopra", where: "web-admin (a teacher whose approved leave needs cover)" },
  { key: "farida", role: "TEACHER", name: "Farida Begum", where: "web-admin (a teacher with approved unpaid leave)" },
  { key: "transport", role: "TRANSPORT_MANAGER", name: "Tarun Transport", where: "web-admin (vehicles, routes, stops, seating students)" },
  { key: "driver", role: "DRIVER", name: "Salim Dar", where: "the Driver app (when built); the driver of the North loop" },
  { key: "parent", role: "PARENT", via: "invitation", name: "Parvati Rao", where: "the Parent app: the parent of one student, who rides the North loop" },
  { key: "office", role: "STAFF", name: "Geeta Kulkarni", where: "the Staff app (the clerk who is not checked in today)" },
].map((p) => ({ ...p, email: `${p.key}@${DOMAIN}` }));

export const FIRST_NAMES = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Meera", "Rohan", "Sana", "Kabir", "Ishita", "Aditya", "Zoya", "Reyansh", "Kavya", "Ayaan", "Riya", "Vivaan", "Nisha", "Dev", "Tanvi", "Imran", "Pooja", "Yash", "Farah", "Rahul", "Lakshmi", "Omar", "Neha", "Karan", "Aisha"];
export const LAST_NAMES = ["Sharma", "Khan", "Patel", "Iyer", "Nair", "Singh", "Menon", "Reddy", "Gupta", "Ahmed", "Das", "Joshi", "Bhat", "Dar", "Verma"];
/** `account` is the demo person who signs in as this member of staff; `teaches` are subject codes. */
export const STAFF = [
  { firstName: "Sunita", lastName: "Rao", department: "Science", designation: "Teacher", basic: 4600000, account: "sunita", teaches: ["SCI"] },
  { firstName: "Vikram", lastName: "Chopra", department: "Mathematics", designation: "Teacher", basic: 4400000, account: "vikram", teaches: ["MATH"] },
  { firstName: "Farida", lastName: "Begum", department: "Languages", designation: "Teacher", basic: 4200000, account: "farida", teaches: ["ENG", "HIN"] },
  { firstName: "Tara", lastName: "Teacher", department: "Mathematics", designation: "Teacher", basic: 4500000, account: "teacher", teaches: ["MATH", "ART"] },
  { firstName: "Joseph", lastName: "Mathew", department: "Science", designation: "Lab assistant", basic: 2600000 },
  { firstName: "Geeta", lastName: "Kulkarni", department: "Office", designation: "Clerk", basic: 2800000, account: "office" },
  { firstName: "Mohan", lastName: "Lal", department: "Support", designation: "Peon", basic: 1800000 },
  { firstName: "Rekha", lastName: "Pillai", department: "Languages", designation: "Teacher", basic: 4300000, teaches: ["HIN", "SST"] },
  { firstName: "Salim", lastName: "Dar", department: "Transport", designation: "Driver", basic: 2200000, account: "driver" },
];
export const SUBJECTS = [["Mathematics", "MATH"], ["English", "ENG"], ["Hindi", "HIN"], ["Science", "SCI"], ["Social Studies", "SST"], ["Art", "ART"]];
export const LEVELS_WITH_CLASSES = ["1", "2", "3", "4", "5"];
export const SECTIONS = ["A", "B"];
export const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"];

const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, day) => new Date(Date.UTC(y, m - 1, day));

/** The school year that contains `now`: April to March. */
export function schoolYear(now = new Date()) {
  const y = now.getUTCMonth() + 1 >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return { name: `${y}-${y + 1}`, startDate: iso(utc(y, 4, 1)), endDate: iso(utc(y + 1, 3, 31)), startYear: y };
}

/** Three terms of a fee, due 10 April, 10 August and 10 December of the school year. */
export const termDates = (startYear) => [iso(utc(startYear, 4, 10)), iso(utc(startYear, 8, 10)), iso(utc(startYear, 12, 10))];

/** Last month's pay month and this one (the run for last month is paid, this month's stays a draft). */
export function payMonths(now = new Date()) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  return { current: { year: y, month: m }, last: m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 } };
}

/** Annual tuition in paise for a class level "1".."5": 40,000 rupees at level 1, 3,000 more each level, in three equal terms. */
export const termAmount = (level) => String(Math.round((4_000_000 + (Number(level) - 1) * 300_000) / 3 / 100) * 100);

/** A phone number that is the same for the same index every run and different for each. */
export const phoneFor = (i) => `+9198${String(76000000 + i * 137).padStart(8, "0").slice(-8)}`;

/** The student's date of birth for a class level (age 5 + level, born in March for a stable date). */
export const dobFor = (level, i, now = new Date()) => iso(utc(schoolYear(now).startYear - 5 - Number(level), 1 + (i % 12), 1 + (i % 27)));

/** What happens to the n-th invoice: paid in full, paid half, or left unpaid (about 60 / 10 / 30 percent). */
export const paymentPlan = (n) => (n % 10 < 6 ? "FULL" : n % 10 === 6 ? "HALF" : "NONE");

/** The text a person reads at the end: addresses and the table of logins. */
export function loginTable({ webAdmin = `http://${DEMO_SUBDOMAIN}.localhost:3002`, saasAdmin = "http://localhost:3001" } = {}) {
  const rows = DEMO_PEOPLE.map((p) => `${p.email.padEnd(36)} ${(p.role ?? "PLATFORM OWNER").padEnd(20)} ${p.name.padEnd(20)} ${p.where}`);
  return [`School:            ${webAdmin}`, `Platform owner app: ${saasAdmin}`, `Password for every account below: ${DEMO_PHRASE}`, "", ...rows].join("\n");
}

// ---- Phase 3 (P3-12): dates and rules for the timetable, attendance, marks and leave. Pure, so the evals can test them.
const DAY_MS = 86_400_000;
export const addDays = (date, n) => iso(new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS));
/** The demo school works Monday to Saturday (the gateway's default). */
export const isWorking = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 0;
/** Today in India Standard Time, the day the gateway reckons attendance by. */
export const schoolToday = (now = new Date()) => iso(new Date(now.getTime() + 330 * 60_000));
/** The `n` working days before `today`, oldest first. */
export function pastWorkingDays(today, n) {
  const out = [];
  for (let d = addDays(today, -1); out.length < n; d = addDays(d, -1)) if (isWorking(d)) out.unshift(d);
  return out;
}
/** The working day `n` working days after `today` (n 1 is the next one). */
export function futureWorkingDay(today, n) {
  let d = today;
  for (let left = n; left > 0; ) { d = addDays(d, 1); if (isWorking(d)) left -= 1; }
  return d;
}
/** The latest working day on or before today that is in today's month (else the first working day on or after today). */
export function thisMonthWorkingDay(today) {
  for (let d = today; d.slice(0, 7) === today.slice(0, 7); d = addDays(d, -1)) if (isWorking(d)) return d;
  return futureWorkingDay(today, 1);
}
/** What a student's day was like: mostly present, now and then something else. The same student and day always give the same answer. */
export function exceptionFor(student, day) {
  const h = (student * 7 + day * 13) % 31;
  return h === 0 ? "ABSENT" : h === 5 ? "LATE" : h === 11 ? "MEDICAL" : h === 17 ? "HALF_DAY" : null;
}
/** A mark out of `max` tenths for the n-th student: spread over the range, one student absent and one not yet marked. */
export function markFor(n, examNo, maxTenths) {
  if (n === 1 && examNo === 0) return { absent: true };
  if (n === 2 && examNo === 2) return null;
  return { tenths: Math.round(((((n * 37 + examNo * 11) % 61) + 35) / 100) * maxTenths / 10) * 10 };
}
/** The index of the subject taught in a period: a rotation that differs by class, so two classes seldom want the same teacher at once. */
export const rotationSubject = (subjectCount, classIndex, dayIndex, periodIndex) => (periodIndex + dayIndex + classIndex * 2) % subjectCount;
/** Marks as the text the gateway takes: `4450` tenths is `44.5`... */
export const marksText = (tenths) => (tenths % 10 === 0 ? String(tenths / 10) : `${Math.floor(tenths / 10)}.${tenths % 10}`);
