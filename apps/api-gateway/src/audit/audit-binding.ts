import { parseOperations } from './gql.js';

/** operation name -> the audit actions its `auditLog_insert` calls record (E-AUD-1, static half). */
export function auditActionsByOperation(gqlText: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const op of parseOperations(gqlText)) {
    if (op.kind !== 'mutation') continue;
    const actions: string[] = [];
    for (const m of op.body.matchAll(/auditLog_insert\s*\(\s*data:\s*\{[^}]*?\baction:\s*"([^"]+)"/g)) actions.push(m[1]!);
    out.set(op.name, actions);
  }
  return out;
}

export interface BoundRoute {
  label: string;
  audit?: { action: string; operation: string };
}

/**
 * A route that says it performs `operation` and records `action` is checked against the real operation text: the operation
 * must exist and its own audit insert must record exactly that action. Renaming either side without the other fails.
 */
export function auditBindingProblems(routes: readonly BoundRoute[], operations: ReadonlyMap<string, readonly string[]>): string[] {
  const problems: string[] = [];
  for (const r of routes) {
    if (!r.audit) continue;
    const actions = operations.get(r.audit.operation);
    if (!actions) problems.push(`${r.label}: @Audit operation ${r.audit.operation} is not a mutation in the connector`);
    else if (actions.length === 0) problems.push(`${r.label}: operation ${r.audit.operation} has no auditLog_insert with a literal action`);
    else if (!actions.includes(r.audit.action)) problems.push(`${r.label}: @Audit says "${r.audit.action}" but ${r.audit.operation} records ${actions.map((a) => `"${a}"`).join(', ')}`);
  }
  return problems;
}
