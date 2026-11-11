/** Distances and arrival estimates for a bus on a route (P5-5a). Straight-line distances between the stops in the order the bus calls; a rough estimate, labelled as one in the apps. */

export interface Point { lat: number; lng: number }
export interface StopPoint { id: string; sequence: number; lat: number | null; lng: number | null }
export interface Fix extends Point { speedKmh: number | null; at: number }

export const REACHED_M = 100;
export const DEFAULT_KMH = 20;
const MIN_KMH = 10;
const MAX_KMH = 50;
const DWELL_MIN = 1;

export function metres(a: Point, b: Point): number {
  const r = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The highest stop (by order) the bus has been within [REACHED_M] of in any position; -1 when none. A later stop reached means the earlier ones were passed. */
export function reachedIndex(stops: readonly StopPoint[], fixes: readonly Fix[]): number {
  let best = -1;
  stops.forEach((s, i) => {
    if (s.lat === null || s.lng === null) return;
    if (fixes.some((f) => metres(f, { lat: s.lat!, lng: s.lng! }) <= REACHED_M)) best = Math.max(best, i);
  });
  return best;
}

/** The bus's usual speed: the median of its recent moving speeds, kept within a sensible range; the default when it reports none. */
export function speedKmh(fixes: readonly Fix[]): number {
  const moving = fixes.slice(0, 10).map((f) => f.speedKmh).filter((v): v is number => v !== null && v >= 5).sort((a, b) => a - b);
  if (moving.length === 0) return DEFAULT_KMH;
  const med = moving[Math.floor(moving.length / 2)]!;
  return Math.min(MAX_KMH, Math.max(MIN_KMH, med));
}

/**
 * Minutes until the bus reaches each stop after the last one it reached, following the route from its newest position through the stops in order, with a minute for each stop it calls at on the way.
 * `fixes` are newest first. A stop with no map position, or one already reached, has no estimate (a missing position does not break the stops after it: the distance carries over it).
 */
export function etas(stops: readonly StopPoint[], fixes: readonly Fix[]): Array<number | null> {
  const out: Array<number | null> = stops.map(() => null);
  const last = fixes[0];
  if (!last) return out;
  const from = reachedIndex(stops, fixes);
  const kmh = speedKmh(fixes);
  let at: Point = last;
  let metresSoFar = 0;
  let calls = 0;
  for (let i = from + 1; i < stops.length; i++) {
    const s = stops[i]!;
    if (s.lat === null || s.lng === null) continue;
    const p = { lat: s.lat, lng: s.lng };
    metresSoFar += metres(at, p);
    at = p;
    out[i] = Math.max(1, Math.round((metresSoFar / 1000 / kmh) * 60 + calls * DWELL_MIN));
    calls += 1;
  }
  return out;
}
