#!/usr/bin/env node
// OruSchools drift / hallucination check.
// Compares what the docs and agents *claim* against what the repo *is*.
// Zero dependencies. Usage: node tools/checks/drift-check.mjs [--json] [--strict]
//   exit 1 on any error (or any warning with --strict).

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { dartViolation, webViolation } from "./rtl-patterns.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = new Set(process.argv.slice(2));
const findings = [];
const add = (severity, check, message, where = "") =>
  findings.push({ severity, check, message, where });

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const exists = (p) => existsSync(join(ROOT, p));
const SKIP = new Set(["node_modules", ".git", ".turbo", ".next", ".dataconnect", "scratch"]);

function walk(dir, filter, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP.has(name)) continue;
    const rel = join(dir, name);
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel, filter, out);
    else if (filter(rel)) out.push(rel);
  }
  return out;
}

const config = JSON.parse(read("tools/checks/drift-config.json"));

// 1. Paths mentioned in docs must exist, or be declared planned. -------------
{
  const docs = [...walk("documentation", (f) => f.endsWith(".md")), "CLAUDE.md"].filter(exists);
  const planned = config.plannedPaths;
  // A path must not be preceded by a name character: "firebase-tools/lib/x" is a package path, not our tools/lib/x.
  const re = /(?<![\w.\/-])((?:apps|packages|dataconnect|tools|evals)\/[A-Za-z0-9_.\-\/*]+)/g;
  for (const doc of docs) {
    if (config.pathCheckExemptDocs.includes(doc)) continue;
    const seen = new Set();
    for (const m of read(doc).matchAll(re)) {
      if (m[1].includes("*") || m[1].endsWith("-")) continue; // globs such as apps/mobile-*
      if (/\/\.env(\.|$)/.test(m[1])) continue; // local, git-ignored env files are never in a clean checkout
      const p = m[1].replace(/[.,)`]+$/, "").replace(/\/$/, "");
      if (seen.has(p)) continue;
      seen.add(p);
      if (exists(p)) continue;
      if (planned.some((pp) => p === pp || p.startsWith(pp + "/"))) continue;
      add("error", "doc-path", `references "${p}" which does not exist and is not in plannedPaths`, doc);
    }
  }
}

// 2. Banned technologies must not appear in any package.json / pubspec. ------
{
  const manifests = walk(".", (f) => /(^|\/)(package\.json|pubspec\.yaml)$/.test(f));
  for (const f of manifests) {
    const text = read(f).toLowerCase();
    for (const banned of config.bannedDependencies) {
      const re = new RegExp(`["'\\s]${banned.replace(/[-/]/g, "\\$&")}["':\\s]`);
      if (re.test(text)) add("error", "banned-dep", `"${banned}" is forbidden by hallucination_checks.md`, f);
    }
  }
}

// 3. Declared vs installed versions (catches invented/phantom versions). -----
{
  const manifests = walk(".", (f) => /(^|\/)package\.json$/.test(f) && !f.startsWith("src/"));
  for (const f of manifests) {
    const pkg = JSON.parse(read(f));
    for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      if (!/^\d+\.\d+\.\d+$/.test(range)) continue; // only exact pins are checkable
      const installed = ["node_modules", join(dirname(f), "node_modules")]
        .map((d) => join(d, name, "package.json"))
        .find(exists);
      if (!installed) continue;
      const v = JSON.parse(read(installed)).version;
      if (v !== range) add("warn", "version-drift", `${name} pinned ${range} but ${v} installed`, f);
    }
  }
}

// 4. Data Connect: no PUBLIC auth, tenant scoping on every operation. --------
{
  // Every connector dir (any folder under dataconnect/ holding a connector.yaml): schema/ and seed data are not operations.
  const connectorDirs = readdirSync(join(ROOT, "dataconnect"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(ROOT, "dataconnect", e.name, "connector.yaml")))
    .map((e) => `dataconnect/${e.name}`);
  const gqls = connectorDirs.flatMap((d) => walk(d, (f) => f.endsWith(".gql")));
  const { parseOperations, exemptionProblems, auditProblems } = await import("./dc-rules.mjs");
  const exemptOps = new Set(Object.keys(config.tenantScopeExemptOperations));
  for (const p of [...exemptionProblems("tenantScopeExemptOperations", config.tenantScopeExemptOperations), ...exemptionProblems("auditExemptOperations", config.auditExemptOperations)]) add("error", "dc-exempt", p, "tools/checks/drift-config.json");
  const allOps = [];
  for (const f of gqls) {
    const ops = parseOperations(read(f));
    allOps.push(...ops);
    for (const { head, name } of ops) {
      if (/@auth\(\s*level:\s*PUBLIC/.test(head))
        add("error", "dc-public-auth", `${name} uses @auth(level: PUBLIC); clients must never reach the DB (use NO_ACCESS + Admin SDK)`, f);
      if (!/\$schoolId\b/.test(head) && !exemptOps.has(name))
        add(config.knownDebt[name] ? "warn" : "error", "dc-tenant-scope", `${name} takes no $schoolId; every tenant operation must be school-scoped (or add to tenantScopeExemptOperations with justification)${config.knownDebt[name] ? ` [known debt: ${config.knownDebt[name]}]` : ""}`, f);
    }
  }
  for (const p of auditProblems(allOps, config.auditExemptOperations ?? {})) add("error", "dc-audit", p, "dataconnect/erp-connector/mutations.gql");
}

// 5. Secrets hygiene. ---------------------------------------------------------
{
  const ignore = exists(".gitignore") ? read(".gitignore") : "";
  const envFiles = readdirSync(ROOT).filter((n) => /^\.env/.test(n) && n !== ".env.example");
  for (const e of envFiles) {
    const covered = ignore.split("\n").some((l) => {
      l = l.trim();
      return l && !l.startsWith("#") && (l === e || l === ".env*" || l === ".env.*" || l === ".env.*local");
    });
    if (!covered) add("error", "secrets", `${e} exists but is not covered by .gitignore`, ".gitignore");
  }
  const docs = walk("documentation", (f) => f.endsWith(".md"));
  for (const d of docs)
    if (/(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_\-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(read(d)))
      add("error", "secrets", "possible credential committed in docs", d);
}

// 6. Doc contradictions: stale terms must not appear outside superseded docs. -
{
  const docs = walk("documentation", (f) => f.endsWith(".md"));
  for (const { term, reason, allowIn = [] } of config.staleTerms) {
    const re = new RegExp(term, "i");
    for (const d of docs) {
      if (allowIn.includes(d)) continue;
      const line = read(d).split("\n").findIndex((l) => re.test(l));
      if (line >= 0) add("warn", "stale-term", `"${term}" contradicts decision ${reason}`, `${d}:${line + 1}`);
    }
  }
}

// 7. Tooling config consistency. ---------------------------------------------
{
  const dc = read("dataconnect/dataconnect.yaml");
  for (const m of dc.matchAll(/(?:outputDir|packageJsonDir):\s*(\S+)/g)) {
    const target = resolve(ROOT, "dataconnect", m[1]);
    if (!existsSync(target)) add("error", "config-path", `dataconnect.yaml points at missing ${relative(ROOT, target)}`, "dataconnect/dataconnect.yaml");
  }
  const turbo = JSON.parse(read("turbo.json"));
  const withTestTask = walk(".", (f) => /^(apps|packages)\/[^/]+\/package\.json$/.test(f)).filter(
    (f) => JSON.parse(read(f)).scripts?.test,
  );
  if (turbo.tasks.test && withTestTask.length === 0)
    add("warn", "no-tests", "turbo has a `test` task but no workspace defines a test script", "turbo.json");
  for (const app of readdirSync(join(ROOT, "apps")))
    if (exists(`apps/${app}/.git`)) add("warn", "nested-git", `apps/${app} has its own .git; the monorepo should be a single repo`, `apps/${app}`);
}

// 8. Design system integrity. --------------------------------------------------
{
  const DS = "documentation/design-system";
  if (exists(`${DS}/tokens.json`) && exists(`${DS}/tokens.css`)) {
    const tokens = JSON.parse(read(`${DS}/tokens.json`));
    const css = read(`${DS}/tokens.css`);
    const blockOf = (sel) => {
      const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([\\s\\S]*?)\\n\\}"));
      return Object.fromEntries([...(m?.[1] ?? "").matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim().toLowerCase()]));
    };
    const light = blockOf(':root, [data-theme="light"]');
    const dark = blockOf('[data-theme="dark"]');
    const norm = (v) => String(v).replace(/\{([\w-]+)\}/g, "var(--$1)").toLowerCase();
    let bad = 0;
    for (const t of [...tokens.color.tokens, ...(tokens.shadow?.tokens ?? [])]) {
      const themed = typeof t.value === "object";
      const lv = norm(themed ? t.value.light : t.value);
      if (light[t.name] !== lv) { bad++; add("error", "tokens-parity", `--${t.name} in tokens.css is "${light[t.name]}", tokens.json says "${lv}" (light)`, `${DS}/tokens.css`); }
      if (themed && dark[t.name] !== norm(t.value.dark)) { bad++; add("error", "tokens-parity", `--${t.name} dark mismatch between tokens.css and tokens.json`, `${DS}/tokens.css`); }
    }
  }
  if (exists("documentation/brand-assets/Brand-guidelines.md") && exists(`${DS}/Brand.md`) &&
      read("documentation/brand-assets/Brand-guidelines.md") !== read(`${DS}/Brand.md`))
    add("error", "brand-mirror", "design-system/Brand.md differs from brand-assets/Brand-guidelines.md (canonical); copy the canonical file over the mirror", `${DS}/Brand.md`);

  // Raw hex colours in product source should be design tokens. Warn (stock scaffolds still contain a few).
  const srcFiles = ["apps", "packages"].flatMap((d) => walk(d, (f) => /\/(src|lib)\//.test(f) && /\.(tsx?|css|dart)$/.test(f) && !/\.(d\.ts|g\.dart)$/.test(f) && !/shared-design-tokens/.test(f)));
  const rawHex = srcFiles.filter((f) => /#[0-9a-fA-F]{6}\b|Color\(0x[0-9A-Fa-f]{8}\)/.test(read(f)));
  for (const f of rawHex) add("warn", "raw-hex", "hard-coded colour; use a semantic design token", f);
}

// 9. Environment templates & generated artefacts. --------------------------------------------------------------
{
  // Every key in any local .env* must be documented in the root .env.example (so a new dev can reproduce the setup).
  const keysOf = (text) => new Set([...text.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]));
  if (exists(".env.example")) {
    const documented = keysOf(read(".env.example"));
    const localEnvs = [".env.local", ...["apps/api-gateway", "apps/saas-admin", "apps/web-admin", "apps/landing-page"].map((d) => `${d}/.env.local`)].filter(exists);
    for (const f of localEnvs)
      for (const k of keysOf(read(f)))
        if (!documented.has(k)) add("error", "env-example", `${k} is used in ${f} but missing from .env.example`, f);
    // Public vars must never look like secrets.
    for (const f of [".env.example", ...localEnvs])
      for (const k of keysOf(read(f)))
        if (/^NEXT_PUBLIC_.*(SECRET|PRIVATE|PASSWORD|TOKEN|ACCESS_KEY)/.test(k)) add("error", "env-public-secret", `${k} is NEXT_PUBLIC_ (shipped to browsers) but looks like a secret`, f);
  }
  // Generated token outputs must match tokens.json (npm run tokens:build).
  try {
    execFileSync("node", ["packages/shared-design-tokens/scripts/build.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    add("error", "tokens-generated", "generated token files are stale: run `npm run tokens:build` (" + String(e.stderr ?? "").split("\n")[0] + ")", "packages/shared-design-tokens");
  }
  // Dark mode is out of scope for v1 (DS-1): no dark rules in app styles.
  for (const f of ["apps", "packages"].flatMap((d) => walk(d, (x) => /\/src\/.*\.css$/.test(x))))
    if (/prefers-color-scheme:\s*dark|\[data-theme=.?dark/.test(read(f))) add("error", "no-dark-mode", "dark-mode styles found; v1 is light-only (decision DS-1)", f);
}

// 10. Tracked files that .gitignore excludes (build output, caches, secrets) must not stay in the index. -------------
if (existsSync(join(ROOT, ".git"))) {
  try {
    const tracked = execFileSync("git", ["ls-files", "-ci", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
    if (tracked.length)
      add("error", "tracked-ignored", `${tracked.length} tracked file(s) match .gitignore (e.g. ${tracked.slice(0, 3).join(", ")}); run: git rm -r --cached <path>`, tracked[0]);
    const submodules = execFileSync("git", ["ls-files", "-s"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter((l) => l.startsWith("160000"));
    if (submodules.length) add("error", "gitlink", `${submodules.length} nested repo(s) recorded as submodule pointers without .gitmodules: ${submodules.map((l) => l.split("\t")[1]).join(", ")}`, ".git");
  } catch { /* git unavailable: skip */ }
}

// 11. Languages / right-to-left (ADR-0006). ---------------------------------------------------------------------------
{
  try {
    execFileSync("node", ["packages/i18n/scripts/build.mjs", "--check", "--quiet"], { cwd: ROOT, stdio: "pipe" });
  } catch (e) {
    add("error", "i18n-generated", "generated i18n files are stale or the language sources are invalid: run `npm run i18n:build` (" + String(e.stderr ?? "").split("\n").find((l) => l.trim()) + ")", "packages/i18n");
  }
  // Physical left/right breaks right-to-left layouts (patterns and the paren-aware Dart scanner: tools/checks/rtl-patterns.mjs).
  const scan = (files, violation, what) => {
    for (const f of files) {
      const found = violation(read(f), f);
      if (found) add("error", "rtl-physical", `${what}: ${found}; physical left/right breaks right-to-left layouts, use the logical equivalent`, f);
    }
  };
  const isSrc = (f) => !/(^|\/)(generated|node_modules|\.next|build|dist)\//.test(f) && !/\.(g|generated)\./.test(f) && !/(^|\/)fonts\.ts$/.test(f);
  const web = ["apps", "packages"].flatMap((d) => walk(d, (f) => /\/src\/.*\.(tsx|ts|css)$/.test(f) && isSrc(f) && !/\.test\./.test(f)));
  scan(web, (text, f) => webViolation(text, { css: f.endsWith(".css") }), "web");
  const dart = ["apps", "packages"].flatMap((d) => walk(d, (f) => /\/(lib|test)\/.*\.dart$/.test(f) && isSrc(f) && !/\/l10n\//.test(f)));
  scan(dart, dartViolation, "flutter");
  // No hard-coded user-visible text in the app shells: strings come from the message catalogs.
  for (const f of walk("apps", (x) => /^apps\/mobile-[^/]+\/lib\/.*\.dart$/.test(x)))
    if (/\bText\(\s*'/.test(read(f)) || /\bText\(\s*"/.test(read(f))) add("error", "hardcoded-string", "Text('literal'): use OruStrings (packages/i18n catalogs) so the UI can be translated", f);
}

// 12. CI workflows must be valid: a workflow GitHub rejects runs NO jobs, so every check silently never executes. ---------
{
  const { checkWorkflow } = await import("./workflow-check.mjs");
  const rootScripts = JSON.parse(read("package.json")).scripts ?? {};
  const turboTasks = Object.keys(JSON.parse(read("turbo.json")).tasks ?? {});
  if (existsSync(join(ROOT, ".github/workflows")))
    for (const f of readdirSync(join(ROOT, ".github/workflows")).filter((n) => /\.ya?ml$/.test(n)))
      for (const problem of checkWorkflow(read(`.github/workflows/${f}`), { rootScripts, turboTasks, exists, isDir: (p) => exists(p) && statSync(join(ROOT, p)).isDirectory() }))
        add("error", "workflow", problem, `.github/workflows/${f}`);
}

// 13. Node version: .nvmrc, root engines and every CI node-version must agree (ADR-0008) ------------------------------------
{
  const major = exists(".nvmrc") ? read(".nvmrc").trim().replace(/^v/, "").split(".")[0] : null;
  const engines = (JSON.parse(read("package.json")).engines ?? {}).node ?? "";
  if (!major) add("error", "node-version", ".nvmrc is missing (ADR-0008 sets Node 22 as the floor)", ".nvmrc");
  else {
    if (!engines.includes(major)) add("error", "node-version", `root engines.node "${engines}" does not match .nvmrc major ${major}`, "package.json");
    if (existsSync(join(ROOT, ".github/workflows")))
      for (const f of readdirSync(join(ROOT, ".github/workflows")).filter((n) => /\.ya?ml$/.test(n)))
        for (const m of read(`.github/workflows/${f}`).matchAll(/node-version:\s*["']?(\d+)/g))
          if (m[1] !== major) add("error", "node-version", `${f} uses Node ${m[1]} but .nvmrc says ${major}`, `.github/workflows/${f}`);
  }
}

// 14. Web fonts are self-hosted: no next/font/google in any app (it fetches from Google on every build and flaked CI). -----
{
  const { googleFontImportLines } = await import("./web-font-rule.mjs");
  for (const f of walk("apps", (n) => /\.(ts|tsx|js|jsx|mjs)$/.test(n)).filter((n) => !n.includes("/node_modules/") && !n.includes("/.next/") && !n.includes("/dist/")))
    for (const line of googleFontImportLines(read(f)))
      add("error", "web-fonts-local", `${f}:${line} imports next/font/google; use next/font/local with the committed WOFF2 files (packages/i18n/fonts, packages/shared-design-tokens/fonts)`, f);
}

// Report -----------------------------------------------------------------------
const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");
if (args.has("--json")) {
  console.log(JSON.stringify({ errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  for (const f of [...errors, ...warns])
    console.log(`${f.severity === "error" ? "ERROR" : "warn "} [${f.check}] ${f.message}${f.where ? `\n        at ${f.where}` : ""}`);
  console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`);
}
process.exit(errors.length || (args.has("--strict") && warns.length) ? 1 : 0);
