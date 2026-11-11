import { fireEvent, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

type Perms = NonNullable<ReturnType<typeof me>["activeSchool"]>["permissions"];
const as = (role: string, perms: Perms) => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role, permissions: perms, navigation: [{ title: "Communication", items: [{ key: "notice-board", label: "Notice board" }] }] };
  return m;
};
const academic = () => as("ACADEMIC_ADMIN", { notice_board: { read: "school", create: "school", update: "school" }, academics: { read: "school" } });
const bursar = () => as("BURSAR", { notice_board: { read: "school", create: "own", update: "own" } });
const go = async (api: ReturnType<typeof fakeApi>) => {
  renderApp(<WebAdminApp />, { api, port: fakePort(IN()).port });
  fireEvent.click(await screen.findByRole("button", { name: "Notice board" }));
};
const NOTICE = (id: string, o: Record<string, unknown> = {}) => ({
  id, title: `Post ${id}`, body: "Words for parents", category: "HOLIDAY", audience: "ALL_PARENTS", pinned: false, publishAt: null, expiresAt: null, target: null,
  author: { id: "u1", name: "Asha Kumar" }, createdAt: "2026-11-02T08:00:00Z", updatedAt: "2026-11-02T08:00:00Z", withdrawn: false, state: "LIVE", told: null, ...o,
});
const LEVELS = { items: [{ id: "g5", name: "5", position: 5, classes: [] }] };
const CLASSES = { items: [{ id: "c5a", name: "5 A", section: "A", capacity: 40, gradeLevel: { id: "g5", name: "5" } }] };

describe("notice board", () => {
  it("lists posts with state, category, audience and the words; pinned and scheduled are marked", async () => {
    const list = { items: [NOTICE("1", { pinned: true }), NOTICE("2", { state: "SCHEDULED", publishAt: "2026-12-01T04:00:00Z", audience: "CLASS", target: "5 A" })] };
    await go(fakeApi({ meGet: vi.fn(async () => academic()), noticeBoardList: vi.fn(async () => list), academicsLevels: vi.fn(async () => LEVELS), academicsClasses: vi.fn(async () => CLASSES) }));
    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(screen.getByText("Pinned")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText(/For: 5 A/)).toBeTruthy();
    const found = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(found.violations.map((v) => v.id)).toEqual([]);
  });

  it("posting to a class shows who it reaches first, then posts and says how many were told", async () => {
    const noticeBoardReach = vi.fn(async () => ({ parents: 12, students: 14 }));
    const noticeBoardPost = vi.fn(async () => NOTICE("9", { told: 12 }));
    await go(fakeApi({ meGet: vi.fn(async () => academic()), noticeBoardList: vi.fn(async () => ({ items: [] })), noticeBoardReach, noticeBoardPost, academicsLevels: vi.fn(async () => LEVELS), academicsClasses: vi.fn(async () => CLASSES) }));
    fireEvent.change(await screen.findByLabelText("Headline"), { target: { value: "Trip" } });
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Bring lunch" } });
    await waitFor(() => expect((screen.getByLabelText("Who is it for") as HTMLSelectElement).options.length).toBe(3));
    fireEvent.change(screen.getByLabelText("Who is it for"), { target: { value: "CLASS" } });
    expect((screen.getByRole("button", { name: "Post" }) as HTMLButtonElement).disabled).toBe(true); // a class has to be chosen
    fireEvent.change(await screen.findByLabelText("Class"), { target: { value: "c5a" } });
    expect(await screen.findByText("Parent accounts that will be told: 12 (for 14 students).")).toBeTruthy();
    expect(noticeBoardReach).toHaveBeenCalledWith({ query: { audience: "CLASS", classId: "c5a" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(noticeBoardPost).toHaveBeenCalledWith({ body: { title: "Trip", body: "Bring lunch", category: "GENERAL", audience: "CLASS", pinned: false, classId: "c5a" } }));
    expect(await screen.findByText("Posted. Parent accounts told: 12.")).toBeTruthy();
  });

  it("the Bursar has only the Fees category and only all parents when grades and classes cannot be read", async () => {
    const noticeBoardPost = vi.fn(async () => NOTICE("9", { category: "FEES", told: 3 }));
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), noticeBoardList: vi.fn(async () => ({ items: [] })), noticeBoardReach: vi.fn(async () => ({ parents: 3, students: 3 })), noticeBoardPost, academicsLevels: vi.fn(async () => { throw new Error("no"); }), academicsClasses: vi.fn(async () => { throw new Error("no"); }) }));
    const category = (await screen.findByLabelText("Category")) as HTMLSelectElement;
    expect([...category.options].map((o) => o.text)).toEqual(["Fees"]);
    expect([...(screen.getByLabelText("Who is it for") as HTMLSelectElement).options].map((o) => o.text)).toEqual(["All parents"]);
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "Fee reminder" } });
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Due on the 10th" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(noticeBoardPost).toHaveBeenCalledWith({ body: expect.objectContaining({ category: "FEES", audience: "ALL_PARENTS" }) }));
  });

  it("the Bursar sees the whole board but can pin and withdraw only Fees posts", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => bursar()), noticeBoardList: vi.fn(async () => ({ items: [NOTICE("1"), NOTICE("2", { category: "FEES" })] })), academicsLevels: vi.fn(async () => { throw new Error("no"); }), academicsClasses: vi.fn(async () => { throw new Error("no"); }) }));
    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Withdraw: Post 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Withdraw: Post 2" })).toBeTruthy();
  });

  it("pin keeps the other fields, withdraw says parents no longer see it", async () => {
    const noticeBoardEdit = vi.fn(async () => NOTICE("1", { pinned: true }));
    const noticeBoardWithdraw = vi.fn(async () => NOTICE("1", { withdrawn: true, state: "WITHDRAWN" }));
    await go(fakeApi({ meGet: vi.fn(async () => academic()), noticeBoardList: vi.fn(async () => ({ items: [NOTICE("1", { expiresAt: "2027-01-01T00:00:00Z" })] })), noticeBoardEdit, noticeBoardWithdraw, academicsLevels: vi.fn(async () => LEVELS), academicsClasses: vi.fn(async () => CLASSES) }));
    fireEvent.click(await screen.findByRole("button", { name: "Pin: Post 1" }));
    await waitFor(() => expect(noticeBoardEdit).toHaveBeenCalledWith({ path: { id: "1" }, body: { title: "Post 1", body: "Words for parents", category: "HOLIDAY", pinned: true, expiresAt: "2027-01-01T00:00:00Z" } }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw: Post 1" }));
    await waitFor(() => expect(noticeBoardWithdraw).toHaveBeenCalledWith({ path: { id: "1" } }));
    expect(await screen.findByText("Withdrawn. Parents no longer see it.")).toBeTruthy();
  });
});
