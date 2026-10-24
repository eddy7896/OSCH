"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CollectionRowDto, CollectionsReportDto, DueRowDto, DuesReportDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, StatCard, TextField } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { BAND_KEY, firstOfMonth, methodKey, rupees, shortDate, todayIso } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Pager } from "./parts";
import { saveFile } from "./download";

const PAGE_SIZE = 25;

type Format = "csv" | "pdf";

/** Download buttons: a file is made by the gateway (the same rows as the screen) and handed to the browser. Only shown to people who may export. */
function Downloads({ canExport, make }: { canExport: boolean; make: (format: Format) => Promise<void> }) {
  const t = useTranslations();
  const [busy, setBusy] = useState<Format | null>(null);
  const [failed, setFailed] = useState(false);
  if (!canExport) return null;
  const run = async (format: Format) => {
    setBusy(format);
    setFailed(false);
    try {
      await make(format);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="comfortable" disabled={busy !== null} onClick={() => void run("csv")}>{t("webDownloadCsv")}</Button>
        <Button size="comfortable" disabled={busy !== null} onClick={() => void run("pdf")}>{t("webDownloadPdf")}</Button>
      </div>
      {failed && <Banner tone="danger" title={t("webDownloadFailed")} />}
    </div>
  );
}

function Collections({ canExport }: { canExport: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayIso);
  const [page, setPage] = useState(1);
  const [state, reload] = useLoad<CollectionsReportDto>(api ? () => api.reportsCollections({ query: { from, to, page, pageSize: PAGE_SIZE } }) : null, `${from}|${to}|${page}`);

  const columns: Column<CollectionRowDto>[] = [
    { key: "date", header: t("receiptDate"), render: (r) => shortDate(r.paidOn, locale) },
    { key: "receipt", header: t("receiptNumber"), render: (r) => r.receiptNumber ?? "" },
    { key: "student", header: t("receiptStudent"), render: (r) => <>{r.student.name}<span className="block text-caption text-text-muted">{r.student.enrollmentId}</span></> },
    { key: "for", header: t("receiptFor"), render: (r) => r.invoice.title },
    { key: "method", header: t("receiptMethod"), render: (r) => t(methodKey(r.method)) },
    { key: "amount", header: t("receiptAmountPaid"), numeric: true, render: (r) => rupees(r.amountMinor, locale) },
    { key: "status", header: t("reportStatus"), render: (r) => (r.reversed ? <Badge tone="danger">{t("reportReversed")}</Badge> : null) },
  ];
  const download = async (format: Format) => {
    if (!api) return;
    const blob = (await api.reportsCollectionsExport({ query: { from, to, format, lang: locale }, parseAs: "blob" })) as Blob;
    saveFile(blob, `collections-${from}_${to}.${format}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" type="date" label={t("webFrom")} value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <TextField size="comfortable" type="date" label={t("webTo")} value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <Downloads canExport={canExport} make={download} />
      </div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label={t("webCollected")} value={rupees(state.data.collectedMinor, locale)} sub={t("webPaymentsCount", { count: state.data.count })} icon="payments" locale={locale} />
            <StatCard label={t("reportReversed")} value={rupees(state.data.reversedMinor, locale)} icon="alert" tone="warning" locale={locale} />
          </div>
          {state.data.byMethod.length > 0 && (
            <Card title={t("webByMethod")} headingLevel={2}>
              <ul className="flex flex-col gap-1">
                {state.data.byMethod.map((m) => (
                  <li key={m.method} className="flex justify-between gap-3 text-body">
                    <span>{t(methodKey(m.method))}<span className="ms-2 text-text-muted">{t("webPaymentsCount", { count: m.count })}</span></span>
                    <span className="tabular-nums">{rupees(m.amountMinor, locale)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!state.data.detail && <Banner tone="info" title={t("webTotalsOnly")} />}
          {state.data.detail && state.data.total === 0 && <Card><EmptyState title={t("webNoRowsTitle")} description={t("webNoRowsBody")} headingLevel={2} /></Card>}
          {state.data.detail && state.data.total > 0 && (
            <>
              <DataTable caption={t("reportCollectionsTitle")} columns={columns} rows={state.data.items} rowKey={(r) => r.paymentId} />
              <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Dues({ canExport }: { canExport: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [asOf, setAsOf] = useState(todayIso);
  const [page, setPage] = useState(1);
  const [state, reload] = useLoad<DuesReportDto>(api ? () => api.reportsDues({ query: { asOf, page, pageSize: PAGE_SIZE } }) : null, `${asOf}|${page}`);

  const columns: Column<DueRowDto>[] = [
    { key: "student", header: t("receiptStudent"), render: (r) => <>{r.student.name}<span className="block text-caption text-text-muted">{r.student.enrollmentId}</span></> },
    { key: "for", header: t("receiptFor"), render: (r) => r.title },
    { key: "due", header: t("reportDueDate"), render: (r) => shortDate(r.dueDate, locale) },
    { key: "amount", header: t("reportAmountDue"), numeric: true, render: (r) => rupees(r.amountMinor, locale) },
    { key: "paid", header: t("receiptAmountPaid"), numeric: true, render: (r) => rupees(r.paidMinor, locale) },
    { key: "outstanding", header: t("reportOutstanding"), numeric: true, render: (r) => rupees(r.outstandingMinor, locale) },
    { key: "days", header: t("reportDaysOverdue"), numeric: true, render: (r) => new Intl.NumberFormat(`${locale}-IN`).format(r.daysOverdue) },
  ];
  const download = async (format: Format) => {
    if (!api) return;
    const blob = (await api.reportsDuesExport({ query: { asOf, format, lang: locale }, parseAs: "blob" })) as Blob;
    saveFile(blob, `fees-outstanding-${asOf}.${format}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField size="comfortable" type="date" label={t("reportAsOf")} value={asOf} onChange={(e) => { setAsOf(e.target.value); setPage(1); }} />
        <Downloads canExport={canExport} make={download} />
      </div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label={t("webOutstandingFees")} value={rupees(state.data.outstandingMinor, locale)} sub={t("webInvoicesCount", { count: state.data.count })} icon="alert" tone="warning" locale={locale} />
          </div>
          {state.data.count > 0 && (
            <Card title={t("webByAge")} headingLevel={2}>
              <ul className="flex flex-col gap-1">
                {state.data.bands.map((b) => (
                  <li key={b.band} className="flex justify-between gap-3 text-body">
                    <span>{t(BAND_KEY[b.band] ?? "webBandDueToday")}<span className="ms-2 text-text-muted">{t("webInvoicesCount", { count: b.count })}</span></span>
                    <span className="tabular-nums">{rupees(b.outstandingMinor, locale)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!state.data.detail && <Banner tone="info" title={t("webTotalsOnly")} />}
          {state.data.count === 0 && <Card><EmptyState title={t("webNoDuesTitle")} headingLevel={2} /></Card>}
          {state.data.detail && state.data.total > 0 && (
            <>
              <DataTable caption={t("reportDuesTitle")} columns={columns} rows={state.data.items} rowKey={(r) => r.invoiceId} />
              <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Financial reports: fee collections and fees outstanding, with files to download. Management sees the totals only (the gateway leaves the people out). */
export function FinanceReports({ canExport }: { canExport: boolean }) {
  const t = useTranslations();
  const [view, setView] = useState("collections");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navReportsFinance")}</h1>
      <SegmentedControl
        label={t("navReportsFinance")}
        value={view}
        onChange={setView}
        options={[{ value: "collections", label: t("reportCollectionsTitle") }, { value: "dues", label: t("reportDuesTitle") }]}
      />
      {view === "collections" ? <Collections canExport={canExport} /> : <Dues canExport={canExport} />}
    </div>
  );
}
