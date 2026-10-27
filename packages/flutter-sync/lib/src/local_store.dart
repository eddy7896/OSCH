import 'dart:convert';
import 'dart:math';

import 'package:drift/drift.dart';

import 'local_database.dart';

/// One change the phone owes the gateway, as the engine and the screens see it.
class OutboxEntry {
  const OutboxEntry({
    required this.id,
    required this.seq,
    required this.kind,
    required this.body,
    required this.state,
    required this.attempts,
    required this.nextAttemptAtMs,
    required this.lastErrorCode,
    required this.lastErrorMessage,
    required this.parentId,
    required this.deviceId,
    required this.baseVersion,
    required this.createdAtMs,
  });

  factory OutboxEntry.fromRow(OutboxRow r) => OutboxEntry(
        id: r.id,
        seq: r.seq,
        kind: r.kind,
        body: jsonDecode(r.body) as Map<String, dynamic>,
        state: r.state,
        attempts: r.attempts,
        nextAttemptAtMs: r.nextAttemptAtMs,
        lastErrorCode: r.lastErrorCode,
        lastErrorMessage: r.lastErrorMessage,
        parentId: r.parentId,
        deviceId: r.deviceId,
        baseVersion: r.baseVersion,
        createdAtMs: r.createdAtMs,
      );

  /// The idempotency key: the gateway treats a repeat of it as the same change.
  final String id;

  /// The order on this device; oldest first.
  final int seq;
  final String kind;
  final Map<String, dynamic> body;
  final String state;
  final int attempts;
  final int? nextAttemptAtMs;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final String? parentId;
  final String deviceId;
  final String? baseVersion;

  /// The device's clock, for display only.
  final int createdAtMs;
}

/// What the `SyncStatus` widget is told: how much is waiting and whether anything needs the person.
class OutboxCounts {
  const OutboxCounts({required this.queued, required this.sending, required this.failed});
  final int queued;
  final int sending;
  final int failed;

  /// Changes not yet safe on the server (`pending` in the six states).
  int get pending => queued + sending;

  @override
  bool operator ==(Object other) => other is OutboxCounts && other.queued == queued && other.sending == sending && other.failed == failed;

  @override
  int get hashCode => Object.hash(queued, sending, failed);

  @override
  String toString() => 'OutboxCounts(queued: $queued, sending: $sending, failed: $failed)';
}

/// The code a change gets when the change it depended on was refused: it cannot succeed either.
const parentRefusedCode = 'PARENT_REFUSED';

