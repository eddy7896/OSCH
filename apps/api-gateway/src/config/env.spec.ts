import { originAllowed, parseOrigins, r2AccountId, r2Config, validateEnv } from './env.js';

describe('validateEnv', () => {
  it('accepts an empty development environment and applies defaults', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.THROTTLE_LIMIT).toBe(120);
  });

  it('reads numeric values from strings', () => {
    expect(validateEnv({ PORT: '4100', THROTTLE_LIMIT: '5' })).toMatchObject({ PORT: 4100, THROTTLE_LIMIT: 5 });
  });

  it('reports EVERY problem in one error, by name', () => {
    let message = '';
    try {
      validateEnv({ PORT: 'abc', LOG_LEVEL: 'loud', NODE_ENV: 'staging', CORS_ORIGINS: 'not a url' });
    } catch (e) {
      message = (e as Error).message;
    }
    for (const name of ['PORT', 'LOG_LEVEL', 'NODE_ENV', 'CORS_ORIGINS']) expect(message).toContain(`${name}:`);
  });

  it('never prints a value, because values may be secrets', () => {
    let message = '';
    try {
      validateEnv({ PORT: 'hunter2-secret', LOG_LEVEL: 'hunter2-secret', CORS_ORIGINS: 'hunter2-secret' });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('PORT');
    expect(message).not.toContain('hunter2');
  });

  it('requires CORS origins and the Firebase project in production, not in development', () => {
    expect(() => validateEnv({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS[\s\S]*FIREBASE_PROJECT_ID/);
    expect(validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.com', FIREBASE_PROJECT_ID: 'p' }).NODE_ENV).toBe('production');
  });

  it('accepts an emulator host in development, rejects a bad shape, and refuses it in production', () => {
    expect(validateEnv({ DATA_CONNECT_EMULATOR_HOST: '127.0.0.1:9399' }).DATA_CONNECT_EMULATOR_HOST).toBe('127.0.0.1:9399');
    expect(() => validateEnv({ DATA_CONNECT_EMULATOR_HOST: 'http://127.0.0.1:9399' })).toThrow(/DATA_CONNECT_EMULATOR_HOST/);
    expect(() => validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: 'https://a.example.com', FIREBASE_PROJECT_ID: 'p', DATA_CONNECT_EMULATOR_HOST: '127.0.0.1:9399' })).toThrow(/must not be set in production/);
  });

  it('refuses the Auth emulator in production (it accepts forged tokens) and checks the host shape in development', () => {
    const prod = { NODE_ENV: 'production', CORS_ORIGINS: 'https://a.example.com', FIREBASE_PROJECT_ID: 'p' };
    expect(() => validateEnv({ ...prod, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' })).toThrow(/accepts forged tokens/);
    expect(validateEnv({ FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }).FIREBASE_AUTH_EMULATOR_HOST).toBe('127.0.0.1:9099');
    expect(() => validateEnv({ FIREBASE_AUTH_EMULATOR_HOST: 'http://127.0.0.1:9099' })).toThrow(/FIREBASE_AUTH_EMULATOR_HOST/);
  });

  it('AUTH_CHECK_REVOKED defaults to true and accepts only true or false', () => {
    expect(validateEnv({}).AUTH_CHECK_REVOKED).toBe(true);
    expect(validateEnv({ AUTH_CHECK_REVOKED: 'false' }).AUTH_CHECK_REVOKED).toBe(false);
    expect(() => validateEnv({ AUTH_CHECK_REVOKED: 'maybe' })).toThrow(/AUTH_CHECK_REVOKED/);
  });

  it('rejects ports outside 1-65535', () => {
    expect(() => validateEnv({ PORT: '0' })).toThrow(/PORT/);
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/PORT/);
  });
});

describe('parseOrigins', () => {
  it('keeps bare http(s) origins and flags paths, loose wildcards and other schemes', () => {
    const r = parseOrigins('http://localhost:3001, https://a.example.com ,https://b.example.com/path,*,ftp://x.com,https://*.com');
    expect(r.origins).toEqual(['http://localhost:3001', 'https://a.example.com']);
    expect(r.invalid).toHaveLength(4);
  });
});

describe('school wildcard origins', () => {
  const parse = (raw: string) => parseOrigins(raw);
  const allowed = (origin: string, raw: string) => { const { origins, patterns } = parse(raw); return originAllowed(origin, origins, patterns); };

  it('accepts scheme://*.domain[:port] and nothing looser', () => {
    expect(parse('https://*.oruschools.com,http://*.localhost:3002').invalid).toEqual([]);
    expect(parse('https://*.oruschools.com').patterns).toEqual([{ scheme: 'https:', suffix: 'oruschools.com' }]);
    for (const bad of ['https://*', 'https://*.com', 'https://school.*.com', 'https://*.*.com', 'https://a*.example.com', 'https://*.example.com/path', 'ftp://*.example.com', '*.example.com', 'https://*.exa mple.com', 'https://*.-bad.com']) expect(parse(bad).invalid, bad).toEqual([bad]);
  });

  it('matches exactly one label in front of the domain, with the same scheme and port', () => {
    const raw = 'https://*.oruschools.com';
    expect(allowed('https://greenfield.oruschools.com', raw)).toBe(true);
    expect(allowed('https://Green-Field2.oruschools.com', raw)).toBe(false); // origins arrive lower case from browsers; anything else is not trusted
    expect(allowed('https://oruschools.com', raw)).toBe(false); // the bare domain is not a school
    expect(allowed('https://a.b.oruschools.com', raw)).toBe(false);
    expect(allowed('http://greenfield.oruschools.com', raw)).toBe(false);
    expect(allowed('https://greenfield.oruschools.com:8443', raw)).toBe(false);
    expect(allowed('https://greenfield.oruschools.com.evil.com', raw)).toBe(false);
    expect(allowed('https://evil-oruschools.com', raw)).toBe(false);
    expect(allowed('https://greenfield.oruschools.com/', raw)).toBe(false); // not a bare origin
    expect(allowed('null', raw)).toBe(false);
  });

  it('keeps exact entries working beside patterns, and dev ports must match', () => {
    const raw = 'http://localhost:3001,http://*.localhost:3002';
    expect(allowed('http://localhost:3001', raw)).toBe(true);
    expect(allowed('http://greenfield.localhost:3002', raw)).toBe(true);
    expect(allowed('http://greenfield.localhost:3003', raw)).toBe(false);
    expect(allowed('http://localhost:3002', raw)).toBe(false);
  });

  it('production accepts patterns as the only origin but only over https', () => {
    expect(validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: 'https://*.oruschools.com', FIREBASE_PROJECT_ID: 'p' }).NODE_ENV).toBe('production');
    expect(() => validateEnv({ NODE_ENV: 'production', CORS_ORIGINS: 'http://*.oruschools.com', FIREBASE_PROJECT_ID: 'p' })).toThrow(/wildcard entries must be https/);
  });
});

