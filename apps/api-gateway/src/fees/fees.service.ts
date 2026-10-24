import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { netOf, totalDiscount, type ConcessionRule } from './amounts.js';
import type {
  ConcessionDto, ConcessionListDto, CreateConcessionDto, CreateItemDto, CreateStructureDto, FeeItemDto, FeeStructureDto, InstalmentDto, ListConcessionsQueryDto,
  ListStructuresQueryDto, ScheduleDto, ScheduleLineDto, UpdateInstalmentDto, UpdateItemDto, UpdateStructureDto,
} from './dto/fees.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const conflict = () => new ApiException(ErrorCode.CONFLICT, 409);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const same = (a: string, b: string) => dashed(a) === b.toLowerCase();
const sum = (xs: Iterable<bigint>) => { let t = 0n; for (const x of xs) t += x; return t; };

type InstalmentRow = { id: string; sequence: number; label?: string | null; amountMinor: string; dueDate: string };
type ItemRow = { id: string; name: string; instalments: InstalmentRow[] };
type StructureRow = { id: string; name: string; academicYear: { id: string; name: string }; gradeLevel: { id: string; name: string }; items: ItemRow[] };

const instalment = (i: InstalmentRow): InstalmentDto => ({ id: dashed(i.id), sequence: i.sequence, label: i.label ?? null, amountMinor: String(i.amountMinor), dueDate: i.dueDate });
const item = (r: ItemRow): FeeItemDto => ({ id: dashed(r.id), name: r.name, instalments: r.instalments.map(instalment), totalMinor: String(sum(r.instalments.map((i) => BigInt(i.amountMinor)))) });
const structure = (r: StructureRow): FeeStructureDto => {
  const items = r.items.map(item);
  return {
    id: dashed(r.id), name: r.name, academicYear: { id: dashed(r.academicYear.id), name: r.academicYear.name }, gradeLevel: { id: dashed(r.gradeLevel.id), name: r.gradeLevel.name },
    items, totalMinor: String(sum(items.map((i) => BigInt(i.totalMinor)))),
  };
};

/**
 * Fee structures, fees (items), instalments and concessions of the active school (P2-7a). Money is a whole number of paise held as a
 * bigint and sent as a string. A fee is created with all its instalments or not at all. The student schedule applies the concessions
 * with the same arithmetic that invoice generation (P2-7b) will use.
 */
