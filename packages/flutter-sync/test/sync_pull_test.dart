import 'dart:math';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

class Clock {
  int now = 5000000;
  int call() => now;
}

class FakeSender implements OutboxSender {
  final order = <String>[];
  SendResult Function(OutboxEntry e) answer = (_) => const SendResult.accepted();
  @override
  Future<SendResult> send(OutboxEntry e) async {
    order.add('push:${e.id}');
    return answer(e);
  }
}

class FakeTombstones implements TombstoneSource {
  FakeTombstones(this.log);
  final List<String> log;
  final pages = <String, TombstonePage>{}; // by `since`
  Object? failWith;
  final asked = <String>[];

  @override
  Future<TombstonePage> since(String since) async {
    asked.add(since);
    log.add('tombstones:$since');
    if (failWith != null) throw failWith!;
    return pages[since] ?? TombstonePage(removed: const [], more: false, next: since);
  }
}

PulledRecord rec(String id, {String? parent, Map<String, dynamic>? json}) => (id: id, parentId: parent, json: json ?? {'id': id});

class Rig {
  Rig() : db = OruLocalDatabase(NativeDatabase.memory()), clock = Clock() {
    store = OruLocalStore(db, nowMs: clock.call, newId: () => 'gen-${_n++}');
    engine = SyncEngine(store: store, sender: sender, nowMs: clock.call, random: Random(1));
    tombstones = FakeTombstones(sender.order);
  }
  final OruLocalDatabase db;
  final Clock clock;
  final sender = FakeSender();
  late final OruLocalStore store;
  late final SyncEngine engine;
  late final FakeTombstones tombstones;
  int _n = 0;
  SyncCoordinator coordinator([List<PullTask> tasks = const []]) => SyncCoordinator(store: store, engine: engine, tombstones: tombstones, tasks: tasks, nowMs: clock.call);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  group('the state shown (deriveSyncState)', () {
    const none = OutboxCounts(queued: 0, sending: 0, failed: 0);
    const ok = PullStatus.ok(1);
    test('each of the six, by its rule', () {
      expect(deriveSyncState(counts: none, activity: EngineActivity.idle, pull: ok), SyncState.synced);
      expect(deriveSyncState(counts: const OutboxCounts(queued: 2, sending: 0, failed: 0), activity: EngineActivity.idle, pull: ok), SyncState.saved);
      expect(deriveSyncState(counts: const OutboxCounts(queued: 2, sending: 0, failed: 0, retrying: 1), activity: EngineActivity.idle, pull: ok), SyncState.pending);
      expect(deriveSyncState(counts: const OutboxCounts(queued: 1, sending: 1, failed: 0), activity: EngineActivity.sending, pull: ok), SyncState.syncing);
      expect(deriveSyncState(counts: const OutboxCounts(queued: 1, sending: 0, failed: 0), activity: EngineActivity.offline, pull: ok), SyncState.offline);
      expect(deriveSyncState(counts: const OutboxCounts(queued: 0, sending: 0, failed: 1), activity: EngineActivity.idle, pull: ok), SyncState.failed);
    });
    test('a refusal outranks everything; a sign-in that ran out is a failure the person must act on', () {
      expect(deriveSyncState(counts: const OutboxCounts(queued: 1, sending: 1, failed: 1), activity: EngineActivity.sending, pull: const PullStatus.offline()), SyncState.failed);
      expect(deriveSyncState(counts: none, activity: EngineActivity.signedOut, pull: ok), SyncState.failed);
    });
    test('a pull that could not reach the server is offline; one the server refused is failed; one not yet tried is not a reason to worry', () {
      expect(deriveSyncState(counts: none, activity: EngineActivity.idle, pull: const PullStatus.offline()), SyncState.offline);
      expect(deriveSyncState(counts: none, activity: EngineActivity.idle, pull: const PullStatus.failed('INTERNAL')), SyncState.failed);
      expect(deriveSyncState(counts: none, activity: EngineActivity.idle, pull: const PullStatus.never()), SyncState.synced);
    });
    test('over EVERY combination: synced only when nothing is owed, nothing failed and nothing is wrong', () {
      for (final q in [0, 1, 3]) {
        for (final s in [0, 1]) {
          for (final f in [0, 2]) {
            for (final r in [0, 1]) {
              if (r > q) continue;
              for (final a in EngineActivity.values) {
                for (final p in [const PullStatus.never(), const PullStatus.ok(1), const PullStatus.offline(), const PullStatus.failed('X')]) {
                  final c = OutboxCounts(queued: q, sending: s, failed: f, retrying: r);
                  final st = deriveSyncState(counts: c, activity: a, pull: p);
                  if (st == SyncState.synced) {
                    expect(c.pending == 0 && c.failed == 0 && a != EngineActivity.signedOut && a != EngineActivity.sending && a != EngineActivity.offline && p is! PullFailed && p is! PullOffline, isTrue, reason: '$c $a $p');
                  }
                  if (c.failed > 0) expect(st, SyncState.failed);
                  if (c.pending > 0) expect(st, isNot(SyncState.synced));
                  if (st == SyncState.saved || st == SyncState.pending) expect(c.pending, greaterThan(0));
                }
              }
            }
          }
        }
      }
    });
  });

