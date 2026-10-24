import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { WebAdminApp } from "@/components/WebAdminApp";
import { IN, fakeApi, fakePort, me, renderApp } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const admin = () => {
  const m = me();
  m.activeSchool = { ...m.activeSchool!, role: "SYSTEM_ADMIN", permissions: { memberships: { read: "school", create: "school", update: "school", delete: "school" } }, navigation: [{ title: "Administration", items: [{ key: "memberships", label: "Users and roles" }] }] };
  return m;
};
const member = (o = {}) => ({ userId: "u2", email: "sana@example.com", displayName: "Sana Iqbal", phoneNumber: null, role: "TEACHER", status: "ACTIVE", since: "2027-04-01T00:00:00Z", ...o });
const self = () => member({ userId: "u1", email: "asha@example.com", displayName: "Asha Kumar", role: "SYSTEM_ADMIN" });
const members = (items = [self(), member(), member({ userId: "u3", displayName: "Ravi Menon", email: "ravi@example.com", role: "BURSAR", status: "SUSPENDED" })]) => ({ items });
const go = async (api: ReturnType<typeof fakeApi>, port = fakePort(IN()).port) => {
  renderApp(<WebAdminApp />, { api, port });
  fireEvent.click(await screen.findByRole("button", { name: "Users and roles" }));
};
const inv = (o = {}) => ({ id: "i1", email: "new@example.com", phoneNumber: null, role: "TEACHER", status: "PENDING", expiresAt: "2027-05-01T00:00:00Z", createdAt: "2027-04-24T00:00:00Z", acceptedAt: null, createdBy: { id: "u1", name: "Asha" }, ...o });

describe("members", () => {
  it("lists who can sign in, with role and status; your own row is marked and has no buttons (the gateway refuses changes to yourself)", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()) }));
    const table = await screen.findByRole("table", { name: "Members" });
    expect(within(table).getByText("Sana Iqbal")).toBeTruthy();
    expect(within(table).getByText("Suspended")).toBeTruthy();
    expect(within(table).getByText("You")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /: Asha Kumar$/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Change role: Sana Iqbal" })).toBeTruthy();
  });

  it("changing a role asks first and sends only the new role; the same role cannot be confirmed", async () => {
    const membershipsUpdate = vi.fn(async () => member());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), membershipsUpdate }));
    fireEvent.click(await screen.findByRole("button", { name: "Change role: Sana Iqbal" }));
    expect((screen.getByRole("button", { name: "Confirm" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "HR_MANAGER" } });
    expect(screen.getByText("Change Sana Iqbal to HR manager? Their screens change at once.")).toBeTruthy();
    expect(membershipsUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(membershipsUpdate).toHaveBeenCalledWith({ path: { userId: "u2" }, body: { schoolRole: "HR_MANAGER" } }));
  });

  it("suspend and reactivate are confirmed and send the status", async () => {
    const membershipsUpdate = vi.fn(async () => member());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), membershipsUpdate }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend: Sana Iqbal" }));
    expect(screen.getByText("Suspend Sana Iqbal? They cannot sign in until you reactivate them.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(membershipsUpdate).toHaveBeenCalledWith({ path: { userId: "u2" }, body: { status: "SUSPENDED" } }));
    fireEvent.click(await screen.findByRole("button", { name: "Reactivate: Ravi Menon" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(membershipsUpdate).toHaveBeenLastCalledWith({ path: { userId: "u3" }, body: { status: "ACTIVE" } }));
  });

  it("removing asks first; cancelling changes nothing", async () => {
    const membershipsRemove = vi.fn(async () => undefined);
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), membershipsRemove }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove: Sana Iqbal" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(membershipsRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove: Sana Iqbal" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(membershipsRemove).toHaveBeenCalledWith({ path: { userId: "u2" } }));
  });

  it("a refusal from the gateway is shown in words", async () => {
    const membershipsUpdate = vi.fn().mockRejectedValue(new ApiError("FORBIDDEN", 403, "x"));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), membershipsUpdate }));
    fireEvent.click(await screen.findByRole("button", { name: "Suspend: Sana Iqbal" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect((await screen.findByRole("alert")).textContent).toContain("You do not have permission");
  });

  it("creates an account for staff, sends the set-password email, and says so; a failed email can be sent again", async () => {
    const accountsCreate = vi.fn(async () => ({ userId: "u9", displayName: "Farah Khan", email: "farah@example.com", phoneNumber: null, role: "STAFF", status: "ACTIVE", signIn: "EMAIL", nextStep: "SEND_SET_PASSWORD_EMAIL" }));
    const { port } = fakePort(IN());
    port.sendPasswordReset.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), accountsCreate }), port);
    fireEvent.click(await screen.findByRole("button", { name: "Create an account" }));
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Farah Khan" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "farah@example.com" } });
    expect(screen.queryByRole("option", { name: "Parent" })).toBeNull(); // parents are not made here
    fireEvent.click(save);
    await waitFor(() => expect(accountsCreate).toHaveBeenCalledWith({ body: { displayName: "Farah Khan", schoolRole: "STAFF", email: "farah@example.com" } }));
    expect(await screen.findByText("The account was created, but the link could not be sent.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Send the link again" }));
    expect(await screen.findByText("A link to set a password was sent to farah@example.com.")).toBeTruthy();
    expect(port.sendPasswordReset).toHaveBeenLastCalledWith("farah@example.com");
  });

  it("a phone-only account needs no email; at least one contact is required", async () => {
    const accountsCreate = vi.fn(async () => ({ userId: "u9", displayName: "Driver Dev", email: null, phoneNumber: "+919876543210", role: "DRIVER", status: "ACTIVE", signIn: "PHONE", nextStep: "NONE" }));
    const { port } = fakePort(IN());
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), accountsCreate }), port);
    fireEvent.click(await screen.findByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Driver Dev" } });
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "DRIVER" } });
    fireEvent.change(screen.getByLabelText("Mobile number"), { target: { value: "+919876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(accountsCreate).toHaveBeenCalledWith({ body: { displayName: "Driver Dev", schoolRole: "DRIVER", phoneNumber: "+919876543210" } }));
    expect(await screen.findByText("Account created for Driver Dev.")).toBeTruthy();
    expect(port.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("no accessibility violations", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()) }));
    await screen.findByRole("table");
    const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});

