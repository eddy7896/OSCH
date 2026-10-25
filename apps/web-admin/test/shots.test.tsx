// A developer tool, not a test: renders real screens with sample data in English and Urdu and writes the page HTML to $SHOTS_DIR/html, for the review pictures in the Project Hub.
// Run: SHOTS_DIR=/some/dir npx vitest run test/shots.test.tsx   (the pictures are made from these files by tools in the session, see documentation/screen-previews.md)
import { mkdirSync, writeFileSync } from "node:fs";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const DIR = process.env["SHOTS_DIR"];
const ONLY = process.env["SHOTS_ONLY"]?.split(",");
type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const nav = [
  { title: "Overview", items: [{ key: "dashboard-academic", label: "Dashboard" }] },
  { title: "Academics", items: [{ key: "students", label: "Students" }, { key: "classes", label: "Classes and subjects" }, { key: "timetable", label: "Timetable" }, { key: "attendance", label: "Attendance" }, { key: "gradebook", label: "Gradebook" }, { key: "substitution", label: "Substitutions" }] },
  { title: "HR", items: [{ key: "leave", label: "Leave" }, { key: "staff-attendance", label: "Staff attendance" }] },
  { title: "Reports", items: [{ key: "reports-academic", label: "Academic reports" }] },
];
export const as = (role: string, perms: Perms, navigation = nav) => {
  const m = me();
  m.user.displayName = "Meera Joshi";
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation };
  return m;
};
export const ACAD: Perms = { academics: { read: "school", create: "school", update: "school", delete: "school" } };

/** One picture: render, do `steps`, wait until `ready` is on screen, write the page. */
export async function shoot(name: string, locale: string, api: ReturnType<typeof fakeApi>, navKey: string, steps: () => Promise<void>) {
  const { container, unmount } = renderApp(<WebAdminApp />, { api, port: fakePort(IN({ displayName: "Meera Joshi" })).port, locale });
  fireEvent.click(await screen.findByRole("button", { name: getMessages(locale)[navKey]! }));
  await steps();
  await new Promise((r) => setTimeout(r, 150));
  // what a person has chosen or typed lives in properties, not attributes: copy it over so the saved page shows it
  container.querySelectorAll("select").forEach((sel) => Array.from(sel.options).forEach((o) => o.toggleAttribute("selected", o.selected)));
  container.querySelectorAll("details").forEach((d) => d.toggleAttribute("open", d.open));
  container.querySelectorAll("input").forEach((i) => { if (i.type === "checkbox") i.toggleAttribute("checked", i.checked); else i.setAttribute("value", i.value); });
  mkdirSync(`${DIR}/html`, { recursive: true });
  writeFileSync(`${DIR}/html/${name}-${locale}.html`, container.innerHTML);
  unmount();
}
export const table = () => waitFor(() => { if (!document.querySelector("table")) throw new Error("no table yet"); });
export const wanted = (name: string) => !ONLY || ONLY.includes(name);

