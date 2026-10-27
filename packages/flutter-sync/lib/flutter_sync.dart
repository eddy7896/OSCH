/// OruSchools offline sync, the device side (ADR-0003, ADR-0014; the contract with the gateway is
/// `documentation/modules/offline-sync.md`).
///
/// This package holds the phone's local database and the queue of changes it owes the gateway. It has no network code and no
/// Flutter UI code: the engine that drives it (P4-2b, P4-2c) and the apps give it a database executor
/// (`driftDatabase(...)` from `drift_flutter` in an app, `NativeDatabase.memory()` in a test).
library;

export 'src/local_database.dart' show OruLocalDatabase, OutboxState;
export 'src/local_store.dart';
