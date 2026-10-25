"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BalanceListDto, LeaveRequestDto, LeaveRequestListDto, LeaveTypeDto, LeaveTypeListDto, StaffListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, Checkbox, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";

export interface LeaveGrants {
  /** The Principal: approve and reject. */
  approve: boolean;
  /** Add leave types (the leave create grant, HR). */
  create: boolean;
  /** Change allowances and remove unused types (the leave update grant, HR). */
  manage: boolean;
}

const RULES: Readonly<Record<string, string>> = {
  notPending: "lvNotPending", changedMeanwhile: "lvNotPending", overBalance: "lvOverBalance", overlapsApprovedLeave: "lvOverlap", overlapsAnotherRequest: "lvOverlap", nameTaken: "gbNameTaken",
  typeInUse: "lvTypeInUse", paidNeedsAllowance: "lvPaidNeedsQuota", belowDaysTaken: "lvBelowTaken", wholeOrHalfDays: "lvWholeOrHalf", noActiveYear: "ttNoYearTitle",
};
type Note = { tone: "saved" | "error"; text: string } | null;
const Notice = ({ note }: { note: Note }) => (note ? note.tone === "saved" ? <Saved>{note.text}</Saved> : <Banner tone="danger" title={note.text} /> : null);
const TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", CANCELLED: "neutral" };

