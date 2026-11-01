import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import { TeachingScope } from '../teaching/teaching-scope.service.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { CommentDto, CommentListDto, CreateCommentDto, EditCommentDto } from './dto/comments.dto.js';
import { ResourcesService, type ResourceRow } from './resources.service.js';

type Scope = 'school' | 'own' | 'linked';
interface CommentRow {
  id: string; clientId: string; authorRole: string; authorName: string; body: string; originalBody: string;
  editedAt?: string | null; deletedAt?: string | null; hiddenAt?: string | null; createdAt: string; updatedAt: string;
  author: { id: string }; hiddenBy?: { id: string } | null; replyTo?: { id: string } | null;
}

/** A parent may edit or delete their own comment for this long after posting; the server's clock decides, whatever the phone's clock says. */
export const COMMENT_WINDOW_MS = 5 * 60_000;
const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const invalid = (field: string, rule: string) => new ApiException(ErrorCode.INVALID_REQUEST, 400, [{ field, rule }]);
const conflict = (field: string, rule: string) => new ApiException(ErrorCode.CONFLICT, 409, [{ field, rule }]);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;
const KINDS = { PARENT: 'PARENT', TEACHER: 'TEACHER' } as const;

/** "Asha", "Asha and Dev", "Asha, Dev and Rohan". */
const joinNames = (names: string[]): string => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/**
 * Comments under a learning resource (P5-11d, ADR-0016 decision 6). Who may read and write: the parents of the resource's class, the teacher who uploaded it, and the Academic
 * admin; nobody else. A parent is shown as "Parent of {first names of their children in the class}", never by their own name. A parent edits or deletes for 5 minutes; the
 * uploading teacher or the Academic admin hides a comment, which parents then see as "hidden" with no words. The teacher and everyone who commented before are told of a new comment.
 */
