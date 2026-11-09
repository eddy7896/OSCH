import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** The most a message may hold. */
export const MESSAGE_MAX = 1000;

export class ThreadParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class MessageParamDto extends ThreadParamDto {
  @IsString() @Matches(UUID) messageId!: string;
}
export class ContactsQueryDto {
  @IsString() @Matches(UUID) studentId!: string;
}
export class StartThreadDto {
  @IsString() @Matches(UUID) studentId!: string;
  /** The other person: for a parent the teacher's user id, for a teacher the parent's user id (both come from `/messages/contacts`). */
  @IsString() @Length(1, 128) otherUserId!: string;
}
export class SendMessageDto {
  /** The device's own id for the message, so sending it twice is one message. */
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) clientId!: string;
  @Transform(trim) @IsString() @Length(1, MESSAGE_MAX) body!: string;
}
export class ReportMessageDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) note?: string;
}

export class ContactDto {
  userId!: string;
  name!: string;
  /** For a teacher: "CLASS_TEACHER" or "TEACHER"; for a parent: the relationship (MOTHER, FATHER, GUARDIAN, OTHER). */
  label!: string;
  /** The subjects a teacher teaches this class (empty for a class teacher who teaches none, and for a parent). */
  subjects!: string[];
}
export class ContactListDto {
  items!: ContactDto[];
}
export class ThreadDto {
  id!: string;
  student!: { id: string; name: string };
  other!: { userId: string; kind: 'PARENT' | 'TEACHER'; name: string };
  lastMessageAt!: string | null;
  /** The other person spoke last and you have not opened the conversation since. */
  unread!: boolean;
}
export class ThreadListDto {
  items!: ThreadDto[];
}
export class MessageDto {
  id!: string;
  mine!: boolean;
  /** Null once the sender hid it. */
  body!: string | null;
  hidden!: boolean;
  /** True while the sender may still hide it (decided by the server's clock when this was sent). */
  canHide!: boolean;
  createdAt!: string;
}
export class ThreadDetailDto extends ThreadDto {
  /** Oldest first. */
  messages!: MessageDto[];
}