function useAct(t: (k: string) => string, reload: () => void) {
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const act = async (work: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    setNote(null);
    try {
      await work();
      setNote({ tone: "saved", text: t(done) });
      after?.();
      reload();
    } catch (e) {
      setNote({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
    }
  };
  return { note, busy, act, clear: () => setNote(null) };
}

function Requests({ grants }: { grants: LeaveGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [status, setStatus] = useState("PENDING");
  const [state, reload] = useLoad<LeaveRequestListDto>(api ? () => api.leaveRequests({ query: status ? { status: status as never } : {} }) : null, `requests-${status}`);
  const { note, busy, act, clear } = useAct(t, reload);
  const [rejecting, setRejecting] = useState<LeaveRequestDto | null>(null);
  const [why, setWhy] = useState("");
  const range = (r: LeaveRequestDto) => (r.startDate === r.endDate ? shortDate(r.startDate, locale) : `${shortDate(r.startDate, locale)} – ${shortDate(r.endDate, locale)}`) + (r.half ? ` (${t(`lvHalf${r.half}`)})` : "");
  const columns: Column<LeaveRequestDto>[] = [
    { key: "who", header: t("lvPerson"), render: (r) => <span>{r.staff.name}<span className="block text-caption text-text-muted">{r.staff.employeeId}</span></span> },
    { key: "type", header: t("lvType"), render: (r) => <span>{r.type.name} <Badge tone={r.type.paid ? "info" : "neutral"}>{t(r.type.paid ? "lvPaid" : "lvUnpaid")}</Badge></span> },
    { key: "dates", header: t("lvDates"), render: range },
    { key: "days", header: t("lvDays"), numeric: true, render: (r) => r.days },
    { key: "status", header: t("lvStatus"), render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{t(`lvStatus${r.status}`)}</Badge> },
    { key: "decision", header: t("lvDecision"), render: (r) => r.decision ? <span>{r.decision.by}{r.decision.note && <span className="block text-caption text-text-muted">{r.decision.note}</span>}</span> : r.reason ? <span className="text-caption text-text-muted">{r.reason}</span> : "" },
    ...(grants.approve ? [{ key: "act", header: t("lvApprove"), hideHeader: true, render: (r: LeaveRequestDto) => r.status === "PENDING" ? (
      <span className="flex gap-2">
        <Button size="compact" variant="primary" aria-label={`${t("lvApprove")}: ${r.staff.name}`} disabled={busy} onClick={() => void act(() => api!.leaveApprove({ path: { id: r.id } }), "lvApproved")}>{t("lvApprove")}</Button>
        <Button size="compact" aria-label={`${t("lvReject")}: ${r.staff.name}`} disabled={busy} onClick={() => { clear(); setWhy(""); setRejecting(r); }}>{t("lvReject")}</Button>
      </span>
    ) : null }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <SelectField label={t("lvStatus")} value={status} onChange={(v) => { setStatus(v); setRejecting(null); }} options={[{ value: "PENDING", label: t("lvStatusPENDING") }, { value: "APPROVED", label: t("lvStatusAPPROVED") }, { value: "REJECTED", label: t("lvStatusREJECTED") }, { value: "CANCELLED", label: t("lvStatusCANCELLED") }, { value: "", label: t("lvAll") }]} className="max-w-xs" />
      <Notice note={note} />
      {rejecting && (
        <ConfirmBox question={t("lvRejectQuestion", { name: rejecting.staff.name })}>
          <TextField size="comfortable" label={t("lvRejectNote")} value={why} onChange={(e) => setWhy(e.target.value)} />
          <Button size="comfortable" variant="danger" disabled={busy} onClick={() => void act(() => api!.leaveReject({ path: { id: rejecting.id }, body: why.trim() ? { note: why.trim() } : {} }), "lvRejected", () => setRejecting(null))}>{t("lvReject")}</Button>
          <Button size="comfortable" onClick={() => setRejecting(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (state.data.items.length === 0 ? <Card><EmptyState title={t("lvNoRequests")} headingLevel={2} /></Card> : <DataTable caption={t("lvTabRequests")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />)}
    </div>
  );
}

function Allowances() {
  const t = useTranslations();
  const { api } = useSession();
  const [people] = useLoad<StaffListDto>(api ? () => api.staffList({ query: { status: "ACTIVE", page: 1, pageSize: 100 } }) : null, "people");
  const [pick, setPick] = useState("");
  const staffId = pick || (people.status === "ready" ? people.data.items[0]?.id ?? "" : "");
  const [bal, reload] = useLoad<BalanceListDto>(api && staffId ? () => api.leaveBalances({ query: { staffId } }) : null, `bal-${staffId}`);
  const { note, busy, act } = useAct(t, reload);
  const [typed, setTyped] = useState<Record<string, string>>({});
  if (people.status !== "ready" || people.data.items.length === 0) return null;
  return (
    <Card title={t("lvAllowances")} headingLevel={2}>
      <div className="flex flex-col gap-3">
        <SelectField label={t("lvPickPerson")} value={staffId} onChange={(v) => { setPick(v); setTyped({}); }} options={people.data.items.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} className="max-w-xs" />
        <Notice note={note} />
        {bal.status === "ready" && bal.data.items.map((b) => (
          <form key={b.type.id} className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.leaveSetBalance({ path: { staffId, typeId: b.type.id }, body: { allowedDays: (typed[b.type.id] ?? b.allowedDays).trim() } }), "lvAllowanceSaved", () => setTyped({})); }}>
            <TextField size="comfortable" inputMode="decimal" label={t("lvAllowedFor", { type: b.type.name })} hint={b.recorded ? undefined : t("lvStandardHint")} value={typed[b.type.id] ?? b.allowedDays} onChange={(e) => setTyped({ ...typed, [b.type.id]: e.target.value })} />
            <span className="pb-2 text-body text-text-muted">{t("lvRemaining")}: {b.remainingDays}</span>
            <Button type="submit" size="comfortable" disabled={busy || (typed[b.type.id] ?? b.allowedDays).trim() === b.allowedDays}>{t("actionSave")}</Button>
          </form>
        ))}
      </div>
    </Card>
  );
}

function Types({ grants }: { grants: LeaveGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<LeaveTypeListDto>(api ? () => api.leaveTypes({}) : null, "types");
  const { note, busy, act, clear } = useAct(t, reload);
  const [name, setName] = useState("");
  const [paid, setPaid] = useState(true);
  const [days, setDays] = useState("");
  const [removing, setRemoving] = useState<LeaveTypeDto | null>(null);
  const columns: Column<LeaveTypeDto>[] = [
    { key: "name", header: t("lvTypeName"), render: (x) => x.name },
    { key: "paid", header: t("lvType"), render: (x) => <Badge tone={x.paid ? "info" : "neutral"}>{t(x.paid ? "lvPaid" : "lvUnpaid")}</Badge> },
    { key: "quota", header: t("lvQuota"), numeric: true, render: (x) => (x.paid ? x.quotaDays : "-") },
    ...(grants.manage ? [{ key: "x", header: t("hrpRemove"), hideHeader: true, render: (x: LeaveTypeDto) => <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${x.name}`} onClick={() => { clear(); setRemoving(x); }}>{t("hrpRemove")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <Notice note={note} />
      {removing && (
        <ConfirmBox question={t("ttRemoveQuestion", { name: removing.name })}>
          <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.leaveDeleteType({ path: { id: removing.id } }), "ttSaved", () => setRemoving(null))}>{t("hrpRemove")}</Button>
          <Button size="comfortable" onClick={() => setRemoving(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (state.data.items.length === 0 ? <Card><EmptyState title={t("lvNoTypes")} headingLevel={2} /></Card> : <DataTable caption={t("lvTabTypes")} columns={columns} rows={state.data.items} rowKey={(x) => x.id} />)}
      {grants.create && (
        <Card title={t("lvAddType")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.leaveCreateType({ body: { name: name.trim(), paid, ...(paid ? { quotaDays: days.trim() } : {}) } }), "lvTypeAdded", () => { setName(""); setDays(""); }); }}>
            <TextField size="comfortable" label={t("lvTypeName")} value={name} onChange={(e) => setName(e.target.value)} />
            <Checkbox label={t("lvIsPaid")} checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            {paid && <TextField size="comfortable" inputMode="decimal" label={t("lvQuota")} hint={t("lvWholeOrHalf")} value={days} onChange={(e) => setDays(e.target.value)} />}
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !name.trim() || (paid && !days.trim())}>{t("lvAddType")}</Button>
          </form>
        </Card>
      )}
      {grants.manage && <Allowances />}
    </div>
  );
}

/** Leave for the school's office (P3-11d): the requests, where only the Principal approves or rejects, and the leave types with each person's yearly allowance. Employees ask in the mobile app. */
export function Leave({ grants }: { grants: LeaveGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("requests");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navLeave")}</h1>
      <SegmentedControl label={t("lvViewLabel")} value={tab} onChange={setTab} options={[{ value: "requests", label: t("lvTabRequests") }, { value: "types", label: t("lvTabTypes") }]} />
      {tab === "requests" ? <Requests grants={grants} /> : <Types grants={grants} />}
    </div>
  );
}