  group('pull', () {
    test('a list pull makes the local copy exactly what the server lists', () async {
      final t = Rig();
      var served = [rec('a'), rec('b')];
      final c = t.coordinator([PullTask.list('Student', () async => served)]);
      await c.syncNow();
      expect((await t.store.records('Student')).map((r) => r['id']), ['a', 'b']);
      served = [rec('b', json: {'id': 'b', 'v': 2}), rec('c')];
      await c.syncNow();
      expect(await t.store.records('Student'), [{'id': 'b', 'v': 2}, {'id': 'c'}]);
    });

    test('a per-parent pull replaces each parent\'s records and leaves other parents alone', () async {
      final t = Rig();
      await t.store.upsertRecords('Roster', [rec('x', parent: 'other')]);
      final c = t.coordinator([
        PullTask.perParent('Roster', () async => ['c1'], (p) async => [(id: 's1', json: <String, dynamic>{'id': 's1'}), (id: 's2', json: <String, dynamic>{'id': 's2'})]),
      ]);
      await c.syncNow();
      expect((await t.store.records('Roster', parentId: 'c1')).length, 2);
      expect((await t.store.records('Roster', parentId: 'other')).length, 1);
    });

    test('push happens first, then the lists, then the removals (rule 3)', () async {
      final t = Rig();
      await t.store.enqueue(kind: 'k', body: {}, id: 'owed');
      final order = t.sender.order;
      final c = t.coordinator([PullTask.list('X', () async {
        order.add('list');
        return [];
      })]);
      await c.syncNow();
      expect(order, ['push:owed', 'list', 'tombstones:$tombstoneBeginning']);
    });

    test('E-SYNC-5: a removal on the server removes the record on the device, and what hung off it', () async {
      final t = Rig();
      await t.store.upsertRecords('TimetableEntry', [rec('lesson-1'), rec('lesson-2')]);
      await t.store.upsertRecords('Substitution', [rec('cover-1', parent: 'lesson-1'), rec('cover-2', parent: 'lesson-2')]);
      t.tombstones.pages[tombstoneBeginning] = const TombstonePage(removed: [(entityType: 'TimetableEntry', entityId: 'lesson-1')], more: false, next: '2026-01-02T00:00:00.000Z');
      await t.coordinator().syncNow();
      expect((await t.store.records('TimetableEntry')).map((r) => r['id']), ['lesson-2']);
      expect((await t.store.records('Substitution')).map((r) => r['id']), ['cover-2'], reason: 'a removed lesson takes its cover');
      expect(await t.store.cursor(tombstoneCursor), '2026-01-02T00:00:00.000Z');
    });

    test('the next pull asks from where the last one ended, and pages are followed to the end', () async {
      final t = Rig();
      t.tombstones.pages[tombstoneBeginning] = const TombstonePage(removed: [], more: true, next: 'T1');
      t.tombstones.pages['T1'] = const TombstonePage(removed: [(entityType: 'Mark', entityId: 'm1')], more: true, next: 'T2');
      t.tombstones.pages['T2'] = const TombstonePage(removed: [], more: false, next: 'T3');
      final c = t.coordinator();
      await c.syncNow();
      expect(t.tombstones.asked, [tombstoneBeginning, 'T1', 'T2']);
      await c.syncNow();
      expect(t.tombstones.asked.last, 'T3');
    });

    test('a server that says "more" but gives the same place again is a failure, not an endless loop', () async {
      final t = Rig();
      t.tombstones.pages[tombstoneBeginning] = const TombstonePage(removed: [], more: true, next: tombstoneBeginning);
      final c = t.coordinator();
      await c.syncNow();
      expect(c.pullStatus, isA<PullFailed>());
    });

    test('a failed pull moves nothing: the cursor stays and the status says why', () async {
      final t = Rig();
      await t.store.setCursor(tombstoneCursor, 'T0');
      t.tombstones.failWith = const PullFailure('NETWORK_ERROR', offline: true);
      final c = t.coordinator();
      await c.syncNow();
      expect(c.pullStatus, isA<PullOffline>());
      expect(await t.store.cursor(tombstoneCursor), 'T0');
      t.tombstones.failWith = const PullFailure('INTERNAL');
      await c.syncNow();
      expect(c.pullStatus, isA<PullFailed>());
      t.tombstones.failWith = null;
      await c.syncNow();
      expect(c.pullStatus, isA<PullOk>());
    });

    test('a page of removals and its cursor are applied together or not at all', () async {
      final t = Rig();
      await t.store.upsertRecords('Mark', [rec('m1'), rec('m2')]);
      Iterable<({String entityType, String entityId})> dies() sync* {
        yield (entityType: 'Mark', entityId: 'm1');
        throw StateError('the app died here');
      }

      await expectLater(t.store.applyTombstones(dies(), cursorScope: tombstoneCursor, next: 'T1'), throwsA(isA<StateError>()));
      expect(await t.store.cursor(tombstoneCursor), isNull, reason: 'the cursor did not move past removals that were not all applied');
      expect((await t.store.records('Mark')).length, 2, reason: 'and the first removal was rolled back with it');
    });
  });

