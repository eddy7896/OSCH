// Pure helpers for the R2 tools (kept apart from the scripts so evals can test them without any network).
import { fileURLToPath } from "node:url";

/** The 32-character hex account id, from the bare id or the S3 endpoint address Cloudflare shows. */
export function accountIdFrom(raw) {
  const m = /^(?:https?:\/\/)?([a-f0-9]{32})(?:\.r2\.cloudflarestorage\.com)?\/?$/.exec(String(raw ?? "").trim().toLowerCase());
  return m?.[1];
}

/** Reads the master .env.local at the repo root without overriding variables that are already set. Missing file is fine. */
export function loadMasterEnv() {
  try {
    process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));
  } catch {
    /* no file */
  }
}

/** The R2 settings, or the NAMES (never the values) of what is missing or wrong. */
export function r2FromEnv(env) {
  const problems = [];
  const accountId = accountIdFrom(env.R2_ACCOUNT_ID);
  if (!env.R2_ACCOUNT_ID) problems.push("R2_ACCOUNT_ID is not set");
  else if (!accountId) problems.push("R2_ACCOUNT_ID is not a 32-character account id (or an https://<id>.r2.cloudflarestorage.com address)");
  for (const name of ["R2_ACCESS_KEY", "R2_SECRET_KEY", "R2_BUCKET_NAME"]) if (!env[name]) problems.push(`${name} is not set`);
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, config: { accountId, accessKey: env.R2_ACCESS_KEY, secretKey: env.R2_SECRET_KEY, bucket: env.R2_BUCKET_NAME, publicUrl: env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "") || undefined } };
}

/**
 * The bucket's CORS rules: a browser may PUT a logo straight to the bucket (from the apps' own addresses only) and read it
 * back. Origins come from CORS_ORIGINS, the same list the gateway uses; `https://*.domain` entries carry over (S3 CORS allows
 * one wildcard in an origin). Nothing else (no DELETE, no wildcard origin) is ever allowed.
 */
export function corsRules(corsOrigins) {
  const origins = [...new Set(String(corsOrigins ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (origins.length === 0) throw new Error("CORS_ORIGINS is empty: the bucket would allow no browser at all");
  for (const o of origins) if (o === "*" || !/^https?:\/\/(\*\.)?[^\s/*]+$/.test(o)) throw new Error(`CORS_ORIGINS has an entry that cannot be a bucket origin: ${o.replace(/[^\w:/.*-]/g, "?")}`);
  return [{ AllowedOrigins: origins, AllowedMethods: ["PUT", "GET", "HEAD"], AllowedHeaders: ["content-type"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }];
}

/** True when two rule lists are the same, so applying them again changes nothing. */
export const sameRules = (a, b) => JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
const normalise = (rules) => (rules ?? []).map((r) => ({ o: [...(r.AllowedOrigins ?? [])].sort(), m: [...(r.AllowedMethods ?? [])].sort(), h: [...(r.AllowedHeaders ?? [])].map((x) => x.toLowerCase()).sort(), e: [...(r.ExposeHeaders ?? [])].sort(), a: r.MaxAgeSeconds ?? null }));

/** A valid 1x1 PNG (70 bytes) for the smoke test. */
export const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

export const endpointFor = (accountId) => `https://${accountId}.r2.cloudflarestorage.com`;
