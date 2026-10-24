import type { DataConnect } from 'firebase-admin/data-connect';
import * as sdk from '@oruschools/erp-admin-sdk';
import { mapDataConnectError } from './errors.js';

const usingEmulator = (): boolean => Boolean(process.env['DATA_CONNECT_EMULATOR_HOST']);
/** True for the emulator's "cannot create transaction ... idle in transaction" failure, which happens before any statement runs. */
export function isEmulatorConnectionGlitch(error: unknown): boolean {
  let text = '';
  try {
    text = `${(error as { message?: string } | null)?.message ?? ''} ${JSON.stringify((error as { response?: unknown } | null)?.response ?? '')} ${JSON.stringify((error as { httpResponse?: unknown } | null)?.httpResponse ?? '')}`;
  } catch {
    return false;
  }
  return /cannot create transaction/.test(text) && /idle in transaction/.test(text);
}

type Sdk = typeof sdk;
type OperationName = { [K in keyof Sdk]: Sdk[K] extends (...args: never[]) => Promise<unknown> ? K : never }[keyof Sdk];

/** Every generated operation with the DataConnect instance already bound; the types come from the generated SDK. */
export type Operations = { [K in OperationName]: (...args: Parameters<Sdk[K]>) => ReturnType<Sdk[K]> };

/**
 * Binds each generated operation to one DataConnect instance and converts failures into DatabaseError.
 * `source` is injectable so unit tests can use a fake SDK.
 */
export function bindOperations(dc: DataConnect, source: Record<string, unknown> = sdk): Operations {
  const bound: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(source)) {
    if (typeof value !== 'function') continue; // enums and connectorConfig
    bound[name] = async (...args: unknown[]) => {
      for (let attempt = 1; ; attempt++) {
        try {
          return await (value as (...a: unknown[]) => Promise<unknown>)(dc, ...args);
        } catch (error) {
          // The LOCAL emulator's database connection is sometimes handed back "idle in transaction" after a deliberately refused
          // write; the next call then fails before it runs anything. Retrying such a call is safe (nothing executed) and is done only
          // against the emulator, so the test suites do not fail at random. Real Cloud SQL is never retried here.
          if (attempt < 3 && usingEmulator() && isEmulatorConnectionGlitch(error)) {
            await new Promise((r) => setTimeout(r, 25 * attempt));
            continue;
          }
          throw mapDataConnectError(error);
        }
      }
    };
  }
  return bound as Operations;
}
