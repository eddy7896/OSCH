import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  CreateGuardianDto, CreateStudentDto, GuardianParamDto, ListStudentsQueryDto, PlacementRequestDto, StudentDto, StudentIdParamDto, StudentListDto,
  UpdateGuardianDto, UpdateStudentDto,
} from './dto/students.dto.js';
import { StudentsService } from './students.service.js';

/**
 * Own and linked scopes (a teacher's classes, a parent's children) cannot be resolved to students yet, so for them the reads
 * return nothing (an empty list, 404 for a single student) rather than the whole school. Writes need a school-wide grant.
 */
const isSchoolWide = (g: GrantedPermission): boolean => g.scope === 'school';
const schoolWide = (g: GrantedPermission): void => {
  if (!isSchoolWide(g)) throw new ForbiddenException();
};

/** Students of the active school. School routes: `X-School-Id` + the `students` grant (Academic Admin, Admissions Officer, Principal read). */
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Permission('students', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListStudentsQueryDto): Promise<StudentListDto> {
    if (!isSchoolWide(g)) return Promise.resolve({ items: [], total: 0, page: q.page ?? 1, pageSize: q.pageSize ?? 25 });
    return this.students.list(t, q);
  }

  @Permission('students', 'read')
  @Get(':id')
  get(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto): Promise<StudentDto> {
    if (!isSchoolWide(g)) throw new NotFoundException();
    return this.students.get(t, p.id);
  }

  @Permission('students', 'create')
  @Audit({ action: 'student.create', operation: 'CreateStudent' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateStudentDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.create(t, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.update', operation: 'UpdateStudent' })
  @Patch(':id')
  update(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: UpdateStudentDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.update(t, p.id, dto);
  }

  /** Put the student in a class for an academic year (once per year; to change it use PATCH). */
  @Permission('students', 'update')
  @Audit({ action: 'student.place', operation: 'PlaceStudent' })
  @Post(':id/placement')
  place(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: PlacementRequestDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.placeIn(t, p.id, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.move', operation: 'MoveStudent' })
  @Patch(':id/placement')
  move(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: PlacementRequestDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.move(t, p.id, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.guardian.add', operation: 'AddGuardian' })
  @Post(':id/guardians')
  addGuardian(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: CreateGuardianDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.addGuardian(t, p.id, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.guardian.update', operation: 'UpdateGuardian' })
  @Patch(':id/guardians/:guardianId')
  updateGuardian(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: GuardianParamDto, @Body() dto: UpdateGuardianDto): Promise<StudentDto> {
    schoolWide(g);
    return this.students.updateGuardian(t, p.id, p.guardianId, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.guardian.remove', operation: 'RemoveGuardian' })
  @HttpCode(204)
  @Delete(':id/guardians/:guardianId')
  async removeGuardian(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: GuardianParamDto): Promise<void> {
    schoolWide(g);
    await this.students.removeGuardian(t, p.id, p.guardianId);
  }
}
