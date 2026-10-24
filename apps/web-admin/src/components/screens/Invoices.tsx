"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GenerateResultDto, GradeLevelListDto, InvoiceDto, InvoiceListDto, InvoiceSummaryDto, PaymentDto, StudentListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, StatCard, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { methodKey, rupees, rupeesToMinor, shortDate, todayIso } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { saveFile } from "./download";
import { ConfirmBox, Failed, Pager, Saved, SelectField } from "./parts";

const PAGE_SIZE = 25;
const STATUS_KEY: Record<string, string> = { PAID: "reportPaid", OVERDUE: "feeStatusOverdue", PARTIAL: "feeStatusPartial", PENDING: "feeStatusPending" };
const TONE: Record<string, "success" | "danger" | "warning" | "neutral"> = { PAID: "success", OVERDUE: "danger", PARTIAL: "warning", PENDING: "neutral" };
const METHODS = ["CASH", "CHEQUE", "BANK_TRANSFER", "UPI", "OTHER"];

export interface FeeGrants {
  /** Make invoices, record payments, add fees (finance create). */
  create: boolean;
  /** Reverse a payment (finance delete: the Bursar). */
  reverse: boolean;
}

function Detail({ id, grants, onBack, onChanged }: { id: string; grants: FeeGrants; onBack: () => void; onChanged: () => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<InvoiceDto>(api ? () => api.invoicesGet({ path: { id } }) : null, id);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso);
  const [reversing, setReversing] = useState<PaymentDto | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const minor = rupeesToMinor(amount);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      reload();
      onChanged();
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const receiptPdf = async (receiptId: string, number: string) => {
    try {
      saveFile((await api!.receiptsPdf({ path: { id: receiptId }, query: { lang: locale }, parseAs: "blob" })) as Blob, `receipt-${number}.pdf`);
    } catch (e) {
      setError(errorKey(e));
    }
  };
  const inv = state.status === "ready" ? state.data : null;
  const owing = inv ? /^[1-9]\d*$/.test(inv.outstandingMinor) : false; // paise as text: more than zero
  return (
    <div className="flex flex-col gap-4">
      <div><Button size="comfortable" variant="ghost" icon="arrow-left" onClick={onBack}>{t("peoBackToList")}</Button></div>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {inv && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{inv.title}</h1>
            <Badge tone={TONE[inv.status] ?? "neutral"}>{t(STATUS_KEY[inv.status] ?? "feeStatusPending")}</Badge>
          </div>
          <p className="text-body text-text-muted">{inv.student.name} ({inv.student.enrollmentId}), {t("reportDueDate")}: {shortDate(inv.dueDate, locale)}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("reportAmountDue")} value={rupees(inv.amountMinor, locale)} icon="payments" locale={locale} />
            <StatCard label={t("receiptAmountPaid")} value={rupees(inv.paidMinor, locale)} icon="check-circle" tone="success" locale={locale} />
            <StatCard label={t("reportOutstanding")} value={rupees(inv.outstandingMinor, locale)} icon="alert" tone="warning" locale={locale} />
          </div>
          {done && <Saved>{done}</Saved>}
          {error && <Banner tone="danger" title={t(error)} />}
          {grants.create && owing && !paying && <div><Button variant="primary" size="comfortable" onClick={() => { setPaying(true); setDone(null); }}>{t("feeRecordPayment")}</Button></div>}
          {paying && (
            <Card title={t("feeRecordPayment")} headingLevel={2}>
              <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
                e.preventDefault();
                if (!minor) return;
                void act(async () => {
                  const r = await api!.invoicesPay({ path: { id }, body: { amountMinor: minor, method: method as "CASH", ...(reference.trim() ? { reference: reference.trim() } : {}), ...(paidOn ? { paidOn } : {}) } });
                  const last = r.payments[r.payments.length - 1];
                  setDone(t("feePaymentRecorded", { number: last?.receipt?.number ?? "" }));
                  setPaying(false);
                  setAmount("");
                  setReference("");
                });
              }}>
                <TextField size="comfortable" inputMode="decimal" label={t("hrpAmount")} hint={t("hrpAmountHint")} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <SelectField label={t("feeMethod")} value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: t(methodKey(m)) }))} />
                <TextField size="comfortable" label={t("receiptReference")} value={reference} onChange={(e) => setReference(e.target.value)} />
                <TextField size="comfortable" type="date" label={t("receiptDate")} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                <Button type="submit" variant="primary" size="comfortable" disabled={busy || !minor}>{t("feeRecordPayment")}</Button>
                <Button size="comfortable" onClick={() => setPaying(false)}>{t("actionCancel")}</Button>
              </form>
            </Card>
          )}
          {reversing && (
            <ConfirmBox question={t("feeConfirmReverse", { amount: rupees(reversing.amountMinor, locale) })}>
              <TextField size="comfortable" label={t("feeReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button variant="danger" size="comfortable" disabled={busy || reason.trim().length < 3} onClick={() => void act(async () => { await api!.invoicesReverse({ path: { id: reversing.id }, body: { reason: reason.trim() } }); setReversing(null); setReason(""); })}>{t("hrpConfirm")}</Button>
              <Button size="comfortable" onClick={() => { setReversing(null); setReason(""); }}>{t("actionCancel")}</Button>
            </ConfirmBox>
          )}
          <Card title={t("feePayments")} headingLevel={2}>
            {inv.payments.length === 0 ? (
              <p className="text-body text-text-muted">{t("feeNoPayments")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-body">
                    <span>
                      {shortDate(p.paidOn, locale)}, {t(methodKey(p.method))}{p.reference ? ` (${p.reference})` : ""}
                      {p.reversedAt && <><Badge tone="danger">{t("reportReversed")}</Badge><span className="ms-2 text-text-muted">{p.reversalReason}</span></>}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{rupees(p.amountMinor, locale)}</span>
                      {p.receipt && <Button size="compact" aria-label={`${t("feeReceiptPdf")}: ${p.receipt.number}`} onClick={() => void receiptPdf(p.receipt!.id, p.receipt!.number)}>{p.receipt.number}</Button>}
                      {grants.reverse && !p.reversedAt && <Button size="compact" variant="danger" aria-label={`${t("feeReverse")}: ${rupees(p.amountMinor, locale)}`} onClick={() => setReversing(p)}>{t("feeReverse")}</Button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StudentPicker({ onPick }: { onPick: (s: { id: string; name: string }) => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [q, setQ] = useState("");
  const [state] = useLoad<StudentListDto>(api && q.trim().length >= 2 ? () => api.studentsList({ query: { search: q.trim(), page: 1, pageSize: 5 } }) : null, q);
  return (
    <div className="flex flex-col gap-2">
      <TextField size="comfortable" type="search" icon="search" label={t("feeFindStudent")} value={q} onChange={(e) => setQ(e.target.value)} />
      {state.status === "ready" && (
        <ul className="flex flex-col gap-1">
          {state.data.items.map((s) => (
            <li key={s.id}><Button size="comfortable" variant="ghost" onClick={() => onPick({ id: s.id, name: `${s.firstName} ${s.lastName} (${s.enrollmentId})` })}>{s.firstName} {s.lastName} ({s.enrollmentId})</Button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewInvoice({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(todayIso);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minor = rupeesToMinor(amount);
  return (
    <Card title={t("feeNewInvoice")} headingLevel={2}>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault();
        if (!student || !minor) return;
        setBusy(true);
        setError(null);
        try {
          await api!.invoicesCreate({ body: { studentId: student.id, title: title.trim(), amountMinor: minor, dueDate: due } });
          onDone();
        } catch (err) {
          setError(errorKey(err));
        } finally {
          setBusy(false);
        }
      }}>
        {student ? <p className="text-body font-semibold">{student.name} <Button size="compact" variant="ghost" onClick={() => setStudent(null)}>{t("actionEdit")}</Button></p> : <StudentPicker onPick={setStudent} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField size="comfortable" label={t("feeDescription")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField size="comfortable" inputMode="decimal" label={t("hrpAmount")} hint={t("hrpAmountHint")} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField size="comfortable" type="date" label={t("reportDueDate")} value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        {error && <Banner tone="danger" title={t(error)} />}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="comfortable" disabled={busy || !student || !minor || !title.trim()}>{t("actionSave")}</Button>
          <Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

function BillFees({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [levels] = useLoad<GradeLevelListDto>(api ? () => api.academicsLevels({}) : null, "levels");
  const [upTo, setUpTo] = useState(todayIso);
  const [level, setLevel] = useState("");
  const [result, setResult] = useState<GenerateResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const body = { dueOnOrBefore: upTo, ...(level ? { gradeLevelId: level } : {}) };
  const go = async (dry: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = dry ? await api!.invoicesPreview({ body }) : await api!.invoicesGenerate({ body });
      setResult(r);
      if (!dry) onDone();
      setConfirm(false);
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={t("feeBillFees")} headingLevel={2}>
      <div className="flex flex-col gap-3">
        <p className="text-body text-text-muted">{t("feeBillIntro")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <TextField size="comfortable" type="date" label={t("feeBillUpTo")} value={upTo} onChange={(e) => { setUpTo(e.target.value); setResult(null); }} />
          <SelectField label={t("peoLevel")} value={level} onChange={(v) => { setLevel(v); setResult(null); }} options={[{ value: "", label: t("feeLevelAll") }, ...(levels.status === "ready" ? levels.data.items.map((l) => ({ value: l.id, label: l.name })) : [])]} />
          <Button size="comfortable" disabled={busy} onClick={() => void go(true)}>{t("feePreview")}</Button>
        </div>
        {error && <Banner tone="danger" title={t(error)} />}
        {result && (
          <Banner tone={result.dryRun ? "info" : "success"} title={t(result.dryRun ? "feePreviewResult" : "feeCreatedResult", { created: result.created, already: result.alreadyInvoiced, without: result.studentsWithoutStructure })} />
        )}
        {result?.dryRun && result.created > 0 && !confirm && <div><Button variant="primary" size="comfortable" onClick={() => setConfirm(true)}>{t("feeCreateInvoices")}</Button></div>}
        {confirm && (
          <ConfirmBox question={t("feePreviewResult", { created: result!.created, already: result!.alreadyInvoiced, without: result!.studentsWithoutStructure })}>
            <Button variant="primary" size="comfortable" disabled={busy} onClick={() => void go(false)}>{t("feeCreateInvoices")}</Button>
            <Button size="comfortable" onClick={() => setConfirm(false)}>{t("actionCancel")}</Button>
          </ConfirmBox>
        )}
        <div><Button size="comfortable" onClick={onCancel}>{t("actionCancel")}</Button></div>
      </div>
    </Card>
  );
}

/** The invoices tab: the list with a state filter and totals, billing from the fee structures, a one-off invoice, and an invoice's page with its payments. */
export function Invoices({ grants }: { grants: FeeGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [stateFilter, setStateFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [panel, setPanel] = useState<"new" | "bill" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [state, reload] = useLoad<InvoiceListDto>(api ? () => api.invoicesList({ query: { page, pageSize: PAGE_SIZE, state: stateFilter as "ALL" } }) : null, `${stateFilter}|${page}`);
  if (open) return <Detail id={open} grants={grants} onBack={() => { setOpen(null); reload(); }} onChanged={reload} />;

  const columns: Column<InvoiceSummaryDto>[] = [
    { key: "student", header: t("receiptStudent"), render: (r) => <>{r.student.name}<span className="block text-caption text-text-muted">{r.student.enrollmentId}</span></> },
    { key: "title", header: t("feeDescription"), render: (r) => <button type="button" className="text-start font-semibold text-primary-text underline-offset-2 hover:underline" onClick={() => setOpen(r.id)}>{r.title}</button> },
    { key: "due", header: t("reportDueDate"), render: (r) => shortDate(r.dueDate, locale) },
    { key: "amount", header: t("reportAmountDue"), numeric: true, render: (r) => rupees(r.amountMinor, locale) },
    { key: "out", header: t("reportOutstanding"), numeric: true, render: (r) => rupees(r.outstandingMinor, locale) },
    { key: "status", header: t("reportStatus"), render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{t(STATUS_KEY[r.status] ?? "feeStatusPending")}</Badge> },
  ];
  return (
    <div className="flex flex-col gap-4">
      {grants.create && !panel && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="comfortable" icon="plus" onClick={() => { setPanel("new"); setNote(null); }}>{t("feeNewInvoice")}</Button>
          <Button size="comfortable" onClick={() => { setPanel("bill"); setNote(null); }}>{t("feeBillFees")}</Button>
        </div>
      )}
      {note && <Saved>{note}</Saved>}
      {panel === "new" && <NewInvoice onCancel={() => setPanel(null)} onDone={() => { setPanel(null); setNote(t("feeInvoiceCreated")); setPage(1); reload(); }} />}
      {panel === "bill" && <BillFees onCancel={() => setPanel(null)} onDone={() => { setPage(1); reload(); }} />}
      <SelectField label={t("reportStatus")} value={stateFilter} onChange={(v) => { setStateFilter(v); setPage(1); }} options={[{ value: "ALL", label: t("peoAll") }, { value: "UNPAID", label: t("feeStatusPending") }, { value: "PAID", label: t("reportPaid") }, { value: "OVERDUE", label: t("feeStatusOverdue") }]} />
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={t("feeBilled")} value={rupees(state.data.totals.amountMinor, locale)} sub={t("webInvoicesCount", { count: state.data.totals.count })} icon="payments" locale={locale} />
          <StatCard label={t("receiptAmountPaid")} value={rupees(state.data.totals.paidMinor, locale)} icon="check-circle" tone="success" locale={locale} />
          <StatCard label={t("reportOutstanding")} value={rupees(state.data.totals.outstandingMinor, locale)} icon="alert" tone="warning" locale={locale} />
        </div>
      )}
      {state.status === "ready" && state.data.total === 0 && <Card><EmptyState title={stateFilter === "ALL" ? t("feeNoInvoicesTitle") : t("webNoRowsTitle")} description={stateFilter === "ALL" ? t("feeNoInvoicesBody") : undefined} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.total > 0 && (
        <>
          <DataTable caption={t("feeTabInvoices")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />
          <Pager page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
