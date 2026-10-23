import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, DatabaseError, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { likeContains } from '../students/students.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CreateStaffDto, LinkStaffAccountDto, ListStaffQueryDto, StaffDto, StaffListDto, StaffSummaryDto, UpdateStaffDto } from './dto/staff.dto.js';

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
const realDate = (d: string) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
const MAX_NUMBER_ATTEMPTS = 12;
const pause = (attempt: number) => new Promise((r) => setTimeout(r, Math.random() * 15 * attempt + 5));
export const EMPLOYEE_PREFIX = 'E';

export type StaffRow = {
  id: string; employeeId: string; firstName: string; lastName: string; department?: string | null; designation?: string | null; status: string; userId?: string | null;
  phone?: string | null; email?: string | null; dateOfBirth?: string | null; gender?: string | null; dateOfJoining?: string | null; address?: string | null;
  emergencyContactName?: string | null; emergencyContactPhone?: string | null; photoKey?: string | null;
  documents?: Array<{ id: string; kind: string; fileKey: string; fileName: string; contentType: string; sizeBytes: number; createdAt: string }>;
};
const summary = (r: StaffRow): StaffSummaryDto => ({
  id: dashed(r.id), employeeId: r.employeeId, firstName: r.firstName, lastName: r.lastName, department: r.department ?? null, designation: r.designation ?? null, status: r.status, hasAccount: !!r.userId,
});

/**
 * Staff records (HR) of the active school (P2-4). A record does not need a sign-in account; one can be linked afterwards, and
 * only an account that is already a member of this school. Roles are never granted here (that stays with the System Admin).
 */
@Injectable()
export class StaffService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(t: TenantContext, q: ListStaffQueryDto): Promise<StaffListDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const filter = { schoolId: t.schoolId, ...(q.search ? { search: likeContains(q.search) } : {}), ...(q.status ? { status: q.status as never } : {}), ...(q.department ? { department: q.department } : {}) };
    const [rows, count] = await Promise.all([this.db.listStaffProfiles({ ...filter, limit: pageSize, offset: (page - 1) * pageSize }), this.db.countStaffProfiles(filter)]);
    return { items: (rows.data.staffProfiles as StaffRow[]).map(summary), total: Number(count.data.staffProfiles[0]?._count ?? 0), page, pageSize };
  }

  async departments(t: TenantContext): Promise<string[]> {
    const rows = (await this.db.listStaffDepartments({ schoolId: t.schoolId })).data.staffProfiles;
    return [...new Set(rows.map((r) => r.department).filter((d): d is string => !!d))];
  }

  /** The raw record for the verified school (the files service uses it too). */
  async row(t: TenantContext, id: string): Promise<StaffRow> {
    const r = (await this.db.getStaffProfile({ schoolId: t.schoolId, id })).data.staffProfiles[0];
    if (!r) throw notFound(); // a record of another school looks exactly like one that does not exist
    return r as StaffRow;
  }
  private full(r: StaffRow): StaffDto {
    return {
      ...summary(r), userId: r.userId ?? null, phone: r.phone ?? null, email: r.email ?? null, dateOfBirth: r.dateOfBirth ?? null, gender: r.gender ?? null,
      dateOfJoining: r.dateOfJoining ?? null, address: r.address ?? null, emergencyContactName: r.emergencyContactName ?? null, emergencyContactPhone: r.emergencyContactPhone ?? null,
      hasPhoto: !!r.photoKey, documents: (r.documents ?? []).map((d) => ({ id: dashed(d.id), kind: d.kind, fileName: d.fileName, contentType: d.contentType, sizeBytes: d.sizeBytes, createdAt: d.createdAt })),
    };
  }
  async get(t: TenantContext, id: string): Promise<StaffDto> {
    return this.full(await this.row(t, id));
  }

  private checkDates(d: { dateOfBirth?: string; dateOfJoining?: string }): void {
    for (const f of ['dateOfBirth', 'dateOfJoining'] as const) if (d[f] !== undefined && !realDate(d[f]!)) throw invalid(f, 'realDate');
    if (d.dateOfBirth !== undefined && d.dateOfBirth > new Date().toISOString().slice(0, 10)) throw invalid('dateOfBirth', 'notInTheFuture');
  }

  async create(t: TenantContext, dto: CreateStaffDto): Promise<StaffDto> {
    this.checkDates(dto);
    const id = randomUUID();
    for (let attempt = 1; ; attempt++) {
      const seq = (await this.db.staffSeqInfo({ schoolId: t.schoolId })).data.school?.staffSeq;
      if (seq === undefined) throw notFound();
      const employeeId = `${EMPLOYEE_PREFIX}${String(seq + 1).padStart(4, '0')}`;
      try {
        await this.db.createStaff({ schoolId: t.schoolId, id, expectedSeq: seq, employeeId, actorId: t.userId, ...defined({ ...dto, gender: dto.gender as never }), firstName: dto.firstName, lastName: dto.lastName, details: { employeeId } });
        break;
      } catch (e) {
        if (e instanceof DatabaseError && e.kind === 'CONFLICT' && attempt < MAX_NUMBER_ATTEMPTS) {
          await pause(attempt); // someone else took this number a moment ago: read again
          continue;
        }
        throw e;
      }
    }
    return this.get(t, id);
  }

  async update(t: TenantContext, id: string, dto: UpdateStaffDto): Promise<StaffDto> {
    const changes = defined(dto);
    if (Object.keys(changes).length === 0) throw invalid('firstName', 'atLeastOneField');
    this.checkDates(dto);
    const before = await this.row(t, id);
    await this.db.updateStaff({ schoolId: t.schoolId, id: dashed(before.id), ...changes, gender: dto.gender as never, status: dto.status as never, actorId: t.userId, details: { employeeId: before.employeeId, changed: Object.keys(changes) } });
    return this.get(t, id);
  }

  async linkAccount(t: TenantContext, id: string, dto: LinkStaffAccountDto): Promise<StaffDto> {
    const before = await this.row(t, id);
    if (before.userId) throw new ApiException(ErrorCode.CONFLICT, 409); // already linked
    const members = (await this.db.listMemberships({ schoolId: t.schoolId })).data.schoolMembers;
    if (!members.some((m) => m.user.id === dto.userId)) throw invalid('userId', 'memberOfThisSchool'); // also checked inside the operation
    await this.db.linkStaffAccount({ schoolId: t.schoolId, id: dashed(before.id), userId: dto.userId, actorId: t.userId, details: { employeeId: before.employeeId, userId: dto.userId } });
    return this.get(t, id);
  }
}
