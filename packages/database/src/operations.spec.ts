import type { DataConnect } from 'firebase-admin/data-connect';
import { bindOperations } from './operations.js';
import { DatabaseError } from './errors.js';
import * as realSdk from '@oruschools/erp-admin-sdk';

const dc = { tag: 'fake-dc' } as unknown as DataConnect;

describe('bindOperations', () => {
  it('passes the bound DataConnect first and the caller arguments after it', async () => {
    const calls: unknown[][] = [];
    const ops = bindOperations(dc, { createThing: async (...a: unknown[]) => (calls.push(a), { data: 1 }), SomeEnum: { A: 'A' }, connectorConfig: {} }) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
    await expect(ops.createThing!({ id: 1 }, { x: 2 })).resolves.toEqual({ data: 1 });
    expect(calls[0]).toEqual([dc, { id: 1 }, { x: 2 }]);
    expect(ops.SomeEnum).toBeUndefined();
    expect(ops.connectorConfig).toBeUndefined();
  });

  it('turns a failing call into a DatabaseError', async () => {
    const ops = bindOperations(dc, { boom: async () => Promise.reject({ code: 'app/network-error' }) }) as unknown as Record<string, () => Promise<unknown>>;
    await expect(ops.boom!()).rejects.toMatchObject({ name: 'DatabaseError', kind: 'UNAVAILABLE' });
    await expect(ops.boom!()).rejects.toBeInstanceOf(DatabaseError);
  });

  it('binds every function the generated SDK exports (24 operations at generation time) and nothing else', () => {
    const ops = bindOperations(dc);
    const fns = Object.entries(realSdk).filter(([, v]) => typeof v === 'function').map(([k]) => k);
    expect(Object.keys(ops).sort()).toEqual(fns.sort());
    expect(fns.length).toBeGreaterThanOrEqual(24);
  });
});
