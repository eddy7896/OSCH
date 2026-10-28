import { nextCursor } from '../common/updated-since.js';
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { LOCALES, getMessages, matchLanguageTag } from '@oruschools/i18n';
import type { Scope } from '@oruschools/rbac';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { markId, isDate } from '../attendance/attendance-rules.js';
import { renderTablePdf } from '../reports/table-pdf.js';
import type { ReportTable } from '../reports/table.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type {
  BandDto, BandsDto, CreateExamDto, ExamDto, ExamListDto, ExamsQueryDto, MarksGridDto, ReportCardDto, SaveMarksDto, TermDto, TermListDto, UpdateExamDto,
} from './dto/grades.dto.js';
import { bandsProblem, bandsText, formatTenths, gradeFor, parseBands, parseTenths, percentOf, reportCard, STANDARD_BANDS, type Band, type MarkFact } from './grade-rules.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const same = (a: string, b: string) => dashed(a) === dashed(b);
const BATCH = 20;
const LANGUAGES = new Set<string>(LOCALES.map((l) => l.code));

interface ExamRow {
  id: string; title: string; examDate: string; maxTenths: number; termId: string;
  term: { id: string; name: string; academicYearId: string }; classroom: { id: string; name: string }; subject: { id: string; name: string; code: string };
}

/**
 * Terms, grade bands, exams, marks and report cards (P3-5, ADR-0013). Marks are whole tenths; every percentage and grade is integer arithmetic (`grade-rules.ts`).
 * Marks entry is: save each changed mark, then one audited finishing step; the same `submissionId` twice changes nothing.
 */
