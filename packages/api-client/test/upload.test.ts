import { describe, expect, it, vi } from 'vitest';
import { ApiError, LOGO_MAX_BYTES, uploadSchoolLogo } from '../src/index.js';

const ticket = { uploadUrl: 'https://acct.r2.cloudflarestorage.com/bucket/schools/s/logo/x.png?X-Amz-Signature=abc', method: 'PUT' as const, headers: { 'Content-Type': 'image/png', 'Content-Length': '4' }, key: 'schools/s/logo/x.png', publicUrl: 'https://files.example/schools/s/logo/x.png', expiresInSeconds: 300 };
const png = (bytes = 4, type = 'image/png') => new Blob([new Uint8Array(bytes)], { type });
const setup = (put: () => Promise<Response> | Response = () => new Response(null, { status: 200 })) => {
  const api = { uploadsSchoolLogo: vi.fn(async () => ticket) };
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => put());
  return { api, fetchMock };
};

describe('uploadSchoolLogo', () => {
  it('asks the gateway for an address for exactly this type and size, then PUTs the file there', async () => {
    const { api, fetchMock } = setup();
    const file = png(4);
    const out = await uploadSchoolLogo(api, file, { fetch: fetchMock });
    expect(api.uploadsSchoolLogo).toHaveBeenCalledWith({ body: { contentType: 'image/png', sizeBytes: 4 } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ticket.uploadUrl);
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(file);
    expect(out).toEqual({ key: ticket.key, publicUrl: ticket.publicUrl });
  });

  it('sends only the signed content type to storage: no token, no school id, no other header', async () => {
    const { api, fetchMock } = setup();
    await uploadSchoolLogo(api, png(), { fetch: fetchMock });
    expect(fetchMock.mock.calls[0]![1]?.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it.each([
    ['an SVG', png(4, 'image/svg+xml')],
    ['a PDF', png(4, 'application/pdf')],
    ['no type', png(4, '')],
    ['an empty file', png(0)],
    ['a file over 2 MB', png(LOGO_MAX_BYTES + 1)],
  ])('%s is UPLOAD_INVALID and nothing is requested or sent', async (_n, file) => {
    const { api, fetchMock } = setup();
    await expect(uploadSchoolLogo(api, file, { fetch: fetchMock })).rejects.toMatchObject({ code: 'UPLOAD_INVALID' });
    expect(api.uploadsSchoolLogo).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('exactly 2 MB and each accepted type go through', async () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      const { api, fetchMock } = setup();
      await uploadSchoolLogo(api, png(LOGO_MAX_BYTES, type), { fetch: fetchMock });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("the gateway's refusal comes through untouched and nothing is sent to storage", async () => {
    const { fetchMock } = setup();
    const api = { uploadsSchoolLogo: vi.fn().mockRejectedValue(new ApiError('FORBIDDEN', 403, 'x')) };
    await expect(uploadSchoolLogo(api, png(), { fetch: fetchMock })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('storage refusing the file (an expired or mismatched signature) is UPLOAD_FAILED with its status', async () => {
    const { api, fetchMock } = setup(() => new Response('<Error/>', { status: 403 }));
    await expect(uploadSchoolLogo(api, png(), { fetch: fetchMock })).rejects.toMatchObject({ code: 'UPLOAD_FAILED', status: 403 });
  });

  it('a broken connection is NETWORK_ERROR, and the message never contains the signed address', async () => {
    const { api, fetchMock } = setup(() => Promise.reject(new TypeError('Failed to fetch https://x?X-Amz-Signature=abc')));
    const error = await uploadSchoolLogo(api, png(), { fetch: fetchMock }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(String((error as Error).message)).not.toContain('X-Amz-Signature');
  });

  it('gives up after the timeout', async () => {
    const { api } = setup();
    const never = vi.fn((_u: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))));
    await expect(uploadSchoolLogo(api, png(), { fetch: never, timeoutMs: 20 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
