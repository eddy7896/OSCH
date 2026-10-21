"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApi, type Api, type PublicSchoolDto } from "@oruschools/api-client";
import { errorKey } from "@oruschools/web-auth";
import { subdomainFromHost } from "@/lib/school-address";

export type SchoolState =
  | { status: "resolving" }
  /** The address is not a school's own address (no subdomain). */
  | { status: "none" }
  /** One answer for an unknown, malformed or suspended school: the gateway does not say which. */
  | { status: "notFound" }
  | { status: "error"; messageKey: string }
  | { status: "ready"; school: PublicSchoolDto };

const SchoolContext = createContext<{ state: SchoolState; retry: () => void } | null>(null);

export function useSchool() {
  const value = useContext(SchoolContext);
  if (!value) throw new Error("useSchool must be used inside <SchoolProvider>");
  return value;
}

/**
 * Works out which school this address belongs to (ADR-0009) with the public lookup, before anyone signs in. The result is
 * only used to show the school's name and to send X-School-Id; the gateway verifies membership on every request.
 * `host`, `api` are for tests.
 */
export function SchoolProvider({ children, baseDomain, apiUrl, host, api: injectedApi }: { children: ReactNode; baseDomain: string; apiUrl?: string; host?: string; api?: Api }) {
  const [state, setState] = useState<SchoolState>({ status: "resolving" });
  const [attempt, setAttempt] = useState(0);
  const api = useMemo(() => injectedApi ?? createApi({ baseUrl: apiUrl ?? "" }), [injectedApi, apiUrl]);

  useEffect(() => {
    let current = true;
    const sub = subdomainFromHost(host ?? window.location.host, baseDomain);
    if (!sub) {
      void Promise.resolve().then(() => current && setState({ status: "none" }));
      return () => {
        current = false;
      };
    }
    api.publicSchoolsBySubdomain({ path: { sub } }).then(
      (school) => current && setState({ status: "ready", school }),
      (e: unknown) => {
        if (!current) return;
        const key = errorKey(e);
        const notFound = typeof e === "object" && e !== null && (e as { code?: string }).code === "NOT_FOUND";
        setState(notFound ? { status: "notFound" } : { status: "error", messageKey: key });
      },
    );
    return () => {
      current = false;
    };
  }, [api, baseDomain, host, attempt]);

  const value = useMemo(
    () => ({
      state,
      retry: () => {
        setState({ status: "resolving" });
        setAttempt((n) => n + 1);
      },
    }),
    [state],
  );
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}
