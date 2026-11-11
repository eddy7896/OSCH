import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AuditPageQueryDto, ReportParamDto, ReviewReportDto, type MessageAuditPageDto, type ReportDetailDto, type ReportDto, type ReportListDto } from './dto/review.dto.js';
import { MessageReviewService } from './review.service.js';

/** Reported messages (P5-3e): the Principal reads the reported words with the whole conversation and closes the report. */
@Controller('messages/reports')
export class MessageReportsController {
  constructor(private readonly review: MessageReviewService) {}

  @Permission('message_reports', 'read')
  @Get()
  list(@Tenant() t: TenantContext): Promise<ReportListDto> {
    return this.review.reports(t);
  }

  @Permission('message_reports', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Param() p: ReportParamDto): Promise<ReportDetailDto> {
    return this.review.one(t, p.id);
  }

  @Permission('message_reports', 'update')
  @Audit({ action: 'message.report.review', operation: 'ReviewMessageReport' })
  @HttpCode(200)
  @Post(':id/review')
  close(@Tenant() t: TenantContext, @Param() p: ReportParamDto, @Body() dto: ReviewReportDto): Promise<ReportDto> {
    return this.review.review(t, p.id, dto.note);
  }
}

/** The trail of messages and class messages for the System Admin (guardrails section 3). Opening it is written down. */
@Controller('audit')
export class MessageAuditController {
  constructor(private readonly review: MessageReviewService) {}

  @Permission('audit_log', 'read')
  @Get('messages')
  messages(@Tenant() t: TenantContext, @Query() q: AuditPageQueryDto): Promise<MessageAuditPageDto> {
    return this.review.audit(t, q.limit, q.offset);
  }
}
