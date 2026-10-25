import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export const TOMBSTONE_TYPES = ['TimetableEntry', 'Substitution', 'AttendanceMark', 'Mark'] as const;

export class TombstoneQueryDto {
  /** Only removals after this moment (ISO 8601, exclusive). Start from the `next` of the last page. */
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/) since!: string;
  @IsOptional() @IsIn([...TOMBSTONE_TYPES]) entityType?: string;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value)) @IsInt() @Min(1) @Max(1000) limit?: number;
}

export class TombstoneDto {
  id!: string;
  entityType!: string;
  entityId!: string;
  classId!: string | null;
  staffId!: string | null;
  deletedAt!: string;
}
export class TombstoneListDto {
  items!: TombstoneDto[];
  /** Pass this as `since` for the next page. Equal to the request's `since` when nothing is new. */
  next!: string;
  /** More removals are waiting after `next`. */
  more!: boolean;
}
