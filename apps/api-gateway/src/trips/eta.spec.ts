import { DEFAULT_KMH, etas, metres, reachedIndex, speedKmh, type Fix, type StopPoint } from './eta.js';

// Stops about 1.1 km apart along a line of latitude-ish on a meridian: 0.01 degree of latitude is about 1,112 m.
const stop = (i: number, lat: number | null = 12 + i * 0.01, lng: number | null = 77): StopPoint => ({ id: `s${i}`, sequence: i + 1, lat, lng });
const fix = (lat: number, speedKmh: number | null = null, at = 0): Fix => ({ lat, lng: 77, speedKmh, at });

describe('distance', () => {
  it('0.01 degree of latitude is about 1.1 km', () => expect(Math.round(metres({ lat: 12, lng: 77 }, { lat: 12.01, lng: 77 }))).toBeGreaterThan(1100));
  it('the same point is zero', () => expect(metres({ lat: 12, lng: 77 }, { lat: 12, lng: 77 })).toBe(0));
});

describe('which stops the bus has reached', () => {
  const stops = [stop(0), stop(1), stop(2)];
  it('none before it gets near the first', () => expect(reachedIndex(stops, [fix(11.9)])).toBe(-1));
  it('within 100 m counts', () => expect(reachedIndex(stops, [fix(12.0005)])).toBe(0));
  it('the highest stop reached wins, even if an earlier fix is far from it', () => expect(reachedIndex(stops, [fix(12.0201), fix(12.0005)])).toBe(2));
  it('stops without a map position are skipped', () => expect(reachedIndex([stop(0, null, null), stop(1)], [fix(12.0105)])).toBe(1));
});

describe('speed', () => {
  it('uses the default when the bus reports none, or only standing still', () => {
    expect(speedKmh([fix(12)])).toBe(DEFAULT_KMH);
    expect(speedKmh([fix(12, 0), fix(12, 2)])).toBe(DEFAULT_KMH);
  });
  it('the median of the moving speeds, kept in range', () => {
    expect(speedKmh([fix(12, 30), fix(12, 40), fix(12, 50)])).toBe(40);
    expect(speedKmh([fix(12, 120)])).toBe(50);
    expect(speedKmh([fix(12, 6)])).toBe(10);
  });
});

describe('arrival estimates', () => {
  const stops = [stop(0), stop(1), stop(2)];
  it('nothing before the first position', () => expect(etas(stops, [])).toEqual([null, null, null]));
  it('stops already reached have none; later stops add up the distance and a minute for each stop called at', () => {
    const e = etas(stops, [fix(12.0005, 40)]);
    expect(e[0]).toBeNull();
    expect(e[1]).toBe(Math.round((metres({ lat: 12.0005, lng: 77 }, { lat: 12.01, lng: 77 }) / 1000 / 40) * 60));
    expect(e[2]!).toBeGreaterThan(e[1]!);
  });
  it('before the first stop, the first stop is the next one', () => {
    const e = etas(stops, [fix(11.99, 30)]);
    expect(e[0]).not.toBeNull();
    expect(e[0]!).toBeLessThan(e[1]!);
  });
  it('a stop with no position gets none, and the distance carries over it', () => {
    const e = etas([stop(0), stop(1, null, null), stop(2)], [fix(12.0005, 40)]);
    expect(e[1]).toBeNull();
    expect(e[2]).not.toBeNull();
  });
  it('never less than one minute', () => expect(etas(stops, [fix(12.0085, 50), fix(12.0, 50)])[1]).toBe(1));
});
