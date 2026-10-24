"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { StudentDto, StudentListDto, StudentSummaryDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Pager, SelectField, Saved } from "./parts";

const PAGE_SIZE = 25;
const STATUS_KEY: Record<string, string> = { ACTIVE: "statusActive", INACTIVE: "peoInactive", LEFT: "peoLeft" };
const REL_KEY: Record<string, string> = { MOTHER: "peoMother", FATHER: "peoFather", GUARDIAN: "peoGuardianRel", OTHER: "paymentMethodOther" };
const tone = (status: string) => (status === "ACTIVE" ? "success" : status === "LEFT" ? "neutral" : "warning");

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<StudentDto>(api ? () => api.studentsGet({ path: { id } }) : null, id);
  return (
    <div className="flex flex-col gap-4">
      <div><Button size="comfortable" variant="ghost" icon="arrow-left" onClick={onBack}>{t("peoBackToList")}</Button></div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{state.data.firstName} {state.data.lastName}</h1>
            <Badge tone={tone(state.data.status)}>{t(STATUS_KEY[state.data.status] ?? "statusActive")}</Badge>
          </div>
          <Card headingLevel={2}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [t("receiptEnrollment"), state.data.enrollmentId],
                [t("peoClass"), state.data.placement?.classroom.name ?? ""],
                [t("peoDateOfBirth"), state.data.dateOfBirth ? shortDate(state.data.dateOfBirth, locale) : ""],
                [t("peoAdmissionDate"), state.data.admissionDate ? shortDate(state.data.admissionDate, locale) : ""],
                [t("peoAddress"), state.data.address ?? ""],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-caption text-text-muted">{label}</dt>
                  <dd className="text-body">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title={t("peoGuardians")} headingLevel={2}>
            {state.data.guardians.length === 0 ? (
              <p className="text-body text-text-muted">{t("peoNoGuardians")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.data.guardians.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 text-body">
                    <span>{g.name}<span className="ms-2 text-text-muted">{t(REL_KEY[g.relationship] ?? "paymentMethodOther")}</span></span>
                    <span className="flex items-center gap-2 text-text-muted">{g.isPrimary && <Badge tone="brand">{t("peoPrimary")}</Badge>}<span dir="ltr">{g.phone ?? g.email ?? ""}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {state.data.placements.length > 0 && (
            <Card title={t("peoClassHistory")} headingLevel={2}>
              <ul className="flex flex-col gap-1">
                {state.data.placements.map((p) => (
                  <li key={`${p.academicYear.id}-${p.classroom.id}`} className="flex justify-between gap-3 text-body"><span>{p.classroom.name}</span><span className="text-text-muted">{p.academicYear.name}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AddForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [f, setF] = useState({ firstName: "", lastName: "", dateOfBirth: "", gender: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      await api.studentsCreate({ body: { firstName: f.firstName, lastName: f.lastName, ...(f.dateOfBirth ? { dateOfBirth: f.dateOfBirth } : {}), ...(f.gender ? { gender: f.gender as "FEMALE" | "MALE" | "OTHER" } : {}), ...(f.address ? { address: f.address } : {}) } });
      onDone();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("peoAddStudent")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField size="comfortable" label={t("peoFirstName")} value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} required />
          <TextField size="comfortable" label={t("peoLastName")} value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} required />
          <TextField size="comfortable" type="date" label={t("peoDateOfBirth")} value={f.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} />
          <SelectField label={t("peoGender")} value={f.gender} onChange={set("gender")} options={[{ value: "", label: "" }, { value: "FEMALE", label: t("peoFemale") }, { value: "MALE", label: t("peoMale") }, { value: "OTHER", label: t("paymentMethodOther") }]} />
        </div>
        <TextField size="comfortable" label={t("peoAddress")} value={f.address} onChange={(e) => set("address")(e.target.value)} />
        {error && <Banner tone="danger" title={t(error)} />}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="comfortable" disabled={busy || !f.firstName.trim() || !f.lastName.trim()}>{t("actionSave")}</Button>
          <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Students: search, filter by status, the roll as a table, add a student, open one to see the profile, guardians and class history. */
export function Students({ canCreate }: { canCreate: boolean }) {
  const t = useTranslations();
  const { api } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [state, reload] = useLoad<StudentListDto>(
    api ? () => api.studentsList({ query: { page, pageSize: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status: status as "ACTIVE" | "INACTIVE" | "LEFT" } : {}) } }) : null,
    `${search}|${status}|${page}`,
  );
  if (open) return <Detail id={open} onBack={() => setOpen(null)} />;

  const columns: Column<StudentSummaryDto>[] = [
    { key: "id", header: t("receiptEnrollment"), render: (r) => r.enrollmentId },
    { key: "name", header: t("receiptStudent"), render: (r) => <button type="button" className="text-start font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>{r.firstName} {r.lastName}</button> },
    { key: "class", header: t("peoClass"), render: (r) => r.placement?.classroom.name ?? "" },
    { key: "status", header: t("reportStatus"), render: (r) => <Badge tone={tone(r.status)}>{t(STATUS_KEY[r.status] ?? "statusActive")}</Badge> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t("navStudents")}</h1>
        {canCreate && !adding && <Button variant="primary" size="comfortable" icon="user-plus" onClick={() => { setAdding(true); setAdded(false); }}>{t("peoAddStudent")}</Button>}
      </div>
      {added && <Saved>{t("peoStudentAdded")}</Saved>}
      {adding && <AddForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setAdded(true); setPage(1); reload(); }} />}
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" type="search" icon="search" aria-label={t("peoSearch")} placeholder={t("peoSearch")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="min-w-64 flex-1" />
        <SelectField label={t("reportStatus")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: t("peoAll") }, { value: "ACTIVE", label: t("statusActive") }, { value: "INACTIVE", label: t("peoInactive") }, { value: "LEFT", label: t("peoLeft") }]} />
      </div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.total === 0 && (
        <Card><EmptyState title={search || status ? t("peoNoMatch") : t("peoNoStudentsTitle")} description={search || status ? undefined : t("peoNoStudentsBody")} headingLevel={2} /></Card>
      )}
      {state.status === "ready" && state.data.total > 0 && (
        <>
          <DataTable caption={t("navStudents")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />
          <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
