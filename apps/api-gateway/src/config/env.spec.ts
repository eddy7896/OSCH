import { parseOrigins, validateEnv } from './env.js';

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

  it('rejects ports outside 1-65535', () => {
    expect(() => validateEnv({ PORT: '0' })).toThrow(/PORT/);
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/PORT/);
  });
});

describe('parseOrigins', () => {
  it('keeps bare http(s) origins and flags paths, wildcards and other schemes', () => {
    const r = parseOrigins('http://localhost:3001, https://a.example.com ,https://b.example.com/path,*,ftp://x.com,https://*.example.com');
    expect(r.origins).toEqual(['http://localhost:3001', 'https://a.example.com']);
    expect(r.invalid).toHaveLength(4);
  });
});
