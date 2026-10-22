import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { LOCALES } from '@oruschools/i18n';
import { HEX_COLOR } from '../brand.js';

const CODES = LOCALES.map((l) => l.code);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SchoolProfileDto {
  id!: string;
  name!: string;
  subDomain!: string;
  defaultLanguage!: string;
  currency!: string;
  locale!: string;
  address!: string | null;
  contactPhone!: string | null;
  contactEmail!: string | null;
  /** #RRGGBB, or null for the OruSchools default. */
  primaryColor!: string | null;
  /** Bucket key of the logo, or null. */
  logoKey!: string | null;
  activeAcademicYear!: { id: string; name: string } | null;
}

/** Only the fields sent are changed (at least one). */
export class UpdateSchoolProfileDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 120) name?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(1, 500) address?: string;
  @IsOptional() @Matches(/^\+[1-9][0-9]{6,14}$/) contactPhone?: string;
  @IsOptional() @Transform(trim) @IsEmail() @MaxLength(254) contactEmail?: string;
  /** #RRGGBB with enough contrast for white text (4.5:1). */
  @IsOptional() @Matches(HEX_COLOR) primaryColor?: string;
  @IsOptional() @IsIn(CODES) defaultLanguage?: string;
}

export class SetSchoolLogoDto {
  /** The `key` from an upload ticket. It must be under this school's own logo prefix. */
  @IsString() @MaxLength(300) key!: string;
}
