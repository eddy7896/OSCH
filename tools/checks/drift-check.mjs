#!/usr/bin/env node
// OruSchools drift / hallucination check.
// Compares what the docs and agents *claim* against what the repo *is*.
// Zero dependencies. Usage: node tools/checks/drift-check.mjs [--json] [--strict]
//   exit 1 on any error (or any warning with --strict).

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  const re = /\b((?:apps|packages|dataconnect|tools|evals)\/[A-Za-z0-9_.\-\/*]+)/g;
  for (const doc of docs) {
    if (config.pathCheckExemptDocs.includes(doc)) continue;
    const seen = new Set();
    for (const m of read(doc).matchAll(re)) {
      if (m[1].includes("*") || m[1].endsWith("-")) continue; // globs such as apps/mobile-*
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
  const exemptOps = new Set(config.tenantScopeExemptOperations);
  for (const f of gqls) {
    const text = read(f);
    const ops = text.split(/^(?=(?:query|mutation)\s)/m).filter((b) => /^(query|mutation)\s/.test(b));
    for (const op of ops) {
      const head = op.split("{")[0];
      const name = head.match(/^(?:query|mutation)\s+(\w+)/)?.[1];
      if (/@auth\(\s*level:\s*PUBLIC/.test(head))
        add("error", "dc-public-auth", `${name} uses @auth(level: PUBLIC); clients must never reach the DB (use NO_ACCESS + Admin SDK)`, f);
      if (!/\$schoolId\b/.test(head) && !exemptOps.has(name))
        add(config.knownDebt[name] ? "warn" : "error", "dc-tenant-scope", `${name} takes no $schoolId; every tenant operation must be school-scoped (or add to tenantScopeExemptOperations with justification)${config.knownDebt[name] ? ` [known debt: ${config.knownDebt[name]}]` : ""}`, f);
    }
  }
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
