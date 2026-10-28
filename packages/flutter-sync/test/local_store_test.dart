import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

OruLocalDatabase memory() => OruLocalDatabase(NativeDatabase.memory());

/// A clock the test moves by hand.
class Clock {
  int now = 1000000;
  int call() => now;
}

int _ids = 0;
String nextId() => 'id-${_ids++}';

OruLocalStore storeOn(OruLocalDatabase db, [Clock? clock]) => OruLocalStore(db, nowMs: (clock ?? Clock()).call, newId: nextId);

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  group('outbox: enqueue, order, idempotency', () {
    test('a change is queued with its own id, the device id, and in order', () async {
      final s = storeOn(memory());
      final a = await s.enqueue(kind: 'attendance.submit', body: {'classId': 'c1'});
      final b = await s.enqueue(kind: 'marks.save', body: {'examId': 'e1'});
      expect(a.state, OutboxState.queued);
      expect(a.deviceId, b.deviceId);
      expect(a.seq, lessThan(b.seq));
      expect((await s.all()).map((e) => e.kind), ['attendance.submit', 'marks.save']);
      expect((await s.all()).first.body, {'classId': 'c1'});
    });

    test('the same id queued twice is ONE change (a double tap, a retried save)', () async {
      final s = storeOn(memory());
      await s.enqueue(kind: 'leave.create', body: {'n': 1}, id: 'client-1');
      final again = await s.enqueue(kind: 'leave.create', body: {'n': 2}, id: 'client-1');
      expect((await s.all()).length, 1);
      expect(again.body, {'n': 1}, reason: 'the first answer stands (offline-sync rule 1)');
    });

    test('order follows the queue, never the clock: a clock that jumps back changes nothing', () async {
      final clock = Clock();
      final s = storeOn(memory(), clock);
      final first = await s.enqueue(kind: 'a', body: {});
      clock.now -= 3600000; // the person set the phone's clock back an hour
      final second = await s.enqueue(kind: 'b', body: {});
      expect(second.createdAtMs, lessThan(first.createdAtMs));
      expect((await s.nextDue())!.id, first.id);
    });

    test('the device id is made once and stays', () async {
      final db = memory();
      final s = storeOn(db);
      expect(await s.deviceId(), await s.deviceId());
    });
  });

  group('outbox: what is due', () {
    test('oldest first, one at a time; a change being sent is not offered again', () async {
      final s = storeOn(memory());
      final a = await s.enqueue(kind: 'a', body: {});
      final b = await s.enqueue(kind: 'b', body: {});
      expect((await s.nextDue())!.id, a.id);
      await s.markSending(a.id);
      expect((await s.nextDue())!.id, b.id);
    });

    test('a child waits for its parent: parents before children (rule 2)', () async {
      final s = storeOn(memory());
      final parent = await s.enqueue(kind: 'exam.setup', body: {});
      final child = await s.enqueue(kind: 'marks.save', body: {}, parentId: parent.id);
      final other = await s.enqueue(kind: 'leave.create', body: {});
      expect((await s.nextDue())!.id, parent.id);
      await s.markSending(parent.id);
      expect((await s.nextDue())!.id, other.id, reason: 'the child is skipped while its parent is in the queue');
      await s.markDone(parent.id);
      await s.markDone(other.id);
      expect((await s.nextDue())!.id, child.id, reason: 'accepted parent: the child is free');
    });

    test('a retry waits out its backoff and is counted', () async {
      final clock = Clock();
      final s = storeOn(memory(), clock);
      final a = await s.enqueue(kind: 'a', body: {});
      await s.markSending(a.id);
      await s.markRetry(a.id, code: 'NETWORK_ERROR', message: 'Could not reach the server.', backoffMs: 30000);
      final held = (await s.entry(a.id))!;
      expect(held.state, OutboxState.queued);
      expect(held.attempts, 1);
      expect(held.lastErrorCode, 'NETWORK_ERROR');
      expect(await s.nextDue(), isNull, reason: 'not due yet');
      expect(await s.nextRetryAtMs(), clock.now + 30000);
      clock.now += 30000;
      expect((await s.nextDue())!.id, a.id);
    });

    test('a retry never lets a younger change jump the queue past an older one that is merely waiting', () async {
      final clock = Clock();
      final s = storeOn(memory(), clock);
      final a = await s.enqueue(kind: 'a', body: {});
      final b = await s.enqueue(kind: 'b', body: {});
      await s.markRetry(a.id, code: 'TIMEOUT', backoffMs: 5000);
      // `a` is waiting; the engine may send `b` meanwhile (they are independent), and `a` goes first once due.
      expect((await s.nextDue())!.id, b.id);
      await s.markDone(b.id);
      clock.now += 5000;
      expect((await s.nextDue())!.id, a.id);
    });
  });

  group('outbox: refusals (rule 5) never block the rest', () {
    test('a refused change stays visible as failed, with its code, and the next one is still sent', () async {
      final s = storeOn(memory());
      final bad = await s.enqueue(kind: 'marks.save', body: {});
      final good = await s.enqueue(kind: 'leave.create', body: {});
      await s.markRefused(bad.id, code: 'CONFLICT', message: 'The day is locked.');
      final f = await s.failed();
      expect(f.single.id, bad.id);
      expect(f.single.lastErrorCode, 'CONFLICT');
      expect(await s.nextDue().then((e) => e!.id), good.id);
    });

    test('what waited for a refused change fails with it, so nothing sits in the queue for ever', () async {
      final s = storeOn(memory());
      final parent = await s.enqueue(kind: 'exam.setup', body: {});
      final child = await s.enqueue(kind: 'marks.save', body: {}, parentId: parent.id);
      final grandchild = await s.enqueue(kind: 'marks.fix', body: {}, parentId: child.id);
      final unrelated = await s.enqueue(kind: 'leave.create', body: {});
      await s.markRefused(parent.id, code: 'NOT_FOUND');
      expect((await s.entry(child.id))!.lastErrorCode, parentRefusedCode);
      expect((await s.entry(grandchild.id))!.state, OutboxState.failed);
      expect((await s.entry(unrelated.id))!.state, OutboxState.queued);
      expect((await s.nextDue())!.id, unrelated.id);
    });

    test('a change queued behind a parent that was already refused is failed at once', () async {
      final s = storeOn(memory());
      final parent = await s.enqueue(kind: 'exam.setup', body: {});
      await s.markRefused(parent.id, code: 'CONFLICT');
      final late = await s.enqueue(kind: 'marks.save', body: {}, parentId: parent.id);
      expect(late.state, OutboxState.failed);
      expect(late.lastErrorCode, parentRefusedCode);
      expect(await s.nextDue(), isNull);
    });

    test('a parent that is no longer in the queue was accepted, so its child is free', () async {
      final s = storeOn(memory());
      final child = await s.enqueue(kind: 'marks.save', body: {}, parentId: 'accepted-long-ago');
      expect((await s.nextDue())!.id, child.id);
    });

    test('dismissing a refusal removes it and what failed because of it, and only failed changes can be dismissed', () async {
      final s = storeOn(memory());
      final parent = await s.enqueue(kind: 'a', body: {});
      final child = await s.enqueue(kind: 'b', body: {}, parentId: parent.id);
      final live = await s.enqueue(kind: 'c', body: {});
      await s.dismiss(live.id);
      expect(await s.entry(live.id), isNotNull, reason: 'a change that is still owed is not dismissed');
      await s.markRefused(parent.id, code: 'CONFLICT');
      await s.dismiss(parent.id);
      expect(await s.entry(parent.id), isNull);
      expect(await s.entry(child.id), isNull);
      expect(await s.entry(live.id), isNotNull);
    });
  });

  group('outbox: the six states are driven by these counts', () {
    test('counts follow the queue and are announced as they change', () async {
      final s = storeOn(memory());
      final seen = <OutboxCounts>[];
      final sub = s.watchCounts().listen(seen.add);
      await pumpEventQueue();
      final a = await s.enqueue(kind: 'a', body: {});
      await pumpEventQueue();
      await s.markSending(a.id);
      await pumpEventQueue();
      await s.markRefused(a.id, code: 'CONFLICT');
      await pumpEventQueue();
      await s.dismiss(a.id);
      await pumpEventQueue();
      await sub.cancel();
      expect(seen.map((c) => (c.queued, c.sending, c.failed)).toList(), [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (0, 0, 0)]);
      expect(const OutboxCounts(queued: 2, sending: 1, failed: 0).pending, 3);
    });

    test('over 400 random steps the counts always equal what is in the queue', () async {
      final rnd = Random(7);
      final clock = Clock();
      final s = storeOn(memory(), clock);
      for (var step = 0; step < 400; step++) {
        final rows = await s.all();
        switch (rnd.nextInt(6)) {
          case 0:
            await s.enqueue(kind: 'k', body: {'n': step}, parentId: rows.isNotEmpty && rnd.nextBool() ? rows[rnd.nextInt(rows.length)].id : null);
          case 1:
            final due = await s.nextDue();
            if (due != null) await s.markSending(due.id);
          case 2:
            final sending = rows.where((r) => r.state == OutboxState.sending).toList();
            if (sending.isNotEmpty) await s.markDone(sending[rnd.nextInt(sending.length)].id);
          case 3:
            final sending = rows.where((r) => r.state == OutboxState.sending).toList();
            if (sending.isNotEmpty) await s.markRetry(sending[rnd.nextInt(sending.length)].id, code: 'TIMEOUT', backoffMs: rnd.nextInt(5000));
          case 4:
            final any = rows.where((r) => r.state != OutboxState.failed).toList();
            if (any.isNotEmpty) await s.markRefused(any[rnd.nextInt(any.length)].id, code: 'CONFLICT');
          case 5:
            final failed = rows.where((r) => r.state == OutboxState.failed).toList();
            if (failed.isNotEmpty) await s.dismiss(failed[rnd.nextInt(failed.length)].id);
            clock.now += rnd.nextInt(3000);
        }
        final all = await s.all();
        final c = await s.counts();
        expect((c.queued, c.sending, c.failed), (
          all.where((e) => e.state == OutboxState.queued).length,
          all.where((e) => e.state == OutboxState.sending).length,
          all.where((e) => e.state == OutboxState.failed).length,
        ), reason: 'step $step');
        // no queued change may be due while it waits on a parent that has failed: the cascade failed it already
        for (final e in all.where((e) => e.parentId != null)) {
          final parent = all.where((p) => p.id == e.parentId).toList();
          if (parent.isNotEmpty && parent.single.state == OutboxState.failed) expect(e.state, OutboxState.failed, reason: 'step $step');
        }
      }
    });
  });

  group('survives the app being killed', () {
    late Directory dir;
    late File file;
    setUp(() {
      dir = Directory.systemTemp.createTempSync('oru-local-db');
      file = File('${dir.path}/app.sqlite');
    });
    tearDown(() => dir.deleteSync(recursive: true));

    OruLocalDatabase open() => OruLocalDatabase(NativeDatabase(file));

    test('queued changes, drafts, cursors and records are all still there after a reopen', () async {
      var db = open();
      var s = storeOn(db);
      final device = await s.deviceId();
      await s.enqueue(kind: 'attendance.submit', body: {'classId': 'c1'}, id: 'sub-1');
      await s.saveDraft('attendance', 'c1|2026-10-27', {'absent': ['s1']});
      await s.setCursor('tombstones', 'cursor-9');
      await s.upsertRecords('TimetableEntry', [(id: 't1', parentId: 'c1', json: {'id': 't1'})]);
      await db.close(); // "killed": nothing was done on the way out

      db = open();
      s = storeOn(db);
      expect(await s.deviceId(), device);
      expect((await s.entry('sub-1'))!.body, {'classId': 'c1'});
      expect(await s.draft('attendance', 'c1|2026-10-27'), {'absent': ['s1']});
      expect(await s.cursor('tombstones'), 'cursor-9');
      expect(await s.record('TimetableEntry', 't1'), {'id': 't1'});
      await db.close();
    });

    test('a change that was being sent when the app died is owed again, not lost and not stuck', () async {
      var db = open();
      var s = storeOn(db);
      final a = await s.enqueue(kind: 'a', body: {}, id: 'sub-a');
      await s.markSending(a.id);
      await s.enqueue(kind: 'b', body: {}, id: 'sub-b');
      expect((await s.counts()).sending, 1);
      await db.close();

      db = open();
      s = storeOn(db);
      expect((await s.entry('sub-a'))!.state, OutboxState.queued);
      expect((await s.nextDue())!.id, 'sub-a', reason: 'still first in line');
      await db.close();
    });

    test('the file is created from nothing at schema 1, and a refused change stays refused after a reopen', () async {
      var db = open();
      var s = storeOn(db);
      expect(db.schemaVersion, 1);
      final a = await s.enqueue(kind: 'a', body: {}, id: 'sub-a');
      await s.markRefused(a.id, code: 'CONFLICT', message: 'locked');
      await db.close();
      db = open();
      s = storeOn(db);
      expect((await s.failed()).single.lastErrorMessage, 'locked');
      await db.close();
    });
  });

  group('what the screens read', () {
    test('records are read by type and by parent, and a pulled list replaces the old one', () async {
      final s = storeOn(memory());
      await s.upsertRecords('RosterEntry', [
        (id: 's1', parentId: 'c1', json: {'id': 's1'}),
        (id: 's2', parentId: 'c1', json: {'id': 's2'}),
        (id: 's3', parentId: 'c2', json: {'id': 's3'}),
      ]);
      expect((await s.records('RosterEntry', parentId: 'c1')).length, 2);
      expect((await s.records('RosterEntry')).length, 3);
      await s.replaceRecords('RosterEntry', parentId: 'c1', records: [(id: 's2', json: {'id': 's2', 'x': 1})]);
      expect((await s.records('RosterEntry', parentId: 'c1')), [
        {'id': 's2', 'x': 1}
      ], reason: 's1 left the class on the server, so it leaves the phone');
      expect((await s.records('RosterEntry', parentId: 'c2')).length, 1, reason: 'another class is untouched');
    });

    test('a screen listening to a list sees a change when it happens', () async {
      final s = storeOn(memory());
      final seen = <int>[];
      final sub = s.watchRecords('Notification').listen((l) => seen.add(l.length));
      await pumpEventQueue();
      await s.upsertRecords('Notification', [(id: 'n1', parentId: null, json: {'id': 'n1'})]);
      await pumpEventQueue();
      await s.applyTombstone(entityType: 'Notification', entityId: 'n1');
      await pumpEventQueue();
      await sub.cancel();
      expect(seen, [0, 1, 0]);
    });

    test('a tombstone removes the record and what hung off it (a lesson takes its cover with it)', () async {
      final s = storeOn(memory());
      await s.upsertRecords('TimetableEntry', [(id: 'lesson-1', parentId: 'c1', json: {})]);
      await s.upsertRecords('Substitution', [(id: 'cover-1', parentId: 'lesson-1', json: {}), (id: 'cover-2', parentId: 'lesson-2', json: {})]);
      await s.applyTombstone(entityType: 'TimetableEntry', entityId: 'lesson-1');
      expect(await s.record('TimetableEntry', 'lesson-1'), isNull);
      expect(await s.record('Substitution', 'cover-1'), isNull);
      expect(await s.record('Substitution', 'cover-2'), isNotNull);
    });

    test('a record is told apart by its type: the same id in two types is two records', () async {
      final s = storeOn(memory());
      await s.upsertRecords('Mark', [(id: 'x', parentId: null, json: {'t': 'mark'})]);
      await s.upsertRecords('AttendanceMark', [(id: 'x', parentId: null, json: {'t': 'att'})]);
      await s.applyTombstone(entityType: 'Mark', entityId: 'x');
      expect(await s.record('Mark', 'x'), isNull);
      expect(await s.record('AttendanceMark', 'x'), {'t': 'att'});
    });

    test('drafts are saved, read, replaced and cleared; a draft is not an owed change', () async {
      final s = storeOn(memory());
      await s.saveDraft('marks', 'exam-1', {'s1': '47'});
      await s.saveDraft('marks', 'exam-1', {'s1': '48'});
      expect(await s.draft('marks', 'exam-1'), {'s1': '48'});
      expect((await s.counts()).pending, 0);
      await s.clearDraft('marks', 'exam-1');
      expect(await s.draft('marks', 'exam-1'), isNull);
    });
  });

  test('signing out wipes every table, so the next person on the phone sees nothing of the last', () async {
    final s = storeOn(memory());
    await s.enqueue(kind: 'a', body: {});
    await s.saveDraft('k', 'x', {});
    await s.setCursor('c', 'v');
    await s.upsertRecords('T', [(id: '1', parentId: null, json: {})]);
    final oldDevice = await s.deviceId();
    await s.wipe();
    expect(await s.all(), isEmpty);
    expect(await s.draft('k', 'x'), isNull);
    expect(await s.cursor('c'), isNull);
    expect(await s.records('T'), isEmpty);
    expect(await s.deviceId(), isNot(oldDevice), reason: 'a new person gets a new install id');
  });
}
