"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { LOCALES } from "@oruschools/i18n";
import type { SchoolDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, ListRow, TextField } from "@oruschools/shared-ui";
import { ApiError, type StaffAccountDto } from "@oruschools/api-client";
import { errorKey, invalidFields } from "@/lib/errors";
import { useSession } from "./AuthProvider";

const PAGE = 50;
type Language = (typeof LOCALES)[number]["code"];

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; school: SchoolDto } | { kind: "suspend"; school: SchoolDto } | { kind: "admin"; school: SchoolDto };
type Notice = { key: string; values?: Record<string, string>; tone: "success" | "warning" };

function LanguageSelect({ value, onChange, label }: { value: string; onChange: (code: Language) => void; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-body font-semibold">
      <span>{label}</span>
      <select className="min-h-12 rounded-md border border-border-strong bg-surface px-3 text-body font-normal text-text" value={value} onChange={(e) => onChange(e.target.value as Language)}>
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The platform owner's schools: list, create, rename, suspend and reactivate. The gateway decides who may; this only asks. */
export function SchoolsScreen() {
  const t = useTranslations();
  const { api, port } = useSession();
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [more, setMore] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("errorInternal");
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [badFields, setBadFields] = useState<ReadonlySet<string>>(new Set());
  const [language, setLanguage] = useState<Language>("en");

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  // The first page, again whenever `reload` is called. State is set only when the answer arrives.
  useEffect(() => {
    if (!api) return;
    let current = true;
    api.platformSchoolsList({ query: { limit: PAGE, offset: 0 } }).then(
      (page) => {
        if (!current) return;
        setSchools(page.items);
        setMore(page.items.length === PAGE);
        setPhase("ready");
      },
      (e: unknown) => {
        if (!current) return;
        setLoadError(errorKey(e));
        setPhase("error");
      },
    );
    return () => {
      current = false;
    };
  }, [api, reloadKey]);

  async function loadMore() {
    if (!api) return;
    try {
      const page = await api.platformSchoolsList({ query: { limit: PAGE, offset: schools.length } });
      setSchools((current) => [...current, ...page.items]);
      setMore(page.items.length === PAGE);
    } catch (e) {
      setLoadError(errorKey(e));
      setPhase("error");
    }
  }

  function open(next: View) {
    setNotice(null);
    setFormError(null);
    setBadFields(new Set());
    if (next.kind === "create") setLanguage("en");
    if (next.kind === "edit") setLanguage(next.school.defaultLanguage as Language);
    setView(next);
  }

  async function act(action: () => Promise<unknown>, doneKey: string) {
    setBusy(true);
    setFormError(null);
    setBadFields(new Set());
    try {
      await action();
      setView({ kind: "list" });
      setNotice({ key: doneKey, tone: "success" });
      reload();
    } catch (e) {
      setFormError(errorKey(e));
      setBadFields(invalidFields(e));
    } finally {
      setBusy(false);
    }
  }

  const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api) return;
    const data = new FormData(event.currentTarget);
    void act(() => api.platformSchoolsCreate({ body: { name: text(data, "name"), subDomain: text(data, "subDomain").toLowerCase(), defaultLanguage: language } }), "saasCreated");
  }

  function submitEdit(event: FormEvent<HTMLFormElement>, school: SchoolDto) {
    event.preventDefault();
    if (!api) return;
    const data = new FormData(event.currentTarget);
    const name = text(data, "name");
    // Only what changed is sent.
    const body = { ...(name !== school.name ? { name } : {}), ...(language !== school.defaultLanguage ? { defaultLanguage: language } : {}) };
    if (Object.keys(body).length === 0) return setView({ kind: "list" });
    void act(() => api.platformSchoolsUpdate({ path: { id: school.id }, body }), "saasSaved");
  }

  function submitSuspend(event: FormEvent<HTMLFormElement>, school: SchoolDto) {
    event.preventDefault();
    if (!api) return;
    const reason = text(new FormData(event.currentTarget), "reason");
    void act(() => api.platformSchoolsSuspend({ path: { id: school.id }, body: reason ? { reason } : {} }), "saasSuspendedDone");
  }

  async function submitAdmin(event: FormEvent<HTMLFormElement>, school: SchoolDto) {
    event.preventDefault();
    if (!api) return;
    const data = new FormData(event.currentTarget);
    const email = text(data, "email").toLowerCase();
    const phone = text(data, "phoneNumber").replace(/[\s-]/g, "");
    const body = { displayName: text(data, "displayName"), ...(email ? { email } : {}), ...(phone ? { phoneNumber: phone } : {}) };
    setBusy(true);
    setFormError(null);
    setBadFields(new Set());
    let created: StaffAccountDto;
    try {
      created = await api.platformSchoolsCreateAdmin({ path: { id: school.id }, body });
    } catch (e) {
      setFormError(e instanceof ApiError && e.code === "CONFLICT" ? "saasAdminExists" : errorKey(e));
      setBadFields(invalidFields(e));
      setBusy(false);
      return;
    }
    // The gateway never handles the password link: the browser asks Firebase to email it (ADR-0011).
    let notice: Notice = { key: "saasAdminAddedNoEmail", tone: "success" };
    if (created.nextStep === "SEND_SET_PASSWORD_EMAIL" && created.email) {
      try {
        await port?.sendPasswordReset(created.email);
        notice = { key: "saasAdminAdded", values: { email: created.email }, tone: "success" };
      } catch {
        notice = { key: "saasAdminEmailFailed", tone: "warning" };
      }
    }
    setBusy(false);
    setView({ kind: "list" });
    setNotice(notice);
    reload(); // the list then shows the school as having an administrator
  }

  const fieldError = (name: string) => (badFields.has(name) ? t("errorInvalidRequest") : undefined);

  if (view.kind === "create" || view.kind === "edit") {
    const editing = view.kind === "edit" ? view.school : null;
    return (
      <Card title={editing ? t("saasSchoolEditTitle") : t("saasSchoolCreateTitle")} headingLevel={2}>
        <form className="flex flex-col gap-4" onSubmit={(e) => (editing ? submitEdit(e, editing) : submitCreate(e))} noValidate>
          {formError && <Banner tone="danger" title={t(formError)} />}
          <TextField name="name" label={t("saasSchoolName")} defaultValue={editing?.name ?? ""} error={fieldError("name")} required />
          <TextField
            name="subDomain"
            label={t("saasSchoolSubdomain")}
            hint={t("saasSchoolSubdomainHint")}
            defaultValue={editing?.subDomain ?? ""}
            disabled={editing !== null}
            error={fieldError("subDomain")}
            autoCapitalize="none"
            required
          />
          <LanguageSelect value={language} onChange={setLanguage} label={t("saasSchoolLanguage")} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={busy}>
              {editing ? t("actionSave") : t("actionCreateSchool")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => open({ kind: "list" })}>
              {t("actionCancel")}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (view.kind === "admin") {
    const school = view.school;
    return (
      <Card title={t("saasAdminTitle", { name: school.name })} headingLevel={2}>
        <form className="flex flex-col gap-4" onSubmit={(e) => void submitAdmin(e, school)} noValidate>
          {formError && <Banner tone="danger" title={t(formError)} />}
          <p className="text-body text-text-muted">{t("saasAdminIntro")}</p>
          <TextField name="displayName" label={t("saasAdminName")} error={fieldError("displayName")} autoComplete="off" required />
          <TextField name="email" type="email" label={t("authEmailLabel")} error={fieldError("email")} autoComplete="off" />
          <TextField name="phoneNumber" type="tel" label={t("authPhoneLabel")} hint={t("authPhoneHint")} error={fieldError("phoneNumber")} autoComplete="off" />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={busy}>
              {t("actionAddAdmin")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => open({ kind: "list" })}>
              {t("actionCancel")}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (view.kind === "suspend") {
    const school = view.school;
    return (
      <Card title={t("saasSuspendTitle", { name: school.name })} headingLevel={2}>
        <form className="flex flex-col gap-4" onSubmit={(e) => submitSuspend(e, school)}>
          {formError && <Banner tone="danger" title={t(formError)} />}
          <p className="text-body text-text-muted">{t("saasSuspendBody")}</p>
          <TextField name="reason" label={t("saasSuspendReason")} multiline />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={busy}>
              {t("actionSuspend")}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => open({ kind: "list" })}>
              {t("actionCancel")}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title">{t("saasSchoolsTitle")}</h1>
          {phase === "ready" && <p className="text-body text-text-muted">{t("saasSchoolsCount", { count: schools.length })}</p>}
        </div>
        <Button variant="primary" icon="plus" onClick={() => open({ kind: "create" })}>
          {t("actionCreateSchool")}
        </Button>
      </div>

      {notice && <Banner tone={notice.tone} title={t(notice.key, notice.values)} />}
      {phase === "error" && <Banner tone="danger" title={t("saasLoadFailed")} action={<Button size="comfortable" icon="refresh" onClick={() => { setPhase("loading"); reload(); }}>{t("actionRetry")}</Button>}>{t(loadError)}</Banner>}
      {phase === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {phase === "ready" && schools.length === 0 && (
        <Card>
          <EmptyState title={t("saasSchoolsEmptyTitle")} description={t("saasSchoolsEmptyBody")} headingLevel={2} />
        </Card>
      )}
      {phase === "ready" && schools.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {schools.map((school) => (
            <ListRow
              key={school.id}
              asItem
              size="touch"
              title={school.name}
              subtitle={school.subDomain}
              trailing={
                <>
                  <Badge tone={school.status === "ACTIVE" ? "success" : "warning"}>{school.status === "ACTIVE" ? t("statusActive") : t("statusSuspended")}</Badge>
                  <Button size="comfortable" variant="ghost" aria-label={`${t("actionEdit")}: ${school.name}`} onClick={() => open({ kind: "edit", school })}>
                    {t("actionEdit")}
                  </Button>
                  <Badge tone={school.hasAdministrator ? "info" : "warning"}>{school.hasAdministrator ? t("saasHasAdmin") : t("saasNoAdmin")}</Badge>
                  {!school.hasAdministrator && (
                    <Button size="comfortable" variant="ghost" aria-label={`${t("actionAddAdmin")}: ${school.name}`} onClick={() => open({ kind: "admin", school })}>
                      {t("actionAddAdmin")}
                    </Button>
                  )}
                  {school.status === "ACTIVE" ? (
                    <Button size="comfortable" variant="ghost" aria-label={`${t("actionSuspend")}: ${school.name}`} onClick={() => open({ kind: "suspend", school })}>
                      {t("actionSuspend")}
                    </Button>
                  ) : (
                    <Button
                      size="comfortable"
                      variant="ghost"
                      aria-label={`${t("actionReactivate")}: ${school.name}`}
                      onClick={() => api && void act(() => api.platformSchoolsActivate({ path: { id: school.id }, body: {} }), "saasReactivatedDone")}
                    >
                      {t("actionReactivate")}
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </ul>
      )}
      {phase === "ready" && more && (
        <div>
          <Button onClick={() => void loadMore()}>{t("actionLoadMore")}</Button>
        </div>
      )}
    </div>
  );
}
