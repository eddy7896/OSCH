import { ApiProperty } from '@nestjs/swagger';

export class MeUserDto {
  id!: string;
  email!: string;
  displayName!: string | null;
  /** SUPER_ADMIN only from the verified `globalRole` claim. */
  globalRole!: 'SUPER_ADMIN' | 'USER';
}

export class MeSchoolDto {
  id!: string;
  name!: string;
  subDomain!: string;
  defaultLanguage!: string;
  /** ACTIVE, TRIAL or SUSPENDED. */
  status!: string;
}

export class MeMembershipDto {
  school!: MeSchoolDto;
  /** One of the 14 school roles (packages/rbac). */
  role!: string;
  /** ACTIVE or SUSPENDED. */
  status!: string;
}

export class NavItemDto {
  key!: string;
  /** English fallback; clients translate from `key`. */
  label!: string;
}

export class NavSectionDto {
  title!: string;
  items!: NavItemDto[];
}

export class AccessDto {
  /** `permissions[resource][action]` is the widest scope granted (school, linked or own); absent means denied. UI hiding only: the gateway enforces. */
  @ApiProperty({ type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'string', enum: ['school', 'linked', 'own'] } } })
  permissions!: Record<string, Record<string, string>>;
  navigation!: NavSectionDto[];
}

export class ActiveSchoolDto extends AccessDto {
  schoolId!: string;
  role!: string;
}

export class MeLanguageDto {
  /** The user's own explicit choice, or null if they never chose. */
  chosen!: string | null;
  /** chosen, else the active school's default, else English. Never taken from the browser or device. */
  effective!: string;
}

export class MeResponseDto {
  user!: MeUserDto;
  memberships!: MeMembershipDto[];
  /** Set only when X-School-Id names a school the caller is an active member of (and the school is not suspended); otherwise null, with no hint why. */
  activeSchool!: ActiveSchoolDto | null;
  /** Set only for a SUPER_ADMIN: the platform-level access. */
  platform!: AccessDto | null;
  language!: MeLanguageDto;
}
