import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { CATEGORIES } from '../notification-rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class ListQueryDto {
  /** `true` shows only what you have not read. */
  @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean() unread?: boolean;
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value)) @IsInt() @Min(1) @Max(200) limit?: number;
}
export class CategoryParamDto {
  @IsIn([...CATEGORIES]) category!: string;
}
export class PreferenceDto {
  /** False hides that category from your inbox (the notifications are kept). */
  @IsBoolean() enabled!: boolean;
}

export class NotificationDto {
  id!: string;
  kind!: string;
  category!: string;
  title!: string;
  body!: string;
  createdAt!: string;
  read!: boolean;
  entityType!: string | null;
  entityId!: string | null;
}
export class NotificationListDto {
  /** Unread among the latest 200, after your preferences. */
  unreadCount!: number;
  items!: NotificationDto[];
}
export class PreferenceItemDto {
  category!: string;
  enabled!: boolean;
}
export class PreferenceListDto {
  items!: PreferenceItemDto[];
}
export class ReadAllDto {
  marked!: number;
}
