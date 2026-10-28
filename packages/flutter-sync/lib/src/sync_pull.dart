import 'dart:async';

import 'local_store.dart';
import 'sync_engine.dart';
import 'sync_state.dart';

/// A pull that did not work. [offline] is true when nothing reached the server.
class PullFailure implements Exception {
  const PullFailure(this.code, {this.offline = false, this.message});
  final String code;
  final bool offline;
  final String? message;

  @override
  String toString() => 'PullFailure($code${offline ? ', offline' : ''}${message == null ? '' : ', $message'})';
}

/// One record as the gateway sent it, ready for the local copy. [parentId] ties it to what it hangs off (a class's roster to the
/// class), so a removal of the parent takes it too.
typedef PulledRecord = ({String id, String? parentId, Map<String, dynamic> json});

/// One thing to pull: fetch it from the gateway and store it. Tasks are small and written per screen; [entityType] should be the
/// gateway's own name where the gateway tombstones that kind (`TimetableEntry`, `Substitution`, `AttendanceMark`, `Mark`) and the
/// record id the gateway's id, so a tombstone finds it.
class PullTask {
  const PullTask(this.entityType, this._run);

  /// The whole list of a type is the truth: what the server no longer lists is removed here too.
  factory PullTask.list(String entityType, Future<List<PulledRecord>> Function() fetch) =>
      PullTask(entityType, (store) async => store.replaceAllRecords(entityType, await fetch()));

  /// A list per parent (the roster of each class): each parent's records replaced by what the server lists for it.
  factory PullTask.perParent(String entityType, Future<List<String>> Function() parents, Future<List<({String id, Map<String, dynamic> json})>> Function(String parentId) fetch) =>
      PullTask(entityType, (store) async {
        for (final p in await parents()) {
          await store.replaceRecords(entityType, parentId: p, records: await fetch(p));
        }
      });

  final String entityType;
  final Future<void> Function(OruLocalStore store) _run;
  Future<void> run(OruLocalStore store) => _run(store);
}

/// A page of removals from the gateway.
class TombstonePage {
  const TombstonePage({required this.removed, required this.more, required this.next});
  final List<({String entityType, String entityId})> removed;
  final bool more;

  /// The moment to ask from next time (the server's own clock, offline-sync rule 4).
  final String next;
}

abstract interface class TombstoneSource {
  /// `GET /v1/sync/tombstones?since=`; throws [PullFailure].
  Future<TombstonePage> since(String since);
}

const tombstoneCursor = 'tombstones';

/// The first ask: all of history. The device's clock is never used to guess a later start (rule 4), so a fresh install reads every
/// removal once; they are removals of records it does not have yet, so applying them changes nothing but the cursor.
const tombstoneBeginning = '1970-01-01T00:00:00.000Z';

/// Push, then pull (offline-sync rule 3), and the one state to show for it. Used by the apps as `syncNow()` on a pull-to-refresh,
/// when the app opens, when the connection returns, and after the person saves something.
class SyncCoordinator {
  SyncCoordinator({required this.store, required this.engine, required this.tombstones, this.tasks = const [], int Function()? nowMs})
      : _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch);

  final OruLocalStore store;
  final SyncEngine engine;
  final TombstoneSource tombstones;
  final List<PullTask> tasks;
  final int Function() _nowMs;

  PullStatus _pull = const PullStatus.never();
  int? _lastSyncedAtMs;
  bool _pulling = false;
  final _pullChanges = StreamController<PullStatus>.broadcast(sync: true);

  PullStatus get pullStatus => _pull;

  /// Sends what is owed, then pulls the lists and the removals. Calls during a pull are folded into it.
  Future<void> syncNow() async {
    await engine.pass();
    if (_pulling) return;
    _pulling = true;
    try {
      await _pullAll();
      _set(PullStatus.ok(_nowMs()));
      _lastSyncedAtMs = _nowMs();
    } on PullFailure catch (e) {
      _set(e.offline ? const PullStatus.offline() : PullStatus.failed(e.code));
    } finally {
      _pulling = false;
    }
  }

  Future<void> _pullAll() async {
    for (final t in tasks) {
      await t.run(store);
    }
    // Removals last: a list pulled just now may still hold a record removed an instant ago.
    var since = await store.cursor(tombstoneCursor) ?? tombstoneBeginning;
    while (true) {
      final page = await tombstones.since(since);
      await store.applyTombstones(page.removed, cursorScope: tombstoneCursor, next: page.next);
      if (!page.more) break;
      // A server that says "more" and gives the same place again would loop for ever.
      if (page.next == since) throw const PullFailure('PAGING_STUCK');
      since = page.next;
    }
  }

  void _set(PullStatus s) {
    _pull = s;
    _pullChanges.add(s);
  }

  SyncSnapshot _snapshot(OutboxCounts c) => SyncSnapshot(
        state: deriveSyncState(counts: c, activity: engine.activity, pull: _pull),
        owed: c.pending,
        failed: c.failed,
        lastSyncedAtMs: _lastSyncedAtMs,
      );

  /// What `SyncStatus` shows, re-emitted whenever the queue, the engine or the last pull changes.
  Stream<SyncSnapshot> watch() {
    late StreamController<SyncSnapshot> out;
    final subs = <StreamSubscription<Object?>>[];
    OutboxCounts? latest;
    void emit() {
      final c = latest;
      if (c != null) out.add(_snapshot(c));
    }

    out = StreamController<SyncSnapshot>(
      onListen: () {
        subs.add(store.watchCounts().listen((c) {
          latest = c;
          emit();
        }));
        subs.add(engine.activityChanges.listen((_) => emit()));
        subs.add(_pullChanges.stream.listen((_) => emit()));
      },
      onCancel: () async {
        for (final s in subs) {
          await s.cancel();
        }
      },
    );
    return out.stream.distinct();
  }

  Future<SyncSnapshot> snapshot() async => _snapshot(await store.counts());

  Future<void> dispose() => _pullChanges.close();
}
