/** Names that must never become a school: infrastructure, the platform's own apps and the obvious phishing bait. */
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'apps', 'admin', 'saas', 'web', 'landing', 'staging', 'stage', 'prod', 'production', 'dev', 'test', 'demo', 'mail', 'smtp', 'imap', 'ftp',
  'ns1', 'ns2', 'static', 'assets', 'cdn', 'docs', 'status', 'support', 'help', 'blog', 'login', 'auth', 'account', 'accounts', 'billing', 'root', 'oruschools', 'oru',
]);

/** One DNS label: lower case letters, digits and single hyphens, 3 to 63 long, not starting or ending with a hyphen. */
export const SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export function subdomainProblem(value: string): string | undefined {
  if (!SUBDOMAIN.test(value)) return 'must be 3-63 characters: lower case letters, digits and hyphens, not starting or ending with a hyphen';
  if (value.includes('--')) return 'must not contain two hyphens in a row';
  if (RESERVED_SUBDOMAINS.has(value)) return 'is reserved';
  return undefined;
}
