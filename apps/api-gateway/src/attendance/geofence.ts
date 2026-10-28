/** Geofenced check-in (P4-S3, ADR-0014 decisions 9 and 10). Pure rules: no database, no clock. */

/** Beyond this many metres from the school point a check-in waits for HR to confirm it. Fixed by the owner. */
export const HARD_RING_M = 500;
export const DEFAULT_MARGIN_M = 50;

export interface Geofence {
  lat: number;
  lng: number;
  /** The grounds, in metres from the point. */
  radiusM: number;
  /** The feathered margin around the grounds; together they are the soft ring. */
  marginM: number;
}

export interface Position {
  lat: number;
  lng: number;
}

export type Stamp = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN';

/** Metres between two points on the earth (haversine; the error over a school's distances is far below a metre). */
export function distanceMetres(a: Position, b: Position): number {
  const R = 6_371_008.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Verdict {
  stamp: Stamp;
  /** Whole metres from the school point; null when there was no position or the school has no point. */
  distanceM: number | null;
  /** A reason must be given: the school has a point and the person is not inside the soft ring (or gave no position). */
  reasonRequired: boolean;
  /** Beyond the hard ring: HR must confirm. */
  needsConfirm: boolean;
}

/**
 * Where a check-in or check-out happened, as evidence for HR. It never blocks: the caller always records the day.
 *  - no geofence set for the school: nothing is asked, the stamp is UNKNOWN;
 *  - inside the soft ring (radius + margin): INSIDE, nothing asked;
 *  - no position from the phone: UNKNOWN, a reason is asked (like the middle case);
 *  - between the soft ring and the hard ring: OUTSIDE, a reason is asked;
 *  - beyond the hard ring: OUTSIDE, a reason is required and HR must confirm.
 */
export function judge(fence: Geofence | null, position: Position | null): Verdict {
  if (!fence) return { stamp: 'UNKNOWN', distanceM: null, reasonRequired: false, needsConfirm: false };
  if (!position) return { stamp: 'UNKNOWN', distanceM: null, reasonRequired: true, needsConfirm: false };
  const d = distanceMetres({ lat: fence.lat, lng: fence.lng }, position);
  const distanceM = Math.round(d);
  if (d <= fence.radiusM + fence.marginM) return { stamp: 'INSIDE', distanceM, reasonRequired: false, needsConfirm: false };
  return { stamp: 'OUTSIDE', distanceM, reasonRequired: true, needsConfirm: d > HARD_RING_M };
}