const P = [
  { id: "p1", label: "Period 1", startTime: "08:30", endTime: "09:10", isBreak: false, number: 1 },
  { id: "p2", label: "Period 2", startTime: "09:10", endTime: "09:50", isBreak: false, number: 2 },
  { id: "br", label: "Break", startTime: "09:50", endTime: "10:10", isBreak: true, number: null },
  { id: "p3", label: "Period 3", startTime: "10:10", endTime: "10:50", isBreak: false, number: 3 },
  { id: "p4", label: "Period 4", startTime: "10:50", endTime: "11:30", isBreak: false, number: 4 },
  { id: "p5", label: "Period 5", startTime: "11:30", endTime: "12:10", isBreak: false, number: 5 },
];
const SCHEDULE = { workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"], periods: P };
const CLASSES = { items: [{ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" } }, { id: "c2", name: "6 A", section: "A", capacity: 40, gradeLevel: { id: "l6", name: "6" } }] };
const SUBJ = { maths: { id: "s1", name: "Mathematics", code: "MATH" }, sci: { id: "s2", name: "Science", code: "SCI" }, eng: { id: "s3", name: "English", code: "ENG" }, hin: { id: "s4", name: "Hindi", code: "HIN" }, soc: { id: "s5", name: "Social Studies", code: "SOC" } };
const T = { asha: { id: "t1", employeeId: "E0001", name: "Asha Rao" }, bilal: { id: "t2", employeeId: "E0002", name: "Bilal Khan" }, chitra: { id: "t3", employeeId: "E0003", name: "Chitra Nair" } };
const TEACHERS = { items: [
  { staff: { ...T.asha, hasAccount: true }, subjects: [SUBJ.maths], classes: [] }, { staff: { ...T.bilal, hasAccount: true }, subjects: [SUBJ.sci, SUBJ.soc], classes: [] }, { staff: { ...T.chitra, hasAccount: false }, subjects: [SUBJ.eng, SUBJ.hin], classes: [] },
] };
const grid: Array<[string, string, keyof typeof SUBJ, keyof typeof T]> = [
  ["MON", "p1", "maths", "asha"], ["MON", "p2", "eng", "chitra"], ["MON", "p3", "sci", "bilal"], ["MON", "p4", "hin", "chitra"], ["MON", "p5", "soc", "bilal"],
  ["TUE", "p1", "eng", "chitra"], ["TUE", "p2", "maths", "asha"], ["TUE", "p3", "hin", "chitra"], ["TUE", "p4", "sci", "bilal"],
  ["WED", "p1", "maths", "asha"], ["WED", "p2", "sci", "bilal"], ["WED", "p3", "eng", "chitra"], ["WED", "p5", "soc", "bilal"],
  ["THU", "p1", "hin", "chitra"], ["THU", "p2", "maths", "asha"], ["THU", "p4", "eng", "chitra"],
  ["FRI", "p1", "sci", "bilal"], ["FRI", "p2", "eng", "chitra"], ["FRI", "p3", "maths", "asha"], ["FRI", "p5", "hin", "chitra"],
  ["SAT", "p1", "maths", "asha"], ["SAT", "p2", "soc", "bilal"], ["SAT", "p3", "eng", "chitra"],
];
const CLASS_TT = { academicYearId: "y1", classId: "c1", entries: grid.map(([day, periodId, s, t], i) => ({ id: `e${i}`, day, periodId, subject: SUBJ[s], staff: T[t] })) };
const STAFF_TT = { academicYearId: "y1", staffId: "t1", entries: grid.filter((g) => g[3] === "asha").map(([day, periodId, s], i) => ({ id: `a${i}`, day, periodId, class: { id: i % 2 ? "c2" : "c1", name: i % 2 ? "6 A" : "5 B" }, subject: SUBJ[s] })) };
const LOAD = { academicYearId: "y1", items: [
  { staff: T.chitra, total: 9, byDay: { MON: 2, TUE: 2, WED: 1, THU: 2, FRI: 2, SAT: 1, SUN: 0 } }, { staff: T.bilal, total: 8, byDay: { MON: 2, TUE: 1, WED: 2, THU: 0, FRI: 1, SAT: 1, SUN: 0 } }, { staff: T.asha, total: 7, byDay: { MON: 1, TUE: 1, WED: 1, THU: 1, FRI: 1, SAT: 1, SUN: 0 } },
] };
export const base = (over: Record<string, unknown> = {}) => ({ scheduleGet: vi.fn(async () => SCHEDULE), academicsClasses: vi.fn(async () => CLASSES), academicsSubjects: vi.fn(async () => ({ items: Object.values(SUBJ) })), teachingTeachers: vi.fn(async () => TEACHERS), timetableForClass: vi.fn(async () => CLASS_TT), timetableForStaff: vi.fn(async () => STAFF_TT), timetableLoad: vi.fn(async () => LOAD), ...over });

describe.skipIf(!DIR)("screen pictures: timetable (P3-11a)", () => {
  for (const locale of ["en", "ur"]) {
    it(`timetable by class and the lesson editor (${locale})`, async () => {
      if (!wanted("web-admin-timetable-class")) return;
      await shoot("web-admin-timetable-class", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ACAD)), ...base() }), "navTimetable", async () => {
        await table();
        fireEvent.click(document.querySelectorAll("table button")[8]!);
        await waitFor(() => { if (!document.querySelector("select")) throw new Error("wait"); });
        const selects = Array.from(document.querySelectorAll("select"));
        fireEvent.change(selects[2]!, { target: { value: "s2" } });
        fireEvent.change(Array.from(document.querySelectorAll("select"))[3]!, { target: { value: "t2" } });
      });
    });
    it(`timetable by teacher (${locale})`, async () => {
      if (!wanted("web-admin-timetable-teacher")) return;
      await shoot("web-admin-timetable-teacher", locale, fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { academics: { read: "school" } })), ...base() }), "navTimetable", async () => {
        await table();
        fireEvent.click(screen.getAllByRole("radio")[1]!);
        await waitFor(() => { if (document.querySelectorAll("table").length < 2) throw new Error("wait"); });
      });
    });
    it(`bell schedule (${locale})`, async () => {
      if (!wanted("web-admin-bell-schedule")) return;
      await shoot("web-admin-bell-schedule", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ACAD)), ...base() }), "navTimetable", async () => {
        await table();
        fireEvent.click(screen.getAllByRole("radio")[2]!);
        await waitFor(() => { if (!document.querySelector("form")) throw new Error("wait"); });
      });
    });
    it(`empty bell schedule (${locale})`, async () => {
      if (!wanted("web-admin-bell-empty")) return;
      await shoot("web-admin-bell-empty", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ACAD)), ...base({ scheduleGet: vi.fn(async () => ({ workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"], periods: [] })) }) }), "navTimetable", async () => {
        fireEvent.click((await screen.findAllByRole("radio"))[2]!);
        await waitFor(() => { if (!document.querySelector("form")) throw new Error("wait"); });
      });
    });
  }
});