@Injectable()
export class GradesService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly scope: TeachingScope) {}

  // ---- terms
  async terms(t: TenantContext, academicYearId?: string): Promise<TermListDto> {
    const rows = (await this.db.listAssessmentTerms({ schoolId: t.schoolId, ...(academicYearId ? { academicYearId: dashed(academicYearId) } : {}) })).data.assessmentTerms;
    return { items: rows.map((r) => ({ id: dashed(r.id), name: r.name, academicYearId: dashed(r.academicYearId) })) };
  }
  private async termOf(t: TenantContext, id: string): Promise<TermDto> {
    const found = (await this.terms(t)).items.find((x) => same(x.id, id));
    if (!found) throw notFound();
    return found;
  }
  async createTerm(t: TenantContext, name: string, academicYearId?: string): Promise<TermDto> {
    const year = academicYearId ?? (await this.scope.activeYearId(t.schoolId));
    if (!year) throw conflict('academicYearId', 'noActiveYear');
    const id = randomUUID();
    try {
      await this.db.createAssessmentTerm({ schoolId: t.schoolId, id, academicYearId: dashed(year), name, actorId: t.userId, details: { name, academicYearId: dashed(year) } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('name', 'nameTaken');
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('academicYearId', 'yearOfThisSchool');
      throw e;
    }
    return this.termOf(t, id);
  }
  async updateTerm(t: TenantContext, id: string, name: string): Promise<TermDto> {
    const before = await this.termOf(t, id);
    try {
      await this.db.updateAssessmentTerm({ schoolId: t.schoolId, id: dashed(id), name, actorId: t.userId, details: { was: before.name, name } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('name', 'nameTaken');
      throw e;
    }
    return this.termOf(t, id);
  }
  async deleteTerm(t: TenantContext, id: string): Promise<void> {
    const before = await this.termOf(t, id);
    if (Number((await this.db.countExamsOfTerm({ schoolId: t.schoolId, termId: dashed(id) })).data.exams[0]?._count ?? 0) > 0) throw conflict('id', 'termHasExams');
    try {
      await this.db.deleteAssessmentTerm({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { name: before.name } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'termHasExams');
      throw e;
    }
  }

  // ---- grade bands
  private async bandList(t: TenantContext): Promise<Band[]> {
    return parseBands((await this.db.schoolGradeBands({ schoolId: t.schoolId })).data.school?.gradeBands ?? '');
  }
  async bands(t: TenantContext): Promise<BandsDto> {
    const ordered = (b: readonly Band[]): BandDto[] => [...b].sort((x, y) => y.minPercent - x.minPercent).map((x) => ({ label: x.label, minPercent: x.minPercent, maxPercent: x.maxPercent }));
    return { bands: ordered(await this.bandList(t)), template: ordered(STANDARD_BANDS) };
  }
  async setBands(t: TenantContext, bands: BandDto[]): Promise<BandsDto> {
    const problem = bandsProblem(bands);
    if (problem) throw invalid('bands', problem);
    await this.db.setGradeBands({ schoolId: t.schoolId, bands: bandsText(bands), actorId: t.userId, details: { count: bands.length, bands: bands.map((b) => `${b.label} ${b.minPercent}-${b.maxPercent}`) } });
    return this.bands(t);
  }

  // ---- exams
  private view(r: ExamRow): ExamDto {
    return { id: dashed(r.id), title: r.title, examDate: r.examDate, term: { id: dashed(r.term.id), name: r.term.name }, class: { id: dashed(r.classroom.id), name: r.classroom.name }, subject: { id: dashed(r.subject.id), name: r.subject.name, code: r.subject.code }, maxMarks: formatTenths(r.maxTenths), maxTenths: r.maxTenths };
  }
  private async examRow(t: TenantContext, id: string) {
    const row = (await this.db.getExam({ schoolId: t.schoolId, id: dashed(id) })).data.exams[0];
    if (!row) throw notFound();
    return row;
  }
  /** Whether a caller of `scope` may enter marks for this exam: the school always; a teacher only for a subject they teach, in a class of theirs. */
  private async mayEnter(t: TenantContext, scope: Scope, row: { classroom: { id: string }; subject: { id: string } }): Promise<boolean> {
    if (scope === 'school') return true;
    if (scope !== 'own') return false;
    const m = await this.scope.mine(t);
    return m.subjects.some((s) => same(s.id, row.subject.id)) && m.classes.some((c) => same(c.id, row.classroom.id));
  }

  async exams(t: TenantContext, scope: Scope, q: ExamsQueryDto): Promise<ExamListDto> {
    const rows = (await this.db.listExams({ schoolId: t.schoolId, ...(q.termId ? { termId: dashed(q.termId) } : {}), ...(q.classId ? { classroomId: dashed(q.classId) } : {}), ...(q.subjectId ? { subjectId: dashed(q.subjectId) } : {}) })).data.exams as unknown as ExamRow[];
    const visible = await this.scope.visibleClassIds(t, scope);
    return { items: rows.filter((r) => !visible || visible.has(dashed(r.classroom.id))).map((r) => this.view(r)) };
  }

  async createExam(t: TenantContext, dto: CreateExamDto): Promise<ExamDto> {
    const max = parseTenths(dto.maxMarks);
    if (!max || max <= 0) throw invalid('maxMarks', 'positiveMarks');
    if (!isDate(dto.examDate)) throw invalid('examDate', 'notADate');
    const id = randomUUID();
    try {
      await this.db.createExam({ schoolId: t.schoolId, id, termId: dashed(dto.termId), classroomId: dashed(dto.classId), subjectId: dashed(dto.subjectId), title: dto.title, examDate: dto.examDate, maxTenths: max, actorId: t.userId, details: { title: dto.title, termId: dashed(dto.termId), classId: dashed(dto.classId), subjectId: dashed(dto.subjectId), maxMarks: formatTenths(max) } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('title', 'examExists');
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw invalid('termId', 'termClassAndSubjectOfThisSchool');
      throw e;
    }
    return this.view((await this.examRow(t, id)) as unknown as ExamRow);
  }

  async updateExam(t: TenantContext, id: string, dto: UpdateExamDto): Promise<ExamDto> {
    if (dto.title === undefined && dto.examDate === undefined && dto.maxMarks === undefined) throw invalid('title', 'atLeastOneField');
    const before = await this.examRow(t, id);
    const max = dto.maxMarks === undefined ? before.maxTenths : parseTenths(dto.maxMarks);
    if (!max || max <= 0) throw invalid('maxMarks', 'positiveMarks');
    if (dto.examDate !== undefined && !isDate(dto.examDate)) throw invalid('examDate', 'notADate');
    try {
      await this.db.updateExam({ schoolId: t.schoolId, id: dashed(id), title: dto.title ?? before.title, examDate: dto.examDate ?? before.examDate, maxTenths: max, actorId: t.userId, details: { title: before.title, was: { examDate: before.examDate, maxMarks: formatTenths(before.maxTenths) }, now: { examDate: dto.examDate ?? before.examDate, maxMarks: formatTenths(max) } } });
    } catch (e) {
      if (kindOf(e) === 'CONFLICT') throw conflict('title', 'examExists');
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('maxMarks', 'belowAGivenMark');
      throw e;
    }
    return this.view((await this.examRow(t, id)) as unknown as ExamRow);
  }

  async deleteExam(t: TenantContext, id: string): Promise<void> {
    const before = await this.examRow(t, id);
    if (Number((await this.db.countMarksOfExam({ schoolId: t.schoolId, examId: dashed(id) })).data.marks[0]?._count ?? 0) > 0) throw conflict('id', 'examHasMarks');
    try {
      await this.db.deleteExam({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: { title: before.title } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('id', 'examHasMarks');
      throw e;
    }
  }

  // ---- marks
  private async roster(t: TenantContext, classId: string, yearId: string) {
    const rows = (await this.db.classRoster({ schoolId: t.schoolId, academicYearId: dashed(yearId), classroomId: dashed(classId) })).data.studentEnrollments;
    return new Map(rows.map((r) => [dashed(r.student.id), { enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` }]));
  }

  async grid(t: TenantContext, scope: Scope, id: string, updatedSince?: string): Promise<MarksGridDto> {
    const row = await this.examRow(t, id);
    if (!(await this.mayEnter(t, scope, row))) throw notFound();
    const [roster, bands] = await Promise.all([this.roster(t, row.classroom.id, row.term.academicYearId), this.bandList(t)]);
    // Filtered here, not in the query: a `where` on the exam's marks relation in Data Connect replaces the link to the exam instead of adding to it.
    const since = updatedSince ? new Date(updatedSince).getTime() : null;
    const changed = row.marks.filter((m) => since === null || new Date(m.updatedAt).getTime() >= since);
    const marks = new Map(changed.map((m) => [dashed(m.studentId), m]));
    return {
      exam: this.view(row as unknown as ExamRow),
      next: nextCursor(changed, updatedSince),
      rows: [...roster].filter(([studentId]) => !updatedSince || marks.has(studentId)).map(([studentId, s]) => {
        const m = marks.get(studentId);
        const p = m && !m.absent ? percentOf(m.tenths, row.maxTenths) : null;
        return { studentId, enrollmentId: s.enrollmentId, name: s.name, marks: m ? formatTenths(m.tenths) : null, marksTenths: m ? m.tenths : null, absent: m?.absent ?? false, percent: m ? (p ? p.display : '0.0') : null, grade: m ? gradeFor(bands, p ? p.whole : 0) : null };
      }),
    };
  }

  async saveMarks(t: TenantContext, scope: Scope, id: string, dto: SaveMarksDto): Promise<MarksGridDto> {
    const row = await this.examRow(t, id);
    if (!(await this.mayEnter(t, scope, row))) throw notFound();
    if (dto.submissionId && row.lastSubmissionId === dto.submissionId) return this.grid(t, scope, id); // a replay: nothing to do
    const year = dashed(row.term.academicYearId), klass = dashed(row.classroom.id), examId = dashed(row.id);
    const roster = await this.roster(t, klass, year);
    const seen = new Set<string>();
    const wanted = new Map<string, { tenths: number; absent: boolean } | null>(); // null: clear the mark
    for (const e of dto.entries) {
      const sid = dashed(e.studentId);
      if (!roster.has(sid)) throw invalid('entries', 'studentNotInClass');
      if (seen.has(sid)) throw invalid('entries', 'duplicateStudent');
      seen.add(sid);
      if (e.absent && e.marks !== undefined) throw invalid('entries', 'absentHasNoMarks');
      if (e.absent) wanted.set(sid, { tenths: 0, absent: true });
      else if (e.marks === undefined) wanted.set(sid, null);
      else {
        const tenths = parseTenths(e.marks);
        if (tenths === null) throw invalid('entries', 'notAMark');
        if (tenths > row.maxTenths) throw invalid('entries', 'aboveMaximum');
        wanted.set(sid, { tenths, absent: false });
      }
    }
    const existing = new Map(row.marks.map((m) => [dashed(m.studentId), m]));
    const changes: Array<{ studentId: string; from: string | null; to: string | null }> = [];
    const jobs: Array<() => Promise<unknown>> = [];
    const text = (m: { tenths: number; absent: boolean } | undefined | null): string | null => (m ? (m.absent ? 'absent' : formatTenths(m.tenths)) : null);
    for (const [sid, w] of wanted) {
      const have = existing.get(sid);
      if (!w) {
        if (have) { changes.push({ studentId: sid, from: text(have), to: null }); jobs.push(() => this.db.removeMark({ schoolId: t.schoolId, id: dashed(have.id), examId, classroomId: klass, actorId: t.userId })); }
      } else if (!have || have.tenths !== w.tenths || have.absent !== w.absent) {
        changes.push({ studentId: sid, from: text(have), to: text(w) });
        jobs.push(() => this.db.saveMark({ schoolId: t.schoolId, id: markId(examId, sid), examId, studentId: sid, classroomId: klass, academicYearId: year, tenths: w.tenths, absent: w.absent, actorId: t.userId }));
      }
    }
    try {
      for (let i = 0; i < jobs.length; i += BATCH) await Promise.all(jobs.slice(i, i + BATCH).map((j) => j()));
      await this.db.finishMarkEntry({ schoolId: t.schoolId, id: examId, ...(dto.submissionId ? { submissionId: dto.submissionId } : {}), actorId: t.userId, details: { examId, title: row.title, changes } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('entries', 'examChanged'); // a student left the class or the exam changed under us
      throw e;
    }
    return this.grid(t, scope, id);
  }

  // ---- report cards
  private async language(t: TenantContext, lang?: string) {
    if (lang !== undefined && !LANGUAGES.has(lang)) throw invalid('lang', 'knownLanguage');
    const s = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school;
    const code = matchLanguageTag(lang ?? s?.defaultLanguage ?? 'en') ?? 'en';
    const msgs = getMessages(code), en = getMessages('en');
    return { school: s?.name ?? '', code, label: (key: string, fallback: string) => msgs[key] ?? en[key] ?? fallback };
  }

  /** A student's report card for a term. The school sees any; a class teacher their own class's; a parent only a linked child's. */
  async reportCard(t: TenantContext, scope: Scope, studentId: string, termId: string): Promise<ReportCardDto> {
    const term = await this.termOf(t, termId);
    const stu = (await this.db.getStudent({ schoolId: t.schoolId, id: dashed(studentId) })).data.students[0];
    if (!stu) throw notFound();
    const klass = (await this.db.enrollmentsOfStudents({ schoolId: t.schoolId, academicYearId: dashed(term.academicYearId), studentIds: [dashed(studentId)] })).data.studentEnrollments[0]?.classroom;
    if (!klass) throw notFound(); // not in a class that year: nothing to report
    if (scope === 'own' && !(await this.scope.classTeacherClassIds(t)).has(dashed(klass.id))) throw notFound();
    if (scope === 'linked' && !(await this.scope.mine(t)).children.some((c) => same(c.id, studentId))) throw notFound();
    const [exams, marks, bands] = await Promise.all([
      this.db.listExams({ schoolId: t.schoolId, termId: dashed(termId), classroomId: dashed(klass.id) }),
      this.db.marksOfStudentInTerm({ schoolId: t.schoolId, studentId: dashed(studentId), termId: dashed(termId) }),
      this.bandList(t),
    ]);
    const facts = (exams.data.exams as unknown as ExamRow[]).map((e) => ({ id: dashed(e.id), title: e.title, date: e.examDate, maxTenths: e.maxTenths, subject: { id: dashed(e.subject.id), name: e.subject.name, code: e.subject.code } }));
    const markMap = new Map<string, MarkFact>(marks.data.marks.map((m) => [dashed(m.examId), { tenths: m.tenths, absent: m.absent }]));
    const card = reportCard(facts, markMap, bands);
    return {
      student: { id: dashed(stu.id), enrollmentId: stu.enrollmentId, name: `${stu.firstName} ${stu.lastName}` }, class: { id: dashed(klass.id), name: klass.name }, term: { id: term.id, name: term.name }, academicYearId: term.academicYearId,
      subjects: card.subjects.map((s) => ({
        subject: s.subject, marks: formatTenths(s.marksTenths), maxMarks: formatTenths(s.maxTenths), percent: s.percent, grade: s.grade, pending: s.pending,
        exams: s.exams.map((e) => ({ id: e.id, title: e.title, date: e.date, maxMarks: formatTenths(e.maxTenths), marks: e.marksTenths === null ? null : formatTenths(e.marksTenths), absent: e.absent, percent: e.percent, grade: e.grade })),
      })),
      totalMarks: formatTenths(card.totals.marksTenths), totalMaxMarks: formatTenths(card.totals.maxTenths), percent: card.totals.percent, grade: card.totals.grade, pending: card.totals.pending,
    };
  }

  /** The report card as a PDF in the school's language (or the one asked for). */
  async reportCardPdf(t: TenantContext, scope: Scope, studentId: string, termId: string, lang?: string): Promise<{ bytes: Buffer; fileName: string; type: string }> {
    const [card, lng] = await Promise.all([this.reportCard(t, scope, studentId, termId), this.language(t, lang)]);
    const table: ReportTable = {
      title: lng.label('gradesReportCardTitle', 'Report card'),
      subtitle: [lng.school, `${card.student.name} (${card.student.enrollmentId}) · ${card.class.name}`, `${lng.label('gradesTerm', 'Term')}: ${card.term.name}`].filter((x) => x !== ''),
      columns: [
        { key: 'subject', label: lng.label('gradesSubject', 'Subject'), kind: 'text', weight: 4 }, { key: 'marks', label: lng.label('gradesMarks', 'Marks'), kind: 'count', weight: 1.5 },
        { key: 'max', label: lng.label('gradesOutOf', 'Out of'), kind: 'count', weight: 1.5 }, { key: 'percent', label: lng.label('gradesPercent', 'Percent'), kind: 'count', weight: 1.5 }, { key: 'grade', label: lng.label('gradesGrade', 'Grade'), kind: 'text', weight: 1 },
      ],
      rows: card.subjects.map((s) => [s.subject.name, s.marks, s.maxMarks, s.percent, s.grade ?? '']),
      totals: [[lng.label('reportTotal', 'Total'), card.totalMarks, card.totalMaxMarks, card.percent, card.grade ?? '']],
    };
    return { bytes: await renderTablePdf(table, lng.code), fileName: `report-card-${card.student.enrollmentId}-${card.term.name.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`, type: 'application/pdf' };
  }
}
