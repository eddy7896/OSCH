/// OruSchools offline sync, the device side (ADR-0003, ADR-0014; the contract with the gateway is
/// `documentation/modules/offline-sync.md`).
///
/// This package holds the phone's local database, the queue of changes it owes the gateway, and the engine that sends them
/// (P4-2b; the pull side is P4-2c). This library has no network code and no Flutter UI code: the engine talks to the gateway
/// through an [OutboxSender], and `package:flutter_sync/api_sender.dart` is the one that uses the generated client. The apps
/// give the database an executor (`driftDatabase(...)` from `drift_flutter` in an app, `NativeDatabase.memory()` in a test).
library;

export 'src/local_database.dart' show OruLocalDatabase, OutboxState;
export 'src/local_store.dart';
export 'src/sync_engine.dart';
