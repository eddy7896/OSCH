"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { StatusDto, ClassDayDto, ClassListDto, MissingDto, RosterEntryDto, StatusListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, StatusPill, TextField, type AttendanceStatus } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Saved, SelectField } from "./parts";

export interface AttendanceGrants {
  /** Take a class's attendance (the attendance create grant). */
  submit: boolean;
  /** Lock a day, correct a locked one and rename statuses (the attendance update grant). */
  edit: boolean;
}

const STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE", "MEDICAL", "HALF_DAY", "EXCUSED"] as const;
const PILL: Record<string, AttendanceStatus> = { PRESENT: "present", ABSENT: "absent", LATE: "late", LEAVE: "leave", MEDICAL: "medical", HALF_DAY: "halfday", EXCUSED: "excused" };
const RULES: Readonly<Record<string, string>> = { dayLocked: "attDayLocked", futureDate: "attFutureDate", notAWorkingDay: "ttNotWorkingDay", noActiveYear: "ttNoYearTitle", studentNotInClass: "errorConflict" };

/** Today at the school (India Standard Time), as the gateway reckons it. */
export const schoolToday = (now: number = Date.now()): string => new Date(now + 330 * 60_000).toISOString().slice(0, 10);

/** The word for a status: the school's own if it renamed it, else ours in the person's language. */
function useWords(statuses: StatusListDto | null) {
  const t = useTranslations();
  return (status: string): string => {
    const custom = statuses?.items.find((s) => s.status === status && !s.isDefault);
    return custom ? custom.label : t(`attStatus${status}`);
  };
}

