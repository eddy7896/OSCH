import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { EditNoticeDto, NoticeParamDto, PostNoticeDto, ReachQueryDto, type NoticeDto, type NoticeListDto, type ReachDto } from './dto/noticeboard.dto.js';
import { NoticeBoardService } from './noticeboard.service.js';

/**
 * The parents' notice board (P5-8a, ADR-0018). School routes: `X-School-Id` + the `notice_board` grant. The Principal and the Academic admin (school scope) post in any category; the Bursar
 * and the transport manager (own scope, narrowed to Fees and Transport); a parent (linked scope) reads the live posts meant for their children.
 */
@Controller('notice-board')
export class NoticeBoardController {
  constructor(private readonly board: NoticeBoardService) {}

  @Permission('notice_board', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission): Promise<NoticeListDto> {
    return this.board.list(t, g.scope);
  }

  /** How many parent accounts a post to this audience would tell, before it is posted. */
  @Permission('notice_board', 'create')
  @Get('reach')
  reach(@Tenant() t: TenantContext, @Query() q: ReachQueryDto): Promise<ReachDto> {
    return this.board.reach(t, q.audience, q.gradeLevelId, q.classId);
  }

  @Permission('notice_board', 'read')
  @Get(':id')
  one(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: NoticeParamDto): Promise<NoticeDto> {
    return this.board.one(t, g.scope, p.id);
  }

  @Permission('notice_board', 'create')
  @Audit({ action: 'notice.post', operation: 'PostNotice' })
  @Post()
  post(@Tenant() t: TenantContext, @Body() dto: PostNoticeDto): Promise<NoticeDto> {
    return this.board.post(t, dto);
  }

  @Permission('notice_board', 'update')
  @Audit({ action: 'notice.edit', operation: 'EditNotice' })
  @Patch(':id')
  edit(@Tenant() t: TenantContext, @Param() p: NoticeParamDto, @Body() dto: EditNoticeDto): Promise<NoticeDto> {
    return this.board.edit(t, p.id, dto);
  }

  @Permission('notice_board', 'update')
  @Audit({ action: 'announcement.withdraw', operation: 'WithdrawAnnouncement' })
  @HttpCode(200)
  @Post(':id/withdraw')
  withdraw(@Tenant() t: TenantContext, @Param() p: NoticeParamDto): Promise<NoticeDto> {
    return this.board.withdraw(t, p.id);
  }
}
