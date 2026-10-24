"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AcademicYearListDto, ApplicationDto, ApplicationListDto, ApplicationSummaryDto, ClassListDto, GradeLevelListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Pager, SelectField, Saved } from "./parts";

const PAGE_SIZE = 25;
const STATUS_KEY: Record<string, string> = { SUBMITTED: "peoSubmitted", UNDER_REVIEW: "peoUnderReview", ACCEPTED: "peoAccepted", REJECTED: "peoRejected", WITHDRAWN: "peoWithdrawn", ADMITTED: "peoAdmitted" };
const TONE: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = { SUBMITTED: "info", UNDER_REVIEW: "warning", ACCEPTED: "success", REJECTED: "danger", WITHDRAWN: "neutral", ADMITTED: "success" };
/** The steps a person may take from each status (the gateway enforces the same table; this only decides which buttons to show). */
const NEXT: Record<string, Array<{ to: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"; label: string }>> = {
  SUBMITTED: [{ to: "UNDER_REVIEW", label: "peoStartReview" }, { to: "ACCEPTED", label: "peoAccept" }, { to: "REJECTED", label: "peoReject" }, { to: "WITHDRAWN", label: "peoWithdraw" }],
  UNDER_REVIEW: [{ to: "ACCEPTED", label: "peoAccept" }, { to: "REJECTED", label: "peoReject" }, { to: "WITHDRAWN", label: "peoWithdraw" }],
  ACCEPTED: [{ to: "WITHDRAWN", label: "peoWithdraw" }],
};
const REL = [{ value: "MOTHER", label: "peoMother" }, { value: "FATHER", label: "peoFather" }, { value: "GUARDIAN", label: "peoGuardianRel" }, { value: "OTHER", label: "paymentMethodOther" }];

