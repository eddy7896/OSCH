import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const student = (o = {}) => ({ id: "s1", enrollmentId: "S0042", firstName: "Asha", lastName: "Kumar", status: "ACTIVE", gender: "FEMALE", dateOfBirth: "2016-05-04", placement: { academicYear: { id: "y1", name: "2027-2028" }, classroom: { id: "c1", name: "5 B" } }, ...o });
const list = (items = [student(), student({ id: "s2", enrollmentId: "S0043", firstName: "Bilal", lastName: "Ahmed", status: "LEFT", placement: null })]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const full = () => ({ ...student(), hasPhoto: false, documents: [], admissionDate: "2027-04-01", address: "12 Lake Road", placements: [{ academicYear: { id: "y1", name: "2027-2028" }, classroom: { id: "c1", name: "5 B" } }], guardians: [{ id: "g1", name: "Rekha Kumar", relationship: "MOTHER", phone: "+919876543210", email: null, isPrimary: true }] });
const app = (over = {}) => ({ id: "a1", applicationNo: "A-2027-0001", status: "SUBMITTED", firstName: "Meera", lastName: "Nair", guardianName: "Latha Nair", gradeLevel: { id: "l5", name: "5" }, academicYear: { id: "y1", name: "2027-2028" }, createdAt: "2027-03-01T00:00:00Z", dateOfBirth: null, gender: null, address: null, guardianRelationship: "MOTHER", guardianPhone: "+919812345678", guardianEmail: null, previousSchool: null, notes: null, decisionNote: null, studentId: null, ...over });
type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms, nav: Array<{ key: string; label: string }>) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Academics", items: nav }] };
  return m;
};
const go = async (api: ReturnType<typeof fakeApi>, name: string) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name }));
};
const admin = () => as("SYSTEM_ADMIN", { students: { read: "school", create: "school" }, admissions: { read: "school", create: "school", update: "school" } }, [{ key: "students", label: "Students" }, { key: "classes", label: "Classes and subjects" }, { key: "admissions", label: "Admissions" }]);

describe("students screen", () => {
  it("lists the roll with enrolment id, class and status; a student with no class shows none", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList: vi.fn(async () => list()) }), "Students");
    const table = await screen.findByRole("table", { name: "Students" });
    expect(within(table).getByText("S0042")).toBeTruthy();
    expect(within(table).getByText("5 B")).toBeTruthy();
    expect(within(table).getByText("Left")).toBeTruthy();
  });

  it("search and status ask the gateway again for that filter, from page 1", async () => {
    const studentsList = vi.fn(async () => list());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList }), "Students");
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Search by name or enrolment no."), { target: { value: "asha" } });
    await waitFor(() => expect(studentsList).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, search: "asha" } }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "LEFT" } });
    await waitFor(() => expect(studentsList).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, search: "asha", status: "LEFT" } }));
  });

  it("empty roll and empty search say different things", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList: vi.fn(async () => list([])) }), "Students");
    expect(await screen.findByText("No students yet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search by name or enrolment no."), { target: { value: "zzz" } });
    expect(await screen.findByText("No student matches this search.")).toBeTruthy();
  });

  it("adds a student: the Add button is only for roles that may create; the form sends only what was filled; the list reloads", async () => {
    const studentsCreate = vi.fn(async () => student());
    const studentsList = vi.fn(async () => list());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList, studentsCreate }), "Students");
    fireEvent.click(await screen.findByRole("button", { name: "Add student" }));
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true); // names are needed
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Kumar" } });
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "FEMALE" } });
    fireEvent.click(save);
    await waitFor(() => expect(studentsCreate).toHaveBeenCalledWith({ body: { firstName: "Asha", lastName: "Kumar", gender: "FEMALE" } }));
    expect(await screen.findByText("Student added")).toBeTruthy();
    await waitFor(() => expect(studentsList.mock.calls.length).toBeGreaterThan(1));
  });

  it("a refusal from the gateway is shown in words and the form stays", async () => {
    const studentsCreate = vi.fn().mockRejectedValue(new ApiError("INVALID_REQUEST", 400, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList: vi.fn(async () => list()), studentsCreate }), "Students");
    fireEvent.click(await screen.findByRole("button", { name: "Add student" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Some details are not valid");
    expect(screen.getByLabelText("First name")).toBeTruthy();
  });

  it("no create grant: no Add button", async () => {
    const m = as("ACADEMIC_ADMIN", { students: { read: "school" } }, [{ key: "students", label: "Students" }]);
    await go(fakeApi({ meGet: vi.fn(async () => m), studentsList: vi.fn(async () => list()) }), "Students");
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Add student" })).toBeNull();
  });

  it("opens a student: profile, guardians with the primary marked, class history; Back returns to the list", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList: vi.fn(async () => list()), studentsGet: vi.fn(async () => full()) }), "Students");
    fireEvent.click(await screen.findByRole("button", { name: "Asha Kumar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Asha Kumar" })).toBeTruthy();
    expect(screen.getByText("12 Lake Road")).toBeTruthy();
    expect(screen.getByText("Rekha Kumar")).toBeTruthy();
    expect(screen.getByText("Primary contact")).toBeTruthy();
    expect(screen.getByText("Class history")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to the list" }));
    expect(await screen.findByRole("table", { name: "Students" })).toBeTruthy();
  });

  it("a failed load offers Retry", async () => {
    const studentsList = vi.fn().mockRejectedValueOnce(new ApiError("NETWORK_ERROR", 0, "x")).mockResolvedValue(list());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList }), "Students");
    expect((await screen.findByRole("alert")).textContent).toContain("We could not reach the server");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), studentsList: vi.fn(async () => list()) }), "Students");
    await screen.findByRole("table");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});

