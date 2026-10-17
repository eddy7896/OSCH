import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, Validate, ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';
import { LOCALES } from '@oruschools/i18n';
import { subdomainProblem } from '../subdomain.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const CODES = LOCALES.map((l) => l.code);

@ValidatorConstraint({ name: 'schoolSubdomain', async: false })
class SubdomainRule implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && subdomainProblem(value) === undefined;
  }
  defaultMessage() {
    return 'invalid or reserved subdomain';
  }
}

export class CreateSchoolDto {
  @Transform(trim) @IsString() @Length(2, 120) name!: string;

  /** The school's address: `<subDomain>.<platform domain>`. Lower case; reserved names are refused. */
  @Transform(trim) @IsString() @Validate(SubdomainRule) subDomain!: string;

  /** The school's default language (ADR-0006); each user may still choose their own. */
  @IsString() @IsIn(CODES) defaultLanguage!: string;
}
