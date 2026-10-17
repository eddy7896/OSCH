// Pure helpers for tools/bootstrap-super-admin.mjs (unit-tested in evals/bootstrap-super-admin.test.mjs).
export const CLAIM = "globalRole";
export const SUPER_ADMIN = "SUPER_ADMIN";

/** Parses `--email x --project y [--apply] [--revoke]`. Throws a readable error; never guesses a default project. */
export function parseArgs(argv) {
  const out = { apply: false, revoke: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--revoke") out.revoke = true;
    else if (a === "--email" || a === "--project") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} needs a value`);
      out[a.slice(2)] = v;
    } else throw new Error(`unknown argument ${a}`);
  }
  if (!out.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new Error("--email must be the account's email address");
  if (!out.project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(out.project)) throw new Error("--project must be the Firebase project id (for example demo-oruschools or my-school-prod)");
  out.email = out.email.trim().toLowerCase();
  return out;
}

/** The claims after the change: every other claim is kept; only `globalRole` is set or removed. */
export function nextClaims(existing, revoke) {
  const claims = { ...(existing ?? {}) };
  if (revoke) delete claims[CLAIM];
  else claims[CLAIM] = SUPER_ADMIN;
  return claims;
}

/** A real account is required: the script promotes someone who has already signed in once; it never creates accounts. */
export function describePlan({ email, project, revoke, existingClaims, uid, emulator }) {
  const before = existingClaims?.[CLAIM] ?? "(none)";
  const after = revoke ? "(none)" : SUPER_ADMIN;
  return [`project   ${project}${emulator ? "  [EMULATOR]" : ""}`, `account   ${email}  (uid ${uid})`, `${CLAIM}  ${before}  ->  ${after}`].join("\n");
}
