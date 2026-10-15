import type { DataConnect } from 'firebase-admin/data-connect';
import * as sdk from '@oruschools/erp-admin-sdk';
import { mapDataConnectError } from './errors.js';

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
      try {
        return await (value as (...a: unknown[]) => Promise<unknown>)(dc, ...args);
      } catch (error) {
        throw mapDataConnectError(error);
      }
    };
  }
  return bound as Operations;
}
