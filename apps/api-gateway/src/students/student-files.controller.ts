import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Strict } from '../common/throttle.guards.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  AddDocumentDto, DocumentParamDto, DocumentUploadRequestDto, FileUploadTicketDto, PhotoUploadRequestDto, SetPhotoDto, SignedReadDto, StudentDto,
  StudentIdParamDto,
} from './dto/students.dto.js';
import { StudentFilesService } from './student-files.service.js';

const schoolWideWrite = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new ForbiddenException();
};
/** Own and linked scopes cannot be resolved to students yet: they see nothing (same rule as the student routes). */
const schoolWideRead = (g: GrantedPermission): void => {
  if (g.scope !== 'school') throw new NotFoundException();
};

/** A student's photo and documents. Files live in the PRIVATE bucket and are read only through short-lived signed addresses. */
@Controller('students/:id')
export class StudentFilesController {
  constructor(private readonly files: StudentFilesService) {}

  @Permission('students', 'update')
  @NoAudit('Issues a short-lived upload address and changes nothing; attaching the file to the student is a separate, audited step.')
  @Strict()
  @HttpCode(200)
  @Post('photo/upload-url')
  photoTicket(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: PhotoUploadRequestDto): Promise<FileUploadTicketDto> {
    schoolWideWrite(g);
    return this.files.photoTicket(t, p.id, dto);
  }

  /** Attach an uploaded file (the `key` from the upload address) as the student's photo. */
  @Permission('students', 'update')
  @Audit({ action: 'student.photo.set', operation: 'SetStudentPhoto' })
  @Put('photo')
  setPhoto(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: SetPhotoDto): Promise<StudentDto> {
    schoolWideWrite(g);
    return this.files.setPhoto(t, p.id, dto);
  }

  @Permission('students', 'read')
  @Get('photo')
  photo(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto): Promise<SignedReadDto> {
    schoolWideRead(g);
    return this.files.photoUrl(t, p.id);
  }

  @Permission('students', 'update')
  @NoAudit('Issues a short-lived upload address and changes nothing; attaching the file to the student is a separate, audited step.')
  @Strict()
  @HttpCode(200)
  @Post('documents/upload-url')
  documentTicket(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: DocumentUploadRequestDto): Promise<FileUploadTicketDto> {
    schoolWideWrite(g);
    return this.files.documentTicket(t, p.id, dto);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.document.add', operation: 'AddStudentDocument' })
  @Post('documents')
  addDocument(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Body() dto: AddDocumentDto): Promise<StudentDto> {
    schoolWideWrite(g);
    return this.files.addDocument(t, p.id, dto);
  }

  @Permission('students', 'read')
  @Get('documents/:documentId/url')
  documentUrl(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: DocumentParamDto): Promise<SignedReadDto> {
    schoolWideRead(g);
    return this.files.documentUrl(t, p.id, p.documentId);
  }

  @Permission('students', 'update')
  @Audit({ action: 'student.document.remove', operation: 'RemoveStudentDocument' })
  @HttpCode(204)
  @Delete('documents/:documentId')
  async removeDocument(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: DocumentParamDto): Promise<void> {
    schoolWideWrite(g);
    await this.files.removeDocument(t, p.id, p.documentId);
  }
}
