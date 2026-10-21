import { ApiError } from './api-error.js';
import type { Api } from './generated/api.gen.js';

/** What the gateway accepts for a school logo (see POST /v1/uploads/school-logo). Checked here too, so nothing is sent for a file that would be refused. */
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export interface UploadedFile {
  /** Where the file lives in the bucket, under the school's own prefix. */
  key: string;
  /** Its public address, or null when the deployment has none configured. */
  publicUrl: string | null;
}

export interface UploadOptions {
  /** For tests. Default: the global fetch. It is NOT the API transport: the file goes to storage with no credentials of ours. */
  fetch?: typeof fetch;
  /** Milliseconds before the upload is given up on. Default 60000. */
  timeoutMs?: number;
}

/**
 * Uploads a school logo straight to object storage: asks the gateway for a short-lived upload address, then sends the file
 * to it. The browser sends only the content type the address was signed for; no token and no school id go to storage.
 * Throws ApiError (`UPLOAD_INVALID` before anything is sent, `UPLOAD_FAILED` when storage refuses, or the gateway's own codes).
 */
export async function uploadSchoolLogo(api: Pick<Api, 'uploadsSchoolLogo'>, file: Blob, options: UploadOptions = {}): Promise<UploadedFile> {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type) || file.size < 1 || file.size > LOGO_MAX_BYTES) throw new ApiError('UPLOAD_INVALID', 0, 'Choose a PNG, JPEG or WebP image up to 2 MB.');

  const ticket = await api.uploadsSchoolLogo({ body: { contentType: file.type as (typeof LOGO_TYPES)[number], sizeBytes: file.size } });

  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  let response: Response;
  try {
    response = await doFetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': ticket.headers['Content-Type'] ?? file.type }, body: file, signal: controller.signal });
  } catch (cause) {
    throw new ApiError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR', 0, cause instanceof Error ? cause.name : 'The upload did not complete.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError('UPLOAD_FAILED', response.status, 'Storage did not accept the file.');
  return { key: ticket.key, publicUrl: ticket.publicUrl };
}
