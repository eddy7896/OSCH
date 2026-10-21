"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Banner, Button, TextField } from "@oruschools/shared-ui";
import type { PhoneChallenge } from "@/lib/auth-port";
import { errorKey } from "@/lib/errors";
import { useSession } from "./AuthProvider";

type Mode = "email" | "phone" | "code";

/** Email and password, Google, or a code sent by SMS (the owner's chosen methods, phase 1 questions). */
export function SignIn() {
  const t = useTranslations();
  const { port } = useSession();
  const [mode, setMode] = useState<Mode>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<PhoneChallenge | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const emailField = useRef<HTMLFormElement>(null);
  const recaptcha = useRef<HTMLDivElement>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!port) return;
    const email = String(new FormData(emailField.current ?? undefined).get("email") ?? "").trim();
    setInfo(null);
    if (!email) return setError("authResetNeedsEmail");
    setError(null);
    try {
      await port.sendPasswordReset(email);
      setInfo("authResetSent");
    } catch (e) {
      // Whether the address has an account is never revealed; only a failure to reach the service is.
      const key = errorKey(e);
      if (key === "authErrorNetwork" || key === "authErrorTooMany") setError(key);
      else setInfo("authResetSent");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!port) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const host = recaptcha.current;
    if (mode === "email") {
      void run(() => port.signInWithEmail(value("email"), String(data.get("password") ?? "")));
    } else if (mode === "phone" && host) {
      void run(async () => {
        setChallenge(await port.startPhoneSignIn(value("phone"), host));
        setMode("code");
      });
    } else if (mode === "code" && challenge) {
      void run(() => challenge.confirm(value("code")));
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-card">
        <h1 className="text-title">{t("saasSignInTitle")}</h1>
        <p className="mt-2 text-body text-text-muted">{t("saasSignInIntro")}</p>

        <form ref={emailField} className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
          {error && <Banner tone="danger" title={t(error)} />}
          {info && <Banner tone="success" title={t(info)} />}

          {mode === "email" && (
            <>
              <TextField name="email" type="email" label={t("authEmailLabel")} autoComplete="username" required />
              <TextField name="password" type="password" label={t("authPasswordLabel")} autoComplete="current-password" required />
              <div>
                <Button variant="ghost" size="comfortable" disabled={busy || !port} onClick={() => void forgot()}>
                  {t("authForgot")}
                </Button>
              </div>
            </>
          )}
          {mode === "phone" && <TextField name="phone" type="tel" label={t("authPhoneLabel")} hint={t("authPhoneHint")} autoComplete="tel" required />}
          {mode === "code" && <TextField name="code" inputMode="numeric" label={t("authCodeLabel")} autoComplete="one-time-code" required />}

          <Button type="submit" variant="primary" disabled={busy || !port}>
            {busy ? t("authSigningIn") : mode === "phone" ? t("actionSendCode") : mode === "code" ? t("actionVerifyCode") : t("actionSignIn")}
          </Button>
        </form>

        <div ref={recaptcha} />

        {mode === "email" && (
          <>
            <p className="my-4 text-center text-body text-text-muted">{t("authOr")}</p>
            <div className="flex flex-col gap-3">
              <Button block disabled={busy || !port} onClick={() => port && void run(() => port.signInWithGoogle())}>
                {t("actionSignInGoogle")}
              </Button>
              <Button block variant="ghost" disabled={busy} onClick={() => { setError(null); setMode("phone"); }}>
                {t("actionSignInPhone")}
              </Button>
            </div>
          </>
        )}
        {mode !== "email" && (
          <div className="mt-4">
            <Button block variant="ghost" disabled={busy} onClick={() => { setError(null); setChallenge(null); setMode("email"); }}>
              {t("actionSignInEmail")}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
