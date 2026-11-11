import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const BROADCAST_BODY_MAX = 2000;

export class BroadcastParamDto {
  @IsString() @Matches(UUID) id!: string;
}
/** The recipients are worked out on the server from the class's students and their linked parents; nothing about them is taken from here. */
export class CreateBroadcastDto {
  @IsString() @Matches(UUID) classId!: string;
  /** The device's own id, so sending it twice is one broadcast. */
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,64}$/) clientId!: string;
  @Transform(trim) @IsString() @Length(1, 120) title!: string;
  @Transform(trim) @IsString() @Length(1, BROADCAST_BODY_MAX) body!: string;
}

export class BroadcastDto {
  id!: string;
  title!: string;
  body!: string;
  class!: { id: string; name: string };
  sender!: { userId: string; name: string };
  sentAt!: string;
}
export class BroadcastStudentDto {
  id!: string;
  name!: string;
}
export class BroadcastStatsDto {
  /** Students in the class when it was sent. */
  targetStudents!: number;
  /** Students with at least one parent account reached. */
  reachedStudents!: number;
  /** Students with no parent account: the teacher should call them. */
  unreachable!: BroadcastStudentDto[];
  /** Parent accounts reached, and how many of them have opened it. */
  parents!: number;
  readBy!: number;
}
/** One broadcast. A parent gets `students` and `read` (their own children in the class, and whether they opened it); the sender and the school get `stats` on a single broadcast (not in lists). */
export class BroadcastDetailDto extends BroadcastDto {
  /** A parent's own children in the class; empty for the sender. */
  students!: BroadcastStudentDto[];
  read!: boolean | null;
  stats!: BroadcastStatsDto | null;
}
export class BroadcastListDto {
  items!: BroadcastDetailDto[];
}
