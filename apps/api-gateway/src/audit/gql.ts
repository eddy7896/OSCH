/** Minimal splitter for Data Connect operation files (same rule as tools/checks/dc-rules.mjs). */
export function parseOperations(text: string): Array<{ kind: 'query' | 'mutation'; name: string; body: string }> {
  return text
    .split(/^(?=(?:query|mutation)\s)/m)
    .filter((b) => /^(query|mutation)\s/.test(b))
    .map((body) => ({ kind: body.startsWith('query') ? ('query' as const) : ('mutation' as const), name: /^(?:query|mutation)\s+(\w+)/.exec(body)![1]!, body }));
}