/// The phone's side of the sync contract (`documentation/modules/offline-sync.md`): the outbox, the local copy of what the
/// screens show, drafts, and the pull cursors. It holds no network code; the engine (P4-2b, P4-2c) drives it.
class OruLocalStore {
  /// [nowMs] and [newId] are injectable so tests are deterministic. The clock is used for display and for backoff timing
  /// only, never to order or decide anything (rule 4).
  OruLocalStore(this.db, {int Function()? nowMs, String Function()? newId})
      : _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch),
        _newId = newId ?? _uuidV4;

  final OruLocalDatabase db;
  final int Function() _nowMs;
  final String Function() _newId;

  // ---- this install ----------------------------------------------------------------------------------------------------

  /// A random id made once for this install and kept. Sent with every queued change so the server's audit trail can say
  /// which device it came from.
  Future<String> deviceId() async {
    final row = await (db.select(db.deviceMeta)..where((t) => t.key.equals('deviceId'))).getSingleOrNull();
    if (row != null) return row.value;
    final id = _newId();
    await db.into(db.deviceMeta).insert(DeviceMetaCompanion.insert(key: 'deviceId', value: id), mode: InsertMode.insertOrIgnore);
    return (await (db.select(db.deviceMeta)..where((t) => t.key.equals('deviceId'))).getSingle()).value;
  }

  // ---- outbox ----------------------------------------------------------------------------------------------------------

  /// Queues a change. Passing the same [id] again returns the existing entry and queues nothing (a double tap, or a retry of
  /// the screen's own save, is one change). [parentId] makes it wait until that change has been accepted.
  Future<OutboxEntry> enqueue({required String kind, required Map<String, dynamic> body, String? id, String? parentId, String? baseVersion}) async {
    final key = id ?? _newId();
    final device = await deviceId();
    return db.transaction(() async {
      final existing = await (db.select(db.outboxItems)..where((t) => t.id.equals(key))).getSingleOrNull();
      if (existing != null) return OutboxEntry.fromRow(existing);
      // A change that depends on one the server already refused can never succeed: it is failed at once, not left waiting.
      final parent = parentId == null ? null : await (db.select(db.outboxItems)..where((t) => t.id.equals(parentId))).getSingleOrNull();
      final doomed = parent != null && parent.state == OutboxState.failed;
      await db.into(db.outboxItems).insert(OutboxItemsCompanion.insert(
            id: key,
            kind: kind,
            body: jsonEncode(body),
            state: Value(doomed ? OutboxState.failed : OutboxState.queued),
            lastErrorCode: Value(doomed ? parentRefusedCode : null),
            parentId: Value(parentId),
            deviceId: device,
            baseVersion: Value(baseVersion),
            createdAtMs: _nowMs(),
          ));
      return OutboxEntry.fromRow(await (db.select(db.outboxItems)..where((t) => t.id.equals(key))).getSingle());
    });
  }

  Future<OutboxEntry?> entry(String id) async {
    final r = await (db.select(db.outboxItems)..where((t) => t.id.equals(id))).getSingleOrNull();
    return r == null ? null : OutboxEntry.fromRow(r);
  }

  /// Everything in the queue, oldest first.
  Future<List<OutboxEntry>> all() async => [for (final r in await (db.select(db.outboxItems)..orderBy([(t) => OrderingTerm.asc(t.seq)])).get()) OutboxEntry.fromRow(r)];

  /// The refused changes, for the person to read and dismiss.
  Future<List<OutboxEntry>> failed() async =>
      [for (final r in await (db.select(db.outboxItems)..where((t) => t.state.equals(OutboxState.failed))..orderBy([(t) => OrderingTerm.asc(t.seq)])).get()) OutboxEntry.fromRow(r)];

  /// The oldest change that may be sent now: queued, past its retry time, and not waiting for a parent that is still in the
  /// queue (rule 2: parents before children). Null when there is nothing to send. One item at a time keeps the order exact.
  Future<OutboxEntry?> nextDue() async {
    final now = _nowMs();
    final parent = db.alias(db.outboxItems, 'parent'); // the same table under another name, or the subquery would compare a row with itself
    final q = db.select(db.outboxItems)
      ..where((t) => t.state.equals(OutboxState.queued) & (t.nextAttemptAtMs.isNull() | t.nextAttemptAtMs.isSmallerOrEqualValue(now)))
      ..where((t) => t.parentId.isNull() | notExistsQuery(db.select(parent)..where((p) => p.id.equalsExp(t.parentId))))
      ..orderBy([(t) => OrderingTerm.asc(t.seq)])
      ..limit(1);
    final r = await q.getSingleOrNull();
    return r == null ? null : OutboxEntry.fromRow(r);
  }

  /// The soonest time a queued change becomes due again (the engine sleeps until then), or null.
  Future<int?> nextRetryAtMs() async {
    final r = await (db.select(db.outboxItems)
          ..where((t) => t.state.equals(OutboxState.queued) & t.nextAttemptAtMs.isNotNull())
          ..orderBy([(t) => OrderingTerm.asc(t.nextAttemptAtMs)])
          ..limit(1))
        .getSingleOrNull();
    return r?.nextAttemptAtMs;
  }

  Future<void> markSending(String id) => (db.update(db.outboxItems)..where((t) => t.id.equals(id))).write(const OutboxItemsCompanion(state: Value(OutboxState.sending)));

  /// The server accepted it (or answered that it already had it): the change is no longer owed, so the row goes.
  Future<void> markDone(String id) => (db.delete(db.outboxItems)..where((t) => t.id.equals(id))).go();

  /// A transient failure (no network, timeout, a 5xx, a rate limit): keep it, count the attempt, try again after [backoffMs].
  Future<void> markRetry(String id, {required String code, String? message, required int backoffMs}) =>
      (db.customUpdate(
        'UPDATE outbox_items SET state = ?, attempts = attempts + 1, next_attempt_at_ms = ?, last_error_code = ?, last_error_message = ? WHERE id = ?',
        variables: [Variable<String>(OutboxState.queued), Variable<int>(_nowMs() + backoffMs), Variable<String>(code), Variable<String>(message), Variable<String>(id)],
        updates: {db.outboxItems},
      ));

  /// The server refused it for good (a 4xx): rule 5, shown to the person and never retried. Whatever waited for it can never
  /// succeed either and is failed with [parentRefusedCode], so nothing sits in the queue forever.
  Future<void> markRefused(String id, {required String code, String? message}) => db.transaction(() async {
        await (db.update(db.outboxItems)..where((t) => t.id.equals(id))).write(OutboxItemsCompanion(
          state: const Value(OutboxState.failed),
          lastErrorCode: Value(code),
          lastErrorMessage: Value(message),
          nextAttemptAtMs: const Value(null),
        ));
        var frontier = [id];
        while (frontier.isNotEmpty) {
          final children = await (db.select(db.outboxItems)..where((t) => t.parentId.isIn(frontier) & t.state.equals(OutboxState.failed).not())).get();
          if (children.isEmpty) break;
          final ids = [for (final c in children) c.id];
          await (db.update(db.outboxItems)..where((t) => t.id.isIn(ids))).write(const OutboxItemsCompanion(
            state: Value(OutboxState.failed),
            lastErrorCode: Value(parentRefusedCode),
            nextAttemptAtMs: Value(null),
          ));
          frontier = ids;
        }
      });

  /// The person has read the refusal: remove it, and what failed because of it. A change that is not failed cannot be dismissed.
  Future<void> dismiss(String id) => db.transaction(() async {
        final row = await (db.select(db.outboxItems)..where((t) => t.id.equals(id))).getSingleOrNull();
        if (row == null || row.state != OutboxState.failed) return;
        var frontier = [id];
        final doomed = <String>{id};
        while (frontier.isNotEmpty) {
          final children = await (db.select(db.outboxItems)..where((t) => t.parentId.isIn(frontier) & t.state.equals(OutboxState.failed))).get();
          frontier = [for (final c in children) c.id]..removeWhere(doomed.contains);
          doomed.addAll(frontier);
        }
        await (db.delete(db.outboxItems)..where((t) => t.id.isIn(doomed))).go();
      });

  Stream<OutboxCounts> watchCounts() {
    final q = db.customSelect(
      'SELECT '
      "COALESCE(SUM(state = 'queued'), 0) AS queued, "
      "COALESCE(SUM(state = 'sending'), 0) AS sending, "
      "COALESCE(SUM(state = 'failed'), 0) AS failed "
      'FROM outbox_items',
      readsFrom: {db.outboxItems},
    );
    return q.watchSingle().map((r) => OutboxCounts(queued: r.read<int>('queued'), sending: r.read<int>('sending'), failed: r.read<int>('failed'))).distinct();
  }

  Future<OutboxCounts> counts() => watchCounts().first;

  // ---- what the screens read ---------------------------------------------------------------------------------------------

  /// Stores records the gateway sent. A record already held is replaced.
  Future<void> upsertRecords(String entityType, Iterable<({String id, String? parentId, Map<String, dynamic> json})> records) => db.batch((b) {
        final now = _nowMs();
        for (final r in records) {
          b.insert(
            db.localRecords,
            LocalRecordsCompanion.insert(entityType: entityType, id: r.id, parentId: Value(r.parentId), json: jsonEncode(r.json), fetchedAtMs: now),
            mode: InsertMode.insertOrReplace,
          );
        }
      });

  Future<Map<String, dynamic>?> record(String entityType, String id) async {
    final r = await (db.select(db.localRecords)..where((t) => t.entityType.equals(entityType) & t.id.equals(id))).getSingleOrNull();
    return r == null ? null : jsonDecode(r.json) as Map<String, dynamic>;
  }

  /// All records of a type, or those of one parent, in a stable order (by id).
  Future<List<Map<String, dynamic>>> records(String entityType, {String? parentId}) async {
    final q = db.select(db.localRecords)
      ..where((t) => t.entityType.equals(entityType) & (parentId == null ? const Constant(true) : t.parentId.equals(parentId)))
      ..orderBy([(t) => OrderingTerm.asc(t.id)]);
    return [for (final r in await q.get()) jsonDecode(r.json) as Map<String, dynamic>];
  }

  /// The same list as a stream, which re-emits when it changes: what a screen listens to.
  Stream<List<Map<String, dynamic>>> watchRecords(String entityType, {String? parentId}) {
    final q = db.select(db.localRecords)
      ..where((t) => t.entityType.equals(entityType) & (parentId == null ? const Constant(true) : t.parentId.equals(parentId)))
      ..orderBy([(t) => OrderingTerm.asc(t.id)]);
    return q.watch().map((rows) => [for (final r in rows) jsonDecode(r.json) as Map<String, dynamic>]);
  }

  /// Replaces ALL records of a type under one parent with exactly the given list: a pull of a whole list (a class's roster)
  /// is the truth, so a record the server no longer lists is gone here too.
  Future<void> replaceRecords(String entityType, {required String parentId, required Iterable<({String id, Map<String, dynamic> json})> records}) => db.transaction(() async {
        await (db.delete(db.localRecords)..where((t) => t.entityType.equals(entityType) & t.parentId.equals(parentId))).go();
        await upsertRecords(entityType, [for (final r in records) (id: r.id, parentId: parentId, json: r.json)]);
      });

  /// A tombstone from the gateway (`GET /v1/sync/tombstones`): the record is gone, and so is whatever hung off it (a removed
  /// lesson takes its cover with it, offline-sync rule 3).
  Future<void> applyTombstone({required String entityType, required String entityId}) => db.transaction(() async {
        await (db.delete(db.localRecords)..where((t) => t.entityType.equals(entityType) & t.id.equals(entityId))).go();
        await (db.delete(db.localRecords)..where((t) => t.parentId.equals(entityId))).go();
      });

  // ---- drafts ------------------------------------------------------------------------------------------------------------

  Future<void> saveDraft(String kind, String key, Map<String, dynamic> json) => db.into(db.drafts).insert(
        DraftsCompanion.insert(kind: kind, key: key, json: jsonEncode(json), updatedAtMs: _nowMs()),
        mode: InsertMode.insertOrReplace,
      );

  Future<Map<String, dynamic>?> draft(String kind, String key) async {
    final r = await (db.select(db.drafts)..where((t) => t.kind.equals(kind) & t.key.equals(key))).getSingleOrNull();
    return r == null ? null : jsonDecode(r.json) as Map<String, dynamic>;
  }

  Future<void> clearDraft(String kind, String key) => (db.delete(db.drafts)..where((t) => t.kind.equals(kind) & t.key.equals(key))).go();

  // ---- pull cursors ------------------------------------------------------------------------------------------------------

  Future<String?> cursor(String scope) async => (await (db.select(db.syncCursors)..where((t) => t.scope.equals(scope))).getSingleOrNull())?.value;

  Future<void> setCursor(String scope, String value) => db.into(db.syncCursors).insert(
        SyncCursorsCompanion.insert(scope: scope, value: value, updatedAtMs: _nowMs()),
        mode: InsertMode.insertOrReplace,
      );

  // ---- sign-out ----------------------------------------------------------------------------------------------------------

  /// Deletes everything (sign-out, or a different school): ADR-0014 decision 5. A change not yet sent is lost with it, which is
  /// why the app asks before signing out while the outbox is not empty.
  Future<void> wipe() => db.wipe();
}

String _uuidV4() {
  final b = List<int>.generate(16, (_) => _random.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int from, int to) => b.sublist(from, to).map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h(0, 4)}-${h(4, 6)}-${h(6, 8)}-${h(8, 10)}-${h(10, 16)}';
}

final _random = Random.secure();
