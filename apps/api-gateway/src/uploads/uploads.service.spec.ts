import { UploadsService, type UploadSigner } from './uploads.service.js';
import { createR2Signer } from './r2-signer.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const tenant = { schoolId: SCHOOL, userId: 'admin-1', schoolRole: 'SYSTEM_ADMIN' } as const;

function fakeSigner(publicUrl: string | null = 'https://files.example.com') {
  const calls: any[] = [];
  const signer: UploadSigner = { publicUrl, presignPut: async (i) => { calls.push(i); return `https://signed.example/${i.key}`; } };
  return { signer, calls };
}

describe('UploadsService.schoolLogo', () => {
  it('builds the key from the verified school and a random name, never from anything the caller sends', async () => {
    const { signer, calls } = fakeSigner();
    const svc = new UploadsService(signer);
    const a = await svc.schoolLogo(tenant, { contentType: 'image/png', sizeBytes: 1000 });
    const b = await svc.schoolLogo(tenant, { contentType: 'image/png', sizeBytes: 1000 });
    expect(a.key).toMatch(new RegExp(`^schools/${SCHOOL}/logo/[0-9a-f-]{36}\\.png$`));
    expect(a.key).not.toBe(b.key);
    expect(calls[0]).toMatchObject({ key: a.key, contentType: 'image/png', contentLength: 1000, expiresInSeconds: 300 });
  });

  it('another school gets another prefix', async () => {
    const { signer } = fakeSigner();
    const out = await new UploadsService(signer).schoolLogo({ ...tenant, schoolId: '22222222-2222-4222-8222-222222222222' }, { contentType: 'image/webp', sizeBytes: 5 });
    expect(out.key.startsWith('schools/22222222-2222-4222-8222-222222222222/')).toBe(true);
    expect(out.key.endsWith('.webp')).toBe(true);
  });

  it('tells the browser exactly what to send, and where the file will be public', async () => {
    const out = await new UploadsService(fakeSigner().signer).schoolLogo(tenant, { contentType: 'image/jpeg', sizeBytes: 2048 });
    expect(out).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '2048' }, expiresInSeconds: 300 });
    expect(out.publicUrl).toBe(`https://files.example.com/${out.key}`);
    expect(out.uploadUrl).toContain(out.key);
  });

  it('no public address configured: publicUrl is null', async () => {
    expect((await new UploadsService(fakeSigner(null).signer).schoolLogo(tenant, { contentType: 'image/png', sizeBytes: 1 })).publicUrl).toBeNull();
  });

  it('storage not configured: 503 service unavailable, and nothing is signed', async () => {
    await expect(new UploadsService(null).schoolLogo(tenant, { contentType: 'image/png', sizeBytes: 1 })).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});

describe('createR2Signer (signs locally, no network)', () => {
  const signer = createR2Signer({ accountId: 'a'.repeat(32), accessKey: 'AKIDEXAMPLE', secretKey: 'super-secret-key-value', bucket: 'my-bucket', publicUrl: 'https://files.example.com' });

  it('is an address on the account endpoint for the bucket and key, valid 300 seconds', async () => {
    const url = new URL(await signer.presignPut({ key: 'schools/s1/logo/x.png', contentType: 'image/png', contentLength: 1234, expiresInSeconds: 300 }));
    expect(url.hostname.endsWith(`${'a'.repeat(32)}.r2.cloudflarestorage.com`)).toBe(true);
    expect(`${url.hostname}${url.pathname}`).toContain('my-bucket');
    expect(url.pathname).toContain('schools/s1/logo/x.png');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.protocol).toBe('https:');
  });

  it('signs the content type and the exact length, so R2 refuses any other body', async () => {
    const url = new URL(await signer.presignPut({ key: 'k.png', contentType: 'image/png', contentLength: 1234, expiresInSeconds: 300 }));
    const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';');
    expect(signed).toEqual(expect.arrayContaining(['content-length', 'content-type', 'host']));
  });

  it('never contains the secret key, and a different length or type gives a different signature', async () => {
    const a = await signer.presignPut({ key: 'k.png', contentType: 'image/png', contentLength: 10, expiresInSeconds: 300 });
    const b = await signer.presignPut({ key: 'k.png', contentType: 'image/png', contentLength: 11, expiresInSeconds: 300 });
    const c = await signer.presignPut({ key: 'k.png', contentType: 'image/webp', contentLength: 10, expiresInSeconds: 300 });
    expect(a).not.toContain('super-secret-key-value');
    const sig = (u: string) => new URL(u).searchParams.get('X-Amz-Signature');
    expect(new Set([sig(a), sig(b), sig(c)]).size).toBe(3);
  });
});
