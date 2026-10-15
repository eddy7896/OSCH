export { DATABASE, DatabaseModule, FIREBASE_APP_NAME, createDatabase, type Database, type DatabaseModuleOptions } from './database.module.js';
export { DatabaseError, mapDataConnectError, type DatabaseErrorKind } from './errors.js';
export { bindOperations, type Operations } from './operations.js';
// Enums and variable/data types of the generated SDK, for callers that build operation arguments.
export { AcademicYearStatus, GlobalRole, InvoiceStatus, LeaveStatus, PayrollStatus, SchoolRole } from '@oruschools/erp-admin-sdk';
export type { Int64String, UUIDString, DateString, TimestampString } from '@oruschools/erp-admin-sdk';
