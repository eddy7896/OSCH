import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { LOCALES } from '@oruschools/i18n';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const CODES = LOCALES.map((l) => l.code);

/** Both optional, at least one required (checked by the service). The subdomain is deliberately not editable: it is the school's address. */
export class UpdateSchoolDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @IsIn(CODES) defaultLanguage?: string;
}