@Injectable()
export class CommentsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly resources: ResourcesService, private readonly scope: TeachingScope) {}

  /** The resource if this caller may see its comments: a teacher only for what she uploaded. */
  private async gate(t: TenantContext, scope: Scope, resourceId: string): Promise<ResourceRow> {
    const r = await this.resources.visible(t, scope, resourceId);
    if (scope === 'own' && r.uploadedBy.id !== t.userId) throw notFound();
    return r;
  }

  private view(t: TenantContext, scope: Scope, c: CommentRow, resourceId: string): CommentDto {
    const mine = c.author.id === t.userId;
    const hidden = Boolean(c.hiddenAt);
    const staff = scope !== 'linked';
    return {
      id: dashed(c.id),
      resourceId: dashed(resourceId),
      author: { kind: c.authorRole === 'PARENT' ? KINDS.PARENT : c.authorRole === 'TEACHER' ? KINDS.TEACHER : 'ADMIN', name: c.authorName, mine },
      body: hidden && !staff ? null : c.body,
      hidden,
      edited: Boolean(c.editedAt),
      replyToId: c.replyTo ? dashed(c.replyTo.id) : null,
      canChange: mine && !hidden && Date.now() - Date.parse(c.createdAt) < COMMENT_WINDOW_MS,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private async rows(t: TenantContext, resourceId: string): Promise<CommentRow[]> {
    return (await this.db.listResourceComments({ schoolId: t.schoolId, resourceId: dashed(resourceId), limit: 500 })).data.resourceComments as unknown as CommentRow[];
  }

  private async one(t: TenantContext, id: string): Promise<CommentRow | null> {
    return ((await this.db.getResourceComment({ schoolId: t.schoolId, id: dashed(id) })).data.resourceComments[0] as unknown as CommentRow | undefined) ?? null;
  }

  async list(t: TenantContext, scope: Scope, resourceId: string): Promise<CommentListDto> {
    const r = await this.gate(t, scope, resourceId);
    return { items: (await this.rows(t, resourceId)).filter((c) => !c.deletedAt).map((c) => this.view(t, scope, c, r.id)) };
  }

  /** What other families see of an author: a parent's children in this class (first names), a member of staff by name. */
  private async authorName(t: TenantContext, scope: Scope, r: ResourceRow): Promise<string> {
    if (scope === 'linked') {
      const classId = dashed(r.classroom.id);
      const names = (await this.scope.mine(t)).children.filter((c) => c.class && dashed(c.class.id) === classId).map((c) => c.name.split(' ')[0]!);
      if (names.length === 0) throw notFound();
      return joinNames(names);
    }
    const staff = (await this.db.staffOfUser({ schoolId: t.schoolId, userId: t.userId })).data.staffProfiles[0];
    if (staff) return `${staff.firstName} ${staff.lastName}`;
    const u = (await this.db.getUser({ id: t.userId })).data.user;
    return u?.displayName ?? u?.email ?? '';
  }

  async create(t: TenantContext, scope: Scope, resourceId: string, dto: CreateCommentDto): Promise<CommentDto> {
    const r = await this.gate(t, scope, resourceId);
    const before = await this.rows(t, resourceId);
    const again = before.find((c) => c.author.id === t.userId && c.clientId === dto.clientId);
    if (again) return this.view(t, scope, again, r.id);
    if (dto.replyToId) {
      const to = before.find((c) => dashed(c.id) === dashed(dto.replyToId!));
      if (!to || to.deletedAt) throw invalid('replyToId', 'notFound');
      if (to.replyTo) throw invalid('replyToId', 'oneLevelOnly');
    }
    const name = await this.authorName(t, scope, r);
    const id = randomUUID();
    try {
      await this.db.createResourceComment({
        schoolId: t.schoolId, id, resourceId: dashed(r.id), clientId: dto.clientId, authorRole: t.schoolRole as never, authorName: name,
        replyToId: dto.replyToId ? dashed(dto.replyToId) : null, body: dto.body, actorId: t.userId, details: { resourceId: dashed(r.id), length: dto.body.length },
      });
    } catch (e) {
      if (kindOf(e) === 'ALREADY_EXISTS') { // the same comment arrived twice at once
        const same = (await this.rows(t, resourceId)).find((c) => c.author.id === t.userId && c.clientId === dto.clientId);
        if (same) return this.view(t, scope, same, r.id);
      }
      throw e;
    }
    await this.tell(t, r, id, scope === 'linked', name, before);
    const made = await this.one(t, id);
    return this.view(t, scope, made!, r.id);
  }

  /** Best effort, after the comment is safely stored: the teacher who shared the resource and everyone who commented before, except the author. A failure here never undoes the comment. */
  private async tell(t: TenantContext, r: ResourceRow, commentId: string, byParent: boolean, name: string, before: CommentRow[]): Promise<void> {
    const people = new Set<string>([r.uploadedBy.id, ...before.filter((c) => !c.deletedAt).map((c) => c.author.id)]);
    people.delete(t.userId);
    const kind = byParent ? 'resourcecomment.parentposted' : 'resourcecomment.staffposted';
    await Promise.all([...people].map((userId) => this.db.notifyResourceComment({ schoolId: t.schoolId, commentId, recipientUserId: userId, kind, notice: { who: name, title: r.title }, actorId: t.userId, details: { to: userId } }).catch(() => undefined)));
  }

  private async mine(t: TenantContext, scope: Scope, resourceId: string, commentId: string): Promise<{ r: ResourceRow; c: CommentRow }> {
    if (scope !== 'linked') throw notFound(); // not the caller's to do: the same answer as for a comment that does not exist
    const r = await this.gate(t, scope, resourceId);
    const c = await this.one(t, commentId);
    if (!c || dashed(c.id) !== dashed(commentId) || c.author.id !== t.userId || c.deletedAt || !(await this.rows(t, resourceId)).some((x) => dashed(x.id) === dashed(c.id))) throw notFound();
    return { r, c };
  }

  private windowStart(): string {
    return new Date(Date.now() - COMMENT_WINDOW_MS).toISOString();
  }

  async edit(t: TenantContext, scope: Scope, resourceId: string, commentId: string, dto: EditCommentDto): Promise<CommentDto> {
    const { r, c } = await this.mine(t, scope, resourceId, commentId);
    if (c.hiddenAt) throw conflict('comment', 'hidden');
    if (Date.now() - Date.parse(c.createdAt) >= COMMENT_WINDOW_MS) throw conflict('comment', 'editWindowClosed');
    try {
      await this.db.editResourceComment({ schoolId: t.schoolId, id: dashed(c.id), body: dto.body, windowStart: this.windowStart(), actorId: t.userId, details: { from: c.body, to: dto.body } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('comment', 'editWindowClosed');
      throw e;
    }
    return this.view(t, scope, (await this.one(t, commentId))!, r.id);
  }

  async remove(t: TenantContext, scope: Scope, resourceId: string, commentId: string): Promise<void> {
    const { c } = await this.mine(t, scope, resourceId, commentId);
    if (Date.now() - Date.parse(c.createdAt) >= COMMENT_WINDOW_MS) throw conflict('comment', 'editWindowClosed');
    try {
      await this.db.deleteResourceComment({ schoolId: t.schoolId, id: dashed(c.id), windowStart: this.windowStart(), actorId: t.userId, details: { body: c.body } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('comment', 'editWindowClosed');
      throw e;
    }
  }

  /** The uploading teacher or the Academic admin. The author is told; the words stay in the audit trail. */
  async hide(t: TenantContext, scope: Scope, resourceId: string, commentId: string): Promise<CommentDto> {
    if (scope === 'linked') throw notFound(); // a parent holds `update` to change their own comment, never to hide
    const r = await this.gate(t, scope, resourceId);
    const c = await this.one(t, commentId);
    if (!c || c.deletedAt || !(await this.rows(t, resourceId)).some((x) => dashed(x.id) === dashed(c.id))) throw notFound();
    if (c.hiddenAt) throw conflict('comment', 'alreadyHidden');
    try {
      await this.db.hideResourceComment({
        schoolId: t.schoolId, id: dashed(c.id), authorUserId: c.author.id, kind: 'resourcecomment.hidden', notice: { title: r.title },
        actorId: t.userId, details: { resourceId: dashed(r.id), body: c.body },
      });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw conflict('comment', 'alreadyHidden');
      throw e;
    }
    return this.view(t, scope, (await this.one(t, commentId))!, r.id);
  }
}
