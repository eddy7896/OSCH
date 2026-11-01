import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { Audit } from '../audit/audit.decorators.js';
import { Granted, Permission, type GrantedPermission } from '../permission/permission.decorator.js';
import { Tenant, type TenantContext } from '../tenant/tenant.decorators.js';
import { CommentsService } from './comments.service.js';
import { CommentParamDto, CreateCommentDto, EditCommentDto, type CommentDto, type CommentListDto } from './dto/comments.dto.js';
import { IdParamDto } from './dto/resources.dto.js';

/**
 * Comments under a learning resource (P5-11d, ADR-0016 decision 6). Parents of the resource's class (linked scope) read, write, and edit or delete their own within 5 minutes;
 * the teacher who uploaded it (own scope, narrowed to her uploads) and the Academic admin (school scope) read, write and hide.
 */
@Controller('resources/:id/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Permission('resource_comments', 'read')
  @Get()
  list(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto): Promise<CommentListDto> {
    return this.comments.list(t, g.scope, p.id);
  }

  @Permission('resource_comments', 'create')
  @Audit({ action: 'resourcecomment.post', operation: 'CreateResourceComment' })
  @Post()
  create(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: IdParamDto, @Body() dto: CreateCommentDto): Promise<CommentDto> {
    return this.comments.create(t, g.scope, p.id, dto);
  }

  @Permission('resource_comments', 'update')
  @Audit({ action: 'resourcecomment.edit', operation: 'EditResourceComment' })
  @Put(':commentId')
  edit(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: CommentParamDto, @Body() dto: EditCommentDto): Promise<CommentDto> {
    return this.comments.edit(t, g.scope, p.id, p.commentId, dto);
  }

  @Permission('resource_comments', 'delete')
  @Audit({ action: 'resourcecomment.delete', operation: 'DeleteResourceComment' })
  @HttpCode(204)
  @Delete(':commentId')
  async remove(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: CommentParamDto): Promise<void> {
    await this.comments.remove(t, g.scope, p.id, p.commentId);
  }

  @Permission('resource_comments', 'update')
  @Audit({ action: 'resourcecomment.hide', operation: 'HideResourceComment' })
  @HttpCode(200)
  @Post(':commentId/hide')
  hide(@Tenant() t: TenantContext, @Granted() g: GrantedPermission, @Param() p: CommentParamDto): Promise<CommentDto> {
    return this.comments.hide(t, g.scope, p.id, p.commentId);
  }
}
