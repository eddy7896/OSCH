import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { NoAudit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { CategoryParamDto, IdParamDto, ListQueryDto, NotificationListDto, PreferenceDto, PreferenceListDto, ReadAllDto } from './dto/notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

/**
 * The in-app inbox (P3-9). School routes: `X-School-Id` + the `notifications` grant, which every role holds at own scope: a person reads only what is addressed to them or to their
 * role. Marking read and the preferences change nothing but the reader's own view, so they write no audit row.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Permission('notifications', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Query() q: ListQueryDto): Promise<NotificationListDto> {
    return this.notifications.list(t, q.unread ?? false, q.limit);
  }

  @Permission('notifications', 'read')
  @Get('preferences')
  preferences(@Tenant() t: TenantContext): Promise<PreferenceListDto> {
    return this.notifications.preferences(t);
  }

  @Permission('notifications', 'update')
  @NoAudit('Switches a category of your own inbox on or off; it changes no school data and the notifications are kept.')
  @Put('preferences/:category')
  setPreference(@Tenant() t: TenantContext, @Param() p: CategoryParamDto, @Body() dto: PreferenceDto): Promise<PreferenceListDto> {
    return this.notifications.setPreference(t, p.category, dto.enabled);
  }

  @Permission('notifications', 'update')
  @NoAudit('Marks notifications as read in your own inbox; it changes no school data.')
  @HttpCode(200)
  @Post('read-all')
  readAll(@Tenant() t: TenantContext): Promise<ReadAllDto> {
    return this.notifications.markAllRead(t);
  }

  @Permission('notifications', 'update')
  @NoAudit('Marks one notification as read in your own inbox; it changes no school data.')
  @HttpCode(204)
  @Post(':id/read')
  async read(@Tenant() t: TenantContext, @Param() p: IdParamDto): Promise<void> {
    await this.notifications.markRead(t, p.id);
  }
}
