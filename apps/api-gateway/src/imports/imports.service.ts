import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { EMPLOYEE_PREFIX } from '../staff/staff.service.js';
import { parseCsv } from './csv.js';
import type { ImportProblemDto, ImportReportDto, ImportResultDto, ImportRowResultDto } from './dto/imports.dto.js';
import { cleanCell, mapHeader, validateRow, type ImportKind } from './import-definitions.js';

const MAX_PROBLEMS = 200;
const MAX_NUMBER_ATTEMPTS = 12;
const pause = (attempt: number) => new Promise((r) => setTimeout(r, Math.random() * 15 * attempt + 5));
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

interface PlannedRow {
  row: number;
  values: Record<string, unknown>;
  /** Resolved while analysing. */
  classroomId?: string;
  studentId?: string;
}
interface Analysis {
  report: ImportReportDto;
  planned: PlannedRow[];
  academicYearId?: string;
}

/**
 * Bulk import of students, staff and guardians from a CSV file (P2-5).
 * The DRY RUN reads and validates only: it never writes, not even an audit row. The REAL import repeats the same checks, refuses to
 * start if anything is wrong, then creates the rows one by one through the same operations the ordinary screens use (so each row is
 * audited with the batch id and the numbers are race-free), bracketed by a start and a finish record. The same file cannot be imported twice.
 */
