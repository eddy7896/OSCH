"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { NeedDto, NeedListDto, SuggestionsDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { schoolToday } from "./Attendance";
import { DataTable, type Column } from "./DataTable";
import { Failed, Saved } from "./parts";

export interface SubstitutionGrants {
  /** Choose and remove cover (the academics update grant). */
  assign: boolean;
}

const RULES: Readonly<Record<string, string>> = {
  hasOwnLesson: "sbHasOwnLesson", onLeave: "sbOnLeave", alreadySubstituting: "sbAlreadyCovering", notQualified: "ttTeacherNotSubject", sameAsAbsent: "sbSameAsAbsent",
  noLeaveCoversThatLesson: "sbNoLongerNeeded", changedMeanwhile: "sbChanged", activeStaffOfThisSchool: "sbChanged",
};
const plus = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
type Note = { tone: "saved" | "error"; text: string } | null;

/** The substitution board (P3-11d): lessons that approved leave leaves uncovered, and who can cover each. Nothing is assigned until the Academic admin chooses. */
export function Substitutions({ grants }: { grants: SubstitutionGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [from, setFrom] = useState(schoolToday());
  const [to, setTo] = useState(plus(schoolToday(), 13));
  const [needs, reload] = useLoad<NeedListDto>(api && from && to ? () => api.substitutionNeeds({ query: { from, to } }) : null, `needs-${from}-${to}`);
  const [open, setOpen] = useState<NeedDto | null>(null);
  const [suggest, reloadSuggest] = useLoad<SuggestionsDto>(api && open ? () => api.substitutionSuggestions({ query: { entryId: open.slot.entryId, date: open.date } }) : null, open ? `sg-${open.slot.entryId}-${open.date}` : "none");
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      await work();
      setNote({ tone: "saved", text: t(done) });
      setOpen(null);
      reload();
    } catch (e) {
      setNote({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
      reloadSuggest();
    } finally {
      setBusy(false);
    }
  };
  const slotName = (n: NeedDto) => `${shortDate(n.date, locale)}, ${n.slot.period.label}, ${n.slot.class.name}`;
  const columns: Column<NeedDto>[] = [
    { key: "date", header: t("attDate"), render: (n) => shortDate(n.date, locale) },
    { key: "period", header: t("sbPeriod"), render: (n) => <span>{n.slot.period.label}<span className="block text-caption text-text-muted">{n.slot.period.startTime}–{n.slot.period.endTime}</span></span> },
    { key: "class", header: t("peoClass"), render: (n) => n.slot.class.name },
    { key: "subject", header: t("gradesSubject"), render: (n) => n.slot.subject.name },
    { key: "away", header: t("sbAway"), render: (n) => n.absent.name },
    { key: "cover", header: t("sbCover"), render: (n) => (n.cover ? <Badge tone="success">{n.cover.substitute.name}</Badge> : <Badge tone="warning">{t("sbNotChosen")}</Badge>) },
    ...(grants.assign ? [{ key: "act", header: t("sbChoose"), hideHeader: true, render: (n: NeedDto) => <Button size="compact" aria-label={`${t(n.cover ? "sbChange" : "sbChoose")}: ${slotName(n)}`} onClick={() => { setNote(null); setOpen(n); }}>{t(n.cover ? "sbChange" : "sbChoose")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navSubstitution")}</h1>
      <div className="flex flex-wrap gap-3">
        <TextField size="comfortable" type="date" label={t("sbFrom")} value={from} onChange={(e) => { setFrom(e.target.value); setOpen(null); }} />
        <TextField size="comfortable" type="date" label={t("sbTo")} value={to} onChange={(e) => { setTo(e.target.value); setOpen(null); }} />
      </div>
      {note?.tone === "saved" && <Saved>{note.text}</Saved>}
      {note?.tone === "error" && <Banner tone="danger" title={note.text} />}
      {needs.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {needs.status === "error" && <Failed messageKey={needs.messageKey} retry={reload} />}
      {needs.status === "ready" && (needs.data.items.length === 0 ? <Card><EmptyState title={t("sbNoNeeds")} headingLevel={2} /></Card> : <DataTable caption={t("navSubstitution")} columns={columns} rows={needs.data.items} rowKey={(n) => `${n.slot.entryId}-${n.date}`} />)}
      {open && grants.assign && (
        <Card title={t("sbSuggestionsTitle", { slot: slotName(open) })} headingLevel={2}>
          {suggest.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
          {suggest.status === "error" && <Failed messageKey={suggest.messageKey} retry={reloadSuggest} />}
          {suggest.status === "ready" && (
            <div className="flex flex-col gap-3">
              {suggest.data.candidates.length === 0 && <p className="text-body text-text-muted">{t("sbNoCandidates")}</p>}
              <ul className="flex flex-col gap-2">
                {suggest.data.candidates.map((c) => (
                  <li key={c.staff.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <span><span className="text-body font-semibold">{c.staff.name}</span><span className="ms-3 text-caption text-text-muted">{t("sbThisMonth", { count: c.substitutionsThisMonth })}</span></span>
                    <Button size="comfortable" variant={open.cover?.substitute.id === c.staff.id ? "secondary" : "primary"} disabled={busy} onClick={() => void act(() => api!.substitutionAssign({ body: { entryId: open.slot.entryId, date: open.date, substituteStaffId: c.staff.id } }), "sbAssigned")}>{t("sbAssign", { name: c.staff.name })}</Button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                {open.cover && <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.substitutionClear({ path: { id: open.cover!.id } }), "sbCleared")}>{t("sbRemoveCover")}</Button>}
                <Button size="comfortable" onClick={() => setOpen(null)}>{t("actionCancel")}</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
