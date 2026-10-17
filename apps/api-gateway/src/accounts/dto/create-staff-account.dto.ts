import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ROLES } from '@oruschools/rbac';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Roles an admin may create an account for. Parents are not created here: they come in through admissions and guardian links. */
export const ACCOUNT_ROLES = ROLES.filter((r) => r !== 'PARENT');

export class CreateStaffAccountDto {
  @Transform(trim) @IsString() @Length(1, 120) displayName!: string;

  /** The role the person receives. */
  @IsString() @IsIn([...ACCOUNT_ROLES]) schoolRole!: string;

  /** Email sign-in: the person receives a one-time link to set their own password. At least one of email and phoneNumber is required. */
  @IsOptional() @Transform(lower) @IsEmail() @MaxLength(254) email?: string;

  /** Phone sign-in by one-time code, international format. No password exists for a phone-only account. */
  @IsOptional() @IsString() @Matches(/^\+[1-9][0-9]{6,14}$/) phoneNumber?: string;
}
