"use client";

import type { FirebaseOptions } from "firebase/app";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createApi, type Api } from "@oruschools/api-client";
import { createFirebaseAuthPort, type AuthPort, type AuthState } from "./auth-port.js";

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

export interface AuthProviderProps {
  children: ReactNode;
  /** The public Firebase web config (it identifies the project and is not a secret). Not needed when a `port` is passed in. */
  firebase?: FirebaseOptions;
  /** The gateway's origin. Not needed when an `api` is passed in. */
  apiUrl?: string;
  /** The school the person is working in (a uuid), sent as X-School-Id on school routes. Read on every request. */
  getSchoolId?: () => string | null | undefined;
  /** For tests. */
  port?: AuthPort;
  api?: Api;
}

/**
 * Sign-in state for the whole app (ADR-0009: the browser signs in with the Firebase web SDK and calls the gateway directly).
 * Firebase is set up in an effect so nothing runs during prerendering; the shell stays static and this is a client island.
 */
export function AuthProvider({ children, firebase, apiUrl, getSchoolId, port: injectedPort, api: injectedApi }: AuthProviderProps) {
  const [port, setPort] = useState<AuthPort | null>(injectedPort ?? null);
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const schoolId = useRef(getSchoolId);
  schoolId.current = getSchoolId;

  useEffect(() => {
    if (!injectedPort && !firebase) throw new Error("AuthProvider needs `firebase` (or an injected `port`)");
    const active = injectedPort ?? createFirebaseAuthPort(firebase as FirebaseOptions);
    // The port is published together with the first sign-in report, from inside the subscription callback.
    return active.subscribe((next) => {
      setPort(active);
      setState(next);
    });
  }, [injectedPort, firebase]);

  const api = useMemo(
    () =>
      injectedApi ??
      (port ? createApi({ baseUrl: apiUrl ?? "", getToken: ({ forceRefresh }) => port.getToken(forceRefresh), getSchoolId: () => schoolId.current?.() }) : null),
    [injectedApi, port, apiUrl],
  );

  const value = useMemo(() => ({ state, port, api }), [state, port, api]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
