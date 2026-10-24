"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ReceiptListDto, ReceiptSummaryDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, StatCard } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { rupees, shortDate } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { saveFile } from "./download";
import { Failed, Pager } from "./parts";

const PAGE_SIZE = 25;

/** The receipts tab: every receipt, newest first, with the total received and a PDF of each in the screen's language. */
export function Receipts() {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [state, reload] = useLoad<ReceiptListDto>(api ? () => api.receiptsList({ query: { page, pageSize: PAGE_SIZE } }) : null, String(page));
  const pdf = async (r: ReceiptSummaryDto) => {
    setError(null);
    try {
      saveFile((await api!.receiptsPdf({ path: { id: r.id }, query: { lang: locale }, parseAs: "blob" })) as Blob, `receipt-${r.number}.pdf`);
    } catch (e) {
      setError(errorKey(e));
    }
  };
  const columns: Column<ReceiptSummaryDto>[] = [
    { key: "no", header: t("receiptNumber"), render: (r) => r.number },
    { key: "date", header: t("receiptDate"), render: (r) => shortDate(r.paidOn, locale) },
    { key: "student", header: t("receiptStudent"), render: (r) => <>{r.student.name}<span className="block text-caption text-text-muted">{r.student.enrollmentId}</span></> },
    { key: "for", header: t("receiptFor"), render: (r) => r.invoice.title },
    { key: "amount", header: t("receiptAmountPaid"), numeric: true, render: (r) => rupees(r.amountMinor, locale) },
    { key: "status", header: t("reportStatus"), render: (r) => (r.cancelled ? <Badge tone="danger">{t("receiptCancelled")}</Badge> : null) },
    { key: "pdf", header: t("feeReceiptPdf"), render: (r) => <Button size="compact" aria-label={`${t("feeReceiptPdf")}: ${r.number}`} onClick={() => void pdf(r)}>PDF</Button> },
  ];
  return (
    <div className="flex flex-col gap-4">
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {error && <Banner tone="danger" title={t(error)} />}
      {state.status === "ready" && state.data.total === 0 && <Card><EmptyState title={t("feeNoReceiptsTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.total > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2"><StatCard label={t("feeReceiptsTotal")} value={rupees(state.data.totalAmountMinor, locale)} sub={t("feeTabReceipts")} icon="payments" locale={locale} /></div>
          <DataTable caption={t("feeTabReceipts")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />
          <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