// ---- P3-11b: attendance
const ST = ["PRESENT", "ABSENT", "LATE", "LEAVE", "MEDICAL", "HALF_DAY", "EXCUSED"].map((s) => ({ status: s, label: s, isDefault: s !== "LATE" }));
const STATUS_LIST = { items: ST.map((s) => (s.status === "LATE" ? { ...s, label: "Tardy" } : s)) };
const names = ["Aarav Mehta", "Bilal Khan", "Chitra Nair", "Devika Rao", "Farhan Ali", "Gauri Shah", "Harsh Verma", "Irfan Sheikh", "Jaya Menon", "Kabir Singh", "Lata Iyer", "Mohan Das"];
const roster = (marks: Record<number, string>) => names.map((name, i) => ({ id: `s${i}`, enrollmentId: `S${String(i + 1).padStart(4, "0")}`, name, status: marks[i] ?? "PRESENT", note: null }));
const cnt = (r: ReturnType<typeof roster>) => { const o: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, MEDICAL: 0, HALF_DAY: 0, EXCUSED: 0 }; r.forEach((x) => { o[x.status] = (o[x.status] ?? 0) + 1; }); return o; };
const TAKEN = roster({ 1: "ABSENT", 4: "LATE", 7: "MEDICAL", 9: "HALF_DAY" });
const DAYS = (o: Record<string, unknown> = {}) => ({ classId: "c1", date: "2026-10-26", submitted: true, locked: false, submittedBy: "Tara Teach", submittedAt: "2026-10-26T03:50:00.000Z", counts: cnt(TAKEN), students: TAKEN, ...o });
const ATT: Perms = { academics: { read: "school" }, attendance: { read: "school", create: "school", update: "school", delete: "school" } };
const attBase = (over: Record<string, unknown> = {}) => ({ academicsClasses: vi.fn(async () => CLASSES), attendanceStatuses: vi.fn(async () => STATUS_LIST), attendanceDay: vi.fn(async () => DAYS()), attendanceMissing: vi.fn(async () => ({ date: "2026-10-26", items: [{ id: "c3", name: "6 A" }, { id: "c4", name: "7 B" }, { id: "c5", name: "8 A" }] })), ...over });
const PRESENCE = { date: "2026-10-26", items: [
  { staff: { id: "t1", employeeId: "E0001", name: "Asha Rao" }, checkIn: "2026-10-26T03:45:00.000Z", checkOut: null, state: "IN" },
  { staff: { id: "t2", employeeId: "E0002", name: "Bilal Khan" }, checkIn: "2026-10-26T03:30:00.000Z", checkOut: "2026-10-26T11:00:00.000Z", state: "OUT" },
  { staff: { id: "t3", employeeId: "E0003", name: "Chitra Nair" }, checkIn: null, checkOut: null, state: "NONE" },
  { staff: { id: "t4", employeeId: "E0004", name: "Dev Patel" }, checkIn: "2026-10-26T03:55:00.000Z", checkOut: null, state: "IN" },
] };