@Injectable()
export class FeesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private async activeYear(t: TenantContext): Promise<{ id: string; name: string }> {
    const y = (await this.db.getSchoolProfile({ schoolId: t.schoolId })).data.school?.activeAcademicYear;
    if (!y) throw invalid('academicYearId', 'noActiveAcademicYear');
    return { id: dashed(y.id), name: y.name };
  }

  // ---------------------------------------------------------------- structures
  async listStructures(t: TenantContext, q: ListStructuresQueryDto): Promise<FeeStructureDto[]> {
    const rows = (await this.db.listFeeStructures({ schoolId: t.schoolId, ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}), ...(q.gradeLevelId ? { gradeLevelId: q.gradeLevelId } : {}) })).data.feeStructures;
    return (rows as unknown as StructureRow[]).sort((a, b) => a.gradeLevel.name.localeCompare(b.gradeLevel.name, undefined, { numeric: true })).map(structure);
  }
  private async structureRow(t: TenantContext, id: string): Promise<StructureRow> {
    const r = (await this.db.getFeeStructure({ schoolId: t.schoolId, id })).data.feeStructures[0];
    if (!r) throw notFound(); // another school's structure looks exactly like one that does not exist
    return r as unknown as StructureRow;
  }
  async getStructure(t: TenantContext, id: string): Promise<FeeStructureDto> {
    return structure(await this.structureRow(t, id));
  }
  async createStructure(t: TenantContext, dto: CreateStructureDto): Promise<FeeStructureDto> {
    const year = dto.academicYearId ? (await this.db.listAcademicYears({ schoolId: t.schoolId })).data.academicYears.find((y) => same(y.id, dto.academicYearId!)) : undefined;
    const yearRef = dto.academicYearId ? (year ? { id: dashed(year.id), name: year.name } : undefined) : await this.activeYear(t);
    if (!yearRef) throw invalid('academicYearId', 'ownAcademicYear');
    const level = (await this.db.listGradeLevels({ schoolId: t.schoolId })).data.gradeLevels.find((l) => same(l.id, dto.gradeLevelId));
    if (!level) throw invalid('gradeLevelId', 'ownClassLevel');
    const id = randomUUID();
    const name = dto.name ?? `${level.name} fees ${yearRef.name}`;
    try {
      await this.db.createFeeStructure({ schoolId: t.schoolId, id, academicYearId: yearRef.id, gradeLevelId: dashed(level.id), name, actorId: t.userId, details: { name } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict(); // that level already has a structure for that year
      throw e;
    }
    return this.getStructure(t, id);
  }
  async updateStructure(t: TenantContext, id: string, dto: UpdateStructureDto): Promise<FeeStructureDto> {
    const before = await this.structureRow(t, id);
    await this.db.updateFeeStructure({ schoolId: t.schoolId, id: dashed(before.id), name: dto.name, actorId: t.userId, details: { from: before.name, to: dto.name } });
    return this.getStructure(t, id);
  }
  /** A fee that has been billed cannot be taken away: the invoices stand on its instalments. */
  private async refuseIfBilled(t: TenantContext, instalmentIds: string[]): Promise<void> {
    if (instalmentIds.length === 0) return;
    const n = (await this.db.countInvoicesForInstalments({ schoolId: t.schoolId, ids: instalmentIds.map(dashed) })).data.invoices[0]?._count ?? 0;
    if (n > 0) throw new ApiException(ErrorCode.CONFLICT, 409, [{ field: 'id', rule: 'alreadyBilled' }]);
  }
  async deleteStructure(t: TenantContext, id: string): Promise<void> {
    const before = await this.structureRow(t, id);
    await this.refuseIfBilled(t, before.items.flatMap((i) => i.instalments.map((x) => x.id)));
    await this.db.deleteFeeStructure({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name, items: before.items.length } });
  }

  // ---------------------------------------------------------------- items and instalments
  private checkInstalment(i: { dueDate?: string }, field = 'dueDate'): void {
    if (i.dueDate !== undefined && !realDate(i.dueDate)) throw invalid(field, 'realDate');
  }
  async createItem(t: TenantContext, structureId: string, dto: CreateItemDto): Promise<FeeStructureDto> {
    const s = await this.structureRow(t, structureId);
    dto.instalments.forEach((i, n) => this.checkInstalment(i, `instalments.${n}.dueDate`));
    if (s.items.some((x) => x.name.toLowerCase() === dto.name.toLowerCase())) throw conflict();
    const itemId = randomUUID();
    try {
      await this.db.createFeeItem({ schoolId: t.schoolId, id: itemId, structureId: dashed(s.id), name: dto.name, actorId: t.userId, details: { name: dto.name, instalments: dto.instalments.length } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict();
      throw e;
    }
    try {
      for (const [n, i] of dto.instalments.entries()) {
        await this.db.addFeeInstalment({ schoolId: t.schoolId, id: randomUUID(), itemId, sequence: n + 1, ...(i.label ? { label: i.label } : {}), amountMinor: i.amountMinor, dueDate: i.dueDate, actorId: t.userId, details: { fee: dto.name, sequence: n + 1, amountMinor: i.amountMinor } });
      }
    } catch (e) {
      // All or nothing: a fee with only some of its instalments would bill wrongly, so take the fee away again.
      await this.db.deleteFeeItem({ schoolId: t.schoolId, id: itemId, actorId: t.userId, details: { name: dto.name, reason: 'instalments not all created' } }).catch(() => undefined);
      throw e;
    }
    return this.getStructure(t, structureId);
  }
  private async itemRow(t: TenantContext, id: string) {
    const r = (await this.db.getFeeItem({ schoolId: t.schoolId, id })).data.feeItems[0];
    if (!r) throw notFound();
    return r;
  }
  async updateItem(t: TenantContext, id: string, dto: UpdateItemDto): Promise<FeeStructureDto> {
    const before = await this.itemRow(t, id);
    try {
      await this.db.updateFeeItem({ schoolId: t.schoolId, id: dashed(before.id), name: dto.name, actorId: t.userId, details: { from: before.name, to: dto.name } });
    } catch (e) {
      if (e instanceof DatabaseError && e.kind === 'CONFLICT') throw conflict();
      throw e;
    }
    return this.getStructure(t, dashed(before.structure.id));
  }
  async deleteItem(t: TenantContext, id: string): Promise<FeeStructureDto> {
    const before = await this.itemRow(t, id);
    await this.refuseIfBilled(t, before.instalments.map((i) => i.id));
    await this.db.deleteFeeItem({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { name: before.name, instalments: before.instalments.length } });
    return this.getStructure(t, dashed(before.structure.id));
  }
  async addInstalment(t: TenantContext, itemId: string, dto: { label?: string; amountMinor: string; dueDate: string }): Promise<FeeStructureDto> {
    this.checkInstalment(dto);
    const it = await this.itemRow(t, itemId);
    if (it.instalments.length >= 24) throw conflict();
    const sequence = Math.max(0, ...it.instalments.map((i) => i.sequence)) + 1;
    await this.db.addFeeInstalment({ schoolId: t.schoolId, id: randomUUID(), itemId: dashed(it.id), sequence, ...(dto.label ? { label: dto.label } : {}), amountMinor: dto.amountMinor, dueDate: dto.dueDate, actorId: t.userId, details: { fee: it.name, sequence, amountMinor: dto.amountMinor } });
    return this.getStructure(t, dashed(it.structure.id));
  }
  async updateInstalment(t: TenantContext, id: string, dto: UpdateInstalmentDto): Promise<FeeStructureDto> {
    if (dto.label === undefined && dto.amountMinor === undefined && dto.dueDate === undefined) throw invalid('amountMinor', 'atLeastOneField');
    this.checkInstalment(dto);
    const before = (await this.db.getFeeInstalment({ schoolId: t.schoolId, id })).data.feeInstalments[0];
    if (!before) throw notFound();
    await this.db.updateFeeInstalment({ schoolId: t.schoolId, id: dashed(before.id), ...(dto.label !== undefined ? { label: dto.label } : {}), ...(dto.amountMinor !== undefined ? { amountMinor: dto.amountMinor } : {}), ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate } : {}), actorId: t.userId, details: { fee: before.item.name, sequence: before.sequence, from: { amountMinor: String(before.amountMinor), dueDate: before.dueDate }, to: { amountMinor: dto.amountMinor, dueDate: dto.dueDate } } });
    return this.getStructure(t, dashed(before.item.structure.id));
  }
  async deleteInstalment(t: TenantContext, id: string): Promise<FeeStructureDto> {
    const before = (await this.db.getFeeInstalment({ schoolId: t.schoolId, id })).data.feeInstalments[0];
    if (!before) throw notFound();
    await this.refuseIfBilled(t, [before.id]);
    await this.db.deleteFeeInstalment({ schoolId: t.schoolId, id: dashed(before.id), actorId: t.userId, details: { fee: before.item.name, sequence: before.sequence, amountMinor: String(before.amountMinor) } });
    return this.getStructure(t, dashed(before.item.structure.id));
  }

  // ---------------------------------------------------------------- concessions
  private view(r: { id: string; name: string; kind: string; basisPoints?: number | null; amountMinor?: string | null; student: { id: string; enrollmentId: string; firstName: string; lastName: string }; academicYear: { id: string; name: string }; targetItem?: { id: string; name: string } | null }): ConcessionDto {
    return {
      id: dashed(r.id), name: r.name, kind: r.kind, basisPoints: r.basisPoints ?? null, amountMinor: r.amountMinor == null ? null : String(r.amountMinor),
      student: { id: dashed(r.student.id), enrollmentId: r.student.enrollmentId, name: `${r.student.firstName} ${r.student.lastName}` },
      academicYear: { id: dashed(r.academicYear.id), name: r.academicYear.name }, feeItem: r.targetItem ? { id: dashed(r.targetItem.id), name: r.targetItem.name } : null,
    };
  }
  async listConcessions(t: TenantContext, q: ListConcessionsQueryDto): Promise<ConcessionListDto> {
    const rows = (await this.db.listConcessions({ schoolId: t.schoolId, ...(q.studentId ? { studentId: q.studentId } : {}), ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}) })).data.concessions;
    return { items: rows.map((r) => this.view(r as never)) };
  }
  async createConcession(t: TenantContext, dto: CreateConcessionDto): Promise<ConcessionDto> {
    if (dto.kind === 'PERCENT' && (dto.basisPoints === undefined || dto.amountMinor !== undefined)) throw invalid('basisPoints', 'percentNeedsBasisPointsOnly');
    if (dto.kind === 'FIXED' && (dto.amountMinor === undefined || dto.basisPoints !== undefined)) throw invalid('amountMinor', 'fixedNeedsAmountOnly');
    const yearId = dto.academicYearId ?? (await this.activeYear(t)).id;
    const id = randomUUID();
    const common = { schoolId: t.schoolId, id, studentId: dto.studentId, academicYearId: yearId, name: dto.name, kind: dto.kind as never, ...(dto.basisPoints !== undefined ? { basisPoints: dto.basisPoints } : {}), ...(dto.amountMinor !== undefined ? { amountMinor: dto.amountMinor } : {}), actorId: t.userId, details: { name: dto.name, kind: dto.kind, basisPoints: dto.basisPoints, amountMinor: dto.amountMinor, feeItemId: dto.feeItemId } };
    try {
      if (dto.feeItemId) await this.db.createItemConcession({ ...common, feeItemId: dto.feeItemId });
      else await this.db.createConcession(common);
    } catch (e) {
      // A student, year or fee that is not this school's looks like one that does not exist.
      if (e instanceof DatabaseError && e.kind === 'FORBIDDEN_REFERENCE') throw invalid('studentId', 'ownStudentYearAndFee');
      throw e;
    }
    const made = (await this.listConcessions(t, { studentId: dto.studentId, academicYearId: yearId })).items.find((c) => same(c.id, id));
    if (!made) throw notFound();
    return made;
  }
  async deleteConcession(t: TenantContext, id: string): Promise<void> {
    const found = (await this.listConcessions(t, {})).items.find((c) => same(c.id, id));
    if (!found) throw notFound();
    await this.db.deleteConcession({ schoolId: t.schoolId, id: dashed(found.id), actorId: t.userId, details: { name: found.name, student: found.student.enrollmentId } });
  }

  // ---------------------------------------------------------------- one student's schedule
  async schedule(t: TenantContext, studentId: string, academicYearId?: string): Promise<ScheduleDto> {
    const stu = (await this.db.getStudent({ schoolId: t.schoolId, id: studentId })).data.students[0];
    if (!stu) throw notFound();
    const year = academicYearId
      ? (await this.db.listAcademicYears({ schoolId: t.schoolId })).data.academicYears.find((y) => same(y.id, academicYearId))
      : await this.activeYear(t).then((y) => ({ id: y.id, name: y.name }));
    if (!year) throw notFound();
    const yearRef = { id: dashed(year.id), name: year.name };
    const base = { student: { id: dashed(stu.id), enrollmentId: stu.enrollmentId, name: `${stu.firstName} ${stu.lastName}` }, academicYear: yearRef };
    const empty = (status: string, s: { id: string; name: string } | null): ScheduleDto => ({ status, ...base, structure: s, lines: [], grossMinor: '0', discountMinor: '0', netMinor: '0' });

    const placement = (await this.db.getStudentLevel({ schoolId: t.schoolId, studentId: dashed(stu.id), academicYearId: yearRef.id })).data.studentEnrollments[0];
    if (!placement) return empty('NO_PLACEMENT', null);
    const found = (await this.db.listFeeStructures({ schoolId: t.schoolId, academicYearId: yearRef.id, gradeLevelId: dashed(placement.classroom.gradeLevel.id) })).data.feeStructures[0] as unknown as StructureRow | undefined;
    if (!found) return empty('NO_STRUCTURE', null);

    const rules: ConcessionRule[] = (await this.db.listConcessions({ schoolId: t.schoolId, studentId: dashed(stu.id), academicYearId: yearRef.id })).data.concessions.map((c) => ({
      kind: c.kind as 'PERCENT' | 'FIXED', basisPoints: c.basisPoints ?? null, amountMinor: c.amountMinor == null ? null : BigInt(c.amountMinor), feeItemId: c.targetItem ? dashed(c.targetItem.id) : null,
    }));
    const lines: ScheduleLineDto[] = [];
    let gross = 0n, discount = 0n;
    for (const it of found.items) {
      for (const inst of it.instalments) {
        const g = BigInt(inst.amountMinor);
        const d = totalDiscount(g, dashed(it.id), rules);
        gross += g;
        discount += d;
        lines.push({ feeItem: { id: dashed(it.id), name: it.name }, instalmentId: dashed(inst.id), sequence: inst.sequence, label: inst.label ?? null, dueDate: inst.dueDate, grossMinor: String(g), discountMinor: String(d), netMinor: String(netOf(g, dashed(it.id), rules)) });
      }
    }
    lines.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.feeItem.name.localeCompare(b.feeItem.name) || a.sequence - b.sequence);
    return { status: 'OK', ...base, structure: { id: dashed(found.id), name: found.name }, lines, grossMinor: String(gross), discountMinor: String(discount), netMinor: String(gross - discount) };
  }
}
