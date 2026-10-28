import { describe, expect, it } from 'vitest';
import { distanceMetres, HARD_RING_M, judge, type Geofence } from './geofence.js';

const school: Geofence = { lat: 12.9716, lng: 77.5946, radiusM: 150, marginM: 50 };
/** A point `m` metres due north of the school (one degree of latitude is about 111,195 m). */
const north = (m: number) => ({ lat: school.lat + m / 111_195, lng: school.lng });

describe('distanceMetres', () => {
  it('is zero for the same point and about 111 km for a degree of latitude', () => {
    expect(distanceMetres(school, school)).toBe(0);
    expect(distanceMetres({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });
  it('is symmetric and shrinks east-west away from the equator', () => {
    const a = { lat: 60, lng: 10 }, b = { lat: 60, lng: 11 };
    expect(distanceMetres(a, b)).toBeCloseTo(distanceMetres(b, a), 6);
    expect(distanceMetres(a, b)).toBeLessThan(distanceMetres({ lat: 0, lng: 10 }, { lat: 0, lng: 11 }) * 0.55);
  });
});

describe('judge: the two rings', () => {
  it('inside the grounds and inside the feathered margin: INSIDE, nothing asked', () => {
    for (const m of [0, 120, 199]) expect(judge(school, north(m))).toMatchObject({ stamp: 'INSIDE', reasonRequired: false, needsConfirm: false });
  });
  it('the soft ring is the radius PLUS the margin: 201 m is outside it', () => {
    expect(judge(school, north(201))).toMatchObject({ stamp: 'OUTSIDE', reasonRequired: true, needsConfirm: false });
  });
  it('between the soft ring and 500 m: a reason is asked and the day still counts, HR need not confirm', () => {
    expect(judge(school, north(400))).toMatchObject({ stamp: 'OUTSIDE', reasonRequired: true, needsConfirm: false });
  });
  it('beyond 500 m: a reason is required and HR must confirm', () => {
    expect(judge(school, north(HARD_RING_M + 20))).toMatchObject({ stamp: 'OUTSIDE', reasonRequired: true, needsConfirm: true });
    expect(judge(school, north(5000))).toMatchObject({ needsConfirm: true });
  });
  it('the distance is whole metres', () => {
    expect(Number.isInteger(judge(school, north(333)).distanceM)).toBe(true);
    expect(judge(school, north(333)).distanceM).toBeGreaterThanOrEqual(332);
    expect(judge(school, north(333)).distanceM).toBeLessThanOrEqual(334);
  });
  it('a larger margin widens the soft ring; a wide school keeps its middle band short of 500 m', () => {
    expect(judge({ ...school, marginM: 300 }, north(400))).toMatchObject({ stamp: 'INSIDE' });
    expect(judge({ ...school, radiusM: 600 }, north(550))).toMatchObject({ stamp: 'INSIDE', needsConfirm: false });
  });
});

describe('judge: no position, no geofence', () => {
  it('a phone that gave no position is UNKNOWN and is asked for a reason, like the middle case', () => {
    expect(judge(school, null)).toEqual({ stamp: 'UNKNOWN', distanceM: null, reasonRequired: true, needsConfirm: false });
  });
  it('a school with no geofence asks nobody anything', () => {
    expect(judge(null, null)).toEqual({ stamp: 'UNKNOWN', distanceM: null, reasonRequired: false, needsConfirm: false });
    expect(judge(null, north(9999))).toEqual({ stamp: 'UNKNOWN', distanceM: null, reasonRequired: false, needsConfirm: false });
  });
});
