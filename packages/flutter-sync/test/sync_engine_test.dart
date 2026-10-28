import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

class Clock {
  int now = 1000000;
  int call() => now;
}

/// A gateway that answers from a script and remembers what it accepted, keyed by the idempotency id (as the real one does).
class FakeGateway implements OutboxSender {
  final accepted = <String>{};
  final calls = <String>[];
  final script = <String, List<SendResult>>{};
  SendResult Function(OutboxEntry e)? always;
  Object? throwOnce;

  @override
  Future<SendResult> send(OutboxEntry e) async {
    calls.add(e.id);
    if (throwOnce != null) {
      final t = throwOnce!;
      throwOnce = null;
      throw t;
    }
    final queue = script[e.id];
    final r = queue != null && queue.isNotEmpty ? queue.removeAt(0) : (always?.call(e) ?? const SendResult.accepted());
    if (r is SendAccepted) accepted.add(e.id); // a repeat of the same id changes nothing
    return r;
  }
}

class Rig {
  Rig({Stream<bool>? online, Future<bool> Function()? isOnline, Schedule? schedule, int seed = 1})
      : db = OruLocalDatabase(NativeDatabase.memory()),
        clock = Clock() {
    store = OruLocalStore(db, nowMs: clock.call, newId: () => 'gen-${_n++}');
    engine = SyncEngine(store: store, sender: gateway, random: Random(seed), nowMs: clock.call, schedule: schedule, onlineChanges: online, isOnline: isOnline);
  }
  final OruLocalDatabase db;
  final Clock clock;
  final gateway = FakeGateway();
  late final OruLocalStore store;
  late final SyncEngine engine;
  int _n = 0;
  Future<void> add(String id, {String? parent}) => store.enqueue(kind: 'k', body: {}, id: id, parentId: parent);
  Future<List<String>> left() async => [for (final e in await store.all()) '${e.id}:${e.state}'];
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  group('backoff', () {
    test('grows by doubling, is capped, and jitter stays between half and the whole', () {
      const b = Backoff(baseMs: 1000, maxMs: 60000);
      final r = Random(7);
      for (var attempts = 0; attempts < 30; attempts++) {
        final full = min(60000, 1000 * (1 << min(attempts, 20)));
        for (var i = 0; i < 50; i++) {
          final d = b.delayMs(attempts, r);
          expect(d, inInclusiveRange(full ~/ 2, full), reason: 'attempt $attempts');
        }
      }
    });
    test('the jitter really varies, so phones that return together do not retry together', () {
      const b = Backoff();
      final r = Random(3);
      expect({for (var i = 0; i < 40; i++) b.delayMs(3, r)}.length, greaterThan(10));
    });
    test('the server\'s "try again in N seconds" is a floor', () {
      const b = Backoff(baseMs: 1000, maxMs: 60000);
      expect(b.delayMs(0, Random(1), retryAfterSeconds: 90), 90000);
    });
  });

