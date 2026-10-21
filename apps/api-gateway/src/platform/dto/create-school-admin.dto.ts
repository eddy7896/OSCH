import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** The person who will administer a new school. The role is not a field: it is always System Admin. */
export class CreateSchoolAdminDto {
  @Transform(trim) @IsString() @Length(1, 120) displayName!: string;

  /** Email sign-in: the person receives a one-time link to set their own password. At least one of email and phoneNumber is required. */
  @IsOptional() @Transform(lower) @IsEmail() @MaxLength(254) email?: string;

  /** Phone sign-in by one-time code, international format. */
  @IsOptional() @IsString() @Matches(/^\+[1-9][0-9]{6,14}$/) phoneNumber?: string;
}