@Injectable()
export class ImportsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // ---------------------------------------------------------------- analysis (no writes)
  async dryRun(t: TenantContext, kind: ImportKind, csv: string): Promise<ImportReportDto> {
    return (await this.analyse(t, kind, csv)).report;
  }

  private async analyse(t: TenantContext, kind: ImportKind, csv: string): Promise<Analysis> {
    const fileHash = createHash('sha256').update(csv).digest('hex');
    const problems: ImportProblemDto[] = [];
    const warnings: ImportProblemDto[] = [];
    const parsed = parseCsv(csv);
    for (const p of parsed.problems) problems.push({ row: p.row, rule: p.rule, ...(p.column ? { column: p.column } : {}) });
    const map = mapHeader(kind, parsed.header);
    for (const key of map.missingRequired) problems.push({ row: 1, column: key, rule: 'missingColumn' });
    const headerOf = new Map<string, string>();
    map.byIndex.forEach((spec, i) => spec && headerOf.set(spec.key, parsed.header[i] ?? spec.key));
    const header = (key: string) => headerOf.get(key) ?? key;

    const planned: PlannedRow[] = [];
    let errorRows = 0; // recomputed below from the problems found
    const blocking = parsed.problems.some((p) => p.rule !== 'cellTooLong') || map.missingRequired.length > 0;
    if (!blocking) {
      for (const r of parsed.rows) {
        const values: Record<string, unknown> = {};
        map.byIndex.forEach((spec, i) => {
          if (!spec) return;
          const v = cleanCell(spec.key, r.cells[i] ?? '');
          if (v !== undefined) values[spec.key] = v;
        });
        if (r.cells.length > parsed.header.length) problems.push({ row: r.row, rule: 'moreCellsThanColumns' });
        const field = validateRow(kind, values, header);
        for (const f of field) problems.push({ row: r.row, column: f.column, rule: f.rule });
        if (field.length === 0) planned.push({ row: r.row, values });
      }
    } else errorRows = parsed.rows.length;

    // Checks that need the database or the whole file.
    let academicYearId: string | undefined;
    if (!blocking) {
      await this.crossChecks(t, kind, planned, problems, warnings, header, (y) => (academicYearId = y));
    }
    const badRows = new Set(problems.filter((p) => p.row > 1).map((p) => p.row));
    const valid = planned.filter((p) => !badRows.has(p.row));
    errorRows = blocking ? parsed.rows.length : parsed.rows.length - valid.length;

    const existing = (await this.db.findImportBatch({ schoolId: t.schoolId, kind, fileHash })).data.importBatches[0];
    const canImport = !blocking && problems.length === 0 && valid.length > 0 && !existing;
    const report: ImportReportDto = {
      kind, fileHash, totalRows: parsed.rows.length, validRows: blocking ? 0 : valid.length, errorRows,
      columns: { recognized: parsed.header.filter((_, i) => map.byIndex[i]), ignored: map.ignored, missingRequired: map.missingRequired },
      problems: problems.slice(0, MAX_PROBLEMS).sort((a, b) => a.row - b.row), problemsTruncated: problems.length > MAX_PROBLEMS,
      warnings: warnings.slice(0, MAX_PROBLEMS), alreadyImported: !!existing, canImport,
    };
    return { report, planned: valid, ...(academicYearId ? { academicYearId } : {}) };
  }

  private async crossChecks(
    t: TenantContext, kind: ImportKind, planned: PlannedRow[], problems: ImportProblemDto[], warnings: ImportProblemDto[],
    header: (key: string) => string, setYear: (id: string) => void,
  ): Promise<void> {
    if (kind === 'guardians') {
      const ids = [...new Set(planned.map((p) => String(p.values['enrollmentId'])))];
      const found = new Map<string, string>();
      for (let i = 0; i < ids.length; i += 500) {
        for (const s of (await this.db.studentsByEnrollmentIds({ schoolId: t.schoolId, ids: ids.slice(i, i + 500) })).data.students) found.set(s.enrollmentId, dashed(s.id));
      }
      for (const p of planned) {
        const id = found.get(String(p.values['enrollmentId']));
        if (!id) problems.push({ row: p.row, column: header('enrollmentId'), rule: 'unknownStudent' });
        else p.studentId = id;
      }
      return;
    }
    // In-file duplicates (same name and birth date), and "may already exist" against the school's records.
    const key = (v: Record<string, unknown>) => (v['dateOfBirth'] ? `${norm(String(v['firstName']))}|${norm(String(v['lastName']))}|${String(v['dateOfBirth'])}` : undefined);
    const seen = new Map<string, number>();
    for (const p of planned) {
      const k = key(p.values);
      if (!k) continue;
      const earlier = seen.get(k);
      if (earlier !== undefined) problems.push({ row: p.row, rule: 'duplicateInFile', ref: earlier });
      else seen.set(k, p.row);
    }
    const existing = new Set<string>();
    for (let offset = 0; ; offset += 1000) {
      const page = kind === 'students'
        ? (await this.db.studentIdentities({ schoolId: t.schoolId, limit: 1000, offset })).data.students
        : (await this.db.staffIdentities({ schoolId: t.schoolId, limit: 1000, offset })).data.staffProfiles;
      for (const s of page) if (s.dateOfBirth) existing.add(`${norm(s.firstName)}|${norm(s.lastName)}|${s.dateOfBirth}`);
      if (page.length < 1000) break;
    }
    for (const p of planned) {
      const k = key(p.values);
      if (k && existing.has(k)) warnings.push({ row: p.row, rule: 'mayAlreadyExist' });
    }
    // Dates must be real, and a birth date cannot be in the future.
    for (const p of planned) {
      for (const f of ['dateOfBirth', 'admissionDate', 'dateOfJoining'] as const) {
        const v = p.values[f];
        if (typeof v === 'string' && !realDate(v)) problems.push({ row: p.row, column: header(f), rule: 'realDate' });
      }
      const dob = p.values['dateOfBirth'];
      if (typeof dob === 'string' && dob > today()) problems.push({ row: p.row, column: header('dateOfBirth'), rule: 'notInTheFuture' });
    }
    if (kind !== 'students') return;

    // Classes (the active academic year is the placement year).
    if (planned.some((p) => p.values['class'] !== undefined)) {
      const yearId = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear?.id;
      const rooms = new Map((await this.db.listClassrooms({ schoolId: t.schoolId })).data.classrooms.map((c) => [norm(c.name), dashed(c.id)]));
      if (!yearId) problems.push({ row: 1, column: header('class'), rule: 'noActiveAcademicYear' });
      else setYear(dashed(yearId));
      for (const p of planned) {
        const name = p.values['class'];
        if (name === undefined) continue;
        const id = rooms.get(norm(String(name)));
        if (!id) problems.push({ row: p.row, column: header('class'), rule: 'unknownClass' });
        else p.classroomId = id;
      }
    }
  }

  // ---------------------------------------------------------------- the real import
  async run(t: TenantContext, kind: ImportKind, csv: string): Promise<ImportResultDto> {
    const analysis = await this.analyse(t, kind, csv);
    const { report } = analysis;
    if (report.alreadyImported) throw new ApiException(ErrorCode.CONFLICT, 409);
    if (!report.canImport) {
      const details = [...report.problems, ...(report.validRows === 0 && report.problems.length === 0 ? [{ row: 1, rule: 'noRows' }] : [])].slice(0, 20).map((p) => ({ field: `row ${p.row}${p.column ? `: ${p.column}` : ''}`, rule: p.rule }));
      throw new ApiException(ErrorCode.INVALID_REQUEST, 400, details); // run the dry run first: nothing is imported unless every row is fine
    }
    const batchId = randomUUID();
    try {
      await this.db.startImportBatch({ schoolId: t.schoolId, id: batchId, kind, fileHash: report.fileHash, rowCount: analysis.planned.length, actorId: t.userId, details: { kind, rows: analysis.planned.length, fileHash: report.fileHash } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw new ApiException(ErrorCode.CONFLICT, 409); // the same file started a moment ago
      throw e;
    }

    const created: ImportRowResultDto[] = [];
    const failures: ImportProblemDto[] = [];
    const tail: Array<Promise<void>> = [];
    const counter = kind === 'guardians' ? undefined : await this.readCounter(t, kind);
    const prefix = kind === 'students' ? ((await this.db.applicationSeqInfo({ schoolId: t.schoolId })).data.school?.enrollmentPrefix ?? 'S') : '';
    let cursor = counter ?? 0;
    for (const p of analysis.planned) {
      try {
        if (kind === 'guardians') {
          const id = randomUUID();
          await this.addGuardian(t, p.studentId!, id, { name: p.values['name'], relationship: p.values['relationship'], phone: p.values['phone'], email: p.values['email'], isPrimary: p.values['isPrimary'] === true }, batchId);
          created.push({ row: p.row, id: dashed(id) });
          continue;
        }
        const id = randomUUID();
        const { number, next } = kind === 'students' ? await this.createStudent(t, id, p.values, cursor, batchId, prefix) : await this.createStaff(t, id, p.values, cursor, batchId);
        cursor = next;
        created.push({ row: p.row, id: dashed(id), number });
        if (kind === 'students') {
          if (p.classroomId) tail.push(this.settle(failures, p.row, 'placementFailed', () => this.db.placeStudent({ schoolId: t.schoolId, studentId: id, academicYearId: analysis.academicYearId!, classroomId: p.classroomId!, actorId: t.userId, details: { importBatchId: batchId } }).then(() => undefined)));
          if (p.values['guardianName'] !== undefined) {
            tail.push(this.settle(failures, p.row, 'guardianFailed', () => this.addGuardian(t, id, randomUUID(), { name: p.values['guardianName'], relationship: p.values['guardianRelationship'] ?? 'GUARDIAN', phone: p.values['guardianPhone'], email: p.values['guardianEmail'], isPrimary: true }, batchId)));
          }
          if (tail.length >= 16) await Promise.all(tail.splice(0));
        }
      } catch {
        failures.push({ row: p.row, rule: 'failed' }); // the reason is not shown to the caller; the row was not created
        if (kind !== 'guardians') cursor = (await this.readCounter(t, kind)) ?? cursor;
      }
    }
    await Promise.all(tail);
    const failedRows = new Set(failures.map((f) => f.row));
    const createdCount = created.length;
    const status = failedRows.size === 0 ? ('COMPLETED' as const) : ('PARTIAL' as const);
    await this.db.finishImportBatch({ schoolId: t.schoolId, id: batchId, status: status as never, createdCount, failedCount: failedRows.size, actorId: t.userId, details: { kind, createdCount, failedCount: failedRows.size } });
    return { batchId: dashed(batchId), status, createdCount, failedCount: failedRows.size, created, failures: failures.sort((a, b) => a.row - b.row) };
  }

  private async settle(failures: ImportProblemDto[], row: number, rule: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch {
      failures.push({ row, rule });
    }
  }

  private async readCounter(t: TenantContext, kind: ImportKind): Promise<number | undefined> {
    return kind === 'students'
      ? (await this.db.applicationSeqInfo({ schoolId: t.schoolId })).data.school?.studentSeq
      : (await this.db.staffSeqInfo({ schoolId: t.schoolId })).data.school?.staffSeq;
  }

  /** One student, numbered from the cursor; if someone else took that number, read the counter again and retry. */
  private async createStudent(t: TenantContext, id: string, v: Record<string, unknown>, start: number, batchId: string, prefix: string): Promise<{ number: string; next: number }> {
    let seq = start;
    for (let attempt = 1; ; attempt++) {
      const enrollmentId = `${prefix}${String(seq + 1).padStart(4, '0')}`;
      try {
        await this.db.createStudent({
          schoolId: t.schoolId, id, expectedSeq: seq, enrollmentId, actorId: t.userId, firstName: String(v['firstName']), lastName: String(v['lastName']),
          dateOfBirth: v['dateOfBirth'] as string | undefined, gender: v['gender'] as never, admissionDate: v['admissionDate'] as string | undefined, address: v['address'] as string | undefined,
          details: { enrollmentId, importBatchId: batchId },
        });
        return { number: enrollmentId, next: seq + 1 };
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt);
          seq = (await this.readCounter(t, 'students')) ?? seq;
          continue;
        }
        throw e;
      }
    }
  }

  private async createStaff(t: TenantContext, id: string, v: Record<string, unknown>, start: number, batchId: string): Promise<{ number: string; next: number }> {
    let seq = start;
    for (let attempt = 1; ; attempt++) {
      const employeeId = `${EMPLOYEE_PREFIX}${String(seq + 1).padStart(4, '0')}`;
      try {
        await this.db.createStaff({
          schoolId: t.schoolId, id, expectedSeq: seq, employeeId, actorId: t.userId, firstName: String(v['firstName']), lastName: String(v['lastName']),
          department: v['department'] as string | undefined, designation: v['designation'] as string | undefined, phone: v['phone'] as string | undefined, email: v['email'] as string | undefined,
          dateOfBirth: v['dateOfBirth'] as string | undefined, gender: v['gender'] as never, dateOfJoining: v['dateOfJoining'] as string | undefined, address: v['address'] as string | undefined,
          emergencyContactName: v['emergencyContactName'] as string | undefined, emergencyContactPhone: v['emergencyContactPhone'] as string | undefined,
          details: { employeeId, importBatchId: batchId },
        });
        return { number: employeeId, next: seq + 1 };
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt);
          seq = (await this.readCounter(t, 'staff')) ?? seq;
          continue;
        }
        throw e;
      }
    }
  }

  private async addGuardian(t: TenantContext, studentId: string, id: string, v: Record<string, unknown>, batchId: string): Promise<void> {
    await this.db.addGuardian({
      schoolId: t.schoolId, id, studentId: dashed(studentId), name: String(v['name']), relationship: String(v['relationship']), phone: v['phone'] as string | undefined, email: v['email'] as string | undefined,
      isPrimary: v['isPrimary'] === true, actorId: t.userId, details: { relationship: v['relationship'], importBatchId: batchId },
    });
  }
}
