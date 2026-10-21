import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { TenantContext } from '../tenant/tenant.decorators.js';
import { LOGO_TYPES, type SchoolLogoUploadDto, type UploadTicketDto } from './dto/school-logo-upload.dto.js';

/** Injection token for the signer (tests replace it; production signs locally with the R2 keys, no network). */
export const UPLOAD_SIGNER = Symbol('UPLOAD_SIGNER');
export interface UploadSigner {
  /** A PUT address that only accepts exactly this content type and length until it expires. */
  presignPut(input: { key: string; contentType: string; contentLength: number; expiresInSeconds: number }): Promise<string>;
  /** Public base address of the bucket, no trailing slash. */
  readonly publicUrl: string | null;
}

export const UPLOAD_TTL_SECONDS = 300;

/**
 * Time-limited upload addresses for Cloudflare R2. The gateway never touches the file: the browser sends it straight to R2.
 * The object key is built here from the VERIFIED school and a random name; nothing from the request chooses the path, so one
 * school can never write into another's prefix. The address is signed for one content type and one exact length.
 */
@Injectable()
export class UploadsService {
  constructor(@Inject(UPLOAD_SIGNER) private readonly signer: UploadSigner | null) {}

  async schoolLogo(tenant: TenantContext, dto: SchoolLogoUploadDto): Promise<UploadTicketDto> {
    if (!this.signer) throw new ApiException(ErrorCode.UPSTREAM_UNAVAILABLE, 503); // storage is not configured on this deployment
    const key = `schools/${tenant.schoolId}/logo/${randomUUID()}.${LOGO_TYPES[dto.contentType]}`;
    const uploadUrl = await this.signer.presignPut({ key, contentType: dto.contentType, contentLength: dto.sizeBytes, expiresInSeconds: UPLOAD_TTL_SECONDS });
    return {
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': dto.contentType, 'Content-Length': String(dto.sizeBytes) },
      key,
      publicUrl: this.signer.publicUrl ? `${this.signer.publicUrl}/${key}` : null,
      expiresInSeconds: UPLOAD_TTL_SECONDS,
    };
  }
}
