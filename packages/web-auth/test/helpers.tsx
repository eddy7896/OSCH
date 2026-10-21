import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import type { Api } from "@oruschools/api-client";
import { AuthProvider } from "../src/AuthProvider.js";
import type { AuthPort, AuthState, PhoneChallenge } from "../src/auth-port.js";

export const OWNER: AuthState = { status: "in", user: { uid: "u1", email: "owner@example.com", displayName: "Owner" }, isOwner: true };

/** A sign-in service we control: `emit` plays the part of Firebase telling the app who is signed in. */
export function fakePort(initial: AuthState = { status: "out" }) {
  let listener: (s: AuthState) => void = () => undefined;
  const challenge: PhoneChallenge = { confirm: vi.fn(async () => undefined) };
  const port = {
    subscribe: vi.fn((l: (s: AuthState) => void) => {
      listener = l;
      l(initial);
      return () => undefined;
    }),
    signInWithEmail: vi.fn(async () => undefined),
    signInWithGoogle: vi.fn(async () => undefined),
    startPhoneSignIn: vi.fn(async () => challenge),
    sendPasswordReset: vi.fn<(email: string) => Promise<void>>(async () => undefined),
    signOut: vi.fn(async () => undefined),
    getToken: vi.fn(async () => "token"),
  } satisfies AuthPort;
  return { port, challenge, emit: (s: AuthState) => listener(s) };
}

export function renderApp(ui: ReactElement, opts: { port?: AuthPort; api?: Api; locale?: string } = {}) {
  const locale = opts.locale ?? "en";
  return render(
    <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
      <AuthProvider port={opts.port} api={opts.api}>
        {ui}
      </AuthProvider>
    </NextIntlClientProvider>,
  );
}
