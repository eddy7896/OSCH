import { IsIn, IsInt, Max, Min } from 'class-validator';

/** What may be uploaded as a school logo. The gateway signs exactly this type and this size into the upload address. */
export const LOGO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export class SchoolLogoUploadDto {
  @IsIn(Object.keys(LOGO_TYPES)) contentType!: keyof typeof LOGO_TYPES;

  /** The exact size of the file in bytes. The upload address only accepts a body of exactly this length. */
  @IsInt() @Min(1) @Max(LOGO_MAX_BYTES) sizeBytes!: number;
}

export class UploadTicketDto {
  /** Where to send the file (HTTP PUT). Valid for `expiresInSeconds`. */
  uploadUrl!: string;
  method!: 'PUT';
  /** Send these headers exactly with the PUT; they are part of the signature. */
  headers!: Record<string, string>;
  /** Where the file will live in the bucket. Always under this school's own prefix. */
  key!: string;
  /** The public address of the file once uploaded, or null if no public address is configured. */
  publicUrl!: string | null;
  expiresInSeconds!: number;
}
