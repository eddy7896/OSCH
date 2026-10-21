"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApi, type Api } from "@oruschools/api-client";
import { createFirebaseAuthPort, type AuthPort, type AuthState } from "@/lib/auth-port";
import { config } from "@/lib/config";

interface Session {
  state: AuthState;
  port: AuthPort | null;
  /** The typed gateway client; null until the browser has set up sign-in. */
  api: Api | null;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <AuthProvider>");
  return session;
}

/**
 * Sign-in state for the whole app (ADR-0009: the browser signs in with the Firebase web SDK and calls the gateway directly).
 * Firebase is set up in an effect so nothing runs during prerendering; the shell stays static and this is a client island.
 * `port` and `api` can be passed in by tests.
 */
export function AuthProvider({ children, port: injectedPort, api: injectedApi }: { children: ReactNode; port?: AuthPort; api?: Api }) {
  const [port, setPort] = useState<AuthPort | null>(injectedPort ?? null);
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const active = injectedPort ?? createFirebaseAuthPort();
    // The port is published together with the first sign-in report, from inside the subscription callback.
    return active.subscribe((next) => {
      setPort(active);
      setState(next);
    });
  }, [injectedPort]);

  const api = useMemo(
    () => injectedApi ?? (port ? createApi({ baseUrl: config.apiUrl, getToken: ({ forceRefresh }) => port.getToken(forceRefresh) }) : null),
    [injectedApi, port],
  );

  const value = useMemo(() => ({ state, port, api }), [state, port, api]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