describe('R2 storage settings', () => {
  const full = { R2_ACCOUNT_ID: 'a'.repeat(32), R2_ACCESS_KEY: 'k', R2_SECRET_KEY: 's', R2_BUCKET_NAME: 'b' };

  it('none set is fine (storage simply is not configured); all four is fine', () => {
    expect(r2Config(validateEnv({}))).toBeNull();
    expect(r2Config(validateEnv(full))).toEqual({ accountId: 'a'.repeat(32), accessKey: 'k', secretKey: 's', bucket: 'b', publicUrl: undefined });
  });

  it('a half-set group means storage is off in development (a template with empty keys must not stop the gateway), and is refused in production', () => {
    const half = { R2_ACCOUNT_ID: 'a'.repeat(32), R2_SECRET_KEY: 'topsecret', R2_ACCESS_KEY: '' };
    expect(r2Config(validateEnv(half))).toBeNull();
    const prod = { NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.com', FIREBASE_PROJECT_ID: 'p', ...half };
    expect(() => validateEnv(prod)).toThrow(/set all four or none/);
    try { validateEnv(prod); } catch (e) { expect(String(e)).not.toContain('topsecret'); }
  });

  it('accepts the account id or the endpoint address Cloudflare shows; anything else is refused', () => {
    const id = 'abcdef0123456789abcdef0123456789';
    expect(r2AccountId(id)).toBe(id);
    expect(r2AccountId(`https://${id}.r2.cloudflarestorage.com`)).toBe(id);
    expect(r2AccountId(` HTTPS://${id.toUpperCase()}.R2.CLOUDFLARESTORAGE.COM/ `)).toBe(id);
    for (const bad of ['', 'short', `${id}z`, `https://evil.com/${id}`, `https://${id}.evil.com`]) expect(r2AccountId(bad), bad).toBeUndefined();
    expect(() => validateEnv({ ...full, R2_ACCOUNT_ID: 'not-an-id' })).toThrow(/R2_ACCOUNT_ID: must be the 32-character account id/);
    expect(r2Config(validateEnv({ ...full, R2_ACCOUNT_ID: `https://${id}.r2.cloudflarestorage.com` }))?.accountId).toBe(id);
  });

  it('the public address must be http(s); a trailing slash is dropped', () => {
    expect(() => validateEnv({ ...full, R2_PUBLIC_URL: 'ftp://x' })).toThrow(/R2_PUBLIC_URL/);
    expect(r2Config(validateEnv({ ...full, R2_PUBLIC_URL: 'https://files.example.com/' }))?.publicUrl).toBe('https://files.example.com');
  });
});
