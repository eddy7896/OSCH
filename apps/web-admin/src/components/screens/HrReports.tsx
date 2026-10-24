"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { PayrollMonthDto, PayrollSummaryDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, StatCard, TextField } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { monthLabel, rupees, shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { saveFile } from "./download";
import { Failed } from "./parts";

/** HR reports: a year of approved and paid pay runs by month and by department (totals only, nobody's own pay), with CSV and PDF downloads for roles that may export. */
export function HrReports({ canExport }: { canExport: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [year, setYear] = useState(String(new Date().getUTCFullYear()));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const valid = /^\d{4}$/.test(year);
  const [state, reload] = useLoad<PayrollSummaryDto>(api && valid ? () => api.reportsPayroll({ query: { year: Number(year) } }) : null, year);

  const download = async (format: "csv" | "pdf") => {
    setBusy(true);
    setFailed(false);
    try {
      saveFile((await api!.reportsPayrollExport({ query: { year: Number(year), format, lang: locale }, parseAs: "blob" })) as Blob, `payroll-summary-${year}.${format}`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const months: Column<PayrollMonthDto>[] = [
    { key: "month", header: t("reportMonth"), render: (m) => monthLabel(state.status === "ready" ? state.data.year : Number(year), m.month) },
    { key: "status", header: t("reportStatus"), render: (m) => <Badge tone={m.status === "PAID" ? "success" : "info"}>{t(m.status === "PAID" ? "reportPaid" : "reportApproved")}</Badge> },
    { key: "paid", header: t("payslipPaidOn"), render: (m) => (m.paidOn ? shortDate(m.paidOn, locale) : "") },
    { key: "staff", header: t("reportHeadcount"), numeric: true, render: (m) => m.headcount },
    { key: "gross", header: t("payslipGross"), numeric: true, render: (m) => rupees(m.grossMinor, locale) },
    { key: "ded", header: t("payslipTotalDeductions"), numeric: true, render: (m) => rupees(m.deductionsMinor, locale) },
    { key: "net", header: t("payslipNetPay"), numeric: true, render: (m) => rupees(m.netMinor, locale) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navReportsHr")}</h1>
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" inputMode="numeric" label={t("reportYear")} value={year} onChange={(e) => setYear(e.target.value)} />
        {canExport && (
          <>
            <Button size="comfortable" disabled={busy || !valid} onClick={() => void download("csv")}>{t("webDownloadCsv")}</Button>
            <Button size="comfortable" disabled={busy || !valid} onClick={() => void download("pdf")}>{t("webDownloadPdf")}</Button>
          </>
        )}
      </div>
      {failed && <Banner tone="danger" title={t("webDownloadFailed")} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.months.length === 0 && <Card><EmptyState title={t("hrrNoRunsTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.months.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("payslipGross")} value={rupees(state.data.grossMinor, locale)} icon="payments" locale={locale} />
            <StatCard label={t("payslipTotalDeductions")} value={rupees(state.data.deductionsMinor, locale)} icon="alert" tone="warning" locale={locale} />
            <StatCard label={t("payslipNetPay")} value={rupees(state.data.netMinor, locale)} icon="check-circle" tone="success" locale={locale} />
          </div>
          <DataTable caption={t("navReportsHr")} columns={months} rows={state.data.months} rowKey={(m) => m.runId} />
          <Card title={t("hrrByDepartment")} headingLevel={2}>
            <ul className="flex flex-col gap-1">
              {state.data.byDepartment.map((d) => (
                <li key={d.department ?? "-"} className="flex justify-between gap-3 text-body">
                  <span>{d.department ?? t("hrrNoDepartment")}<span className="ms-2 text-text-muted">{t("reportHeadcount")}: {d.headcount}</span></span>
                  <span className="tabular-nums">{rupees(d.netMinor, locale)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
