import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { SignIn } from "@/components/SignIn";
import { AuthFailure } from "@/lib/auth-port";
import { fakePort, renderApp } from "./helpers";

const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("SignIn", () => {
  it("signs in with the email and password typed, trimming the email but not the password", async () => {
    const { port } = fakePort();
    renderApp(<SignIn />, { port });
    type("Email address", "  owner@example.com ");
    type("Password", " pass word ");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(port.signInWithEmail).toHaveBeenCalledWith("owner@example.com", " pass word "));
  });

  it("shows a translated message, not Firebase's text, when sign-in fails; and clears it on the next try", async () => {
    const { port } = fakePort();
    port.signInWithEmail.mockRejectedValueOnce(new AuthFailure("CREDENTIALS"));
    renderApp(<SignIn />, { port });
    type("Email address", "a@b.co");
    type("Password", "x");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("The email or password is not correct.");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("Google sign-in", async () => {
    const { port } = fakePort();
    renderApp(<SignIn />, { port });
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(port.signInWithGoogle).toHaveBeenCalledTimes(1));
  });

  it("phone: asks for the number, then the code, and confirms it", async () => {
    const { port, challenge } = fakePort();
    renderApp(<SignIn />, { port });
    fireEvent.click(screen.getByRole("button", { name: "Use a mobile number instead" }));
    expect(screen.queryByLabelText("Password")).toBeNull();
    type("Mobile number", "+91 98765 43210");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(port.startPhoneSignIn).toHaveBeenCalledWith("+91 98765 43210", expect.any(HTMLElement)));
    type("6-digit code", "123456");
    fireEvent.click(await screen.findByRole("button", { name: "Verify code" }));
    await waitFor(() => expect(challenge.confirm).toHaveBeenCalledWith("123456"));
  });

  it("a wrong code is reported in words", async () => {
    const { port, challenge } = fakePort();
    (challenge.confirm as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthFailure("CODE"));
    renderApp(<SignIn />, { port });
    fireEvent.click(screen.getByRole("button", { name: "Use a mobile number instead" }));
    type("Mobile number", "+919876543210");
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("6-digit code");
    type("6-digit code", "000000");
    fireEvent.click(await screen.findByRole("button", { name: "Verify code" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not correct or has expired");
  });

  it("can go back to email from the phone steps", () => {
    renderApp(<SignIn />, { port: fakePort().port });
    fireEvent.click(screen.getByRole("button", { name: "Use a mobile number instead" }));
    fireEvent.click(screen.getByRole("button", { name: "Use email instead" }));
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("every field has a label and the page has no accessibility violations", async () => {
    const { container } = renderApp(<SignIn />, { port: fakePort().port });
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("renders in Urdu right-to-left without missing words", () => {
    renderApp(<SignIn />, { port: fakePort().port, locale: "ur" });
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/saasSignInTitle|authEmailLabel/);
  });
});

describe("SignIn: forgot password", () => {
  it("asks Firebase to email a link to the typed address and says so without revealing whether it has an account", async () => {
    const { port } = fakePort();
    renderApp(<SignIn />, { port });
    type("Email address", " Owner@Example.com ");
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await waitFor(() => expect(port.sendPasswordReset).toHaveBeenCalledWith("Owner@Example.com"));
    expect(await screen.findByText(/If an account exists for that address/)).toBeTruthy();
  });

  it("an unknown address looks the same as a known one", async () => {
    const { port } = fakePort();
    port.sendPasswordReset.mockRejectedValueOnce(new AuthFailure("CREDENTIALS"));
    renderApp(<SignIn />, { port });
    type("Email address", "nobody@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(await screen.findByText(/If an account exists for that address/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a network failure is reported, because then nothing was sent", async () => {
    const { port } = fakePort();
    port.sendPasswordReset.mockRejectedValueOnce(new AuthFailure("NETWORK"));
    renderApp(<SignIn />, { port });
    type("Email address", "a@b.co");
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not reach the sign-in service");
  });

  it("with no address typed it asks for one and sends nothing", () => {
    const { port } = fakePort();
    renderApp(<SignIn />, { port });
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(screen.getByRole("alert").textContent).toContain("Enter your email address first");
    expect(port.sendPasswordReset).not.toHaveBeenCalled();
  });
});
