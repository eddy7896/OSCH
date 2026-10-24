"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PayrollRunDto, PayrollRunListDto, PayrollRunSummaryDto, PayslipDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, StatCard, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { monthLabel, rupees, shortDate, todayIso } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { saveFile } from "./download";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";

const STATUS_KEY: Record<string, string> = { DRAFT: "hrpDraft", APPROVED: "reportApproved", PAID: "reportPaid" };
const TONE: Record<string, "warning" | "info" | "success"> = { DRAFT: "warning", APPROVED: "info", PAID: "success" };

export interface PayrollGrants {
  create: boolean;
  /** The Principal. */
  approve: boolean;
  /** The Bursar: paying and deleting a draft. */
  pay: boolean;
}

type Pending = "approve" | "pay" | "delete" | null;

function Detail({ id, grants, onBack, onChanged }: { id: string; grants: PayrollGrants; onBack: () => void; onChanged: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<PayrollRunDto>(api ? () => api.payrollRun({ path: { id } }) : null, id);
  const [pending, setPending] = useState<Pending>(null);
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPending(null);
      after?.();
      reload();
      onChanged();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const pdf = async (slip: PayslipDto) => {
    setError(null);
    try {
      const blob = (await api!.payrollPayslipPdf({ path: { id: slip.id }, query: { lang: locale }, parseAs: "blob" })) as Blob;
      saveFile(blob, `payslip-${slip.staff.employeeId}.pdf`);
    } catch (e) {
      setError(errorKey(e));
    }
  };

  if (gone) return <div className="flex flex-col gap-4"><Button size="comfortable" variant="ghost" icon="arrow-left" onClick={onBack}>{t("peoBackToList")}</Button></div>;
  const run = state.status === "ready" ? state.data : null;
  const month = run ? monthLabel(run.year, run.month) : "";
  const columns: Column<PayslipDto>[] = [
    {
      key: "name", header: t("payslipEmployee"),
      render: (s) => (
        <details>
          <summary className="cursor-pointer font-semibold">{s.staff.name}<span className="ms-2 text-caption font-normal text-text-muted">{s.staff.employeeId}</span></summary>
          <ul className="mt-2 flex flex-col gap-1 text-caption">
            {s.lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3"><span>{l.name}<span className="ms-2 text-text-muted">{t(l.kind === "EARNING" ? "hrpEarning" : "hrpDeduction")}</span></span><span className="tabular-nums">{rupees(l.amountMinor, locale)}</span></li>
            ))}
          </ul>
        </details>
      ),
    },
    { key: "dept", header: t("payslipDepartment"), render: (s) => s.staff.department ?? "" },
    { key: "gross", header: t("payslipGross"), numeric: true, render: (s) => rupees(s.grossMinor, locale) },
    { key: "ded", header: t("payslipTotalDeductions"), numeric: true, render: (s) => rupees(s.deductionsMinor, locale) },
    { key: "net", header: t("payslipNetPay"), numeric: true, render: (s) => rupees(s.netMinor, locale) },
    ...(run && run.status !== "DRAFT" ? [{ key: "pdf", header: t("hrpPayslipPdf"), render: (s: PayslipDto) => <Button size="compact" onClick={() => void pdf(s)}>{t("hrpPayslipPdf")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div><Button size="comfortable" variant="ghost" icon="arrow-left" onClick={onBack}>{t("peoBackToList")}</Button></div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {run && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{t("hrpRunTitle", { month })}</h1>
            <Badge tone={TONE[run.status] ?? "info"}>{t(STATUS_KEY[run.status] ?? "hrpDraft")}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("payslipGross")} value={rupees(run.totals.grossMinor, locale)} sub={`${t("reportHeadcount")}: ${run.totals.payslips}`} icon="payments" locale={locale} />
            <StatCard label={t("payslipTotalDeductions")} value={rupees(run.totals.deductionsMinor, locale)} icon="alert" tone="warning" locale={locale} />
            <StatCard label={t("payslipNetPay")} value={rupees(run.totals.netMinor, locale)} icon="check-circle" tone="success" locale={locale} />
          </div>
          <Card headingLevel={2}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [t("hrpPreparedBy"), run.preparedBy.name],
                [t("hrpApprovedBy"), run.approvedBy ? `${run.approvedBy.name}${run.approvedAt ? `, ${shortDate(run.approvedAt.slice(0, 10), locale)}` : ""}` : ""],
                [t("payslipPaidOn"), run.paidOn ? shortDate(run.paidOn, locale) : ""],
                [t("receiptReference"), run.paymentReference ?? ""],
              ].map(([label, value]) => (
                <div key={label}><dt className="text-caption text-text-muted">{label}</dt><dd className="text-body">{value || "—"}</dd></div>
              ))}
            </dl>
          </Card>
          {error && <Banner tone="danger" title={t(error)} />}
          {pending === null && (
            <div className="flex flex-wrap gap-2">
              {grants.approve && run.status === "DRAFT" && <Button variant="primary" size="comfortable" disabled={busy || run.totals.payslips === 0} onClick={() => setPending("approve")}>{t("hrpApprove")}</Button>}
              {grants.pay && run.status === "APPROVED" && <Button variant="primary" size="comfortable" disabled={busy} onClick={() => setPending("pay")}>{t("hrpPay")}</Button>}
              {grants.pay && run.status === "DRAFT" && <Button variant="danger" size="comfortable" disabled={busy} onClick={() => setPending("delete")}>{t("hrpDeleteRun")}</Button>}
            </div>
          )}
          {pending && (
            <ConfirmBox question={t(pending === "approve" ? "hrpConfirmApprove" : pending === "pay" ? "hrpConfirmPay" : "hrpConfirmDelete", { month, count: run.totals.payslips, net: rupees(run.totals.netMinor, locale) })}>
              {pending === "pay" && (
                <>
                  <TextField size="comfortable" label={t("receiptReference")} value={reference} onChange={(e) => setReference(e.target.value)} />
                  <TextField size="comfortable" type="date" label={t("payslipPaidOn")} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                </>
              )}
              <Button size="comfortable" variant={pending === "delete" ? "danger" : "primary"} disabled={busy} onClick={() => void act(
                pending === "approve" ? () => api!.payrollApprove({ path: { id } }) : pending === "pay" ? () => api!.payrollPay({ path: { id }, body: { ...(reference.trim() ? { reference: reference.trim() } : {}), ...(paidOn ? { paidOn } : {}) } }) : () => api!.payrollDeleteRun({ path: { id } }),
                pending === "delete" ? () => setGone(true) : undefined,
              )}>{t("hrpConfirm")}</Button>
              <Button size="comfortable" onClick={() => setPending(null)}>{t("actionCancel")}</Button>
            </ConfirmBox>
          )}
          <DataTable caption={t("navPayroll")} columns={columns} rows={run.payslips} rowKey={(s) => s.id} />
        </>
      )}
    </div>
  );
}

