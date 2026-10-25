import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  ClassIdParamDto, ClassTeacherQueryDto, LinkParentDto, MineDto, ParentLinkListDto, SetClassTeacherDto, StaffIdParamDto, StaffSubjectParamDto, StudentIdParamDto,
  StudentLinkParamDto, TeacherDto, TeacherListDto, TeachesSubjectDto,
} from './dto/teaching.dto.js';
import { TeachingScope } from './teaching-scope.service.js';
import { TeachingService } from './teaching.service.js';

const wide = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException(); // own and linked scopes see themselves through /academics/mine, not the school's staff
};

/**
 * Teachers: which subjects each member of staff teaches, who is class teacher of which class, and what a caller's own and linked scopes resolve
 * to (P3-2). School routes: `X-School-Id` + the `academics` grant (the Academic administrator edits; the Principal and Admissions officer read).
 */
@Controller('academics')
export class TeachingController {
  constructor(private readonly teaching: TeachingService, private readonly scope: TeachingScope) {}

  /** The caller's own teaching context: their staff record, subjects and classes, and linked children. Any scope may ask, and only about themselves. */
  @Permission('academics', 'read')
  @Get('mine')
  mine(@Tenant() t: TenantContext): Promise<MineDto> {
    return this.scope.mine(t);
  }

  @Permission('academics', 'read')
  @Get('teachers')
  async teachers(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<TeacherListDto> {
    wide(g);
    return { items: await this.teaching.teachers(t) };
  }

  @Permission('academics', 'create')
  @Audit({ action: 'academic.teachersubject.add', operation: 'AddTeacherSubject' })
  @Post('teachers/:staffId/subjects')
  addSubject(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: TeachesSubjectDto): Promise<TeacherDto> {
    wide(g);
    return this.teaching.addSubject(t, p.staffId, dto.subjectId);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.teachersubject.remove', operation: 'RemoveTeacherSubject' })
  @HttpCode(204)
  @Delete('teachers/:staffId/subjects/:subjectId')
  async removeSubject(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffSubjectParamDto): Promise<void> {
    wide(g);
    await this.teaching.removeSubject(t, p.staffId, p.subjectId);
  }

  /** Sets or changes the class teacher of a class (active year unless `academicYearId` is given). */
  @Permission('academics', 'update')
  @Audit({ action: 'academic.classteacher.set', operation: 'AssignClassTeacher' })
  @Put('classes/:id/teacher')
  setClassTeacher(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassIdParamDto, @Body() dto: SetClassTeacherDto) {
    wide(g);
    return this.teaching.setClassTeacher(t, p.id, dto.staffId, dto.academicYearId);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'academic.classteacher.remove', operation: 'RemoveClassTeacher' })
  @HttpCode(204)
  @Delete('classes/:id/teacher')
  async removeClassTeacher(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: ClassIdParamDto, @Query() q: ClassTeacherQueryDto): Promise<void> {
    wide(g);
    await this.teaching.removeClassTeacher(t, p.id, q.academicYearId);
  }
}

/** The link from a parent's sign-in account to a student: it is what gives that parent the `linked` scope. School routes: the `students` grant. */
@Controller('students')
export class ParentLinksController {
  constructor(private readonly teaching: TeachingService) {}

  @Permission('students', 'read')
  @Get(':id/parent-accounts')
  async list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto): Promise<ParentLinkListDto> {
    wide(g);
    return { items: await this.teaching.parentLinks(t, p.id) };
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.parent.link', operation: 'LinkParentAccount' })
  @Post(':id/parent-accounts')
  async link(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: LinkParentDto): Promise<ParentLinkListDto> {
    wide(g);
    return { items: await this.teaching.linkParent(t, p.id, dto.userId, dto.relationship) };
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.parent.unlink', operation: 'UnlinkParentAccount' })
  @HttpCode(204)
  @Delete(':id/parent-accounts/:linkId')
  async unlink(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentLinkParamDto): Promise<void> {
    wide(g);
    await this.teaching.unlinkParent(t, p.id, p.linkId);
  }
}
