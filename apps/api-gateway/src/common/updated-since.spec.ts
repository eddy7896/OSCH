import { describe, expect, it } from 'vitest';
import { nextCursor } from './updated-since.js';

describe('nextCursor', () => {
  it('is the newest change, floored to the millisecond', () => {
    expect(nextCursor([{ updatedAt: '2026-10-28T10:00:00.123456Z' }, { updatedAt: '2026-10-28T10:00:05.987654Z' }, { updatedAt: '2026-10-28T09:00:00Z' }])).toBe('2026-10-28T10:00:05.987Z');
  });
  it('keeps the given moment when nothing changed, and never moves backwards', () => {
    expect(nextCursor([], '2026-10-28T10:00:00.000Z')).toBe('2026-10-28T10:00:00.000Z');
    expect(nextCursor([{ updatedAt: '2026-10-27T00:00:00Z' }], '2026-10-28T10:00:00.000Z')).toBe('2026-10-28T10:00:00.000Z');
  });
  it('is null with no rows and no given moment (the next ask is a full list)', () => {
    expect(nextCursor([])).toBeNull();
    expect(nextCursor([{ updatedAt: null }, {}])).toBeNull();
  });
});
