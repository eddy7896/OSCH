import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** The most a comment may hold (ADR-0016 decision 6). */
export const COMMENT_MAX = 500;

export class CommentParamDto {
  @IsString() @Matches(UUID) id!: string;
  @IsString() @Matches(UUID) commentId!: string;
}
export class CreateCommentDto {
  /** The device's own id for the comment, so sending it twice is one comment. */
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) clientId!: string;
  /** Text only; no links are turned into buttons and nothing is attached. */
  @Transform(trim) @IsString() @Length(1, COMMENT_MAX) body!: string;
  /** The comment this one answers (one level only: it must not itself be a reply). */
  @IsOptional() @IsString() @Matches(UUID) replyToId?: string;
}
export class EditCommentDto {
  @Transform(trim) @IsString() @Length(1, COMMENT_MAX) body!: string;
}

export class CommentDto {
  id!: string;
  resourceId!: string;
  /** `PARENT` is shown as "Parent of {name}" (the name is the first names of their children in the class); staff as their own name. */
  author!: { kind: 'PARENT' | 'TEACHER' | 'ADMIN'; name: string; mine: boolean };
  /** Null for a parent when the school hid the comment. */
  body!: string | null;
  hidden!: boolean;
  edited!: boolean;
  replyToId!: string | null;
  /** True while the author may still edit or delete it (decided by the server's clock when this was sent). */
  canChange!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
export class CommentListDto {
  items!: CommentDto[];
}
