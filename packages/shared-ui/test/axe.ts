import axe from 'axe-core';

/**
 * Runs axe-core on a rendered tree and fails with the violations spelled out. Colour contrast is not checked here: jsdom has
 * no layout or computed colours, and the token pairs are contrast-tested separately (evals/design-tokens.test.mjs).
 */
export async function expectAccessible(container: Element): Promise<void> {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  const summary = results.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.html).join(' | ')}`);
  expect(summary).toEqual([]);
}