describe.skipIf(!DIR)("screen pictures: attendance (P3-11b)", () => {
  for (const locale of ["en", "ur"]) {
    it(`daily register of a taken day (${locale})`, async () => {
      if (!wanted("web-admin-attendance-register")) return;
      await shoot("web-admin-attendance-register", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ATT)), ...attBase() }), "navAttendance", async () => { await table(); });
    });
    it(`daily register of a locked day (${locale})`, async () => {
      if (!wanted("web-admin-attendance-locked")) return;
      await shoot("web-admin-attendance-locked", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ATT)), ...attBase({ attendanceDay: vi.fn(async () => DAYS({ locked: true })) }) }), "navAttendance", async () => {
        await table();
        fireEvent.change(document.querySelectorAll("table select")[1]!, { target: { value: "PRESENT" } });
      });
    });
    it(`classes not taken yet (${locale})`, async () => {
      if (!wanted("web-admin-attendance-missing")) return;
      await shoot("web-admin-attendance-missing", locale, fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { academics: { read: "school" }, attendance: { read: "school" } })), ...attBase() }), "navAttendance", async () => {
        fireEvent.click(screen.getAllByRole("radio")[1]!);
        await table();
      });
    });
    it(`status names (${locale})`, async () => {
      if (!wanted("web-admin-attendance-names")) return;
      await shoot("web-admin-attendance-names", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", ATT)), ...attBase() }), "navAttendance", async () => {
        fireEvent.click(screen.getAllByRole("radio")[2]!);
        await waitFor(() => { if (document.querySelectorAll("form").length < 7) throw new Error("wait"); });
      });
    });
    it(`staff attendance (${locale})`, async () => {
      if (!wanted("web-admin-staff-attendance")) return;
      await shoot("web-admin-staff-attendance", locale, fakeApi({ meGet: vi.fn(async () => as("HR_MANAGER", { staff_attendance: { read: "school", create: "school", update: "school" } })), staffAttendancePresence: vi.fn(async () => PRESENCE) }), "navStaffAttendance", async () => {
        await table();
        fireEvent.click(document.querySelectorAll("table button")[2]!);
        await waitFor(() => { if (!document.querySelector("form")) throw new Error("wait"); });
      });
    });
  }
});

// ---- P3-11c: gradebook
const GB: Perms = { academics: { read: "school", create: "school", update: "school", delete: "school" }, grades: { read: "school", create: "school", update: "school", delete: "school" }, students: { read: "school" } };
const TERMS = { items: [{ id: "t1", name: "Term 1", academicYearId: "y1" }, { id: "t2", name: "Term 2", academicYearId: "y1" }] };
const mkExam = (id: string, title: string, subject: keyof typeof SUBJ, date: string, max: string) => ({ id, title, examDate: date, term: { id: "t1", name: "Term 1" }, class: { id: "c1", name: "5 B" }, subject: SUBJ[subject], maxMarks: max, maxTenths: Number(max) * 10 });
const EXAMS = { items: [mkExam("x1", "Unit test 1", "maths", "2026-08-12", "50"), mkExam("x2", "Unit test 1", "sci", "2026-08-13", "50"), mkExam("x3", "Half yearly", "maths", "2026-09-20", "100"), mkExam("x4", "Half yearly", "eng", "2026-09-22", "100")] };
const marksFor: Array<[string | null, string | null, boolean]> = [["44.9", "89.8", false], ["31", "62.0", false], [null, null, false], ["0", "0.0", true], ["38.5", "77.0", false], ["49", "98.0", false], ["27.5", "55.0", false], ["41", "82.0", false]];
const gradeOf = (p: string | null) => (p === null ? null : Number(p) >= 90 ? "A1" : Number(p) >= 80 ? "A2" : Number(p) >= 70 ? "B1" : Number(p) >= 60 ? "B2" : Number(p) >= 50 ? "C1" : "E");
const GRID = { exam: EXAMS.items[0]!, rows: names.slice(0, 8).map((name, i) => ({ studentId: `s${i}`, enrollmentId: `S${String(i + 1).padStart(4, "0")}`, name, marks: marksFor[i]![1] === null ? null : marksFor[i]![0], marksTenths: marksFor[i]![0] === null ? null : Math.round(Number(marksFor[i]![0]) * 10), absent: marksFor[i]![2], percent: marksFor[i]![1], grade: gradeOf(marksFor[i]![1]) })) };
const BANDS_SET = [{ label: "A1", minPercent: 90, maxPercent: 100 }, { label: "A2", minPercent: 80, maxPercent: 89 }, { label: "B1", minPercent: 70, maxPercent: 79 }, { label: "B2", minPercent: 60, maxPercent: 69 }, { label: "C1", minPercent: 50, maxPercent: 59 }, { label: "C2", minPercent: 40, maxPercent: 49 }, { label: "D", minPercent: 33, maxPercent: 39 }, { label: "E", minPercent: 0, maxPercent: 32 }];
const CARD = { student: { id: "s0", enrollmentId: "S0001", name: "Aarav Mehta" }, class: { id: "c1", name: "5 B" }, term: { id: "t1", name: "Term 1" }, academicYearId: "y1", totalMarks: "287.5", totalMaxMarks: "350", percent: "82.1", grade: "A2", pending: 1,
  subjects: [
    { subject: SUBJ.eng, marks: "82", maxMarks: "100", percent: "82.0", grade: "A2", pending: 0, exams: [{ id: "e1", title: "Half yearly", date: "2026-09-22", maxMarks: "100", marks: "82", absent: false, percent: "82.0", grade: "A2" }] },
    { subject: SUBJ.maths, marks: "134.9", maxMarks: "150", percent: "89.9", grade: "A2", pending: 0, exams: [{ id: "e2", title: "Unit test 1", date: "2026-08-12", maxMarks: "50", marks: "44.9", absent: false, percent: "89.8", grade: "A2" }, { id: "e3", title: "Half yearly", date: "2026-09-20", maxMarks: "100", marks: "90", absent: false, percent: "90.0", grade: "A1" }] },
    { subject: SUBJ.sci, marks: "70.6", maxMarks: "100", percent: "70.6", grade: "B1", pending: 1, exams: [{ id: "e4", title: "Unit test 1", date: "2026-08-13", maxMarks: "50", marks: "35.3", absent: false, percent: "70.6", grade: "B1" }, { id: "e5", title: "Half yearly", date: "2026-09-25", maxMarks: "100", marks: null, absent: false, percent: null, grade: null }] },
  ] };