describe("classes screen", () => {
  it("lists classes with level, section and capacity", async () => {
    const academicsClasses = vi.fn(async () => ({ items: [{ id: "c1", name: "5 B", section: "B", capacity: 40, gradeLevel: { id: "l5", name: "5" } }] }));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), academicsClasses }), "Classes and subjects");
    const table = await screen.findByRole("table", { name: "Classes and subjects" });
    expect(within(table).getByText("5 B")).toBeTruthy();
    expect(within(table).getByText("40")).toBeTruthy();
  });
  it("no classes: an honest empty state", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), academicsClasses: vi.fn(async () => ({ items: [] })) }), "Classes and subjects");
    expect(await screen.findByText("No classes yet")).toBeTruthy();
  });
});

describe("admissions screen", () => {
  const apps = () => ({ items: [app(), app({ id: "a2", applicationNo: "A-2027-0002", firstName: "Omar", status: "ACCEPTED" })], total: 2, page: 1, pageSize: 25 });
  it("lists applications with status; the status filter asks the gateway", async () => {
    const admissionsList = vi.fn(async () => apps());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), admissionsList }), "Admissions");
    const table = await screen.findByRole("table", { name: "Admissions" });
    expect(within(table).getByText("A-2027-0001")).toBeTruthy();
    expect(within(table).getByText("Accepted")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ACCEPTED" } });
    await waitFor(() => expect(admissionsList).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 25, status: "ACCEPTED" } }));
  });

  it("a new application sends the level, the active year and the guardian; only roles that may create see the button", async () => {
    const admissionsCreate = vi.fn(async () => app());
    const api = fakeApi({
      meGet: vi.fn(async () => admin()), admissionsList: vi.fn(async () => apps()), admissionsCreate,
      academicsLevels: vi.fn(async () => ({ items: [{ id: "l5", name: "5", position: 5, classes: [] }] })),
      academicsYears: vi.fn(async () => ({ items: [{ id: "y1", name: "2027-2028", startDate: "2027-04-01", endDate: "2028-03-31", status: "ACTIVE" }] })),
    });
    await go(api, "Admissions");
    fireEvent.click(await screen.findByRole("button", { name: "New application" }));
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Meera" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Nair" } });
    await screen.findByRole("option", { name: "5" });
    fireEvent.change(screen.getByLabelText("Level applied for"), { target: { value: "l5" } });
    fireEvent.change(screen.getByLabelText("Guardian name"), { target: { value: "Latha Nair" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(admissionsCreate).toHaveBeenCalledWith({ body: { firstName: "Meera", lastName: "Nair", gradeLevelId: "l5", guardianName: "Latha Nair", guardianRelationship: "MOTHER", academicYearId: "y1" } }));
    expect(await screen.findByText("Application saved")).toBeTruthy();
  });

  it("a submitted application offers review, accept, reject and withdraw; a decision is sent with its note", async () => {
    const admissionsDecide = vi.fn(async () => app({ status: "REJECTED" }));
    const admissionsGet = vi.fn().mockResolvedValueOnce(app()).mockResolvedValue(app({ status: "REJECTED", decisionNote: "No seat" }));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), admissionsList: vi.fn(async () => apps()), admissionsGet, admissionsDecide }), "Admissions");
    fireEvent.click(await screen.findByRole("button", { name: "Meera Nair" }));
    for (const b of ["Start review", "Accept", "Reject", "Mark as withdrawn"]) expect(await screen.findByRole("button", { name: b })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Admit student" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "No seat" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(admissionsDecide).toHaveBeenCalledWith({ path: { id: "a1" }, body: { status: "REJECTED", note: "No seat" } }));
    expect(await screen.findByText("No seat")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull(); // nothing more to decide
  });

  it("an accepted application can be admitted into a class of the level applied for, and the new enrolment no. is shown", async () => {
    const admissionsAdmit = vi.fn(async () => ({ application: app({ status: "ADMITTED" }), student: { id: "s9", enrollmentId: "S0099" }, guardianInvitationPending: false }));
    const academicsClasses = vi.fn(async () => ({ items: [{ id: "c5", name: "5 A", section: "A", capacity: 40, gradeLevel: { id: "l5", name: "5" } }, { id: "c6", name: "6 A", section: "A", capacity: 40, gradeLevel: { id: "l6", name: "6" } }] }));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), admissionsList: vi.fn(async () => apps()), admissionsGet: vi.fn(async () => app({ status: "ACCEPTED" })), admissionsAdmit, academicsClasses }), "Admissions");
    fireEvent.click(await screen.findByRole("button", { name: "Omar Nair" }).catch(() => screen.findByRole("button", { name: "Omar Nair" })));
    await screen.findByRole("option", { name: "5 A" });
    expect(screen.queryByRole("option", { name: "6 A" })).toBeNull(); // another level's class is not offered
    const admit = screen.getByRole("button", { name: "Admit student" }) as HTMLButtonElement;
    expect(admit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Class"), { target: { value: "c5" } });
    fireEvent.click(admit);
    await waitFor(() => expect(admissionsAdmit).toHaveBeenCalledWith({ path: { id: "a2" }, body: { classroomId: "c5" } }));
    expect(await screen.findByText("Student admitted. Enrolment no. S0099")).toBeTruthy();
  });

  it("read-only roles see no buttons for new applications or decisions", async () => {
    const m = as("PRINCIPAL", { admissions: { read: "school" } }, [{ key: "admissions", label: "Admissions" }]);
    await go(fakeApi({ meGet: vi.fn(async () => m), admissionsList: vi.fn(async () => apps()), admissionsGet: vi.fn(async () => app()) }), "Admissions");
    expect(screen.queryByRole("button", { name: "New application" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Meera Nair" }));
    await screen.findByRole("heading", { level: 1, name: "Meera Nair" });
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });
});
