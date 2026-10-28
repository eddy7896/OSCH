import 'package:drift/drift.dart';

part 'local_database.g.dart';

/// The state of one queued change. A change that the server accepted is DELETED from the outbox (the server now holds it);
/// a change the server refused stays as [failed] with its reason until the person dismisses it (ADR-0014 decision 4).
abstract final class OutboxState {
  static const queued = 'queued';
  static const sending = 'sending';
  static const failed = 'failed';
}

/// The sync queue (ADR-0003: an outbox table). Each row is one change the phone owes the gateway.
///
/// * [id] is the idempotency key, made on the device (a UUID): the same id sent twice is one change on the server
///   (`documentation/modules/offline-sync.md` rule 1).
/// * [seq] orders the queue. It is a counter on this device, never a clock (rule 4: the device clock decides nothing).
/// * [createdAtMs] is the device's clock and is for display only ("saved on this device at ...").
/// * [parentId] is another outbox row this one waits for (a mark waits for its exam being confirmed): rule 2.
@DataClassName('OutboxRow')
class OutboxItems extends Table {
  TextColumn get id => text()();
  IntColumn get seq => integer().autoIncrement()();
  TextColumn get kind => text()();
  TextColumn get body => text()();
  TextColumn get state => text().withDefault(const Constant(OutboxState.queued))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  IntColumn get nextAttemptAtMs => integer().nullable()();
  TextColumn get lastErrorCode => text().nullable()();
  TextColumn get lastErrorMessage => text().nullable()();
  TextColumn get parentId => text().nullable()();
  TextColumn get deviceId => text()();
  TextColumn get baseVersion => text().nullable()();
  IntColumn get createdAtMs => integer()();

  @override
  List<Set<Column>> get uniqueKeys => [
        {id},
      ];
}

/// Where the last pull stopped, per scope ("tombstones", "timetable", ...). The value is whatever the gateway gave back
/// (a server time or a `next` cursor), never a device time.
@DataClassName('CursorRow')
class SyncCursors extends Table {
  TextColumn get scope => text()();
  TextColumn get value => text()();
  IntColumn get updatedAtMs => integer()();

  @override
  Set<Column> get primaryKey => {scope};
}

/// The phone's copy of what the screens show: the UI reads from here, never from the network (ADR rule: local database is the
/// source of truth). One row per record the gateway has told us about, keyed by the gateway's own entity type and id, so a
/// tombstone (`entityType`, `entityId`) removes exactly one row. [json] is the record as the gateway's DTO; screens decode it
/// with the generated models. [parentId] names the record it belongs to (a class, an exam) so a list, and the cascade of a
/// removed parent, are one indexed query.
@DataClassName('RecordRow')
@TableIndex(name: 'records_by_parent', columns: {#entityType, #parentId})
class LocalRecords extends Table {
  TextColumn get entityType => text()();
  TextColumn get id => text()();
  TextColumn get parentId => text().nullable()();
  TextColumn get json => text()();
  IntColumn get fetchedAtMs => integer()();

  @override
  Set<Column> get primaryKey => {entityType, id};
}

/// Work in progress that has not been submitted (attendance exceptions being ticked, marks being typed). A draft is not an
/// outbox item: nothing is owed to the server until the person submits. It survives the app being killed.
@DataClassName('DraftRow')
class Drafts extends Table {
  TextColumn get kind => text()();
  TextColumn get key => text()();
  TextColumn get json => text()();
  IntColumn get updatedAtMs => integer()();

  @override
  Set<Column> get primaryKey => {kind, key};
}

/// Single-value facts about this install.
@DataClassName('MetaRow')
class DeviceMeta extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

/// The phone's local database for ONE school and ONE account. Signing out, or switching school, calls [wipe] (ADR-0014
/// decision 5). The outbox is never touched by a schema migration except to add to it (a migration must not lose a change the
/// person has not yet sent).
@DriftDatabase(tables: [OutboxItems, SyncCursors, LocalRecords, Drafts, DeviceMeta])
class OruLocalDatabase extends _$OruLocalDatabase {
  /// [e] is the executor: `driftDatabase(name: ...)` (from `drift_flutter`) in an installed app, `NativeDatabase.memory()` or a
  /// temporary file in a test.
  OruLocalDatabase(super.e);

  /// Bump on every change of the tables above, add a step to [migration], dump the schema (`dart run drift_dev schema dump`)
  /// and add a test that migrates from the previous dump.
  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          // No earlier version exists yet. A future step goes here, one `if (from < N)` block per version, additive only for
          // `outbox_items`.
          throw StateError('no migration from schema $from to $to');
        },
        beforeOpen: (details) async {
          // A process killed mid-send leaves rows as `sending`: nothing is in flight now, so they are owed again. The server
          // treats a repeated id as the same change, so sending again is safe.
          await (update(outboxItems)..where((t) => t.state.equals(OutboxState.sending))).write(const OutboxItemsCompanion(state: Value(OutboxState.queued)));
        },
      );

  /// Deletes everything this database holds (sign-out, or a different school).
  Future<void> wipe() => transaction(() async {
        for (final t in allTables) {
          await delete(t).go();
        }
      });
}
