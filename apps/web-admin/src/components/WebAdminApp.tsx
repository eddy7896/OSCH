"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { MeResponseDto } from "@oruschools/api-client";
import { Banner, Button, Card, EmptyState } from "@oruschools/shared-ui";
import { errorKey, SignIn, useSession } from "@oruschools/web-auth";
import { ErpShell } from "./ErpShell";
import { useSchool } from "./SchoolProvider";

const Centered = ({ children }: { children: React.ReactNode }) => <main className="flex flex-1 items-center justify-center p-4"><div className="w-full max-w-md">{children}</div></main>;

type MeState = { status: "loading" } | { status: "error"; messageKey: string } | { status: "ready"; me: MeResponseDto };

/** After sign-in: who this person is in this school. Not a member of it: a clear "no access", never a half-working screen. */
function Account({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const t = useTranslations();
  const { api, port, state } = useSession();
  const uid = state.status === "in" ? state.user.uid : "";
  const [me, setMe] = useState<MeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!api || !uid) return;
    let current = true;
    api.meGet({}).then(
      (result) => current && setMe({ status: "ready", me: result }),
      (e: unknown) => current && setMe({ status: "error", messageKey: errorKey(e) }),
    );
    return () => {
      current = false;
    };
  }, [api, uid, schoolId, attempt]);

  const signOut = <Button onClick={() => void port?.signOut()}>{t("actionSignOut")}</Button>;

  if (me.status === "loading") return <Centered><Banner tone="info" title={t("statusLoading")} /></Centered>;
  if (me.status === "error")
    return (
      <Centered>
        <Banner
          tone="danger"
          title={t("webLoadFailed")}
          action={<Button size="comfortable" icon="refresh" onClick={() => { setMe({ status: "loading" }); setAttempt((n) => n + 1); }}>{t("actionRetry")}</Button>}
        >
          {t(me.messageKey)}
        </Banner>
        <div className="mt-4">{signOut}</div>
      </Centered>
    );
  const active = me.me.activeSchool;
  if (!active || active.schoolId !== schoolId)
    return (
      <Centered>
        <Card title={t("webNoAccessTitle", { name: schoolName })} headingLevel={2}>
          <p className="text-body text-text-muted">{t("webNoAccessBody")}</p>
          <div className="mt-4">{signOut}</div>
        </Card>
      </Centered>
    );
  return <ErpShell me={me.me} active={active} school={{ id: schoolId, name: schoolName, subDomain: "", defaultLanguage: me.me.language.effective }} />;
}

/** Address -> school -> sign-in -> account -> the school's area. */
export function WebAdminApp() {
  const t = useTranslations();
  const { state: school, retry } = useSchool();
  const { state } = useSession();

  if (school.status === "resolving") return <Centered><Banner tone="info" title={t("statusLoading")} /></Centered>;
  if (school.status === "none") return <Centered><Card><EmptyState title={t("webNoSchoolTitle")} description={t("webNoSchoolBody")} headingLevel={1} /></Card></Centered>;
  if (school.status === "notFound") return <Centered><Card><EmptyState title={t("webSchoolNotFoundTitle")} description={t("webSchoolNotFoundBody")} headingLevel={1} /></Card></Centered>;
  if (school.status === "error")
    return (
      <Centered>
        <Banner tone="danger" title={t("webLoadFailed")} action={<Button size="comfortable" icon="refresh" onClick={retry}>{t("actionRetry")}</Button>}>
          {t(school.messageKey)}
        </Banner>
      </Centered>
    );

  if (state.status === "loading") return <Centered><Banner tone="info" title={t("statusLoading")} /></Centered>;
  if (state.status === "out") return <SignIn title={t("webSignInTitle", { name: school.school.name })} intro={t("webSignInIntro")} />;
  return <Account schoolId={school.school.id} schoolName={school.school.name} />;
}