  group('the snapshot a screen watches', () {
    test('it follows a change from saved, through syncing, to synced, and tells how many are owed', () async {
      final t = Rig();
      final c = t.coordinator();
      final seen = <SyncState>[];
      final owed = <int>[];
      final sub = c.watch().listen((s) {
        seen.add(s.state);
        owed.add(s.owed);
      });
      await pumpEventQueue();
      await t.store.enqueue(kind: 'k', body: {}, id: 'a');
      await pumpEventQueue();
      await c.syncNow();
      await pumpEventQueue();
      expect(seen.first, SyncState.synced);
      expect(seen, contains(SyncState.saved));
      expect(seen.last, SyncState.synced);
      expect(owed, contains(1));
      expect(owed.last, 0);
      expect((await c.snapshot()).lastSyncedAtMs, isNotNull);
      await sub.cancel();
    });

    test('a refused change shows as failed with its count until the person dismisses it', () async {
      final t = Rig();
      t.sender.answer = (_) => const SendResult.refused('CONFLICT');
      final c = t.coordinator();
      await t.store.enqueue(kind: 'k', body: {}, id: 'a');
      await c.syncNow();
      var s = await c.snapshot();
      expect((s.state, s.failed), (SyncState.failed, 1));
      await t.store.dismiss('a');
      await c.syncNow();
      s = await c.snapshot();
      expect(s.state, SyncState.synced);
    });
  });

  group('property: the state shown always matches the queue', () {
    test('400 random events: whatever happens, synced means nothing owed, and failed/owed counts equal the queue', () async {
      final t = Rig();
      final r = Random(11);
      final c = t.coordinator();
      var n = 0;
      for (var step = 0; step < 400; step++) {
        switch (r.nextInt(6)) {
          case 0:
          case 1:
            await t.store.enqueue(kind: 'k', body: {}, id: 'c${n++}', parentId: n > 1 && r.nextBool() ? 'c${r.nextInt(n - 1)}' : null);
          case 2:
            final p = r.nextInt(4);
            t.sender.answer = (_) => switch (p) {
                  0 => const SendResult.accepted(),
                  1 => const SendResult.refused('X'),
                  2 => const SendResult.retry('INTERNAL'),
                  _ => const SendResult.retry('NETWORK_ERROR', offline: true),
                };
            await c.syncNow();
          case 3:
            final f = await t.store.failed();
            if (f.isNotEmpty) await t.store.dismiss(f[r.nextInt(f.length)].id);
          case 4:
            t.clock.now += 400000;
          case 5:
            t.tombstones.failWith = r.nextInt(3) == 0 ? const PullFailure('NETWORK_ERROR', offline: true) : null;
            await c.syncNow();
        }
        final all = await t.store.all();
        final owed = all.where((e) => e.state != OutboxState.failed).length;
        final failed = all.where((e) => e.state == OutboxState.failed).length;
        final s = await c.snapshot();
        expect(s.owed, owed, reason: 'step $step');
        expect(s.failed, failed, reason: 'step $step');
        expect(SyncState.values, contains(s.state));
        if (s.state == SyncState.synced) expect(owed + failed, 0, reason: 'step $step: shown synced while the queue holds work');
        if (failed > 0) expect(s.state, SyncState.failed, reason: 'step $step');
        if (owed > 0 && failed == 0) expect(s.state, isNot(SyncState.synced));
      }
    });
  });
}

Future<void> pumpEventQueue() async {
  for (var i = 0; i < 25; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}
