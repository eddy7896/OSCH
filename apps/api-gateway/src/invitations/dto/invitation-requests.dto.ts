import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ROLES } from '@oruschools/rbac';
import { INVITATION_TOKEN } from '../token.js';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class CreateInvitationDto {
  /** Who the invitation is for. Whoever accepts must sign in with this verified email address. */
  @Transform(lower) @IsEmail() @MaxLength(254) email!: string;
  /** Optional contact number in international format; informational only in Phase 1. */
  @IsOptional() @IsString() @Matches(/^\+[1-9][0-9]{6,14}$/) phoneNumber?: string;
  /** The role the person receives on acceptance. It is fixed here and cannot be changed by whoever accepts. */
  @IsString() @IsIn([...ROLES]) schoolRole!: string;
  /** Valid for this many days (default 7). */
  @IsOptional() @IsInt() @Min(1) @Max(30) expiresInDays?: number;
}

export class InvitationIdParamDto {
  @IsString() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) id!: string;
}

export class AcceptInvitationDto {
  /** The secret from the invitation link. */
  @IsString() @Matches(INVITATION_TOKEN) token!: string;
}