function Register({ grants, date }: { grants: AttendanceGrants; date: string }) {
  const t = useTranslations();
  const { api } = useSession();
  const [classes] = useLoad<ClassListDto>(api ? () => api.academicsClasses({}) : null, "classes");
  const [statuses] = useLoad<StatusListDto>(api ? () => api.attendanceStatuses({}) : null, "statuses");
  const word = useWords(statuses.status === "ready" ? statuses.data : null);
  const [chosen, setChosen] = useState("");
  const classId = chosen || (classes.status === "ready" ? classes.data.items[0]?.id ?? "" : "");
  const [day, reload] = useLoad<ClassDayDto>(api && classId && date ? () => api.attendanceDay({ path: { id: classId, date } }) : null, `day-${classId}-${date}`);
  const [edits, setEdits] = useState<{ key: string; map: Record<string, string> }>({ key: "", map: {} });
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = `${classId}|${date}`;
  const changed = edits.key === key ? edits.map : {};

  if (classes.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (classes.status === "error") return <Failed messageKey={classes.messageKey} retry={() => location.reload()} />;
  if (classes.data.items.length === 0) return <Card><EmptyState title={t("ttNoClasses")} headingLevel={2} /></Card>;

  const rows: RosterEntryDto[] = day.status === "ready" ? day.data.students : [];
  const statusOf = (r: RosterEntryDto) => changed[r.id] ?? r.status;
  const locked = day.status === "ready" && day.data.locked;
  const dirty = Object.keys(changed).length > 0;
  const marks = () => rows.filter((r) => statusOf(r) !== "PRESENT").map((r) => ({ studentId: r.id, status: statusOf(r) as never, ...(r.note ? { note: r.note } : {}) }));
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      setMessage({ tone: "saved", text: t(done) });
      setEdits({ key, map: {} });
      reload();
    } catch (e) {
      setMessage({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
    }
  };
  const columns: Column<RosterEntryDto>[] = [
    { key: "name", header: t("attStudent"), render: (r) => <span>{r.name}<span className="block text-caption text-text-muted">{r.enrollmentId}</span></span> },
    {
      key: "status", header: t("attStatus"),
      render: (r) => {
        const canEdit = locked ? grants.edit : grants.submit;
        return canEdit ? (
          <select aria-label={`${t("attStatus")}: ${r.name}`} className="min-h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-text" value={statusOf(r)} onChange={(e) => setEdits({ key, map: { ...changed, [r.id]: e.target.value } })}>
            {STATUSES.map((s) => <option key={s} value={s}>{word(s)}</option>)}
          </select>
        ) : <StatusPill status={PILL[r.status] ?? "present"} label={word(r.status)} />;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SelectField label={t("peoClass")} value={classId} onChange={(v) => { setChosen(v); setMessage(null); }} options={classes.data.items.map((c) => ({ value: c.id, label: c.name }))} className="max-w-xs" />
      {day.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {day.status === "error" && (day.messageKey === "errorConflict" ? <Card><EmptyState title={t("ttNoYearTitle")} description={t("ttNoYearBody")} headingLevel={2} /></Card> : <Failed messageKey={day.messageKey} retry={reload} />)}
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {day.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {day.data.submitted ? <Badge tone="success">{t("attTakenBy", { name: day.data.submittedBy ?? "" })}</Badge> : <Badge tone="warning">{t("attTabMissing")}</Badge>}
            {locked && <Badge tone="neutral">{t("attLocked")}</Badge>}
            {STATUSES.filter((s) => s !== "PRESENT" && day.data.counts[s] > 0).map((s) => <StatusPill key={s} status={PILL[s]!} label={t("attCount", { label: word(s), count: day.data.counts[s] })} />)}
            <span className="text-body text-text-muted">{t("attCount", { label: word("PRESENT"), count: day.data.counts.PRESENT })}</span>
          </div>
          {!day.data.submitted && <Banner tone="info" title={t("attNotTaken")} />}
          {locked && grants.edit && <Banner tone="warning" title={t("attLockedNote")} />}
          {rows.length === 0 ? <Card><EmptyState title={t("attNoStudents")} headingLevel={2} /></Card> : <DataTable caption={t("attTabRegister")} columns={columns} rows={rows} rowKey={(r) => r.id} />}
          <div className="flex flex-wrap gap-3">
            {!locked && grants.submit && rows.length > 0 && <Button variant="primary" size="comfortable" disabled={busy || (day.data.submitted && !dirty)} onClick={() => void act(() => api!.attendanceSubmit({ path: { id: classId, date }, body: { marks: marks(), submissionId: crypto.randomUUID() } }), "attSaved")}>{t("attSave")}</Button>}
            {!locked && day.data.submitted && grants.edit && <Button size="comfortable" disabled={busy || dirty} onClick={() => void act(() => api!.attendanceLock({ path: { id: classId, date } }), "attLockDone")}>{t("attLock")}</Button>}
            {locked && grants.edit && <Button variant="primary" size="comfortable" disabled={busy || !dirty} onClick={() => void act(() => api!.attendanceCorrect({ path: { id: classId, date }, body: { marks: marks() } }), "attCorrected")}>{t("attSaveCorrection")}</Button>}
          </div>
        </>
      )}
    </div>
  );
}

function Missing({ date }: { date: string }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<MissingDto>(api && date ? () => api.attendanceMissing({ query: { date } }) : null, `missing-${date}`);
  if (state.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (state.status === "error") return <Failed messageKey={state.messageKey} retry={reload} />;
  if (state.data.items.length === 0) return <Card><EmptyState title={t("attMissingEmpty")} headingLevel={2} /></Card>;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-body-lg font-semibold">{t("attMissingTitle", { date })}</h2>
      <DataTable caption={t("attTabMissing")} columns={[{ key: "name", header: t("peoClass"), render: (c) => c.name }]} rows={state.data.items} rowKey={(c) => c.id} />
    </div>
  );
}

function Names({ grants }: { grants: AttendanceGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<StatusListDto>(api ? () => api.attendanceStatuses({}) : null, "statuses-names");
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (state.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (state.status === "error") return <Failed messageKey={state.messageKey} retry={reload} />;
  const shown = (s: StatusDto) => typed[s.status] ?? (s.isDefault ? t(`attStatus${s.status}`) : s.label);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text-muted">{t("attNamesHint")}</p>
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      <div className="flex flex-col gap-3">
        {state.data.items.map((s) => (
          <form key={s.status} className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage(null);
            try {
              await api!.attendanceSetLabel({ path: { status: s.status as never }, body: { label: shown(s).trim() } });
              setTyped((cur) => { const { [s.status]: _drop, ...rest } = cur; return rest; });
              setMessage({ tone: "saved", text: t("attNameSaved") });
              reload();
            } catch (err) {
              setMessage({ tone: "error", text: t(errorKey(err)) });
            } finally {
              setBusy(false);
            }
          }}>
            <StatusPill status={PILL[s.status] ?? "present"} label={t(`attStatus${s.status}`)} />
            {grants.edit ? (
              <>
                <TextField size="comfortable" label={t("attNameFor", { status: t(`attStatus${s.status}`) })} value={shown(s)} onChange={(e) => setTyped((cur) => ({ ...cur, [s.status]: e.target.value }))} />
                <Button type="submit" size="comfortable" disabled={busy || !shown(s).trim() || shown(s) === (s.isDefault ? t(`attStatus${s.status}`) : s.label)}>{t("actionSave")}</Button>
              </>
            ) : <span className="text-body">{shown(s)}</span>}
            {s.isDefault && <span className="text-caption text-text-muted">{t("attNameDefault")}</span>}
          </form>
        ))}
      </div>
    </div>
  );
}

/** Student attendance for the school's office (P3-11b): one class's register on a date, who has not taken attendance, and the school's own names for the seven statuses. */
export function Attendance({ grants }: { grants: AttendanceGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("register");
  const [date, setDate] = useState(schoolToday());
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navAttendance")}</h1>
      <SegmentedControl label={t("attViewLabel")} value={tab} onChange={setTab} options={[{ value: "register", label: t("attTabRegister") }, { value: "missing", label: t("attTabMissing") }, { value: "names", label: t("attTabNames") }]} />
      {tab !== "names" && <TextField size="comfortable" type="date" label={t("attDate")} value={date} max={schoolToday()} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />}
      {tab === "register" ? <Register grants={grants} date={date} /> : tab === "missing" ? <Missing date={date} /> : <Names grants={grants} />}
    </div>
  );
}
