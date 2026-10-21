import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import type { Api } from "@oruschools/api-client";
import { AuthProvider } from "@/components/AuthProvider";
import type { AuthPort, AuthState, PhoneChallenge } from "@/lib/auth-port";

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

export function fakeApi(overrides: Record<string, unknown> = {}) {
  return {
    platformSchoolsList: vi.fn(async () => ({ items: [], limit: 50, offset: 0 })),
    platformSchoolsCreate: vi.fn(async () => ({})),
    platformSchoolsUpdate: vi.fn(async () => ({})),
    platformSchoolsSuspend: vi.fn(async () => ({})),
    platformSchoolsActivate: vi.fn(async () => ({})),
    ...overrides,
  } as unknown as Api & Record<string, ReturnType<typeof vi.fn>>;
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

export const school = (over: Partial<{ id: string; name: string; subDomain: string; status: string; defaultLanguage: string }> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Greenfield School",
  subDomain: "greenfield",
  status: "ACTIVE",
  defaultLanguage: "en",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});
