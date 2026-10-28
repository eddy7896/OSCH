import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { UpdatedSince } from '../../common/updated-since.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AnnouncementParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class ListAnnouncementsQueryDto {
  /** Only announcements posted, edited or withdrawn at or after this moment (the `next` of an earlier answer). */
  @UpdatedSince() updatedSince?: string;
}

export class WriteAnnouncementDto {
  /** A short headline. It is also what the notice says, so it has to make sense on its own. */
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @Transform(trim) @IsString() @Length(1, 5000) body!: string;
}

export class AnnouncementDto {
  id!: string;
  /** Empty when withdrawn: a phone that has it must hear that it is gone, but nobody reads the words again. */
  title!: string;
  body!: string;
  author!: { id: string; name: string };
  createdAt!: string;
  updatedAt!: string;
  withdrawn!: boolean;
}

export class AnnouncementListDto {
  items!: AnnouncementDto[];
  /** Ask from here next time (the server's clock); null when there is nothing to anchor to yet. */
  next!: string | null;
}
