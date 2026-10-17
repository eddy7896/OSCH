import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SchoolStatusDto {
  /** Why, for the audit trail. Free text written by the platform administrator; never shown to the school. */
  @IsOptional() @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(500) reason?: string;
}
