import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Academics", items: [{ key: "gradebook", label: "Gradebook" }] }] };
  return m;
};
const ALL = { read: "school", create: "school", update: "school", delete: "school" } as const;
const acad = () => as("ACADEMIC_ADMIN", { academics: ALL, grades: ALL, students: { read: "school" } });
const reader = () => as("PRINCIPAL", { academics: { read: "school" }, grades: { read: "school" }, students: { read: "school" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Gradebook" }));
};

const TERMS = { items: [{ id: "t1", name: "Term 1", academicYearId: "y1" }, { id: "t2", name: "Term 2", academicYearId: "y1" }] };
const EXAM = { id: "x1", title: "Unit 1", examDate: "2026-10-05", term: { id: "t1", name: "Term 1" }, class: { id: "c1", name: "5 B" }, subject: { id: "s1", name: "Mathematics", code: "MATH" }, maxMarks: "50", maxTenths: 500 };
const EXAMS = { items: [EXAM] };
const row = (id: string, name: string, o: Record<string, unknown> = {}) => ({ studentId: id, enrollmentId: `S${id}`, name, marks: null, marksTenths: null, absent: false, percent: null, grade: null, ...o });
const GRID = { exam: EXAM, rows: [row("a", "Asha Rao", { marks: "44.9", marksTenths: 449, percent: "89.8", grade: "A2" }), row("b", "Bilal Khan"), row("c", "Chitra Nair", { marks: "0", marksTenths: 0, absent: true, percent: "0.0", grade: "E" })] };
const BANDS = { bands: [{ label: "A1", minPercent: 90, maxPercent: 100 }, { label: "E", minPercent: 0, maxPercent: 89 }], template: [{ label: "A1", minPercent: 90, maxPercent: 100 }, { label: "A2", minPercent: 80, maxPercent: 89 }, { label: "E", minPercent: 0, maxPercent: 79 }] };
const base = (over: Record<string, unknown> = {}) => ({ gradesTerms: vi.fn(async () => TERMS), gradesExams: vi.fn(async () => EXAMS), gradesGrid: vi.fn(async () => GRID), gradesBands: vi.fn(async () => BANDS), academicsClasses: vi.fn(async () => ({ items: [{ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" } }] })), academicsSubjects: vi.fn(async () => ({ items: [{ id: "s1", name: "Mathematics", code: "MATH" }] })), ...over });

describe("marks entry", () => {
  it("shows an exam's students with marks, percentage and grade; a reader gets no inputs", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    const table = await screen.findByRole("table", { name: "Marks entry" });
    expect(within(table).getByText("44.9")).toBeTruthy();
    expect(within(table).getByText("89.8%")).toBeTruthy();
    expect(within(table).getByText("A2")).toBeTruthy();
    expect(within(table).getByText("Absent", { selector: "td" })).toBeTruthy();
    expect(screen.getByText(/Unit 1 · Out of 50/)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /Marks:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save marks" })).toBeNull();
  });

  it("enters marks and an absence; only the students changed are sent, with the device's own id", async () => {
    const gradesSaveMarks = vi.fn(async () => GRID);
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ gradesSaveMarks }) }));
    await screen.findByRole("table", { name: "Marks entry" });
    const save = screen.getByRole("button", { name: "Save marks" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Marks: Bilal Khan"), { target: { value: "37.5" } });
    fireEvent.click(screen.getByLabelText("Absent: Asha Rao"));
    fireEvent.click(save);
    await waitFor(() => expect(gradesSaveMarks).toHaveBeenCalledWith({ path: { id: "x1" }, body: { entries: [{ studentId: "b", marks: "37.5" }, { studentId: "a", absent: true }], submissionId: expect.any(String) } }));
    expect(await screen.findByText("Marks saved")).toBeTruthy();
  });

  it("clearing a mark sends the student with nothing, and a refusal is said in words", async () => {
    const gradesSaveMarks = vi.fn(async () => { throw new ApiError("INVALID_REQUEST", 400, "x", undefined, [{ field: "entries", rule: "aboveMaximum" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ gradesSaveMarks }) }));
    await screen.findByRole("table", { name: "Marks entry" });
    fireEvent.change(screen.getByLabelText("Marks: Asha Rao"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Marks: Bilal Khan"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Save marks" }));
    await waitFor(() => expect(gradesSaveMarks).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ entries: [{ studentId: "a" }, { studentId: "b", marks: "99" }] }) })));
    expect(await screen.findByText("A mark is above the most possible for this exam.")).toBeTruthy();
  });

  it("with no terms it says to add one first", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ gradesTerms: vi.fn(async () => ({ items: [] })) }) }));
    expect(await screen.findByText("There are no terms yet")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base() }));
    await screen.findByRole("table", { name: "Marks entry" });
    const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("exams and terms", () => {
  it("adds a term and an exam with their grants, and asks before removing an exam", async () => {
    const gradesCreateTerm = vi.fn(async () => TERMS.items[0]);
    const gradesCreateExam = vi.fn(async () => EXAM);
    const gradesDeleteExam = vi.fn(async () => { throw new ApiError("CONFLICT", 409, "x", undefined, [{ field: "id", rule: "examHasMarks" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ gradesCreateTerm, gradesCreateExam, gradesDeleteExam }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Exams and terms" }));
    const exams = await screen.findByRole("table", { name: "Exams and terms" });
    expect(within(exams).getByText("Mathematics")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Term name"), { target: { value: "Term 3" } });
    fireEvent.click(screen.getByRole("button", { name: "Add a term" }));
    await waitFor(() => expect(gradesCreateTerm).toHaveBeenCalledWith({ body: { name: "Term 3" } }));
    fireEvent.change(screen.getByLabelText("Exam name"), { target: { value: "Half yearly" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add an exam" }).at(-1)!);
    await waitFor(() => expect(gradesCreateExam).toHaveBeenCalledWith({ body: { termId: "t1", classId: "c1", subjectId: "s1", title: "Half yearly", examDate: "2026-12-01", maxMarks: "100" } }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove: Unit 1" }));
    expect(await screen.findByRole("alertdialog", { name: "Remove Unit 1?" })).toBeTruthy();
    expect(gradesDeleteExam).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("This exam already has marks.")).toBeTruthy();
  });

  it("a reader sees the exams but none of the add or remove buttons", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base() }));
    fireEvent.click(await screen.findByRole("radio", { name: "Exams and terms" }));
    await screen.findByRole("table", { name: "Exams and terms" });
    expect(screen.queryByRole("button", { name: "Add a term" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });
});

describe("grade bands", () => {
  it("fills the editor from the standard set, saves exactly what is shown, and explains an overlap", async () => {
    const gradesSetBands = vi.fn(async () => { throw new ApiError("INVALID_REQUEST", 400, "x", undefined, [{ field: "bands", rule: "overlap" }]); });
    await go(fakeApi({ meGet: vi.fn(async () => acad()), ...base({ gradesSetBands }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Grade bands" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use the standard set" }));
    expect((await screen.findAllByLabelText("Grade")).length).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Save grade bands" }));
    await waitFor(() => expect(gradesSetBands).toHaveBeenCalledWith({ body: { bands: [{ label: "A1", minPercent: 90, maxPercent: 100 }, { label: "A2", minPercent: 80, maxPercent: 89 }, { label: "E", minPercent: 0, maxPercent: 79 }] } }));
    expect(await screen.findByText("Two bands cover the same percentages.")).toBeTruthy();
  });

  it("with none set it says marks show a percentage without a grade; a reader sees a table only", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ gradesBands: vi.fn(async () => ({ bands: [], template: BANDS.template })) }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Grade bands" }));
    expect(await screen.findByText("No grade bands are set. Marks show a percentage without a grade.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save grade bands" })).toBeNull();
  });
});

describe("report cards", () => {
  const CARD = { student: { id: "a", enrollmentId: "S0001", name: "Asha Rao" }, class: { id: "c1", name: "5 B" }, term: { id: "t1", name: "Term 1" }, academicYearId: "y1", totalMarks: "117.5", totalMaxMarks: "200", percent: "58.7", grade: "C1", pending: 1,
    subjects: [{ subject: { id: "s1", name: "Mathematics", code: "MATH" }, marks: "45", maxMarks: "100", percent: "45.0", grade: "C2", pending: 0, exams: [{ id: "e1", title: "Unit 1", date: "2026-10-05", maxMarks: "50", marks: "45", absent: false, percent: "90.0", grade: "A1" }, { id: "e2", title: "Unit 2", date: "2026-11-05", maxMarks: "50", marks: "0", absent: true, percent: "0.0", grade: "E" }] }] };
  const students = () => ({ items: [{ id: "a", enrollmentId: "S0001", firstName: "Asha", lastName: "Rao", dateOfBirth: null, gender: null, status: "ACTIVE", placement: { academicYear: { id: "y1", name: "Y" }, classroom: { id: "c1", name: "5 B" } } }, { id: "z", enrollmentId: "S0002", firstName: "Zed", lastName: "Other", dateOfBirth: null, gender: null, status: "ACTIVE", placement: { academicYear: { id: "y1", name: "Y" }, classroom: { id: "c9", name: "9 A" } } }], total: 2, page: 1, pageSize: 100 });
  it("shows a student's card: subjects with their exams, the total that adds up, what is pending; downloads the PDF in the person's language", async () => {
    const gradesReportCard = vi.fn(async () => CARD);
    const gradesReportCardPdf = vi.fn(async () => new Blob(["%PDF"]));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ studentsList: vi.fn(async () => students()), gradesReportCard, gradesReportCardPdf }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Report cards" }));
    expect(await screen.findByRole("heading", { name: "Asha Rao · 5 B · Term 1" })).toBeTruthy();
    expect(gradesReportCard).toHaveBeenCalledWith({ path: { studentId: "a" }, query: { termId: "t1" } });
    const student = screen.getByLabelText("Student") as HTMLSelectElement;
    expect(Array.from(student.options).map((o) => o.textContent)).toEqual(["Asha Rao"]); // only this class
    expect(screen.getByText(/117\.5 \/ 200 · 58\.7%/)).toBeTruthy();
    expect(screen.getByText("1 exam has no mark yet and is left out")).toBeTruthy();
    fireEvent.click(screen.getByText("Mathematics"));
    expect(screen.getAllByText("Absent").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Download the report card (PDF)" }));
    await waitFor(() => expect(gradesReportCardPdf).toHaveBeenCalledWith({ path: { studentId: "a" }, query: { termId: "t1", lang: "en" }, parseAs: "blob" }));
  });
  it("a student with no card says so", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => reader()), ...base({ studentsList: vi.fn(async () => students()), gradesReportCard: vi.fn(async () => { throw new ApiError("NOT_FOUND", 404, "x"); }) }) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Report cards" }));
    expect(await screen.findByText("This student has no report card for this term.")).toBeTruthy();
  });
});
