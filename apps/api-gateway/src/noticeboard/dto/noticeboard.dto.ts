import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, Length, Matches } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const NOTICE_CATEGORIES = ['GENERAL', 'HOLIDAY', 'EXAM', 'EVENT', 'FEES', 'TRANSPORT'] as const;
export const NOTICE_AUDIENCES = ['ALL_PARENTS', 'GRADE', 'CLASS'] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export class NoticeParamDto {
  @IsString() @Matches(UUID) id!: string;
}

export class ReachQueryDto {
  @IsIn(NOTICE_AUDIENCES) audience!: NoticeAudience;
  @IsOptional() @IsString() @Matches(UUID) gradeLevelId?: string;
  @IsOptional() @IsString() @Matches(UUID) classId?: string;
}

export class PostNoticeDto {
  /** Also the text of the notice a parent gets, so it has to make sense on its own and name no child. */
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @Transform(trim) @IsString() @Length(1, 5000) body!: string;
  @IsIn(NOTICE_CATEGORIES) category!: NoticeCategory;
  @IsIn(NOTICE_AUDIENCES) audience!: NoticeAudience;
  /** Required for the audience GRADE. */
  @IsOptional() @IsString() @Matches(UUID) gradeLevelId?: string;
  /** Required for the audience CLASS. */
  @IsOptional() @IsString() @Matches(UUID) classId?: string;
  @IsOptional() @IsBoolean() pinned?: boolean;
  /** Visible from this moment; left out means at once. A post that is not yet visible tells nobody until someone edits it (there is no scheduler yet). */
  @IsOptional() @IsISO8601() publishAt?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}

export class EditNoticeDto {
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @Transform(trim) @IsString() @Length(1, 5000) body!: string;
  @IsIn(NOTICE_CATEGORIES) category!: NoticeCategory;
  @IsBoolean() pinned!: boolean;
  @IsOptional() @IsISO8601() publishAt?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}

export class NoticeDto {
  id!: string;
  /** Empty when withdrawn. */
  title!: string;
  body!: string;
  category!: NoticeCategory;
  audience!: NoticeAudience;
  pinned!: boolean;
  publishAt!: string | null;
  expiresAt!: string | null;
  /** The grade or class it is for; null for all parents. */
  target!: string | null;
  author!: { id: string; name: string };
  createdAt!: string;
  updatedAt!: string;
  withdrawn!: boolean;
  /** SCHEDULED (not yet visible), LIVE, EXPIRED or WITHDRAWN. Parents only ever see LIVE and WITHDRAWN-free lists. */
  state!: 'SCHEDULED' | 'LIVE' | 'EXPIRED' | 'WITHDRAWN';
  /** Parent accounts told when it was posted; null on a read. */
  told!: number | null;
}
export class NoticeListDto {
  items!: NoticeDto[];
}
export class ReachDto {
  /** Parent accounts a post to this audience would tell, and the students they are linked to. */
  parents!: number;
  students!: number;
}
