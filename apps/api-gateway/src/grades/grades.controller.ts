import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Patch, Post, Put, Query, StreamableFile } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import {
  BandsDto, CreateExamDto, CreateTermDto, ExamDto, ExamListDto, ExamsQueryDto, IdParamDto, MarksGridDto, ReportCardDto, ReportCardQueryDto, SaveMarksDto, SetBandsDto, StudentIdParamDto,
  TermDto, TermListDto, TermsQueryDto, UpdateExamDto, UpdateTermDto,
} from './dto/grades.dto.js';
import { GradesService } from './grades.service.js';

/**
 * Terms, grade bands, exams, marks and report cards (P3-5). The set-up (terms, bands, exams) is the `academics` grant: the Academic admin edits, a Teacher reads
 * the exams of their classes. Marks and report cards are the `grades` grant: a Teacher enters marks only for a subject they teach in a class of theirs,
 * a Parent reads only a linked child's report card.
 */
@Controller('grades')
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  private schoolOnly(g: GrantedPermission): void {
    if (g.scope !== 'school') throw new NotFoundException();
  }

  @Permission('academics', 'read')
  @Get('terms')
  terms(@Tenant() t: TenantContext, @Query() q: TermsQueryDto): Promise<TermListDto> {
    return this.grades.terms(t, q.academicYearId);
  }

  @Permission('academics', 'create')
  @Audit({ action: 'grades.term.create', operation: 'CreateAssessmentTerm' })
  @Post('terms')
  createTerm(@Tenant() t: TenantContext, @Body() dto: CreateTermDto): Promise<TermDto> {
    return this.grades.createTerm(t, dto.name, dto.academicYearId);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'grades.term.update', operation: 'UpdateAssessmentTerm' })
  @Patch('terms/:id')
  updateTerm(@Tenant() t: TenantContext, @Param() p: IdParamDto, @Body() dto: UpdateTermDto): Promise<TermDto> {
    return this.grades.updateTerm(t, p.id, dto.name);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'grades.term.delete', operation: 'DeleteAssessmentTerm' })
  @HttpCode(204)
  @Delete('terms/:id')
  async deleteTerm(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.grades.deleteTerm(t, p.id);
  }

  @Permission('academics', 'read')
  @Get('bands')
  bands(@Tenant() t: TenantContext): Promise<BandsDto> {
    return this.grades.bands(t);
  }

  /** Replaces the school's grade bands with the set sent: 0 to 100, no gap, no overlap. */
  @Permission('academics', 'update')
  @Audit({ action: 'grades.bands.set', operation: 'SetGradeBands' })
  @Put('bands')
  setBands(@Tenant() t: TenantContext, @Body() dto: SetBandsDto): Promise<BandsDto> {
    return this.grades.setBands(t, dto.bands);
  }

  @Permission('academics', 'read')
  @Get('exams')
  exams(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Query() q: ExamsQueryDto): Promise<ExamListDto> {
    return this.grades.exams(t, g.scope, q);
  }

  @Permission('academics', 'create')
  @Audit({ action: 'grades.exam.create', operation: 'CreateExam' })
  @Post('exams')
  createExam(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Body() dto: CreateExamDto): Promise<ExamDto> {
    this.schoolOnly(g);
    return this.grades.createExam(t, dto);
  }

  @Permission('academics', 'update')
  @Audit({ action: 'grades.exam.update', operation: 'UpdateExam' })
  @Patch('exams/:id')
  updateExam(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: UpdateExamDto): Promise<ExamDto> {
    this.schoolOnly(g);
    return this.grades.updateExam(t, p.id, dto);
  }

  @Permission('academics', 'delete')
  @Audit({ action: 'grades.exam.delete', operation: 'DeleteExam' })
  @HttpCode(204)
  @Delete('exams/:id')
  async deleteExam(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<void> {
    this.schoolOnly(g);
    await this.grades.deleteExam(t, p.id);
  }

  /** The marks entry grid: every student of the class with their mark, percentage and grade. */
  @Permission('grades', 'read')
  @Get('exams/:id/marks')
  grid(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<MarksGridDto> {
    return this.grades.grid(t, g.scope, p.id);
  }

  /** Enters or changes marks for the students listed (others are untouched). A mark above the exam's maximum is refused. */
  @Permission('grades', 'create')
  @Audit({ action: 'grades.marks.save', operation: 'FinishMarkEntry' })
  @Put('exams/:id/marks')
  saveMarks(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: SaveMarksDto): Promise<MarksGridDto> {
    return this.grades.saveMarks(t, g.scope, p.id, dto);
  }

  @Permission('grades', 'read')
  @Get('report-cards/students/:studentId')
  reportCard(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Query() q: ReportCardQueryDto): Promise<ReportCardDto> {
    return this.grades.reportCard(t, g.scope, p.studentId, q.termId);
  }

  @Permission('grades', 'read')
  @Header('Cache-Control', 'private, no-store')
  @Get('report-cards/students/:studentId/pdf')
  async reportCardPdf(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: StudentIdParamDto, @Query() q: ReportCardQueryDto): Promise<StreamableFile> {
    const f = await this.grades.reportCardPdf(t, g.scope, p.studentId, q.termId, q.lang);
    return new StreamableFile(f.bytes, { type: f.type, disposition: `attachment; filename="${f.fileName}"` });
  }
}
