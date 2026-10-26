"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ClassListDto, ClassTimetableDto, PeriodDto, ScheduleDto, StaffTimetableDto, SubjectListDto, TeacherListDto, TimetableLoadDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, Checkbox, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";

export interface TimetableGrants {
  /** Put lessons in the timetable and change the working days (the academics update grant). */
  edit: boolean;
  /** Add periods and start from a standard day (the academics create grant). */
  create: boolean;
  /** Clear lessons and remove periods (the academics delete grant). */
  remove: boolean;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
/** The gateway's rule names for a refusal, and the catalogue key that says it. */
const RULES: Readonly<Record<string, string>> = {
  classBusy: "ttClassBusy", teacherBusy: "ttTeacherBusy", teacherDoesNotTeachSubject: "ttTeacherNotSubject", notAWorkingDay: "ttNotWorkingDay", periodInUse: "ttPeriodInUse",
  overlaps: "ttPeriodOverlaps", labelTaken: "ttPeriodLabelTaken", startTaken: "ttPeriodStartTaken", endNotAfterStart: "ttPeriodEnd", timeInvalid: "ttPeriodTime", noActiveYear: "ttNoYearTitle",
};

const dayKey = (d: string) => `ttDay${d}`;

/** The week as a table: a column per working day, a row per period (breaks span the row). `cell` draws what is in one slot. */
function Grid({ caption, days, periods, cell }: { caption: string; days: string[]; periods: PeriodDto[]; cell: (day: string, period: PeriodDto) => React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-surface-muted">
            <th scope="col" className="px-3 py-2 text-start text-caption font-semibold text-text-muted"><span className="sr-only">{t("ttPeriodName")}</span></th>
            {days.map((d) => <th key={d} scope="col" className="px-3 py-2 text-start text-caption font-semibold text-text-muted">{t(dayKey(d))}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-start align-top text-body font-semibold">
                {p.label}
                <span className="block text-caption font-normal text-text-muted">{p.startTime}–{p.endTime}</span>
              </th>
              {p.isBreak ? (
                <td colSpan={days.length} className="bg-surface-muted px-3 py-2 text-center text-caption text-text-muted">{t("ttBreak")}</td>
              ) : (
                days.map((d) => <td key={d} className="p-1 align-top">{cell(d, p)}</td>)
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Slot({ title, detail, onPress, label }: { title: string; detail?: string; onPress?: () => void; label: string }) {
  const body = (
    <>
      <span className="block text-body font-semibold">{title}</span>
      {detail && <span className="block text-caption text-text-muted">{detail}</span>}
    </>
  );
  if (!onPress) return <div className="min-h-12 rounded-md px-2 py-1">{body}</div>;
  return <button type="button" aria-label={label} onClick={onPress} className="min-h-12 w-full rounded-md border border-border px-2 py-1 text-start hover:bg-surface-muted">{body}</button>;
}

function useWorking() {
  const { api } = useSession();
  return useLoad<ScheduleDto>(api ? () => api.scheduleGet({}) : null, "schedule");
}

function ClassView({ grants, schedule }: { grants: TimetableGrants; schedule: ScheduleDto }) {
  const t = useTranslations();
  const { api } = useSession();
  const [classes] = useLoad<ClassListDto>(api ? () => api.academicsClasses({}) : null, "classes");
  const [subjects] = useLoad<SubjectListDto>(api && grants.edit ? () => api.academicsSubjects({}) : null, "subjects");
  const [teachers] = useLoad<TeacherListDto>(api && grants.edit ? () => api.teachingTeachers({}) : null, "teachers");
  const [chosen, setChosen] = useState("");
  const classId = chosen || (classes.status === "ready" ? classes.data.items[0]?.id ?? "" : "");
  const [tt, reload] = useLoad<ClassTimetableDto>(api && classId ? () => api.timetableForClass({ path: { id: classId } }) : null, `class-${classId}`);
  const [pick, setPick] = useState<{ day: string; period: PeriodDto } | null>(null);
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (classes.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (classes.status === "error") return <Failed messageKey={classes.messageKey} retry={() => location.reload()} />;
  if (classes.data.items.length === 0) return <Card><EmptyState title={t("ttNoClasses")} headingLevel={2} /></Card>;
  const entries = tt.status === "ready" ? tt.data.entries : [];
  const at = (day: string, periodId: string) => entries.find((e) => e.day === day && e.periodId === periodId);
  const teachersOf = (subjectId: string) => (teachers.status === "ready" ? teachers.data.items.filter((x) => x.subjects.some((s) => s.id === subjectId)) : []);
  const open = (day: string, period: PeriodDto) => {
    const e = at(day, period.id);
    setPick({ day, period });
    setSubject(e?.subject.id ?? "");
    setTeacher(e?.staff.id ?? "");
    setMessage(null);
  };
  const act = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      setMessage({ tone: "saved", text: t(done) });
      setPick(null);
      reload();
    } catch (e) {
      setMessage({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
    }
  };
  const current = pick ? at(pick.day, pick.period.id) : undefined;
  const candidates = subject ? teachersOf(subject) : [];

  return (
    <div className="flex flex-col gap-4">
      <SelectField label={t("peoClass")} value={classId} onChange={(v) => { setChosen(v); setPick(null); setMessage(null); }} options={classes.data.items.map((c) => ({ value: c.id, label: c.name }))} className="max-w-xs" />
      {tt.status === "error" && (tt.messageKey === "errorConflict" ? <Card><EmptyState title={t("ttNoYearTitle")} description={t("ttNoYearBody")} headingLevel={2} /></Card> : <Failed messageKey={tt.messageKey} retry={reload} />)}
      {tt.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {tt.status === "ready" && (
        <Grid caption={t("navTimetable")} days={schedule.workingDays} periods={schedule.periods} cell={(day, period) => {
          const e = at(day, period.id);
          const label = `${t(dayKey(day))}, ${period.label}`;
          return <Slot label={label} title={e ? e.subject.name : t("ttEmptyCell")} detail={e?.staff.name} onPress={grants.edit ? () => open(day, period) : undefined} />;
        }} />
      )}
      {pick && grants.edit && (
        <Card title={t("ttEditorTitle", { slot: `${t(dayKey(pick.day))}, ${pick.period.label}` })} headingLevel={2}>
          <div className="flex flex-wrap items-end gap-3">
            <SelectField label={t("ttSubject")} value={subject} onChange={(v) => { setSubject(v); setTeacher(""); }} options={[{ value: "", label: "" }, ...(subjects.status === "ready" ? subjects.data.items.map((s) => ({ value: s.id, label: s.name })) : [])]} />
            <SelectField label={t("ttPickTeacher")} value={teacher} onChange={setTeacher} options={[{ value: "", label: "" }, ...candidates.map((x) => ({ value: x.staff.id, label: x.staff.name }))]} />
            <Button variant="primary" size="comfortable" disabled={busy || !subject || !teacher} onClick={() => void act(() => api!.timetableSetSlot({ path: { id: classId }, body: { day: pick.day as never, periodId: pick.period.id, subjectId: subject, staffId: teacher } }), "ttSaved")}>{t("ttSetLesson")}</Button>
            {current && grants.remove && <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.timetableClear({ path: { id: current.id } }), "ttCleared")}>{t("ttClearLesson")}</Button>}
            <Button size="comfortable" onClick={() => setPick(null)}>{t("actionCancel")}</Button>
          </div>
          {subject && candidates.length === 0 && <p className="mt-3 text-body text-text-muted">{t("ttNoTeachers")}</p>}
        </Card>
      )}
    </div>
  );
}

function TeacherView({ schedule }: { schedule: ScheduleDto }) {
  const t = useTranslations();
  const { api } = useSession();
  const [teachers] = useLoad<TeacherListDto>(api ? () => api.teachingTeachers({}) : null, "teachers");
  const [load] = useLoad<TimetableLoadDto>(api ? () => api.timetableLoad({}) : null, "load");
  const [chosen, setChosen] = useState("");
  const staffId = chosen || (teachers.status === "ready" ? teachers.data.items[0]?.staff.id ?? "" : "");
  const [tt, reload] = useLoad<StaffTimetableDto>(api && staffId ? () => api.timetableForStaff({ path: { staffId } }) : null, `staff-${staffId}`);
  if (teachers.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (teachers.status === "error") return <Failed messageKey={teachers.messageKey} retry={() => location.reload()} />;
  if (teachers.data.items.length === 0) return <Card><EmptyState title={t("ttNoTeachers")} headingLevel={2} /></Card>;
  const entries = tt.status === "ready" ? tt.data.entries : [];
  type Row = TimetableLoadDto["items"][number];
  const columns: Column<Row>[] = [
    { key: "name", header: t("ttPickTeacher"), render: (r) => r.staff.name },
    { key: "total", header: t("ttLoadTitle"), numeric: true, render: (r) => t("ttLoadCount", { count: r.total }) },
    ...DAYS.filter((d) => schedule.workingDays.includes(d)).map((d) => ({ key: d, header: t(dayKey(d)), numeric: true, render: (r: Row) => (r.byDay as Record<string, number>)[d] ?? 0 })),
  ];
  return (
    <div className="flex flex-col gap-4">
      <SelectField label={t("ttPickTeacher")} value={staffId} onChange={setChosen} options={teachers.data.items.map((x) => ({ value: x.staff.id, label: x.staff.name }))} className="max-w-xs" />
      {tt.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {tt.status === "error" && <Failed messageKey={tt.messageKey} retry={reload} />}
      {tt.status === "ready" && (
        <Grid caption={t("navTimetable")} days={schedule.workingDays} periods={schedule.periods} cell={(day, period) => {
          const e = entries.find((x) => x.day === day && x.periodId === period.id);
          return <Slot label="" title={e ? e.class.name : t("ttEmptyCell")} detail={e?.subject.name} />;
        }} />
      )}
      <h2 className="text-body-lg font-semibold">{t("ttLoadTitle")}</h2>
      {load.status === "ready" && (load.data.items.length === 0 ? <p className="text-body text-text-muted">{t("ttNoLoad")}</p> : <DataTable caption={t("ttLoadTitle")} columns={columns} rows={load.data.items} rowKey={(r) => r.staff.id} />)}
    </div>
  );
}

function ScheduleView({ grants, schedule, reload }: { grants: TimetableGrants; schedule: ScheduleDto; reload: () => void }) {
  const t = useTranslations();
  const { api } = useSession();
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<string[]>(schedule.workingDays);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isBreak, setIsBreak] = useState(false);
  const [removing, setRemoving] = useState<PeriodDto | null>(null);
  const act = async (work: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      setMessage({ tone: "saved", text: t(done) });
      after?.();
      reload();
    } catch (e) {
      setMessage({ tone: "error", text: t(ruleKey(e, RULES, errorKey)) });
    } finally {
      setBusy(false);
    }
  };
  const toggle = (d: string) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const columns: Column<PeriodDto>[] = [
    { key: "no", header: t("ttNumber"), render: (p) => (p.isBreak ? <Badge tone="neutral">{t("ttBreak")}</Badge> : p.number) },
    { key: "label", header: t("ttPeriodName"), render: (p) => p.label },
    { key: "start", header: t("ttStarts"), numeric: true, render: (p) => p.startTime },
    { key: "end", header: t("ttEnds"), numeric: true, render: (p) => p.endTime },
    ...(grants.remove ? [{ key: "x", header: t("hrpRemove"), hideHeader: true, render: (p: PeriodDto) => <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${p.label}`} onClick={() => setRemoving(p)}>{t("hrpRemove")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      <Card title={t("ttWorkingDays")} headingLevel={2}>
        <div className="flex flex-wrap items-center gap-4">
          {DAYS.map((d) => <Checkbox key={d} label={t(dayKey(d))} checked={days.includes(d)} disabled={!grants.edit} onChange={() => toggle(d)} />)}
          {grants.edit && <Button size="comfortable" disabled={busy || days.length === 0 || days.join() === schedule.workingDays.join()} onClick={() => void act(() => api!.scheduleSetWorkingDays({ body: { days: DAYS.filter((d) => days.includes(d)) as never } }), "ttDaysSaved")}>{t("actionSave")}</Button>}
        </div>
      </Card>
      {schedule.periods.length === 0 ? (
        <Card><EmptyState title={t("ttNoPeriodsTitle")} description={t("ttNoPeriodsBody")} headingLevel={2} /></Card>
      ) : (
        <DataTable caption={t("ttTabSchedule")} columns={columns} rows={schedule.periods} rowKey={(p) => p.id} />
      )}
      {removing && (
        <ConfirmBox question={t("ttRemoveQuestion", { name: removing.label })}>
          <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.scheduleRemove({ path: { id: removing.id } }), "ttSaved", () => setRemoving(null))}>{t("hrpRemove")}</Button>
          <Button size="comfortable" onClick={() => setRemoving(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {grants.create && schedule.periods.length === 0 && (
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="comfortable" disabled={busy} onClick={() => void act(() => api!.scheduleTemplate({ body: { template: "STANDARD" } }), "ttTemplateApplied")}>{t("ttStandard")}</Button>
          <Button size="comfortable" disabled={busy} onClick={() => void act(() => api!.scheduleTemplate({ body: { template: "SHORT_DAY" } }), "ttTemplateApplied")}>{t("ttShort")}</Button>
        </div>
      )}
      {grants.create && (
        <Card title={t("ttAddPeriod")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
            e.preventDefault();
            void act(() => api!.scheduleCreate({ body: { label: label.trim(), startTime: start, endTime: end, isBreak } }), "ttPeriodAdded", () => { setLabel(""); setStart(""); setEnd(""); setIsBreak(false); });
          }}>
            <TextField size="comfortable" label={t("ttPeriodName")} value={label} onChange={(e) => setLabel(e.target.value)} />
            <TextField size="comfortable" label={t("ttStarts")} inputMode="numeric" placeholder="08:30" value={start} onChange={(e) => setStart(e.target.value)} />
            <TextField size="comfortable" label={t("ttEnds")} inputMode="numeric" placeholder="09:10" value={end} onChange={(e) => setEnd(e.target.value)} />
            <Checkbox label={t("ttIsBreak")} checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
            <Button type="submit" variant={schedule.periods.length === 0 ? "secondary" : "primary"} size="comfortable" disabled={busy || !label.trim() || !start || !end}>{t("ttAddPeriod")}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

/** The timetable and the school's bell schedule (P3-11a): the week of one class or one teacher, who is busy how often, and the periods and working days. */
export function Timetable({ grants }: { grants: TimetableGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("class");
  const [schedule, reload] = useWorking();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navTimetable")}</h1>
      <SegmentedControl label={t("ttViewLabel")} value={tab} onChange={setTab} options={[{ value: "class", label: t("ttTabClass") }, { value: "teacher", label: t("ttTabTeacher") }, { value: "schedule", label: t("ttTabSchedule") }]} />
      {schedule.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {schedule.status === "error" && <Failed messageKey={schedule.messageKey} retry={reload} />}
      {schedule.status === "ready" && (tab === "schedule" ? <ScheduleView grants={grants} schedule={schedule.data} reload={reload} /> : schedule.data.periods.length === 0 ? (
        <Card><EmptyState title={t("ttNoPeriodsTitle")} description={t("ttNoPeriodsBody")} headingLevel={2} /></Card>
      ) : tab === "class" ? <ClassView grants={grants} schedule={schedule.data} /> : <TeacherView schedule={schedule.data} />)}
    </div>
  );
}