  group('one pass', () {
    test('sends oldest first and removes what the server accepted', () async {
      final t = Rig();
      await t.add('a');
      await t.add('b');
      await t.add('c');
      await t.engine.pass();
      expect(t.gateway.calls, ['a', 'b', 'c']);
      expect(await t.left(), isEmpty);
    });

    test('a child is not sent before its parent is accepted, and is sent right after', () async {
      final t = Rig();
      await t.add('exam');
      await t.add('marks', parent: 'exam');
      t.gateway.script['exam'] = [const SendResult.retry('INTERNAL')];
      await t.engine.pass();
      expect(t.gateway.calls, ['exam'], reason: 'the child waits while the parent is owed');
      t.clock.now += 10 * 60 * 1000;
      await t.engine.pass();
      expect(t.gateway.calls, ['exam', 'exam', 'marks']);
      expect(await t.left(), isEmpty);
    });

    test('a 5xx keeps the change, backs it off, and does NOT block the changes behind it', () async {
      final t = Rig();
      await t.add('a');
      await t.add('b');
      t.gateway.script['a'] = [const SendResult.retry('INTERNAL')];
      await t.engine.pass();
      expect(t.gateway.calls, ['a', 'b']);
      final a = (await t.store.entry('a'))!;
      expect(a.state, OutboxState.queued);
      expect(a.attempts, 1);
      expect(a.nextAttemptAtMs, greaterThan(t.clock.now));
      expect(a.lastErrorCode, 'INTERNAL');
      expect(await t.store.entry('b'), isNull);
    });

    test('a change is not tried again before its backoff, then is', () async {
      final t = Rig();
      await t.add('a');
      t.gateway.script['a'] = [const SendResult.retry('INTERNAL')];
      await t.engine.pass();
      final due = (await t.store.entry('a'))!.nextAttemptAtMs!;
      t.clock.now = due - 1;
      await t.engine.pass();
      expect(t.gateway.calls, ['a']);
      t.clock.now = due;
      await t.engine.pass();
      expect(t.gateway.calls, ['a', 'a']);
      expect(await t.left(), isEmpty);
    });

    test('a refusal is final: shown, never retried, its children fail with it, the rest go through (E-SYNC-3)', () async {
      final t = Rig();
      await t.add('day');
      await t.add('child', parent: 'day');
      await t.add('other');
      t.gateway.script['day'] = [const SendResult.refused('DAY_LOCKED', message: 'locked')];
      await t.engine.pass();
      t.clock.now += 24 * 3600 * 1000;
      await t.engine.pass();
      expect(t.gateway.calls, ['day', 'other'], reason: 'neither the refused change nor its child is sent again');
      expect(await t.left(), ['day:failed', 'child:failed']);
      expect((await t.store.entry('day'))!.lastErrorCode, 'DAY_LOCKED');
      expect((await t.store.entry('child'))!.lastErrorCode, parentRefusedCode);
      expect((await t.store.counts()).failed, 2);
    });

    test('two network failures in a row mean offline: the pass stops instead of hammering the rest', () async {
      final t = Rig();
      for (final id in ['a', 'b', 'c', 'd']) {
        await t.add(id);
      }
      t.gateway.always = (_) => const SendResult.retry('NETWORK_ERROR', offline: true);
      await t.engine.pass();
      expect(t.gateway.calls, ['a', 'b']);
      expect(t.engine.activity, EngineActivity.offline);
      expect((await t.store.counts()).pending, 4);
    });

    test('a slow change that times out does not starve the ones behind it', () async {
      final t = Rig();
      await t.add('slow');
      await t.add('b');
      await t.add('c');
      t.gateway.script['slow'] = [const SendResult.retry('TIMEOUT', offline: true)];
      await t.engine.pass();
      expect(await t.left(), ['slow:queued']);
      expect(t.gateway.accepted, {'b', 'c'});
    });

    test('a 401 after a fresh token stops everything, loses nothing, and signedIn() resumes', () async {
      final t = Rig();
      await t.add('a');
      await t.add('b');
      t.gateway.script['a'] = [const SendResult.signInNeeded()];
      await t.engine.pass();
      expect(t.engine.activity, EngineActivity.signedOut);
      expect(t.gateway.calls, ['a']);
      final a = (await t.store.entry('a'))!;
      expect(a.state, OutboxState.queued);
      expect(a.attempts, 0, reason: 'not the change\'s fault');
      await t.engine.pass();
      expect(t.gateway.calls, ['a'], reason: 'nothing is sent while signed out');
      await t.engine.signedIn();
      expect(t.gateway.calls, ['a', 'a', 'b']);
      expect(await t.left(), isEmpty);
      expect(t.engine.activity, EngineActivity.idle);
    });

    test('a sender that throws is surfaced as a failed change, not retried for ever and not left "sending"', () async {
      final t = Rig();
      await t.add('a');
      await t.add('b');
      t.gateway.throwOnce = StateError('bad body');
      await t.engine.pass();
      expect((await t.store.entry('a'))!.lastErrorCode, 'UNSENDABLE');
      expect(await t.left(), ['a:failed']);
      expect(t.gateway.accepted, {'b'});
    });

    test('calls that arrive during a pass are folded into it: nothing is sent twice at once', () async {
      final t = Rig();
      await t.add('a');
      await t.add('b');
      await Future.wait([t.engine.pass(), t.engine.pass(), t.engine.kick()]);
      await t.engine.pass();
      expect(t.gateway.calls, ['a', 'b']);
    });
  });

