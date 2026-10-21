"use client";

import type { ReactNode } from "react";
import { AuthProvider, type AuthPort, type FirebaseConfig } from "@oruschools/web-auth";
import { config } from "@/lib/config";
import { SchoolProvider, useSchool } from "./SchoolProvider";

/** The school first (from the address), then sign-in, which sends that school's id with every school request. */
function WithSession({ children, firebase, apiUrl, port }: { children: ReactNode; firebase?: FirebaseConfig; apiUrl: string; port?: AuthPort }) {
  const { state } = useSchool();
  return (
    <AuthProvider firebase={firebase} apiUrl={apiUrl} port={port} getSchoolId={() => (state.status === "ready" ? state.school.id : undefined)}>
      {children}
    </AuthProvider>
  );
}

export interface AppProvidersProps {
  children: ReactNode;
  baseDomain: string;
  apiUrl: string;
  firebase?: FirebaseConfig;
  /** For tests: the address and the sign-in service. */
  host?: string;
  port?: AuthPort;
}

export function AppProviders({ children, baseDomain, apiUrl, firebase, host, port }: AppProvidersProps) {
  return (
    <SchoolProvider baseDomain={baseDomain} apiUrl={apiUrl} host={host}>
      <WithSession firebase={firebase} apiUrl={apiUrl} port={port}>
        {children}
      </WithSession>
    </SchoolProvider>
  );
}

/** The real thing: configuration from the build, the browser's own address. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProviders baseDomain={config.baseDomain} apiUrl={config.apiUrl} firebase={config.firebase}>
      {children}
    </AppProviders>
  );
}
