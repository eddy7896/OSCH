"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BandsDto, ClassListDto, ExamDto, ExamListDto, MarksGridDto, ReportCardDto, StudentSummaryDto, SubjectListDto, TermListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, SegmentedControl, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { shortDate } from "@/lib/display";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { ConfirmBox, Failed, Saved, SelectField } from "./parts";
import { saveFile } from "./download";

export interface GradebookGrants {
  /** Enter marks (the grades create grant). */
  enter: boolean;
  /** Add terms and exams (the academics create grant). */
  create: boolean;
  /** Set the grade bands (the academics update grant). */
  update: boolean;
  /** Remove terms and exams (the academics delete grant). */
  remove: boolean;
}

const RULES: Readonly<Record<string, string>> = {
  aboveMaximum: "gbAboveMax", notAMark: "gbNotAMark", positiveMarks: "gbNotAMark", absentHasNoMarks: "gbAbsentNoMarks", nameTaken: "gbNameTaken", termHasExams: "gbTermHasExams", examExists: "gbExamExists",
  examHasMarks: "gbExamHasMarks", belowAGivenMark: "gbBelowMark", overlap: "gbBandOverlap", gap: "gbBandGap", startsAboveZero: "gbBandStart", endsBelowHundred: "gbBandEnd", labelTaken: "gbBandLabelTaken", badRange: "gbBandBad",
  noActiveYear: "ttNoYearTitle",
};

type Note = { tone: "saved" | "error"; text: string } | null;
const Notice = ({ note }: { note: Note }) => (note ? note.tone === "saved" ? <Saved>{note.text}</Saved> : <Banner tone="danger" title={note.text} /> : null);

/** Runs a write, shows what happened in the person's words, and asks for a fresh read. */
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

function useTerms() {
  const { api } = useSession();
  return useLoad<TermListDto>(api ? () => api.gradesTerms({}) : null, "terms");
}

