import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ROLES } from '@oruschools/rbac';

/** A Firebase uid: letters, digits, '-' and '_'. */
const UID = /^[A-Za-z0-9_-]+$/;

export class UserIdParamDto {
  @IsString() @Length(1, 128) @Matches(UID) userId!: string;
}

export class AddMembershipDto {
  /** The Firebase uid of a user who already has an account. To bring in someone new, use an invitation. */
  @IsString() @Length(1, 128) @Matches(UID) userId!: string;
  @IsString() @IsIn([...ROLES]) schoolRole!: string;
}

/** At least one field (checked by the service). */
export class UpdateMembershipDto {
  @IsOptional() @IsString() @IsIn([...ROLES]) schoolRole?: string;
  @IsOptional() @IsString() @IsIn(['ACTIVE', 'SUSPENDED']) status?: string;
}
