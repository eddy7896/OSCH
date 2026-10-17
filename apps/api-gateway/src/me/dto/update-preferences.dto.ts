import { IsIn, IsString, ValidateIf } from 'class-validator';
import { LOCALES } from '@oruschools/i18n';

const CODES = LOCALES.map((l) => l.code);

export class UpdatePreferencesDto {
  /** The user's own language choice (ADR-0006: explicit, never auto-detected). `null` clears it, so the school default applies. */
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @IsIn(CODES)
  language!: string | null;
}
