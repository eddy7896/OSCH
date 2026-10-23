import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { FileUploadTicketDto, SignedReadDto } from '../students/dto/students.dto.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  AddStaffDocumentDto, CreateStaffDto, LinkStaffAccountDto, ListStaffQueryDto, StaffDepartmentsDto, StaffDocumentParamDto, StaffDocumentUploadRequestDto, StaffDto,
  StaffIdParamDto, StaffListDto, StaffPhotoUploadRequestDto, StaffSetPhotoDto, UpdateStaffDto,
} from './dto/staff.dto.js';
import { StaffFilesService } from './staff-files.service.js';
import { StaffService } from './staff.service.js';

/** Own and linked scopes cannot be resolved to staff records yet: they see nothing. Writes need a school-wide grant. */
const isSchoolWide = (g: GrantedPermission): boolean => g.scope === 'school';
const wide = (g: GrantedPermission): void => {
  if (!isSchoolWide(g)) throw new ForbiddenException();
};
const wideRead = (g: GrantedPermission): void => {
  if (!isSchoolWide(g)) throw new NotFoundException();
};
const TICKET = 'Issues a short-lived upload address and changes nothing; attaching the file is a separate, audited step.';

/** Staff records (HR) of the active school. School routes: `X-School-Id` + the `staff` grant (HR Manager and System Admin write; Principal and Academic Admin read). */
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly files: StaffFilesService,
  ) {}

  @Permission('staff', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ListStaffQueryDto): Promise<StaffListDto> {
    if (!isSchoolWide(g)) return Promise.resolve({ items: [], total: 0, page: q.page ?? 1, pageSize: q.pageSize ?? 25 });
    return this.staff.list(t, q);
  }

  @Permission('staff', 'read')
  @Get('departments')
  async departments(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<StaffDepartmentsDto> {
    return { items: isSchoolWide(g) ? await this.staff.departments(t) : [] };
  }

  @Permission('staff', 'read')
  @Get(':id')
  get(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto): Promise<StaffDto> {
    wideRead(g);
    return this.staff.get(t, p.id);
  }

  @Permission('staff', 'create')
  @Audit({ action: 'staff.create', operation: 'CreateStaff' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateStaffDto): Promise<StaffDto> {
    wide(g);
    return this.staff.create(t, dto);
  }

  @Permission('staff', 'update')
  @Audit({ action: 'staff.update', operation: 'UpdateStaff' })
  @Patch(':id')
  update(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: UpdateStaffDto): Promise<StaffDto> {
    wide(g);
    return this.staff.update(t, p.id, dto);
  }

  /** Link the record to a sign-in account that is already a member of this school. This never grants a role. */
  @Permission('staff', 'update')
  @Audit({ action: 'staff.account.link', operation: 'LinkStaffAccount' })
  @Put(':id/account')
  link(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: LinkStaffAccountDto): Promise<StaffDto> {
    wide(g);
    return this.staff.linkAccount(t, p.id, dto);
  }

  @Permission('staff', 'update')
  @NoAudit(TICKET)
  @Strict()
  @HttpCode(200)
  @Post(':id/photo/upload-url')
  photoTicket(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: StaffPhotoUploadRequestDto): Promise<FileUploadTicketDto> {
    wide(g);
    return this.files.photoTicket(t, p.id, dto);
  }

  @Permission('staff', 'update')
  @Audit({ action: 'staff.photo.set', operation: 'SetStaffPhoto' })
  @Put(':id/photo')
  setPhoto(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: StaffSetPhotoDto): Promise<StaffDto> {
    wide(g);
    return this.files.setPhoto(t, p.id, dto);
  }

  @Permission('staff', 'read')
  @Get(':id/photo')
  photo(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto): Promise<SignedReadDto> {
    wideRead(g);
    return this.files.photoUrl(t, p.id);
  }

  @Permission('staff', 'update')
  @NoAudit(TICKET)
  @Strict()
  @HttpCode(200)
  @Post(':id/documents/upload-url')
  documentTicket(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: StaffDocumentUploadRequestDto): Promise<FileUploadTicketDto> {
    wide(g);
    return this.files.documentTicket(t, p.id, dto);
  }

  @Permission('staff', 'update')
  @Audit({ action: 'staff.document.add', operation: 'AddStaffDocument' })
  @Post(':id/documents')
  addDocument(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffIdParamDto, @Body() dto: AddStaffDocumentDto): Promise<StaffDto> {
    wide(g);
    return this.files.addDocument(t, p.id, dto);
  }

  @Permission('staff', 'read')
  @Get(':id/documents/:documentId/url')
  documentUrl(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffDocumentParamDto): Promise<SignedReadDto> {
    wideRead(g);
    return this.files.documentUrl(t, p.id, p.documentId);
  }

  @Permission('staff', 'update')
  @Audit({ action: 'staff.document.remove', operation: 'RemoveStaffDocument' })
  @HttpCode(204)
  @Delete(':id/documents/:documentId')
  async removeDocument(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StaffDocumentParamDto): Promise<void> {
    wide(g);
    await this.files.removeDocument(t, p.id, p.documentId);
  }
}
