import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ReportParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class ReviewReportDto {
  /** What the Principal decided or did, kept in the audit trail. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) note?: string;
}
export class AuditPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

export class PersonRefDto {
  userId!: string;
  name!: string;
}
export class StudentNameDto {
  id!: string;
  name!: string;
}
export class ReportedMessageDto {
  id!: string;
  /** The words, shown to the Principal even if the sender hid them. */
  body!: string;
  hidden!: boolean;
  sentAt!: string;
  sender!: PersonRefDto;
  student!: StudentNameDto;
  staff!: PersonRefDto;
  guardian!: PersonRefDto;
}
export class ReportDto {
  id!: string;
  note!: string | null;
  reportedAt!: string;
  reportedBy!: PersonRefDto;
  reviewed!: boolean;
  reviewedAt!: string | null;
  message!: ReportedMessageDto;
}
export class ConversationLineDto {
  id!: string;
  sender!: PersonRefDto;
  body!: string;
  hidden!: boolean;
  sentAt!: string;
  /** This is the message that was reported. */
  reported!: boolean;
}
export class ReportDetailDto extends ReportDto {
  /** The whole conversation, oldest first (the last 200 messages). */
  conversation!: ConversationLineDto[];
}
export class ReportListDto {
  items!: ReportDto[];
}

export class MessageAuditEntryDto {
  id!: string;
  at!: string;
  /** message.thread.start, message.send, message.hide, message.report, message.report.review or broadcast.send. */
  action!: string;
  actor!: PersonRefDto;
  /** The other person in the conversation (the parent when a teacher wrote, and the other way round). */
  to!: string | null;
  student!: string | null;
  /** The words, or for a class message its title. */
  title!: string | null;
  body!: string | null;
  note!: string | null;
}
export class MessageAuditPageDto {
  items!: MessageAuditEntryDto[];
  /** Pass as `offset` for the next page; null on the last page. */
  next!: number | null;
}
