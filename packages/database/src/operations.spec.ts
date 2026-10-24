import type { DataConnect } from 'firebase-admin/data-connect';
import { bindOperations, isEmulatorConnectionGlitch } from './operations.js';
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

  describe('emulator connection glitch (local test runs only)', () => {
    const glitch = () => Object.assign(new Error('SQL execution failed'), { response: { errors: [{ message: 'cannot create transaction: pq: unexpected transaction status idle in transaction' }] } });
    const saved = process.env['DATA_CONNECT_EMULATOR_HOST'];
    afterEach(() => (saved === undefined ? delete process.env['DATA_CONNECT_EMULATOR_HOST'] : (process.env['DATA_CONNECT_EMULATOR_HOST'] = saved)));

    it('recognises the glitch and nothing else', () => {
      expect(isEmulatorConnectionGlitch(glitch())).toBe(true);
      expect(isEmulatorConnectionGlitch(new Error('violates SQL unique constraint'))).toBe(false);
      expect(isEmulatorConnectionGlitch({ code: 'app/network-error' })).toBe(false);
      expect(isEmulatorConnectionGlitch(null)).toBe(false);
    });
    it('retries a glitch against the emulator, then succeeds', async () => {
      process.env['DATA_CONNECT_EMULATOR_HOST'] = '127.0.0.1:9399';
      let n = 0;
      const ops = bindOperations(dc, { flaky: async () => (++n < 3 ? Promise.reject(glitch()) : { data: 'ok' }) }) as unknown as Record<string, () => Promise<unknown>>;
      await expect(ops.flaky!()).resolves.toEqual({ data: 'ok' });
      expect(n).toBe(3);
    });
    it('gives up after three tries and still reports an error', async () => {
      process.env['DATA_CONNECT_EMULATOR_HOST'] = '127.0.0.1:9399';
      let n = 0;
      const ops = bindOperations(dc, { always: async () => (++n, Promise.reject(glitch())) }) as unknown as Record<string, () => Promise<unknown>>;
      await expect(ops.always!()).rejects.toBeInstanceOf(DatabaseError);
      expect(n).toBe(3);
    });
    it('never retries against the real service (no emulator host)', async () => {
      delete process.env['DATA_CONNECT_EMULATOR_HOST'];
      let n = 0;
      const ops = bindOperations(dc, { once: async () => (++n, Promise.reject(glitch())) }) as unknown as Record<string, () => Promise<unknown>>;
      await expect(ops.once!()).rejects.toBeInstanceOf(DatabaseError);
      expect(n).toBe(1);
    });
  });

  it('binds every function the generated SDK exports (24 operations at generation time) and nothing else', () => {
    const ops = bindOperations(dc);
    const fns = Object.entries(realSdk).filter(([, v]) => typeof v === 'function').map(([k]) => k);
    expect(Object.keys(ops).sort()).toEqual(fns.sort());
    expect(fns.length).toBeGreaterThanOrEqual(24);
  });
});
