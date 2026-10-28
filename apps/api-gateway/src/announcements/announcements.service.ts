import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '@oruschools/database';
import { randomUUID } from 'node:crypto';
import { nextCursor } from '../common/updated-since.js';
import { ApiException, ErrorCode } from '../common/errors.js';
import { dashed } from '../common/uuid.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import type { AnnouncementDto, AnnouncementListDto, WriteAnnouncementDto } from './dto/announcements.dto.js';

interface Row {
  id: string; title: string; body: string; createdAt: string; updatedAt: string; withdrawnAt?: string | null;
  author: { id: string; displayName?: string | null; email: string };
}

const notFound = () => new ApiException(ErrorCode.NOT_FOUND, 404);
const kindOf = (e: unknown) => (e as { kind?: string }).kind;

@Injectable()
export class AnnouncementsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private view(r: Row): AnnouncementDto {
    const withdrawn = !!r.withdrawnAt;
    return { id: dashed(r.id), title: withdrawn ? '' : r.title, body: withdrawn ? '' : r.body, author: { id: r.author.id, name: r.author.displayName ?? r.author.email }, createdAt: r.createdAt, updatedAt: r.updatedAt, withdrawn };
  }

  async list(t: TenantContext, updatedSince?: string): Promise<AnnouncementListDto> {
    const rows = (await this.db.listAnnouncements({ schoolId: t.schoolId, ...(updatedSince ? { updatedSince } : {}) })).data.announcements as unknown as Row[];
    return { items: rows.map((r) => this.view(r)), next: nextCursor(rows, updatedSince) };
  }

  async one(t: TenantContext, id: string): Promise<AnnouncementDto> {
    const row = (await this.db.getAnnouncement({ schoolId: t.schoolId, id: dashed(id) })).data.announcements[0] as unknown as Row | undefined;
    if (!row) throw notFound();
    return this.view(row);
  }

  /** Posts it and writes a notice for every staff role in the same transaction (all or none). The notice carries only the title; the words are read here. */
  async post(t: TenantContext, dto: WriteAnnouncementDto): Promise<AnnouncementDto> {
    const id = randomUUID();
    await this.db.postAnnouncement({ schoolId: t.schoolId, id, title: dto.title, body: dto.body, notice: { title: dto.title }, actorId: t.userId, details: { title: dto.title } });
    return this.one(t, id);
  }

  /** Corrects the words. It does not send another notice: people were told once. */
  async edit(t: TenantContext, id: string, dto: WriteAnnouncementDto): Promise<AnnouncementDto> {
    try {
      await this.db.editAnnouncement({ schoolId: t.schoolId, id: dashed(id), title: dto.title, body: dto.body, actorId: t.userId, details: { title: dto.title } });
    } catch (e) {
      if (kindOf(e) === 'FORBIDDEN_REFERENCE') throw notFound(); // not here, or already withdrawn
      throw e;
    }
    return this.one(t, id);
  }

  async withdraw(t: TenantContext, id: string): Promise<AnnouncementDto> {
    const have = await this.one(t, id);
    if (have.withdrawn) return have; // already gone: the same answer
    try {
      await this.db.withdrawAnnouncement({ schoolId: t.schoolId, id: dashed(id), actorId: t.userId, details: {} });
    } catch (e) {
      if (kindOf(e) !== 'FORBIDDEN_REFERENCE') throw e; // withdrawn an instant ago
    }
    return this.one(t, id);
  }
}
