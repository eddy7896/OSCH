import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Every environment variable the gateway reads. No other code touches process.env (see documentation/environment.md). */
export class Env {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Transform(({ value }) => (value === undefined || value === '' ? 3000 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsIn(LOG_LEVELS)
  LOG_LEVEL: (typeof LOG_LEVELS)[number] = 'info';

  /** Comma separated list of browser origins allowed to call the API (exact match). */
  @IsString()
  CORS_ORIGINS: string = '';

  @IsOptional()
  @IsString()
  @MinLength(1)
  FIREBASE_PROJECT_ID?: string;

  /** Local development only: host:port of the Data Connect emulator (no scheme). Refused in production. */
  @IsOptional()
  @Matches(/^[\w.-]+:\d{1,5}$/, { message: 'DATA_CONNECT_EMULATOR_HOST must look like host:port (no scheme)' })
  DATA_CONNECT_EMULATOR_HOST?: string;

  /**
   * Local development only: host:port of the Firebase Auth emulator. With it set the Admin SDK does NOT verify token
   * signatures (verified on 2026-10-15: an unsigned alg=none token naming an existing uid, with a forged
   * globalRole=SUPER_ADMIN claim, was accepted). Therefore refused in production.
   */
  @IsOptional()
  @Matches(/^[\w.-]+:\d{1,5}$/, { message: 'FIREBASE_AUTH_EMULATOR_HOST must look like host:port (no scheme)' })
  FIREBASE_AUTH_EMULATOR_HOST?: string;

  /** Also reject tokens of disabled users and tokens issued before a revocation (one extra Firebase lookup per request). */
  @Transform(({ value }) => (value === undefined || value === '' ? true : value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  AUTH_CHECK_REVOKED: boolean = true;

  /** How long an ALLOW decision (active member of an active school) may be reused. 0 turns the cache off. Denials are never cached. */
  @Transform(({ value }) => (value === undefined || value === '' ? 30_000 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(300_000)
  TENANT_CACHE_TTL_MS: number = 30_000;

  @Transform(({ value }) => (value === undefined || value === '' ? 60_000 : Number(value)))
  @IsInt()
  @Min(1)
  THROTTLE_TTL_MS: number = 60_000;

  @Transform(({ value }) => (value === undefined || value === '' ? 120 : Number(value)))
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;
}

/** Origins must be bare http(s) origins; a path or wildcard would silently never match. */
export function parseOrigins(raw: string): { origins: string[]; invalid: string[] } {
  const origins: string[] = [];
  const invalid: string[] = [];
  for (const item of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      const u = new URL(item);
      if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin === item && !item.includes('*')) origins.push(item);
      else invalid.push(item);
    } catch {
      invalid.push(item);
    }
  }
  return { origins, invalid };
}

/**
 * Validates the raw environment once at boot. Throws one error listing EVERY problem by variable name only:
 * values are never included, because they may be secrets.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: false, exposeDefaultValues: true });
  const problems = validateSync(env, { whitelist: false, forbidUnknownValues: false }).map(
    (e) => `${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
  );
  const { origins, invalid } = parseOrigins(env.CORS_ORIGINS ?? '');
  if (invalid.length > 0) problems.push(`CORS_ORIGINS: ${invalid.length} entr${invalid.length === 1 ? 'y is' : 'ies are'} not a bare http(s) origin such as https://app.example.com`);
  if (env.NODE_ENV === 'production') {
    if (origins.length === 0) problems.push('CORS_ORIGINS: must list at least one origin in production');
    if (!env.FIREBASE_PROJECT_ID) problems.push('FIREBASE_PROJECT_ID: required in production');
    if (env.FIREBASE_AUTH_EMULATOR_HOST) problems.push('FIREBASE_AUTH_EMULATOR_HOST: must not be set in production (the Auth emulator accepts forged tokens)');
    if (env.DATA_CONNECT_EMULATOR_HOST) problems.push('DATA_CONNECT_EMULATOR_HOST: must not be set in production (it would send real data to an emulator)');
  }
  if (problems.length > 0) throw new Error(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  return env;
}
