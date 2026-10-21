import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@oruschools/api-client";
import { PlatformApp } from "@/components/PlatformApp";
import { OWNER, fakeApi, fakePort, renderApp, school } from "./helpers";

vi.mock("@/i18n/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ replace: vi.fn() }) }));

const created = (over: object = {}) => ({ userId: "u9", displayName: "Asha Principal", email: "asha@example.com", phoneNumber: null, role: "SYSTEM_ADMIN", status: "ACTIVE", signIn: "EMAIL", nextStep: "SEND_SET_PASSWORD_EMAIL", ...over });
const withSchool = (extra: Record<string, unknown> = {}) => fakeApi({ platformSchoolsList: vi.fn(async () => ({ items: [school()], limit: 50, offset: 0 })), ...extra });
const open = async () => fireEvent.click(await screen.findByRole("button", { name: "Add administrator: Greenfield School" }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getAllByRole("button", { name: "Add administrator" }).at(-1)!);

describe("Add the first administrator of a school", () => {
  it("sends name and email (lowercased), then asks Firebase to email the set-password link and says where it went", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn(async () => created()) });
    const { port } = fakePort(OWNER);
    renderApp(<PlatformApp />, { port, api });
    await open();
    expect(screen.getByText("Add the administrator of Greenfield School")).toBeTruthy();
    type("Full name", " Asha Principal ");
    type("Email address", "Asha@Example.com");
    submit();
    await waitFor(() => expect(api.platformSchoolsCreateAdmin).toHaveBeenCalledWith({ path: { id: school().id }, body: { displayName: "Asha Principal", email: "asha@example.com" } }));
    await waitFor(() => expect(port.sendPasswordReset).toHaveBeenCalledWith("asha@example.com"));
    expect(await screen.findByText("Administrator added. An email to set their password was sent to asha@example.com.")).toBeTruthy();
  });

  it("the body never carries a role or a school: the gateway decides both", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn(async () => created()) });
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api });
    await open();
    type("Full name", "A");
    type("Email address", "a@b.co");
    submit();
    await waitFor(() => expect(api.platformSchoolsCreateAdmin).toHaveBeenCalled());
    const body = ((api.platformSchoolsCreateAdmin as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [{ body: object }])[0].body;
    expect(Object.keys(body).sort()).toEqual(["displayName", "email"]);
  });

  it("phone only: no email is sent and the notice says they sign in with a code", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn(async () => created({ email: null, phoneNumber: "+919876543210", signIn: "PHONE", nextStep: "NONE" })) });
    const { port } = fakePort(OWNER);
    renderApp(<PlatformApp />, { port, api });
    await open();
    type("Full name", "Ravi");
    type("Mobile number", "+91 98765-43210");
    submit();
    await waitFor(() => expect(api.platformSchoolsCreateAdmin).toHaveBeenCalledWith({ path: { id: school().id }, body: { displayName: "Ravi", phoneNumber: "+919876543210" } }));
    expect(await screen.findByText(/sign in with a code sent to their phone/)).toBeTruthy();
    expect(port.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("if the email cannot be sent the admin still exists and the notice is a warning that says what to do", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn(async () => created()) });
    const { port } = fakePort(OWNER);
    port.sendPasswordReset.mockRejectedValueOnce(new Error("x"));
    renderApp(<PlatformApp />, { port, api });
    await open();
    type("Full name", "A");
    type("Email address", "a@b.co");
    submit();
    expect(await screen.findByText(/the email could not be sent/)).toBeTruthy();
    expect(screen.getByText(/Forgot password/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add administrator" })).toBeNull();
  });

  it("a school that already has an administrator is explained as such, not as a name clash", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn().mockRejectedValue(new ApiError("CONFLICT", 409, "x")) });
    const { port } = fakePort(OWNER);
    renderApp(<PlatformApp />, { port, api });
    await open();
    type("Full name", "A");
    type("Email address", "a@b.co");
    submit();
    expect((await screen.findByRole("alert")).textContent).toContain("already has an administrator");
    expect(port.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("an address that already has an account is explained as such", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn().mockRejectedValue(new ApiError("ACCOUNT_EXISTS", 409, "x")) });
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api });
    await open();
    type("Full name", "A");
    type("Email address", "a@b.co");
    submit();
    expect((await screen.findByRole("alert")).textContent).toContain("An account with this email or number already exists");
  });

  it("invalid fields are marked", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn().mockRejectedValue(new ApiError("INVALID_REQUEST", 400, "x", "r", [{ field: "email", rule: "isEmail" }])) });
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api });
    await open();
    type("Full name", "A");
    type("Email address", "not-an-email");
    submit();
    await waitFor(() => expect(screen.getByLabelText("Email address").getAttribute("aria-invalid")).toBe("true"));
  });

  it("cancelling changes nothing", async () => {
    const api = withSchool({ platformSchoolsCreateAdmin: vi.fn() });
    renderApp(<PlatformApp />, { port: fakePort(OWNER).port, api });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("heading", { name: "Schools" })).toBeTruthy();
    expect(api.platformSchoolsCreateAdmin).not.toHaveBeenCalled();
  });
});
