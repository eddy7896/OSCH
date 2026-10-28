import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PARENT_RELATIONSHIPS = ['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'] as const;

export class StaffIdParamDto {
  @IsString() @Matches(UUID) staffId!: string;
}
export class StaffSubjectParamDto {
  @IsString() @Matches(UUID) staffId!: string;
  @IsString() @Matches(UUID) subjectId!: string;
}
export class ClassIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StudentIdParamDto {
  @IsString() @Matches(UUID) id!: string;
}
export class StudentLinkParamDto {
  @IsString() @Matches(UUID) id!: string;
  @IsString() @Matches(UUID) linkId!: string;
}

export class TeachesSubjectDto {
  @IsString() @Matches(UUID) subjectId!: string;
}
export class SetClassTeacherDto {
  @IsString() @Matches(UUID) staffId!: string;
  /** Defaults to the active academic year. */
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class ClassTeacherQueryDto {
  @IsOptional() @Matches(UUID) academicYearId?: string;
}
export class LinkParentDto {
  /** The parent's sign-in account: an active member of this school with the PARENT role. */
  @IsString() @Matches(/^[A-Za-z0-9_-]{1,128}$/) userId!: string;
  @IsIn([...PARENT_RELATIONSHIPS]) relationship!: string;
}

export class RefDto {
  id!: string;
  name!: string;
}
export class StaffRefDto {
  id!: string;
  employeeId!: string;
  name!: string;
}
export class SubjectRefDto {
  id!: string;
  name!: string;
  code!: string;
}
export class TeacherStaffDto extends StaffRefDto {
  hasAccount!: boolean;
}
export class TeacherDto {
  staff!: TeacherStaffDto;
  subjects!: SubjectRefDto[];
  /** Classes this person is class teacher of in the active year. */
  classes!: RefDto[];
}
export class TeacherListDto {
  items!: TeacherDto[];
}
export class ChildDto {
  id!: string;
  enrollmentId!: string;
  name!: string;
  relationship!: string;
  /** The class in the active year, or null. */
  class!: RefDto | null;
}
/** Who the caller is in this school, as far as teaching goes: what the `own` and `linked` scopes resolve to. */
export class MineDto {
  /** The staff record linked to the caller's account, or null. */
  staff!: StaffRefDto | null;
  subjects!: SubjectRefDto[];
  classes!: RefDto[];
  /** The classes the caller is class teacher of this year: the only classes whose daily attendance they take. */
  classTeacherOf!: RefDto[];
  /** Children linked to the caller's account (a parent). */
  children!: ChildDto[];
}
export class ParentLinkDto {
  id!: string;
  relationship!: string;
  user!: { id: string; name: string };
}
export class ParentLinkListDto {
  items!: ParentLinkDto[];
}
