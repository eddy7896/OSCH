/**
 * The school a web address belongs to: the single label in front of the base domain
 * (`greenfield.oruschools.com` or `greenfield.localhost:3002` -> `greenfield`). The gateway still decides whether such a
 * school exists and whether the person is a member; this only reads the address (ADR-0009).
 */
export function subdomainFromHost(host: string, baseDomain: string): string | null {
  const base = baseDomain.trim().toLowerCase();
  if (!base) return null;
  const hostname = host.trim().toLowerCase().replace(/:\d{1,5}$/, "");
  if (!hostname.endsWith(`.${base}`)) return null;
  const label = hostname.slice(0, hostname.length - base.length - 1);
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label) ? label : null;
}