// ------------------------------------------------------------------ marks entry
function MarksTab({ grants }: { grants: GradebookGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [terms] = useTerms();
  const [termPick, setTermPick] = useState("");
  const termId = termPick || (terms.status === "ready" ? terms.data.items[0]?.id ?? "" : "");
  const [exams] = useLoad<ExamListDto>(api && termId ? () => api.gradesExams({ query: { termId } }) : null, `exams-${termId}`);
  const [examPick, setExamPick] = useState("");
  const examId = (exams.status === "ready" && exams.data.items.some((e) => e.id === examPick) ? examPick : exams.status === "ready" ? exams.data.items[0]?.id : "") ?? "";
  const [grid, reload] = useLoad<MarksGridDto>(api && examId ? () => api.gradesGrid({ path: { id: examId } }) : null, `grid-${examId}`);
  const [edits, setEdits] = useState<{ key: string; map: Record<string, { marks: string; absent: boolean }> }>({ key: "", map: {} });
  const { note, busy, act } = useAct(t, reload);
  const changed = edits.key === examId ? edits.map : {};

  if (terms.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (terms.status === "error") return <Failed messageKey={terms.messageKey} retry={() => location.reload()} />;
  if (terms.data.items.length === 0) return <Card><EmptyState title={t("gbNoTermsTitle")} description={t("gbNoTermsBody")} headingLevel={2} /></Card>;
  const rows = grid.status === "ready" ? grid.data.rows : [];
  type Row = (typeof rows)[number];
  const valueOf = (r: Row) => changed[r.studentId] ?? { marks: r.marks ?? "", absent: r.absent };
  const set = (r: Row, patch: Partial<{ marks: string; absent: boolean }>) => setEdits({ key: examId, map: { ...changed, [r.studentId]: { ...valueOf(r), ...patch } } });
  const entries = () => Object.entries(changed).map(([studentId, v]) => (v.absent ? { studentId, absent: true } : v.marks.trim() === "" ? { studentId } : { studentId, marks: v.marks.trim() }));
  const columns: Column<Row>[] = [
    { key: "name", header: t("attStudent"), render: (r) => <span>{r.name}<span className="block text-caption text-text-muted">{r.enrollmentId}</span></span> },
    {
      key: "marks", header: t("gradesMarks"), numeric: true,
      render: (r) => grants.enter
        ? <input aria-label={t("gbMarksFor", { name: r.name })} inputMode="decimal" className="min-h-10 w-24 rounded-md border border-border-strong bg-surface px-3 text-end text-body text-text" value={valueOf(r).absent ? "" : valueOf(r).marks} disabled={valueOf(r).absent} onChange={(e) => set(r, { marks: e.target.value })} />
        : r.absent ? t("gbMarkAbsent") : r.marks ?? "",
    },
    ...(grants.enter ? [{ key: "absent", header: t("attStatusABSENT"), render: (r: Row) => <label className="flex min-h-12 min-w-12 items-center justify-center"><input type="checkbox" className="size-6 accent-primary" aria-label={t("gbAbsentFor", { name: r.name })} checked={valueOf(r).absent} onChange={(e) => set(r, { absent: e.target.checked, marks: "" })} /></label> }] : []),
    { key: "percent", header: t("gradesPercent"), numeric: true, render: (r) => (r.percent ? `${r.percent}%` : "") },
    { key: "grade", header: t("gradesGrade"), render: (r) => r.grade ?? "" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <SelectField label={t("gbPickTerm")} value={termId} onChange={(v) => { setTermPick(v); setExamPick(""); }} options={terms.data.items.map((x) => ({ value: x.id, label: x.name }))} />
        {exams.status === "ready" && exams.data.items.length > 0 && <SelectField label={t("gbPickExam")} value={examId} onChange={setExamPick} options={exams.data.items.map((e) => ({ value: e.id, label: `${e.title}: ${e.class.name}, ${e.subject.name}` }))} />}
      </div>
      {exams.status === "ready" && exams.data.items.length === 0 && <Card><EmptyState title={t("gbNoExams")} headingLevel={2} /></Card>}
      {grid.status === "loading" && examId && <Banner tone="info" title={t("statusLoading")} />}
      {grid.status === "error" && <Failed messageKey={grid.messageKey} retry={reload} />}
      <Notice note={note} />
      {grid.status === "ready" && (
        <>
          <p className="text-body text-text-muted">{grid.data.exam.title} · {t("gbOutOf", { max: grid.data.exam.maxMarks })}</p>
          {rows.length === 0 ? <Card><EmptyState title={t("attNoStudents")} headingLevel={2} /></Card> : <DataTable caption={t("gbTabMarks")} columns={columns} rows={rows} rowKey={(r) => r.studentId} />}
          {grants.enter && rows.length > 0 && <div><Button variant="primary" size="comfortable" disabled={busy || Object.keys(changed).length === 0} onClick={() => void act(() => api!.gradesSaveMarks({ path: { id: examId }, body: { entries: entries(), submissionId: crypto.randomUUID() } }), "gbMarksSaved", () => setEdits({ key: examId, map: {} }))}>{t("gbSaveMarks")}</Button></div>}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ exams and terms
function ExamsTab({ grants }: { grants: GradebookGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [terms, reloadTerms] = useTerms();
  const [exams, reloadExams] = useLoad<ExamListDto>(api ? () => api.gradesExams({}) : null, "exams-all");
  const [classes] = useLoad<ClassListDto>(api && grants.create ? () => api.academicsClasses({}) : null, "classes");
  const [subjects] = useLoad<SubjectListDto>(api && grants.create ? () => api.academicsSubjects({}) : null, "subjects");
  const reload = () => { reloadTerms(); reloadExams(); };
  const { note, busy, act, clear } = useAct(t, reload);
  const [termName, setTermName] = useState("");
  const [form, setForm] = useState({ termId: "", classId: "", subjectId: "", title: "", examDate: "", maxMarks: "100" });
  const [removing, setRemoving] = useState<{ kind: "exam" | "term"; id: string; name: string } | null>(null);
  const columns: Column<ExamDto>[] = [
    { key: "title", header: t("gbExamName"), render: (e) => e.title },
    { key: "term", header: t("gbPickTerm"), render: (e) => e.term.name },
    { key: "class", header: t("peoClass"), render: (e) => e.class.name },
    { key: "subject", header: t("gradesSubject"), render: (e) => e.subject.name },
    { key: "date", header: t("attDate"), render: (e) => shortDate(e.examDate, locale) },
    { key: "max", header: t("gradesOutOf"), numeric: true, render: (e) => e.maxMarks },
    ...(grants.remove ? [{ key: "x", header: t("hrpRemove"), hideHeader: true, render: (e: ExamDto) => <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${e.title}`} onClick={() => { clear(); setRemoving({ kind: "exam", id: e.id, name: e.title }); }}>{t("hrpRemove")}</Button> }] : []),
  ];
  const ready = terms.status === "ready";
  const x = form.termId || (ready ? terms.data.items[0]?.id ?? "" : "");
  const c = form.classId || (classes.status === "ready" ? classes.data.items[0]?.id ?? "" : "");
  const s = form.subjectId || (subjects.status === "ready" ? subjects.data.items[0]?.id ?? "" : "");
  return (
    <div className="flex flex-col gap-4">
      <Notice note={note} />
      <Card title={t("gbPickTerm")} headingLevel={2}>
        {terms.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
        {terms.status === "error" && <Failed messageKey={terms.messageKey} retry={reloadTerms} />}
        {ready && (
          <ul className="flex flex-wrap gap-2">
            {terms.data.items.map((term) => (
              <li key={term.id} className="flex items-center gap-1 rounded-md bg-surface-muted ps-3">
                <span className="text-body font-semibold">{term.name}</span>
                {grants.remove && <Button size="compact" variant="ghost" aria-label={`${t("hrpRemove")}: ${term.name}`} onClick={() => { clear(); setRemoving({ kind: "term", id: term.id, name: term.name }); }}>{t("hrpRemove")}</Button>}
              </li>
            ))}
          </ul>
        )}
        {grants.create && (
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.gradesCreateTerm({ body: { name: termName.trim() } }), "gbTermAdded", () => setTermName("")); }}>
            <TextField size="comfortable" label={t("gbTermName")} value={termName} onChange={(e) => setTermName(e.target.value)} />
            <Button type="submit" size="comfortable" disabled={busy || !termName.trim()}>{t("gbAddTerm")}</Button>
          </form>
        )}
      </Card>
      {removing && (
        <ConfirmBox question={t("ttRemoveQuestion", { name: removing.name })}>
          <Button size="comfortable" disabled={busy} onClick={() => void act(() => (removing.kind === "exam" ? api!.gradesDeleteExam({ path: { id: removing.id } }) : api!.gradesDeleteTerm({ path: { id: removing.id } })), "ttSaved", () => setRemoving(null))}>{t("hrpRemove")}</Button>
          <Button size="comfortable" onClick={() => setRemoving(null)}>{t("actionCancel")}</Button>
        </ConfirmBox>
      )}
      {exams.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {exams.status === "error" && <Failed messageKey={exams.messageKey} retry={reloadExams} />}
      {exams.status === "ready" && (exams.data.items.length === 0 ? <Card><EmptyState title={t("gbNoExams")} headingLevel={2} /></Card> : <DataTable caption={t("gbTabExams")} columns={columns} rows={exams.data.items} rowKey={(e) => e.id} />)}
      {grants.create && ready && terms.data.items.length > 0 && (
        <Card title={t("gbAddExam")} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void act(() => api!.gradesCreateExam({ body: { termId: x, classId: c, subjectId: s, title: form.title.trim(), examDate: form.examDate, maxMarks: form.maxMarks.trim() } }), "gbExamAdded", () => setForm({ ...form, title: "" })); }}>
            <SelectField label={t("gbPickTerm")} value={x} onChange={(v) => setForm({ ...form, termId: v })} options={terms.data.items.map((i) => ({ value: i.id, label: i.name }))} />
            <SelectField label={t("peoClass")} value={c} onChange={(v) => setForm({ ...form, classId: v })} options={classes.status === "ready" ? classes.data.items.map((i) => ({ value: i.id, label: i.name })) : []} />
            <SelectField label={t("gradesSubject")} value={s} onChange={(v) => setForm({ ...form, subjectId: v })} options={subjects.status === "ready" ? subjects.data.items.map((i) => ({ value: i.id, label: i.name })) : []} />
            <TextField size="comfortable" label={t("gbExamName")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField size="comfortable" type="date" label={t("attDate")} value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} />
            <TextField size="comfortable" inputMode="decimal" label={t("gbMarksField")} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !form.title.trim() || !form.examDate || !form.maxMarks.trim() || !x || !c || !s}>{t("gbAddExam")}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ grade bands
interface BandRow { label: string; from: string; to: string }
const toRows = (b: BandsDto["bands"]): BandRow[] => b.map((x) => ({ label: x.label, from: String(x.minPercent), to: String(x.maxPercent) }));

function BandsTab({ grants }: { grants: GradebookGrants }) {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<BandsDto>(api ? () => api.gradesBands({}) : null, "bands");
  const [draft, setDraft] = useState<BandRow[] | null>(null);
  const { note, busy, act } = useAct(t, reload);
  if (state.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (state.status === "error") return <Failed messageKey={state.messageKey} retry={reload} />;
  const rows = draft ?? toRows(state.data.bands);
  const edit = (i: number, patch: Partial<BandRow>) => setDraft(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const num = (v: string) => (/^\d{1,3}$/.test(v.trim()) ? Number(v) : -1);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text-muted">{t("gbBandsHint")}</p>
      <Notice note={note} />
      {rows.length === 0 && <Banner tone="info" title={t("gbBandsNone")} />}
      {grants.update ? (
        <div className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <TextField size="comfortable" label={t("gradesGrade")} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} />
              <TextField size="comfortable" inputMode="numeric" label={t("gbFrom")} value={r.from} onChange={(e) => edit(i, { from: e.target.value })} />
              <TextField size="comfortable" inputMode="numeric" label={t("gbTo")} value={r.to} onChange={(e) => edit(i, { to: e.target.value })} />
              <Button size="comfortable" variant="ghost" aria-label={t("gbRemoveBand", { label: r.label })} onClick={() => setDraft(rows.filter((_x, j) => j !== i))}>{t("hrpRemove")}</Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button size="comfortable" icon="plus" onClick={() => setDraft([...rows, { label: "", from: "", to: "" }])}>{t("gbAddBand")}</Button>
            <Button size="comfortable" onClick={() => setDraft(toRows(state.data.template))}>{t("gbUseStandard")}</Button>
            <Button variant="primary" size="comfortable" disabled={busy || draft === null} onClick={() => void act(() => api!.gradesSetBands({ body: { bands: rows.map((r) => ({ label: r.label.trim(), minPercent: num(r.from), maxPercent: num(r.to) })) } }), "gbBandsSaved", () => setDraft(null))}>{t("gbSaveBands")}</Button>
          </div>
        </div>
      ) : rows.length > 0 && <DataTable caption={t("gbTabBands")} columns={[{ key: "g", header: t("gradesGrade"), render: (r: BandRow) => r.label }, { key: "f", header: t("gbFrom"), numeric: true, render: (r: BandRow) => r.from }, { key: "t", header: t("gbTo"), numeric: true, render: (r: BandRow) => r.to }]} rows={rows} rowKey={(r) => r.label} />}
    </div>
  );
}

// ------------------------------------------------------------------ report cards
function CardsTab() {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [terms] = useTerms();
  const [classes] = useLoad<ClassListDto>(api ? () => api.academicsClasses({}) : null, "classes");
  const [students] = useLoad<StudentSummaryDto[]>(api ? async () => {
    const all: StudentSummaryDto[] = [];
    for (let page = 1; page <= 20; page++) {
      const r = await api.studentsList({ query: { page, pageSize: 100 } });
      all.push(...r.items);
      if (all.length >= r.total) break;
    }
    return all;
  } : null, "students-all");
  const [term, setTerm] = useState("");
  const [klass, setKlass] = useState("");
  const [student, setStudent] = useState("");
  const termId = term || (terms.status === "ready" ? terms.data.items[0]?.id ?? "" : "");
  const classId = klass || (classes.status === "ready" ? classes.data.items[0]?.id ?? "" : "");
  const inClass = students.status === "ready" ? students.data.filter((s) => s.placement?.classroom.id === classId) : [];
  const studentId = inClass.some((s) => s.id === student) ? student : inClass[0]?.id ?? "";
  const [card, reload] = useLoad<ReportCardDto>(api && termId && studentId ? () => api.gradesReportCard({ path: { studentId }, query: { termId } }) : null, `card-${termId}-${studentId}`);
  const [error, setError] = useState<string | null>(null);
  if (terms.status === "loading" || classes.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (terms.status === "error") return <Failed messageKey={terms.messageKey} retry={() => location.reload()} />;
  if (terms.data.items.length === 0) return <Card><EmptyState title={t("gbNoTermsTitle")} description={t("gbNoTermsBody")} headingLevel={2} /></Card>;
  const pdf = async () => {
    setError(null);
    try {
      const blob = (await api!.gradesReportCardPdf({ path: { studentId }, query: { termId, lang: locale }, parseAs: "blob" })) as Blob;
      saveFile(blob, `report-card-${card.status === "ready" ? card.data.student.enrollmentId : studentId}.pdf`);
    } catch (e) {
      setError(errorKey(e));
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <SelectField label={t("gbPickTerm")} value={termId} onChange={setTerm} options={terms.data.items.map((x) => ({ value: x.id, label: x.name }))} />
        <SelectField label={t("peoClass")} value={classId} onChange={(v) => { setKlass(v); setStudent(""); }} options={classes.status === "ready" ? classes.data.items.map((c) => ({ value: c.id, label: c.name })) : []} />
        <SelectField label={t("gbPickStudent")} value={studentId} onChange={setStudent} options={inClass.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))} />
      </div>
      {error && <Banner tone="danger" title={t(error)} />}
      {inClass.length === 0 && students.status === "ready" && <Card><EmptyState title={t("attNoStudents")} headingLevel={2} /></Card>}
      {card.status === "loading" && studentId && <Banner tone="info" title={t("statusLoading")} />}
      {card.status === "error" && (card.messageKey === "errorNotFound" ? <Card><EmptyState title={t("gbNoCard")} headingLevel={2} /></Card> : <Failed messageKey={card.messageKey} retry={reload} />)}
      {card.status === "ready" && (
        <Card title={`${card.data.student.name} · ${card.data.class.name} · ${card.data.term.name}`} headingLevel={2}>
          <div className="flex flex-col gap-3">
            {card.data.subjects.map((s) => (
              <details key={s.subject.id} className="rounded-md border border-border">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <span className="text-body font-semibold">{s.subject.name}</span>
                  <span className="flex items-center gap-3 text-body tabular-nums">{s.marks} / {s.maxMarks} · {s.percent}% {s.grade && <Badge tone="brand">{s.grade}</Badge>}</span>
                </summary>
                <ul className="flex flex-col gap-1 border-t border-border px-3 py-2 text-caption">
                  {s.exams.map((e) => <li key={e.id} className="flex justify-between gap-3"><span>{e.title}<span className="ms-2 text-text-muted">{shortDate(e.date, locale)}</span></span><span className="tabular-nums">{e.absent ? t("gbMarkAbsent") : e.marks === null ? "-" : `${e.marks} / ${e.maxMarks}`}</span></li>)}
                </ul>
              </details>
            ))}
            <p className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border-strong pt-3 text-body font-semibold"><span>{t("reportTotal")}</span><span className="tabular-nums">{card.data.totalMarks} / {card.data.totalMaxMarks} · {card.data.percent}% {card.data.grade && <Badge tone="brand">{card.data.grade}</Badge>}</span></p>
            {card.data.pending > 0 && <p className="text-caption text-text-muted">{t("gbPending", { count: card.data.pending })}</p>}
            <div><Button size="comfortable" onClick={() => void pdf()}>{t("gbPdf")}</Button></div>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Marks, exams and report cards for the school's office (P3-11c). Teachers enter marks in the mobile app; the Academic admin sets up terms, exams and grade bands here. */
export function Gradebook({ grants }: { grants: GradebookGrants }) {
  const t = useTranslations();
  const [tab, setTab] = useState("marks");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navGradebook")}</h1>
      <SegmentedControl label={t("gbViewLabel")} value={tab} onChange={setTab} options={[{ value: "marks", label: t("gbTabMarks") }, { value: "exams", label: t("gbTabExams") }, { value: "bands", label: t("gbTabBands") }, { value: "cards", label: t("gbTabCards") }]} />
      {tab === "marks" ? <MarksTab grants={grants} /> : tab === "exams" ? <ExamsTab grants={grants} /> : tab === "bands" ? <BandsTab grants={grants} /> : <CardsTab />}
    </div>
  );
}