  group('running (start)', () {
    test('while the device says it is offline nothing is sent; when it is back the queue drains', () async {
      final online = StreamController<bool>(sync: true);
      final wakes = <Duration>[];
      final t = Rig(online: online.stream, isOnline: () async => false, schedule: (d, f) {
        wakes.add(d);
        return () {};
      });
      await t.add('a');
      await t.engine.start();
      expect(t.engine.activity, EngineActivity.offline);
      await t.engine.pass();
      expect(t.gateway.calls, isEmpty);
      online.add(true);
      await pumpEventQueue();
      expect(t.gateway.calls, ['a']);
      expect(await t.left(), isEmpty);
      expect(t.engine.activity, EngineActivity.idle);
      t.engine.stop();
      await online.close();
    });

    test('it wakes itself when the soonest retry is due', () async {
      final wakes = <Duration>[];
      void Function()? fire;
      final t = Rig(schedule: (d, f) {
        wakes.add(d);
        fire = f;
        return () {};
      });
      await t.add('a');
      t.gateway.script['a'] = [const SendResult.retry('INTERNAL')];
      await t.engine.start();
      final due = (await t.store.entry('a'))!.nextAttemptAtMs!;
      expect(wakes.last.inMilliseconds, due - t.clock.now);
      t.clock.now = due;
      fire!();
      await pumpEventQueue();
      expect(await t.left(), isEmpty);
      t.engine.stop();
    });
  });

  group('E-SYNC-2: killed mid-sync, resumes without loss or duplicates', () {
    test('a file-backed queue reopened after a kill sends every change once and nothing twice', () async {
      final dir = await Directory.systemTemp.createTemp('oru-engine');
      final file = File('${dir.path}/local.db');
      final gateway = FakeGateway();
      try {
        var db = OruLocalDatabase(NativeDatabase(file));
        var store = OruLocalStore(db, newId: () => 'gen');
        for (final id in ['a', 'b', 'c']) {
          await store.enqueue(kind: 'k', body: {}, id: id);
        }
        // The app dies after "b" went on the wire and before its answer was stored.
        await store.markSending('a');
        await store.markDone('a');
        gateway.accepted.add('a');
        await store.markSending('b');
        gateway.accepted.add('b'); // the server got it
        await db.close();

        db = OruLocalDatabase(NativeDatabase(file));
        store = OruLocalStore(db, newId: () => 'gen');
        final engine = SyncEngine(store: store, sender: gateway);
        await engine.pass();
        expect(gateway.calls, ['b', 'c'], reason: 'a was done; b is owed again (the server knows it by id); c was never sent');
        expect(gateway.accepted, {'a', 'b', 'c'});
        expect(await store.all(), isEmpty);
        await db.close();
      } finally {
        await dir.delete(recursive: true);
      }
    });
  });

  group('property: random failures never lose, duplicate or reorder a change', () {
    test('300 random runs: everything not refused ends accepted once, the server saw accepted changes in queue order', () async {
      for (var seed = 0; seed < 300; seed++) {
        final r = Random(seed);
        final t = Rig(seed: seed);
        final n = 3 + r.nextInt(8);
        final ids = [for (var i = 0; i < n; i++) 'c$i'];
        final parent = <String, String?>{};
        for (final id in ids) {
          final i = ids.indexOf(id);
          parent[id] = i > 0 && r.nextInt(3) == 0 ? ids[r.nextInt(i)] : null;
          await t.add(id, parent: parent[id]);
        }
        final accepted = <String>[];
        final refusedFor = <String>{};
        t.gateway.always = (e) {
          final p = r.nextInt(10);
          if (p < 3) return const SendResult.retry('INTERNAL');
          if (p < 5) return const SendResult.retry('NETWORK_ERROR', offline: true);
          if (p == 5) {
            refusedFor.add(e.id);
            return const SendResult.refused('X');
          }
          accepted.add(e.id);
          return const SendResult.accepted();
        };
        for (var round = 0; round < 80 && (await t.store.counts()).pending > 0; round++) {
          await t.engine.pass();
          t.clock.now += 400000; // past any backoff
        }
        final remaining = await t.store.all();
        expect(remaining.where((e) => e.state != OutboxState.failed), isEmpty, reason: 'seed $seed: nothing is left owed');
        // nothing accepted twice, and each accepted at most once
        expect(accepted.toSet().length, accepted.length, reason: 'seed $seed: duplicate accept');
        // a child was accepted only after its parent
        for (final id in accepted) {
          final p = parent[id];
          if (p != null) expect(accepted.indexOf(p), inInclusiveRange(0, accepted.indexOf(id) - 1), reason: 'seed $seed: $id before its parent $p');
        }
        // every change is either accepted or failed, never both and never missing
        final failed = {for (final e in remaining) e.id};
        for (final id in ids) {
          expect(accepted.contains(id) != failed.contains(id), isTrue, reason: 'seed $seed: $id');
        }
        // a child of a failed change is failed
        for (final id in ids) {
          final p = parent[id];
          if (p != null && failed.contains(p)) expect(failed.contains(id), isTrue, reason: 'seed $seed: $id should fail with $p');
        }
      }
    });
  });
}

Future<void> pumpEventQueue() async {
  for (var i = 0; i < 25; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}
