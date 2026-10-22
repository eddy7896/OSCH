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

  /** Requests per window for routes marked @Strict() (invitation acceptance), per signed-in user. */
  @Transform(({ value }) => (value === undefined || value === '' ? 10 : Number(value)))
  @IsInt()
  @Min(1)
  THROTTLE_STRICT_LIMIT: number = 10;

  /** Requests per window per signed-in user per route (THROTTLE_LIMIT is the per-IP limit). */
  @Transform(({ value }) => (value === undefined || value === '' ? 240 : Number(value)))
  @IsInt()
  @Min(1)
  THROTTLE_USER_LIMIT: number = 240;

  @Transform(({ value }) => (value === undefined || value === '' ? 120 : Number(value)))
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;

  /** Cloudflare R2 (S3 compatible), used only to hand out time-limited upload URLs. All four of the first group, or none. */
  @IsOptional() @IsString() R2_ACCOUNT_ID?: string;
  @IsOptional() @IsString() R2_ACCESS_KEY?: string;
  @IsOptional() @IsString() R2_SECRET_KEY?: string;
  @IsOptional() @IsString() R2_BUCKET_NAME?: string;
  /** Public base address of the bucket (a custom domain or r2.dev), used to form the address of an uploaded file. */
  @IsOptional() @IsString() R2_PUBLIC_URL?: string;
  /** The PRIVATE bucket for student photos and documents: no public address, read only through short-lived signed addresses. Uses the same account and keys, so the API token must cover this bucket too. */
  @IsOptional() @IsString() R2_PRIVATE_BUCKET_NAME?: string;
}

export interface R2Config {
  accountId: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  /** No trailing slash; undefined when not configured. */
  publicUrl?: string;
}

/**
 * The 32-character hex account id, from either the bare id or the S3 endpoint address Cloudflare shows
 * (`https://<id>.r2.cloudflarestorage.com`), so pasting the wrong one of the two still works.
 */
export function r2AccountId(raw: string | undefined): string | undefined {
  const value = (raw ?? '').trim().toLowerCase();
  const m = /^(?:https?:\/\/)?([a-f0-9]{32})(?:\.r2\.cloudflarestorage\.com)?\/?$/.exec(value);
  return m?.[1];
}

/** The R2 settings, or null when none are set. (validateEnv has already refused a half-set or malformed group.) */
export function r2Config(env: Pick<Env, 'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY' | 'R2_SECRET_KEY' | 'R2_BUCKET_NAME' | 'R2_PUBLIC_URL'>): R2Config | null {
  const accountId = r2AccountId(env.R2_ACCOUNT_ID);
  if (!accountId || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY || !env.R2_BUCKET_NAME) return null;
  return { accountId, accessKey: env.R2_ACCESS_KEY, secretKey: env.R2_SECRET_KEY, bucket: env.R2_BUCKET_NAME, publicUrl: env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '') || undefined };
}

/** A school's own address: `https://*.example.com` allows `https://greenfield.example.com` but not `https://a.b.example.com` or the bare domain. */
export interface OriginPattern {
  scheme: 'http:' | 'https:';
  /** Everything after `*.`, host and optional port, lower case. */
  suffix: string;
}

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Wildcards are only for the leftmost label, and never for a bare public suffix like `*.com` (the suffix needs a dot, or is `localhost`). */
function parsePattern(item: string): OriginPattern | undefined {
  const m = /^(https?:)\/\/\*\.([^/*]+)$/.exec(item);
  if (!m) return undefined;
  const [, scheme, suffix] = m as unknown as ['', 'http:' | 'https:', string];
  const host = suffix.replace(/:\d{1,5}$/, '');
  if (!host.split('.').every((l) => LABEL.test(l))) return undefined;
  if (!host.includes('.') && host !== 'localhost') return undefined;
  return { scheme, suffix: suffix.toLowerCase() };
}

/** Origins must be bare http(s) origins; a wildcard is allowed only as `scheme://*.domain[:port]` (one label deep). */
export function parseOrigins(raw: string): { origins: string[]; patterns: OriginPattern[]; invalid: string[] } {
  const origins: string[] = [];
  const patterns: OriginPattern[] = [];
  const invalid: string[] = [];
  for (const item of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (item.includes('*')) {
      const pattern = parsePattern(item);
      if (pattern) patterns.push(pattern);
      else invalid.push(item);
      continue;
    }
    try {
      const u = new URL(item);
      if ((u.protocol === 'http:' || u.protocol === 'https:') && u.origin === item) origins.push(item);
      else invalid.push(item);
    } catch {
      invalid.push(item);
    }
  }
  return { origins, patterns, invalid };
}

/** True if the browser origin is listed exactly, or is exactly one label in front of a wildcard entry's domain. */
export function originAllowed(origin: string, origins: readonly string[], patterns: readonly OriginPattern[]): boolean {
  if (origins.includes(origin)) return true;
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.origin !== origin) return false;
  return patterns.some((p) => {
    if (u.protocol !== p.scheme) return false;
    const host = u.host.toLowerCase();
    if (!host.endsWith(`.${p.suffix}`)) return false;
    return LABEL.test(host.slice(0, host.length - p.suffix.length - 1));
  });
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
  const { origins, patterns, invalid } = parseOrigins(env.CORS_ORIGINS ?? '');
  if (invalid.length > 0) problems.push(`CORS_ORIGINS: ${invalid.length} entr${invalid.length === 1 ? 'y is' : 'ies are'} not a bare http(s) origin such as https://app.example.com (or a school wildcard such as https://*.example.com)`);
  const r2Set = [env.R2_ACCOUNT_ID, env.R2_ACCESS_KEY, env.R2_SECRET_KEY, env.R2_BUCKET_NAME].filter((v) => v !== undefined && v !== '');
  // A half-filled group (for example a developer's template with empty keys) just means storage is off: uploads answer 503.
  // In production it is a mistake worth refusing to start for.
  if (env.NODE_ENV === 'production' && r2Set.length > 0 && r2Set.length < 4) problems.push('R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME: set all four or none');
  else if (r2Set.length === 4 && !r2AccountId(env.R2_ACCOUNT_ID)) problems.push('R2_ACCOUNT_ID: must be the 32-character account id (or the https://<id>.r2.cloudflarestorage.com address)');
  if (env.R2_PUBLIC_URL && !/^https?:\/\/[^\s/]+(\/\S*)?$/.test(env.R2_PUBLIC_URL.trim())) problems.push('R2_PUBLIC_URL: must be an http(s) address');
  if (env.NODE_ENV === 'production') {
    if (origins.length + patterns.length === 0) problems.push('CORS_ORIGINS: must list at least one origin in production');
    if (patterns.some((p) => p.scheme !== 'https:')) problems.push('CORS_ORIGINS: wildcard entries must be https in production');
    if (!env.FIREBASE_PROJECT_ID) problems.push('FIREBASE_PROJECT_ID: required in production');
    if (env.FIREBASE_AUTH_EMULATOR_HOST) problems.push('FIREBASE_AUTH_EMULATOR_HOST: must not be set in production (the Auth emulator accepts forged tokens)');
    if (env.DATA_CONNECT_EMULATOR_HOST) problems.push('DATA_CONNECT_EMULATOR_HOST: must not be set in production (it would send real data to an emulator)');
  }
  if (problems.length > 0) throw new Error(`Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  return env;
}
