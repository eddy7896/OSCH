import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Audit, NoAudit } from '../audit/audit.decorators.js';
import { Permission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { ContactsQueryDto, MessageParamDto, ReportMessageDto, SendMessageDto, StartThreadDto, ThreadParamDto, type ContactListDto, type MessageDto, type ThreadDetailDto, type ThreadDto, type ThreadListDto } from './dto/messaging.dto.js';
import { MessagingService } from './messaging.service.js';

/**
 * One-to-one conversations about a student (P5-3b, ADR-0018): a teacher and one parent account. School routes: `X-School-Id` + the `messages` grant (Teacher and Parent, own scope).
 * Messages are delivered at once at any hour; each is audited with its words; a conversation of someone else looks like one that does not exist.
 */
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagingService) {}

  /** Who the caller may start a conversation with about a student: a parent sees the teachers of the child's class, a teacher sees the parents of a student in her class. */
  @Permission('messages', 'read')
  @Get('contacts')
  contacts(@Tenant() t: TenantContext, @Query() q: ContactsQueryDto): Promise<ContactListDto> {
    return this.messages.contacts(t, q.studentId);
  }

  @Permission('messages', 'read')
  @Get('threads')
  threads(@Tenant() t: TenantContext): Promise<ThreadListDto> {
    return this.messages.threads(t);
  }

  @Permission('messages', 'create')
  @Audit({ action: 'message.thread.start', operation: 'StartConversation' })
  @HttpCode(200)
  @Post('threads')
  start(@Tenant() t: TenantContext, @Body() dto: StartThreadDto): Promise<ThreadDto> {
    return this.messages.start(t, dto);
  }

  @Permission('messages', 'read')
  @Get('threads/:id')
  thread(@Tenant() t: TenantContext, @Param() p: ThreadParamDto): Promise<ThreadDetailDto> {
    return this.messages.thread(t, p.id);
  }

  @Permission('messages', 'create')
  @Audit({ action: 'message.send', operation: 'SendMessage' })
  @Post('threads/:id/messages')
  send(@Tenant() t: TenantContext, @Param() p: ThreadParamDto, @Body() dto: SendMessageDto): Promise<MessageDto> {
    return this.messages.send(t, p.id, dto);
  }

  @Permission('messages', 'update')
  @NoAudit('Records only when the person last opened a conversation; it changes no message.')
  @HttpCode(204)
  @Post('threads/:id/read')
  async read(@Tenant() t: TenantContext, @Param() p: ThreadParamDto): Promise<void> {
    await this.messages.markRead(t, p.id);
  }

  @Permission('messages', 'update')
  @Audit({ action: 'message.hide', operation: 'HideMessage' })
  @HttpCode(200)
  @Post('threads/:id/messages/:messageId/hide')
  hide(@Tenant() t: TenantContext, @Param() p: MessageParamDto): Promise<MessageDto> {
    return this.messages.hide(t, p.id, p.messageId);
  }

  @Permission('messages', 'create')
  @Audit({ action: 'message.report', operation: 'ReportMessage' })
  @HttpCode(204)
  @Post('threads/:id/messages/:messageId/report')
  async report(@Tenant() t: TenantContext, @Param() p: MessageParamDto, @Body() dto: ReportMessageDto): Promise<void> {
    await this.messages.report(t, p.id, p.messageId, dto.note);
  }
}