const STUDENTS = { items: names.slice(0, 8).map((n, i) => ({ id: `s${i}`, enrollmentId: `S${String(i + 1).padStart(4, "0")}`, firstName: n.split(" ")[0]!, lastName: n.split(" ")[1]!, dateOfBirth: null, gender: null, status: "ACTIVE", placement: { academicYear: { id: "y1", name: "2026-2027" }, classroom: { id: "c1", name: "5 B" } } })), total: 8, page: 1, pageSize: 100 };
const gbBase = (over: Record<string, unknown> = {}) => ({ gradesTerms: vi.fn(async () => TERMS), gradesExams: vi.fn(async () => EXAMS), gradesGrid: vi.fn(async () => GRID), gradesBands: vi.fn(async () => ({ bands: BANDS_SET, template: BANDS_SET })), academicsClasses: vi.fn(async () => CLASSES), academicsSubjects: vi.fn(async () => ({ items: Object.values(SUBJ) })), studentsList: vi.fn(async () => STUDENTS), gradesReportCard: vi.fn(async () => CARD), ...over });

describe.skipIf(!DIR)("screen pictures: gradebook (P3-11c)", () => {
  for (const locale of ["en", "ur"]) {
    it(`marks entry (${locale})`, async () => {
      if (!wanted("web-admin-marks-entry")) return;
      await shoot("web-admin-marks-entry", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", GB)), ...gbBase() }), "navGradebook", async () => {
        await table();
        const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("table input[inputmode=decimal]"));
        fireEvent.change(inputs[2]!, { target: { value: "36" } });
      });
    });
    it(`exams and terms (${locale})`, async () => {
      if (!wanted("web-admin-exams")) return;
      await shoot("web-admin-exams", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", GB)), ...gbBase() }), "navGradebook", async () => {
        fireEvent.click(screen.getAllByRole("radio")[1]!);
        await table();
      });
    });
    it(`grade bands (${locale})`, async () => {
      if (!wanted("web-admin-grade-bands")) return;
      await shoot("web-admin-grade-bands", locale, fakeApi({ meGet: vi.fn(async () => as("ACADEMIC_ADMIN", GB)), ...gbBase() }), "navGradebook", async () => {
        fireEvent.click(screen.getAllByRole("radio")[2]!);
        await waitFor(() => { if (document.querySelectorAll("input").length < 20) throw new Error("wait"); });
      });
    });
    it(`report card (${locale})`, async () => {
      if (!wanted("web-admin-report-card")) return;
      await shoot("web-admin-report-card", locale, fakeApi({ meGet: vi.fn(async () => as("PRINCIPAL", { academics: { read: "school" }, grades: { read: "school" }, students: { read: "school" } })), ...gbBase() }), "navGradebook", async () => {
        fireEvent.click(screen.getAllByRole("radio")[3]!);
        await waitFor(() => { if (!document.querySelector("details")) throw new Error("wait"); });
        document.querySelectorAll("details").forEach((d) => { d.open = true; });
      });
    });
  }
});
