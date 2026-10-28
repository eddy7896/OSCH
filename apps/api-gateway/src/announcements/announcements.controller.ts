import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { AnnouncementsService } from './announcements.service.js';
import { type AnnouncementDto, type AnnouncementListDto, AnnouncementParamDto, ListAnnouncementsQueryDto, WriteAnnouncementDto } from './dto/announcements.dto.js';

/** Announcements from the school to its staff (P4-S4, ADR-0014 decision 11). Every staff role reads; the Principal and the Academic admin write. */
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Permission('announcements', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Query() q: ListAnnouncementsQueryDto): Promise<AnnouncementListDto> {
    return this.announcements.list(t, q.updatedSince);
  }

  @Permission('announcements', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Param() p: AnnouncementParamDto): Promise<AnnouncementDto> {
    return this.announcements.one(t, p.id);
  }

  /** Posts an announcement and tells every staff role with a notice. */
  @Permission('announcements', 'create')
  @Audit({ action: 'announcement.post', operation: 'PostAnnouncement' })
  @Post()
  post(@Tenant() t: TenantContext, @Body() dto: WriteAnnouncementDto): Promise<AnnouncementDto> {
    return this.announcements.post(t, dto);
  }

  @Permission('announcements', 'update')
  @Audit({ action: 'announcement.edit', operation: 'EditAnnouncement' })
  @Patch(':id')
  edit(@Tenant() t: TenantContext, @Param() p: AnnouncementParamDto, @Body() dto: WriteAnnouncementDto): Promise<AnnouncementDto> {
    return this.announcements.edit(t, p.id, dto);
  }

  /** Takes it down. The row stays so that phones hear it is gone; its words are no longer shown. */
  @Permission('announcements', 'update')
  @Audit({ action: 'announcement.withdraw', operation: 'WithdrawAnnouncement' })
  @HttpCode(200)
  @Post(':id/withdraw')
  withdraw(@Tenant() t: TenantContext, @Param() p: AnnouncementParamDto): Promise<AnnouncementDto> {
    return this.announcements.withdraw(t, p.id);
  }
}