describe("invitations", () => {
  it("lists them with status; a new invitation shows its one-time code once; a pending one can be cancelled", async () => {
    const invitationsCreate = vi.fn(async () => ({ ...inv({ id: "i2" }), token: "T".repeat(43) }));
    const invitationsRevoke = vi.fn(async () => inv({ status: "REVOKED" }));
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), invitationsList: vi.fn(async () => ({ items: [inv(), inv({ id: "i0", email: "old@example.com", status: "ACCEPTED" })] })), invitationsCreate, invitationsRevoke }));
    fireEvent.click(await screen.findByRole("radio", { name: "Invitations" }));
    const table = await screen.findByRole("table", { name: "Invitations" });
    expect(within(table).getByText("Pending")).toBeTruthy();
    expect(within(table).getByText("Accepted")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Cancel invitation/ })).toHaveLength(1); // only the pending one
    fireEvent.click(screen.getByRole("button", { name: "Invite someone" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new2@example.com" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "ACCOUNTANT" } });
    fireEvent.change(screen.getByLabelText("Valid for (days)"), { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(invitationsCreate).toHaveBeenCalledWith({ body: { email: "new2@example.com", schoolRole: "ACCOUNTANT", expiresInDays: 14 } }));
    expect(await screen.findByText("T".repeat(43))).toBeTruthy();
    expect(screen.getByText("One-time code. Copy it now: it is shown only once.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel invitation: new@example.com" }));
    await waitFor(() => expect(invitationsRevoke).toHaveBeenCalledWith({ path: { id: "i1" } }));
  });

  it("days outside 1 to 30 block Save", async () => {
    await go(fakeApi({ meGet: vi.fn(async () => admin()), membershipsList: vi.fn(async () => members()), invitationsList: vi.fn(async () => ({ items: [] })) }));
    fireEvent.click(await screen.findByRole("radio", { name: "Invitations" }));
    expect(await screen.findByText("No invitations yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Invite someone" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Valid for (days)"), { target: { value: "45" } });
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("joining with an invitation code", () => {
  it("a signed-in person who is not a member can enter the code, join, and the school loads", async () => {
    const invitationsAccept = vi.fn(async () => ({ role: "TEACHER", school: { id: "s", name: "Greenfield School" } }));
    const meGet = vi.fn().mockResolvedValueOnce(me({ activeSchool: null })).mockResolvedValue(admin());
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet, invitationsAccept, membershipsList: vi.fn(async () => members()) }), port: fakePort(IN()).port });
    expect(await screen.findByText("You do not have access to Greenfield School")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "I have an invitation code" }));
    const join = screen.getByRole("button", { name: "Join" }) as HTMLButtonElement;
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Invitation code"), { target: { value: "C".repeat(43) } });
    fireEvent.click(join);
    await waitFor(() => expect(invitationsAccept).toHaveBeenCalledWith({ body: { token: "C".repeat(43) } }));
    expect(await screen.findByRole("navigation", { name: "School sections" })).toBeTruthy(); // the account is read again and the school opens
    expect(meGet).toHaveBeenCalledTimes(2);
  });

  it("a code the gateway refuses is reported", async () => {
    const invitationsAccept = vi.fn().mockRejectedValue(new ApiError("INVITATION_INVALID", 400, "x"));
    renderApp(<WebAdminApp />, { api: fakeApi({ meGet: vi.fn(async () => me({ activeSchool: null })), invitationsAccept }), port: fakePort(IN()).port });
    fireEvent.click(await screen.findByRole("button", { name: "I have an invitation code" }));
    fireEvent.change(screen.getByLabelText("Invitation code"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect((await screen.findByRole("alert")).textContent).toContain("This code is not valid");
  });
});
