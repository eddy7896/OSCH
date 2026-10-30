"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { StudentLeaveDto, StudentLeaveListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";

export interface StudentLeaveGrants {
  /** Approve and decline (the class teacher for their own class, the Academic admin for all). */
  decide: boolean;
}

const RULES: Readonly<Record<string, string>> = { alreadyDecided: "slAlreadyDecided", cancelled: "slAlreadyDecided" };
const TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = { PENDING: "warning", APPROVED: "success", DECLINED: "danger", CANCELLED: "neutral" };
type Note = { tone: "saved" | "error"; text: string } | null;

/** Parents' requests for their children's leave (P5-10b, ADR-0016). Either approver may decide; whoever is second is told the request was already decided. Parents ask in the Parent app. */
export function StudentLeave({ grants }: { grants: StudentLeaveGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [status, setStatus] = useState("PENDING");
  const [state, reload] = useLoad<StudentLeaveListDto>(api ? () => api.studentLeaveList({ query: status ? { status: status as never } : {} }) : null, `student-leave-${status}`);
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState<StudentLeaveDto | null>(null);
  const [why, setWhy] = useState("");

  const act = async (work: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    setNote(null);
    try {
      await work();
      setNote({ tone: "saved", text: t(done) });
      after?.();
    } catch (e) {
      setNote({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
      reload();
    }
  };
  const range = (r: StudentLeaveDto) => (r.startDate === r.endDate ? shortDate(r.startDate, locale) : `${shortDate(r.startDate, locale)} – ${shortDate(r.endDate, locale)}`) + (r.half ? ` (${t("slHalf")})` : "");
  const columns: Column<StudentLeaveDto>[] = [
    { key: "student", header: t("slStudent"), render: (r) => <span>{r.student.name}<span className="block text-caption text-text-muted">{r.student.enrollmentId}</span></span> },
    { key: "class", header: t("slClass"), render: (r) => r.student.className ?? "" },
    { key: "dates", header: t("slDates"), render: range },
    { key: "by", header: t("slBy"), render: (r) => r.requestedBy.name },
    { key: "reason", header: t("slReason"), render: (r) => <span>{r.reason}{r.decision?.note && <span className="block text-caption text-text-muted">{r.decision.note}</span>}</span> },
    { key: "status", header: t("slStatus"), render: (r) => <Badge tone={TONE[r.status] ?? "neutral"}>{t(`slStatus${r.status}`)}</Badge> },
    ...(grants.decide ? [{ key: "act", header: t("slApprove"), hideHeader: true, render: (r: StudentLeaveDto) => r.status === "PENDING" ? (
      <span className="flex gap-2">
        <Button size="compact" variant="primary" aria-label={`${t("slApprove")}: ${r.student.name}`} disabled={busy} onClick={() => void act(() => api!.studentLeaveApprove({ path: { id: r.id }, body: {} }), "slApproved")}>{t("slApprove")}</Button>
        <Button size="compact" aria-label={`${t("slDecline")}: ${r.student.name}`} disabled={busy} onClick={() => { setNote(null); setWhy(""); setDeclining(r); }}>{t("slDecline")}</Button>
      </span>
    ) : null }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navStudentLeave")}</h1>
      <SelectField label={t("slStatus")} value={status} onChange={(v) => { setStatus(v); setDeclining(null); }} options={[{ value: "PENDING", label: t("slStatusPENDING") }, { value: "APPROVED", label: t("slStatusAPPROVED") }, { value: "DECLINED", label: t("slStatusDECLINED") }, { value: "CANCELLED", label: t("slStatusCANCELLED") }, { value: "", label: t("slAll") }]} className="max-w-xs" />
      {note && (note.tone === "saved" ? <Saved>{note.text}</Saved> : <Banner tone="danger" title={note.text} />)}
      {declining && (
        <ConfirmBox question={t("slDeclineQuestion", { name: declining.student.name })}>
          <TextField size="comfortable" label={t("slNote")} value={why} onChange={(e) => setWhy(e.target.value)} />
          <Button size="comfortable" variant="danger" disabled={busy} onClick={() => void act(() => api!.studentLeaveDecline({ path: { id: declining.id }, body: why.trim() ? { note: why.trim() } : {} }), "slDeclined", () => setDeclining(null))}>{t("slDecline")}</Button>
          <Button size="comfortable" onClick={() => setDeclining(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (state.data.items.length === 0 ? <Card><EmptyState title={t("slNoRequests")} headingLevel={2} /></Card> : <DataTable caption={t("navStudentLeave")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />)}
    </div>
  );
}