function NewRun({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const now = new Date();
  const [year, setYear] = useState(String(now.getUTCFullYear()));
  const [month, setMonth] = useState(String(now.getUTCMonth() + 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^\d{4}$/.test(year);
  return (
    <Card title={t("hrpNewRun")} headingLevel={2}>
      <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api!.payrollCreateRun({ body: { year: Number(year), month: Number(month) } });
          onDone();
        } catch (err) {
          setError(errorKey(err));
        } finally {
          setBusy(false);
        }
      }}>
        <SelectField label={t("reportMonth")} value={month} onChange={setMonth} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, "0") }))} />
        <TextField size="comfortable" inputMode="numeric" label={t("reportYear")} value={year} onChange={(e) => setYear(e.target.value)} />
        <Button type="submit" variant="primary" size="comfortable" disabled={busy || !valid}>{t("hrpNewRun")}</Button>
        <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
      </form>
      {error && <div className="mt-3"><Banner tone="danger" title={t(error)} /></div>}
    </Card>
  );
}

/** Payroll: the monthly runs, a new run, and a run's page with payslips, approval by the Principal, payment by the Bursar and payslip PDFs. */
export function Payroll({ grants }: { grants: PayrollGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(false);
  const [state, reload] = useLoad<PayrollRunListDto>(api ? () => api.payrollRuns({ query: { limit: 100 } }) : null, "runs");
  if (open) return <Detail id={open} grants={grants} onBack={() => { setOpen(null); reload(); }} onChanged={reload} />;

  const columns: Column<PayrollRunSummaryDto>[] = [
    { key: "month", header: t("reportMonth"), render: (r) => <button type="button" className="text-start font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>{monthLabel(r.year, r.month)}</button> },
    { key: "status", header: t("reportStatus"), render: (r) => <Badge tone={TONE[r.status] ?? "info"}>{t(STATUS_KEY[r.status] ?? "hrpDraft")}</Badge> },
    { key: "by", header: t("hrpPreparedBy"), render: (r) => r.preparedBy.name },
    { key: "paid", header: t("payslipPaidOn"), render: (r) => (r.paidOn ? shortDate(r.paidOn, locale) : "") },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t("navPayroll")}</h1>
        {grants.create && !adding && <Button variant="primary" size="comfortable" icon="plus" onClick={() => { setAdding(true); setCreated(false); }}>{t("hrpNewRun")}</Button>}
      </div>
      {created && <Saved>{t("hrpRunCreated")}</Saved>}
      {adding && <NewRun onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setCreated(true); reload(); }} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("hrpNoRunsTitle")} description={t("hrpNoRunsBody")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.length > 0 && <DataTable caption={t("navPayroll")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />}
    </div>
  );
}
