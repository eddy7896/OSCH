import { RESERVED_SUBDOMAINS, subdomainProblem } from './subdomain.js';

describe('subdomain rules', () => {
  it.each(['greenvalley', 'dps-ranchi', 'school1', 'abc', 'a1b2c3', 'x'.repeat(63)])('accepts "%s"', (s) => {
    expect(subdomainProblem(s)).toBeUndefined();
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'x'.repeat(64)],
    ['upper case', 'GreenValley'],
    ['space', 'green valley'],
    ['underscore', 'green_valley'],
    ['dot (a second label)', 'green.valley'],
    ['leading hyphen', '-green'],
    ['trailing hyphen', 'green-'],
    ['double hyphen (punycode lookalike)', 'xn--abc'],
    ['unicode', 'schöol'],
    ['slash', 'a/b'],
    ['empty', ''],
  ])('rejects %s', (_n, s) => {
    expect(subdomainProblem(s)).toBeDefined();
  });

  it('rejects every reserved name', () => {
    for (const r of RESERVED_SUBDOMAINS) expect(subdomainProblem(r), r).toBeDefined();
    expect(RESERVED_SUBDOMAINS.has('www') && RESERVED_SUBDOMAINS.has('api') && RESERVED_SUBDOMAINS.has('admin') && RESERVED_SUBDOMAINS.has('staging')).toBe(true);
  });
});