function Detail({ id, canUpdate, onBack, onChanged }: { id: string; canUpdate: boolean; onBack: () => void; onChanged: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<ApplicationDto>(api ? () => api.admissionsGet({ path: { id } }) : null, id);
  const [note, setNote] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admittedAs, setAdmittedAs] = useState<string | null>(null);
  const levelId = state.status === "ready" ? state.data.gradeLevel.id : "";
  const [classes] = useLoad<ClassListDto>(api && state.status === "ready" && state.data.status === "ACCEPTED" ? () => api.academicsClasses({}) : null, `classes|${state.status === "ready" ? state.data.status : ""}`);
  const choices = classes.status === "ready" ? classes.data.items.filter((c) => c.gradeLevel.id === levelId) : [];

  const act = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await run();
      reload();
      onChanged();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div><Button size="comfortable" variant="ghost" icon="arrow-left" onClick={onBack}>{t("peoBackToList")}</Button></div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{state.data.firstName} {state.data.lastName}</h1>
            <Badge tone={TONE[state.data.status] ?? "neutral"}>{t(STATUS_KEY[state.data.status] ?? "peoSubmitted")}</Badge>
          </div>
          <Card headingLevel={2}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [t("peoApplicationNo"), state.data.applicationNo],
                [t("peoLevelApplied"), state.data.gradeLevel.name],
                [t("peoGuardianName"), state.data.guardianName],
                [t("peoRelationship"), t(REL.find((r) => r.value === state.data.guardianRelationship)?.label ?? "paymentMethodOther")],
                [t("peoGuardianPhone"), state.data.guardianPhone ?? ""],
                [t("authEmailLabel"), state.data.guardianEmail ?? ""],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-caption text-text-muted">{label}</dt>
                  <dd className="text-body">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {state.data.decisionNote && <p className="mt-3 text-body text-text-muted">{state.data.decisionNote}</p>}
          </Card>
          {admittedAs && <Saved>{t("peoStudentAdmitted", { id: admittedAs })}</Saved>}
          {error && <Banner tone="danger" title={t(error)} />}
          {canUpdate && NEXT[state.data.status] && (
            <Card headingLevel={2}>
              <div className="flex flex-col gap-3">
                <TextField size="comfortable" label={t("peoNote")} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {NEXT[state.data.status]!.map((n) => (
                    <Button key={n.to} size="comfortable" disabled={busy} onClick={() => void act(() => api!.admissionsDecide({ path: { id }, body: { status: n.to, ...(note.trim() ? { note: note.trim() } : {}) } }))}>{t(n.label)}</Button>
                  ))}
                </div>
              </div>
            </Card>
          )}
          {canUpdate && state.data.status === "ACCEPTED" && (
            <Card headingLevel={2}>
              <div className="flex flex-wrap items-end gap-3">
                <SelectField label={t("peoClass")} value={classroomId} onChange={setClassroomId} options={[{ value: "", label: "" }, ...choices.map((c) => ({ value: c.id, label: c.name }))]} />
                <Button variant="primary" size="comfortable" disabled={busy || !classroomId} onClick={() => void act(async () => { const r = await api!.admissionsAdmit({ path: { id }, body: { classroomId } }); setAdmittedAs(r.student.enrollmentId); })}>{t("peoAdmitStudent")}</Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function NewApplication({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [levels] = useLoad<GradeLevelListDto>(api ? () => api.academicsLevels({}) : null, "levels");
  const [years] = useLoad<AcademicYearListDto>(api ? () => api.academicsYears({}) : null, "years");
  const [f, setF] = useState({ firstName: "", lastName: "", dateOfBirth: "", gender: "", gradeLevelId: "", guardianName: "", guardianRelationship: "MOTHER", guardianPhone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const activeYear = years.status === "ready" ? years.data.items.find((y) => y.status === "ACTIVE") : undefined;
  const ready = f.firstName.trim() && f.lastName.trim() && f.gradeLevelId && f.guardianName.trim();
  const save = async () => {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      await api.admissionsCreate({
        body: {
          firstName: f.firstName, lastName: f.lastName, gradeLevelId: f.gradeLevelId, guardianName: f.guardianName, guardianRelationship: f.guardianRelationship as "MOTHER",
          ...(activeYear ? { academicYearId: activeYear.id } : {}), ...(f.dateOfBirth ? { dateOfBirth: f.dateOfBirth } : {}), ...(f.gender ? { gender: f.gender as "FEMALE" } : {}), ...(f.guardianPhone ? { guardianPhone: f.guardianPhone } : {}),
        },
      });
      onDone();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("peoNewApplication")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField size="comfortable" label={t("peoFirstName")} value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} required />
          <TextField size="comfortable" label={t("peoLastName")} value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} required />
          <TextField size="comfortable" type="date" label={t("peoDateOfBirth")} value={f.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} />
          <SelectField label={t("peoGender")} value={f.gender} onChange={set("gender")} options={[{ value: "", label: "" }, { value: "FEMALE", label: t("peoFemale") }, { value: "MALE", label: t("peoMale") }, { value: "OTHER", label: t("paymentMethodOther") }]} />
          <SelectField label={t("peoLevelApplied")} value={f.gradeLevelId} onChange={set("gradeLevelId")} options={[{ value: "", label: "" }, ...(levels.status === "ready" ? levels.data.items.map((l) => ({ value: l.id, label: l.name })) : [])]} />
          <TextField size="comfortable" label={t("peoGuardianName")} value={f.guardianName} onChange={(e) => set("guardianName")(e.target.value)} required />
          <SelectField label={t("peoRelationship")} value={f.guardianRelationship} onChange={set("guardianRelationship")} options={REL.map((r) => ({ value: r.value, label: t(r.label) }))} />
          <TextField size="comfortable" type="tel" label={t("peoGuardianPhone")} hint={t("authPhoneHint")} value={f.guardianPhone} onChange={(e) => set("guardianPhone")(e.target.value)} />
        </div>
        {error && <Banner tone="danger" title={t(error)} />}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="comfortable" disabled={busy || !ready}>{t("actionSave")}</Button>
          <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Admission applications: the list with a status filter, a new application, and for each one the steps the school may take (review, accept, reject, withdraw) and admitting the child into a class. */
export function Admissions({ canCreate, canUpdate }: { canCreate: boolean; canUpdate: boolean }) {
  const t = useTranslations();
  const { api } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [state, reload] = useLoad<ApplicationListDto>(
    api ? () => api.admissionsList({ query: { page, pageSize: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status: status as "SUBMITTED" } : {}) } }) : null,
    `${search}|${status}|${page}`,
  );
  if (open) return <Detail id={open} canUpdate={canUpdate} onBack={() => { setOpen(null); reload(); }} onChanged={reload} />;

  const columns: Column<ApplicationSummaryDto>[] = [
    { key: "no", header: t("peoApplicationNo"), render: (r) => r.applicationNo },
    { key: "name", header: t("peoApplicant"), render: (r) => <button type="button" className="text-start font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>{r.firstName} {r.lastName}</button> },
    { key: "level", header: t("peoLevelApplied"), render: (r) => r.gradeLevel.name },
    { key: "guardian", header: t("peoGuardianName"), render: (r) => r.guardianName },
    { key: "status", header: t("reportStatus"), render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{t(STATUS_KEY[r.status] ?? "peoSubmitted")}</Badge> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t("navAdmissions")}</h1>
        {canCreate && !adding && <Button variant="primary" size="comfortable" icon="user-plus" onClick={() => { setAdding(true); setSaved(false); }}>{t("peoNewApplication")}</Button>}
      </div>
      {saved && <Saved>{t("peoApplicationSaved")}</Saved>}
      {adding && <NewApplication onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setSaved(true); setPage(1); reload(); }} />}
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" type="search" icon="search" aria-label={t("peoSearch")} placeholder={t("peoSearch")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="min-w-64 flex-1" />
        <SelectField label={t("reportStatus")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: t("peoAll") }, ...Object.entries(STATUS_KEY).map(([value, label]) => ({ value, label: t(label) }))]} />
      </div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.total === 0 && <Card><EmptyState title={search || status ? t("peoNoMatch") : t("peoNoApplicationsTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.total > 0 && (
        <>
          <DataTable caption={t("navAdmissions")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />
          <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
