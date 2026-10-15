// Branch policy (ADR-0010): which branch may merge into which, and which files an app branch may touch.
//   feat|fix|chore/<app>/<topic> -> app/<app> -> staging -> main (production);  hotfix/* -> main, then main -> staging.
//   cross/<topic> -> staging is the sanctioned exception for a change that must land in several apps at once (for example
//   a shared package plus the apps that stop using the old one); ownership is not enforced there, so it needs a human review.
export const APPS = ["api-gateway", "web-admin", "saas-admin", "landing-page", "mobile-teacher", "mobile-staff", "mobile-parent", "mobile-driver", "shared"];

// Lockfiles change whenever dependencies do, so any app branch may carry them.
const SHARED_LOCKS = ["package-lock.json", "pubspec.lock"];

export function ownerOf(file) {
  const m = file.match(/^apps\/([^/]+)\//);
  return m ? m[1] : "shared";
}

/** @returns {string[]} problems; empty means the pull request is allowed */
export function checkBranchPolicy({ head, base, changedFiles = [] }) {
  const problems = [];
  const appBranch = (b) => b.match(/^app\/([a-z0-9-]+)$/)?.[1];
  const known = (a) => APPS.includes(a);

  if (base === "main") {
    if (head !== "staging" && !/^hotfix\/[\w.-]+$/.test(head)) problems.push(`production (main) only accepts merges from staging or hotfix/*, not "${head}"`);
  } else if (base === "staging") {
    const a = appBranch(head);
    if (head !== "main" && !/^(hotfix|cross)\/[\w.-]+$/.test(head) && !a) problems.push(`staging only accepts app/<app> branches, cross/*, hotfix/* or a back-merge of main, not "${head}"`);
    if (a && !known(a)) problems.push(`"${head}" is not a known app branch (known: ${APPS.join(", ")})`);
    if (a && known(a))
      for (const f of changedFiles) {
        if (SHARED_LOCKS.includes(f)) continue;
        if (ownerOf(f) !== a) problems.push(`${head} changes ${f}, which belongs to "${ownerOf(f)}"; move it to app/${ownerOf(f)}`);
      }
  } else if (appBranch(base)) {
    const a = appBranch(base);
    if (!new RegExp(`^(feat|fix|chore)/${a}/[\\w.-]+$`).test(head)) problems.push(`${base} only accepts feat|fix|chore/${a}/<topic>, not "${head}"`);
  }
  return problems;
}
