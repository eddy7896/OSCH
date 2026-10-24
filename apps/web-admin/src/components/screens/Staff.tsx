"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SalaryDto, StaffDto, StaffListDto, StaffSummaryDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { rupees, rupeesToMinor, shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Pager, Saved, SelectField } from "./parts";

const PAGE_SIZE = 25;
const STATUS_KEY: Record<string, string> = { ACTIVE: "statusActive", INACTIVE: "peoInactive", LEFT: "peoLeft" };
const tone = (status: string) => (status === "ACTIVE" ? "success" : status === "LEFT" ? "neutral" : "warning");

export interface StaffGrants {
  create: boolean;
  /** May see salaries (the `payroll` read grant). */
  salaryRead: boolean;
  /** May add a salary line (`payroll` create). */
  salaryAdd: boolean;
  /** May remove one (`payroll` delete: the Bursar). */
  salaryRemove: boolean;
}

function Salary({ staffId, grants }: { staffId: string; grants: StaffGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<SalaryDto>(api ? () => api.payrollSalary({ path: { staffId } }) : null, staffId);
  const [kind, setKind] = useState("EARNING");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const minor = rupeesToMinor(amount);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setError(errorKey(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("hrpSalary")} headingLevel={2}>
      <div className="flex flex-col gap-4">
        {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
        {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
        {state.status === "ready" && (
          <>
            {state.data.lines.length === 0 ? (
              <p className="text-body text-text-muted">{t("hrpNoLines")}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {state.data.lines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-body">
                    <span>{l.name}<span className="ms-2 text-text-muted">{t(l.kind === "EARNING" ? "hrpEarning" : "hrpDeduction")}</span></span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{rupees(l.amountMinor, locale)}</span>
                      {grants.salaryRemove && <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${l.name}`} disabled={busy} onClick={() => void run(() => api!.payrollRemoveLine({ path: { id: l.id } }))}>{t("hrpRemove")}</Button>}
                    </span>
                  </li>
                ))}
                <li className="mt-2 flex justify-between gap-3 border-t border-border pt-2 text-body font-semibold">
                  <span>{t("payslipNetPay")}</span><span className="tabular-nums">{rupees(state.data.netMinor, locale)}</span>
                </li>
              </ul>
            )}
            {added && <Saved>{t("hrpAddLine")}</Saved>}
            {error && <Banner tone="danger" title={t(error)} />}
            {grants.salaryAdd && (
              <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!minor) return; void run(() => api!.payrollAddLine({ path: { staffId }, body: { kind: kind as "EARNING", name: name.trim(), amountMinor: minor } })).then((ok) => { if (ok) { setName(""); setAmount(""); setAdded(true); } }); }}>
                <SelectField label={t("hrpKind")} value={kind} onChange={setKind} options={[{ value: "EARNING", label: t("hrpEarning") }, { value: "DEDUCTION", label: t("hrpDeduction") }]} />
                <TextField size="comfortable" label={t("hrpComponent")} value={name} onChange={(e) => setName(e.target.value)} />
                <TextField size="comfortable" inputMode="decimal" label={t("hrpAmount")} hint={t("hrpAmountHint")} value={amount} onChange={(e) => setAmount(e.target.value)} error={amount && !minor ? t("hrpAmountHint") : undefined} />
                <Button type="submit" size="comfortable" disabled={busy || !name.trim() || !minor}>{t("hrpAddLine")}</Button>
              </form>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function Detail({ id, grants, onBack }: { id: string; grants: StaffGrants; onBack: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<StaffDto>(api ? () => api.staffGet({ path: { id } }) : null, id);
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
                [t("payslipEmployeeId"), state.data.employeeId],
                [t("payslipDepartment"), state.data.department ?? ""],
                [t("payslipDesignation"), state.data.designation ?? ""],
                [t("hrpJoined"), state.data.dateOfJoining ? shortDate(state.data.dateOfJoining, locale) : ""],
                [t("authPhoneLabel"), state.data.phone ?? ""],
                [t("authEmailLabel"), state.data.email ?? ""],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-caption text-text-muted">{label}</dt>
                  <dd className="text-body" dir={label === t("authPhoneLabel") || label === t("authEmailLabel") ? "ltr" : undefined}>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {grants.salaryRead && <Salary staffId={id} grants={grants} />}
        </>
      )}
    </div>
  );
}

function AddForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [f, setF] = useState({ firstName: "", lastName: "", department: "", designation: "", phone: "", email: "", dateOfJoining: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!api) return;
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim() !== "")) as { firstName: string; lastName: string };
      await api.staffCreate({ body });
      onDone();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("hrpAddStaff")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField size="comfortable" label={t("peoFirstName")} value={f.firstName} onChange={(e) => set("firstName")(e.target.value)} required />
          <TextField size="comfortable" label={t("peoLastName")} value={f.lastName} onChange={(e) => set("lastName")(e.target.value)} required />
          <TextField size="comfortable" label={t("payslipDepartment")} value={f.department} onChange={(e) => set("department")(e.target.value)} />
          <TextField size="comfortable" label={t("payslipDesignation")} value={f.designation} onChange={(e) => set("designation")(e.target.value)} />
          <TextField size="comfortable" type="tel" label={t("authPhoneLabel")} hint={t("authPhoneHint")} value={f.phone} onChange={(e) => set("phone")(e.target.value)} />
          <TextField size="comfortable" type="email" label={t("authEmailLabel")} value={f.email} onChange={(e) => set("email")(e.target.value)} />
          <TextField size="comfortable" type="date" label={t("hrpJoined")} value={f.dateOfJoining} onChange={(e) => set("dateOfJoining")(e.target.value)} />
        </div>
        {error && <Banner tone="danger" title={t(error)} />}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="comfortable" disabled={busy || !f.firstName.trim() || !f.lastName.trim()}>{t("actionSave")}</Button>
          <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Staff records: search, filter by status and department, add a staff member, and a page with the profile and (for roles that may see pay) the salary lines. */
export function Staff({ grants }: { grants: StaffGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [departments] = useLoad<string[]>(api ? async () => (await api.staffDepartments({})).items : null, "departments");
  const [state, reload] = useLoad<StaffListDto>(
    api ? () => api.staffList({ query: { page, pageSize: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status: status as "ACTIVE" } : {}), ...(department ? { department } : {}) } }) : null,
    `${search}|${status}|${department}|${page}`,
  );
  if (open) return <Detail id={open} grants={grants} onBack={() => setOpen(null)} />;

  const columns: Column<StaffSummaryDto>[] = [
    { key: "id", header: t("payslipEmployeeId"), render: (r) => r.employeeId },
    { key: "name", header: t("payslipEmployee"), render: (r) => <button type="button" className="text-start font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>{r.firstName} {r.lastName}</button> },
    { key: "dept", header: t("payslipDepartment"), render: (r) => r.department ?? "" },
    { key: "role", header: t("payslipDesignation"), render: (r) => r.designation ?? "" },
    { key: "status", header: t("reportStatus"), render: (r) => <Badge tone={tone(r.status)}>{t(STATUS_KEY[r.status] ?? "statusActive")}</Badge> },
  ];
  const filtered = search || status || department;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t("navStaff")}</h1>
        {grants.create && !adding && <Button variant="primary" size="comfortable" icon="user-plus" onClick={() => { setAdding(true); setAdded(false); }}>{t("hrpAddStaff")}</Button>}
      </div>
      {added && <Saved>{t("hrpStaffAdded")}</Saved>}
      {adding && <AddForm onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setAdded(true); setPage(1); reload(); }} />}
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" type="search" icon="search" aria-label={t("hrpSearch")} placeholder={t("hrpSearch")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="min-w-64 flex-1" />
        <SelectField label={t("reportStatus")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: t("peoAll") }, { value: "ACTIVE", label: t("statusActive") }, { value: "INACTIVE", label: t("peoInactive") }, { value: "LEFT", label: t("peoLeft") }]} />
        <SelectField label={t("payslipDepartment")} value={department} onChange={(v) => { setDepartment(v); setPage(1); }} options={[{ value: "", label: t("hrpAllDepartments") }, ...(departments.status === "ready" ? departments.data.map((d) => ({ value: d, label: d })) : [])]} />
      </div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.total === 0 && <Card><EmptyState title={filtered ? t("hrpNoMatch") : t("hrpNoStaffTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.total > 0 && (
        <>
          <DataTable caption={t("navStaff")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />
          <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
