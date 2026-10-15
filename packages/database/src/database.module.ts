import { Global, Module, type DynamicModule } from '@nestjs/common';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getDataConnect } from 'firebase-admin/data-connect';
import * as sdk from '@oruschools/erp-admin-sdk';
import { bindOperations, type Operations } from './operations.js';

/** Injection token for the bound operations: `@Inject(DATABASE) db: Database`. */
export const DATABASE = Symbol('DATABASE');
export type Database = Operations;

export const FIREBASE_APP_NAME = 'oruschools';

export interface DatabaseModuleOptions {
  /** Firebase project id. Required against real Firebase; any value works against the emulator. */
  projectId: string;
}

/**
 * The only way the gateway reaches the database (ADR-0008). Operations run as admin and ignore auth directives, so
 * the NO_ACCESS operations are callable here and nowhere else; tenant scoping is the caller's `schoolId` argument
 * plus the @check rules inside each operation. Against the emulator, set DATA_CONNECT_EMULATOR_HOST (host:port).
 */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATABASE, useFactory: (): Database => createDatabase(options) }],
      exports: [DATABASE],
    };
  }
}

export function createDatabase(options: DatabaseModuleOptions): Database {
  const app = getApps().some((a) => a.name === FIREBASE_APP_NAME) ? getApp(FIREBASE_APP_NAME) : initializeApp({ projectId: options.projectId }, FIREBASE_APP_NAME);
  return bindOperations(getDataConnect(sdk.connectorConfig, app));
}
