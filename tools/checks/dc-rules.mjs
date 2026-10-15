// Data Connect operation rules (pure functions, so evals can feed them bad input).
export function parseOperations(text) {
  return text
    .split(/^(?=(?:query|mutation)\s)/m)
    .filter((b) => /^(query|mutation)\s/.test(b))
    .map((body) => ({
      kind: body.match(/^(query|mutation)/)[1],
      name: body.match(/^(?:query|mutation)\s+(\w+)/)?.[1],
      head: body.split("{")[0],
      body,
    }));
}

/** Entries must say WHY they are exempt; a bare name or an empty reason is rejected. */
export function exemptionProblems(label, exempt) {
  return Object.entries(exempt ?? {}).filter(([, why]) => typeof why !== "string" || why.trim().length < 10).map(([n]) => `${label}.${n} needs a written reason`);
}

/**
 * dc-audit: every state-changing mutation writes its audit row inside its own @transaction, so there is no change
 * without an audit row (ADR-0008 decision 6). `exempt` maps operation name -> reason.
 */
export function auditProblems(ops, exempt) {
  const problems = [];
  const mutations = ops.filter((o) => o.kind === "mutation");
  for (const m of mutations) {
    if (exempt[m.name] !== undefined) continue;
    if (!/auditLog_insert\s*\(/.test(m.body)) problems.push(`${m.name} changes data but has no auditLog_insert (add it inside the mutation, or list it in auditExemptOperations with a reason)`);
    else if (!/@transaction\b/.test(m.head)) problems.push(`${m.name} writes an audit row but is not @transaction, so the change and its audit row are not atomic`);
  }
  const names = new Set(mutations.map((m) => m.name));
  for (const n of Object.keys(exempt)) if (!names.has(n)) problems.push(`auditExemptOperations lists ${n}, which is not a mutation (remove the stale entry)`);
  return problems;
}
