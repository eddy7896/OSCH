// CI entry point: node tools/checks/branch-policy-cli.mjs <head> <base>; changed files come from git.
import { execFileSync } from "node:child_process";
import { checkBranchPolicy } from "./branch-policy.mjs";

const [head, base] = process.argv.slice(2);
if (!head || !base) { console.error("usage: branch-policy-cli.mjs <head-branch> <base-branch>"); process.exit(2); }
const changedFiles = execFileSync("git", ["diff", "--name-only", `origin/${base}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
const problems = checkBranchPolicy({ head, base, changedFiles });
for (const p of problems) console.log(`::error title=branch-policy::${p}`);
console.log(problems.length ? `branch policy: ${problems.length} problem(s)` : `branch policy: ${head} -> ${base} allowed (${changedFiles.length} files)`);
process.exit(problems.length ? 1 : 0);
