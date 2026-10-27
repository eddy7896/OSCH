import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { getMessages } from "@oruschools/i18n";
import { AuthProvider, type AuthPort, type AuthState } from "@oruschools/web-auth";
import type { Api, MeResponseDto } from "@oruschools/api-client";
import { SchoolProvider } from "@/components/SchoolProvider";

export const SCHOOL = { id: "11111111-1111-4111-8111-111111111111", name: "Greenfield School", subDomain: "greenfield", defaultLanguage: "en" };
export const IN = (over: Partial<{ uid: string; email: string; displayName: string | null }> = {}): AuthState => ({ status: "in", user: { uid: "u1", email: "asha@example.com", displayName: "Asha Kumar", ...over }, isOwner: false });

export function fakePort(initial: AuthState = { status: "out" }) {
  const port = {
    subscribe: vi.fn((l: (s: AuthState) => void) => {
      l(initial);
      return () => undefined;
    }),
    signInWithEmail: vi.fn(async () => undefined),
    signInWithGoogle: vi.fn(async () => undefined),
    startPhoneSignIn: vi.fn(async () => ({ confirm: vi.fn(async () => undefined) })),
    sendPasswordReset: vi.fn<(email: string) => Promise<void>>(async () => undefined),
    signOut: vi.fn(async () => undefined),
    getToken: vi.fn(async () => "token"),
  } satisfies AuthPort;
  return { port };
}

export const me = (over: Partial<MeResponseDto> = {}): MeResponseDto => ({
  user: { id: "u1", email: "asha@example.com", displayName: "Asha Kumar", globalRole: "USER" },
  language: { chosen: null, effective: "en" },
  memberships: [],
  platform: null,
  activeSchool: {
    schoolId: SCHOOL.id,
    role: "SYSTEM_ADMIN",
    permissions: {},
    navigation: [
      { title: "Overview", items: [{ key: "dashboard-system", label: "Dashboard" }] },
      { title: "Academics", items: [{ key: "students", label: "Students" }] },
      { title: "Administration", items: [{ key: "memberships", label: "Users and roles" }, { key: "audit", label: "Audit log" }] },
    ],
  },
  ...over,
});

export function fakeApi(overrides: Record<string, unknown> = {}) {
  return {
    publicSchoolsBySubdomain: vi.fn(async () => SCHOOL),
    meGet: vi.fn(async () => me()),
    // the bell in the top bar asks for the person's notifications on every screen; most tests do not care about them
    notificationsList: vi.fn(async () => ({ unreadCount: 0, items: [] })),
    notificationsPreferences: vi.fn(async () => ({ items: [{ category: "leave", enabled: true }, { category: "substitution", enabled: true }, { category: "payroll", enabled: true }] })),
    // a pay run's page also asks for the unpaid-leave proposals; most tests do not care about them
    leaveDeductionProposals: vi.fn(async () => ({ run: { id: "r", year: 2027, month: 4, status: "DRAFT" }, workingDays: 26, items: [], withoutPayslip: [] })),
    ...overrides,
  } as unknown as Api & Record<string, ReturnType<typeof vi.fn>>;
}

export function renderApp(ui: ReactElement, opts: { port?: AuthPort; api?: Api; host?: string; locale?: string } = {}) {
  const locale = opts.locale ?? "en";
  return render(
    <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
      <SchoolProvider baseDomain="localhost" host={opts.host ?? "greenfield.localhost:3002"} api={opts.api}>
        <AuthProvider port={opts.port} api={opts.api}>
          {ui}
        </AuthProvider>
      </SchoolProvider>
    </NextIntlClientProvider>,
  );
}
