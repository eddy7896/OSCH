// The sync engine against the REAL gateway on the Auth and Data Connect emulators with the demo school in them
// (`bash tools/tests/dart-gateway.sh` starts all of it). Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set.
// It writes to the emulator's demo school, never to a real project. It proves E-SYNC-1 to E-SYNC-4 with the real
// idempotency, locking and replacement rules: a network that fails, an answer that is lost, a day that is locked, and two phones.
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

final gateway = Platform.environment['ORU_GATEWAY_URL'];
final authHost = Platform.environment['ORU_AUTH_EMULATOR'];
const phrase = 'demo-pass-2027';

Future<String> signIn(String email) async {
  final r = await http.post(Uri.parse('http://$authHost/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake'),
      headers: {'content-type': 'application/json'}, body: jsonEncode({'email': email, 'password': phrase, 'returnSecureToken': true}));
  expect(r.statusCode, 200, reason: 'could not sign $email in: ${r.body}');
  return (jsonDecode(r.body) as Map<String, dynamic>)['idToken'] as String;
}

/// The real transport with the network taken away on demand, and answers that can be lost on the way back.
class FlakyTransport implements OruTransport {
  FlakyTransport(this.inner);
  final OruTransport inner;
  bool offline = false;
  int loseNextAnswers = 0;
  int reachedServer = 0;

  @override
  Future<Object?> send(OruRoute route, String path, {Map<String, Object?> query = const {}, Object? body}) async {
    if (offline) throw const OruApiError('NETWORK_ERROR', 0, 'no connection');
    reachedServer++;
    final r = await inner.send(route, path, query: query, body: body);
    if (loseNextAnswers > 0) {
      loseNextAnswers--;
      throw const OruApiError('TIMEOUT', 0, 'the answer never came');
    }
    return r;
  }
}

class Phone {
  Phone(this.transport, this.api)
      : db = OruLocalDatabase(NativeDatabase.memory()) {
    store = OruLocalStore(db, nowMs: () => clock);
    engine = SyncEngine(store: store, sender: OruApiSender(api), nowMs: () => clock);
  }
  final FlakyTransport transport;
  final OruApi api;
  final OruLocalDatabase db;
  late final OruLocalStore store;
  late final SyncEngine engine;
  int clock = DateTime.now().millisecondsSinceEpoch;

  /// Lets every backoff pass.
  Future<void> syncAll() async {
    for (var i = 0; i < 6 && (await store.counts()).queued > 0; i++) {
      clock += 10 * 60 * 1000;
      await engine.pass();
    }
  }
}

Future<Phone> phoneFor(String email) async {
  final token = await signIn(email);
  String? school;
  final inner = OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => token, getSchoolId: () => school);
  final me = await OruApi(inner).meGet();
  school = me.memberships.firstWhere((m) => m.school.subDomain == 'greenfield').school.id;
  final flaky = FlakyTransport(inner);
  return Phone(flaky, OruApi(flaky));
}

/// [n] working days, starting [skip] days back; the tests lock a day, so a rerun on the same emulator uses other days.
List<String> lastWorkingDays(List<String> working, int n, {int skip = 0}) {
  const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  final out = <String>[];
  var d = DateTime.now().toUtc().subtract(Duration(days: skip));
  while (out.length < n) {
    if (working.contains(names[d.weekday % 7])) out.add(d.toIso8601String().substring(0, 10));
    d = d.subtract(const Duration(days: 1));
  }
  return out;
}

Map<String, dynamic> attendanceBody(String classId, String date, List<(String, String)> marks, {bool lock = false}) => {
      'classId': classId,
      'date': date,
      if (lock) 'lock': true,
      'marks': [for (final m in marks) {'studentId': m.$1, 'status': m.$2}],
    };

void main() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  late Phone phone;
  late String classId;
  late List<String> days;
  late List<String> studentIds;

  setUpAll(() async {
    if (skip != null) return;
    phone = await phoneFor('teacher@demo.oruschools.example');
    classId = (await phone.api.teachingMine()).classes.first.id;
    // A day another run of these tests has already locked cannot be used again, so take the first four that are still open.
    final candidates = lastWorkingDays((await phone.api.scheduleGet()).workingDays, 60, skip: Random().nextInt(100));
    days = [];
    for (final c in candidates) {
      if (!(await phone.api.attendanceDay(id: classId, date: c)).locked) days.add(c);
      if (days.length == 4) break;
    }
    expect(days.length, 4);
    studentIds = [for (final s in (await phone.api.attendanceDay(id: classId, date: days[0])).students) s.id];
    expect(studentIds.length, greaterThanOrEqualTo(2));
  });

  Future<Map<String, String>> statusesOn(String date) async => {for (final s in (await phone.api.attendanceDay(id: classId, date: date)).students) s.id: s.status};

  test('E-SYNC-1: attendance taken with the network off syncs once when it returns; replaying it any number of times leaves one result', () async {
    final t = await phoneFor('teacher@demo.oruschools.example');
    final date = days[0];
    final before = await statusesOn(date);
    t.transport.offline = true;
    final queued = await t.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[0], 'ABSENT'), (studentIds[1], 'LATE')]));
    await t.engine.pass();
    expect((await t.store.counts()).pending, 1, reason: 'still owed while offline');
    expect(t.transport.reachedServer, 0);
    expect(await statusesOn(date), before, reason: 'the server has seen nothing');

    t.transport.offline = false;
    await t.syncAll();
    expect([for (final e in await t.store.all()) '${e.lastErrorCode} ${e.lastErrorMessage}'], isEmpty, reason: 'date $date');
    final after = await statusesOn(date);
    expect(after[studentIds[0]], 'ABSENT');
    expect(after[studentIds[1]], 'LATE');

    // The same change sent again and again (a lost answer, a restarted app) leaves the same single result.
    final sender = OruApiSender(t.api);
    for (var i = 0; i < 3; i++) {
      expect(await sender.send(queued), isA<SendAccepted>());
    }
    expect(await statusesOn(date), after);
  }, skip: skip);

  test('E-SYNC-1b: an answer lost on the way back is retried and still leaves one result', () async {
    final t = await phoneFor('teacher@demo.oruschools.example');
    final date = days[1];
    t.transport.loseNextAnswers = 2; // the server got it twice and each answer was lost
    await t.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[0], 'MEDICAL')]));
    await t.syncAll();
    expect(await t.store.all(), isEmpty);
    expect(t.transport.reachedServer, 3, reason: 'sent three times: two answers lost, then the third heard');
    final s = await statusesOn(date);
    expect(s.values.where((v) => v == 'MEDICAL').length, 1);
    expect(s[studentIds[0]], 'MEDICAL');
  }, skip: skip);

  test('E-SYNC-3: a refused change (a locked day) does not block the changes behind it, and is shown with the gateway\'s code', () async {
    final t = await phoneFor('teacher@demo.oruschools.example');
    final date = days[2];
    final lock = await t.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[0], 'PRESENT')], lock: true));
    final late = await t.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[0], 'ABSENT')]));
    final read = await t.store.enqueue(kind: OutboxKinds.staffCheckIn, body: {});
    await t.syncAll();
    final failed = await t.store.failed();
    expect([for (final f in failed) f.id], [late.id], reason: 'only the change for the locked day is refused');
    expect(failed.single.lastErrorCode, 'CONFLICT', reason: 'the gateway\'s 409 for a locked day');
    expect(await t.store.entry(lock.id), isNull);
    expect(await t.store.entry(read.id), isNull, reason: 'the change behind the refused one went through');
    expect((await statusesOn(date))[studentIds[0]], 'PRESENT');
    // it is never retried, however long we wait
    final reached = t.transport.reachedServer;
    await t.syncAll();
    expect(t.transport.reachedServer, reached);
    await t.store.dismiss(late.id);
    expect(await t.store.all(), isEmpty);
  }, skip: skip);

  test('E-SYNC-4: two phones changing the same day resolve by the written rule (the later submit replaces the list), the same way in both orders', () async {
    final a = await phoneFor('teacher@demo.oruschools.example');
    final b = await phoneFor('teacher@demo.oruschools.example');
    final date = days[3];
    Future<Map<String, String>> run(bool aFirst) async {
      await a.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[0], 'ABSENT')]));
      await b.store.enqueue(kind: OutboxKinds.attendanceSubmit, body: attendanceBody(classId, date, [(studentIds[1], 'LATE')]));
      if (aFirst) {
        await a.syncAll();
        await b.syncAll();
      } else {
        await b.syncAll();
        await a.syncAll();
      }
      return statusesOn(date);
    }

    final aThenB = await run(true);
    expect(aThenB[studentIds[1]], 'LATE');
    expect(aThenB[studentIds[0]], 'PRESENT', reason: 'B\'s list is the whole truth for the day, so A\'s absence is gone');
    final bThenA = await run(false);
    expect(bThenA[studentIds[0]], 'ABSENT');
    expect(bThenA[studentIds[1]], 'PRESENT');
    // Same order again: same result.
    expect(await run(true), aThenB);
    expect(await run(false), bThenA);
  }, skip: skip);

  test('a 401 (the account was signed out on the server side) stops the queue without losing anything; signing in again resumes', () async {
    final good = await signIn('teacher@demo.oruschools.example');
    String token = 'not-a-real-token';
    String? school;
    final inner = OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => token, getSchoolId: () => school);
    school = (await OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => good)).meGet()).memberships.firstWhere((m) => m.school.subDomain == 'greenfield').school.id;
    final t = Phone(FlakyTransport(inner), OruApi(inner));
    await t.store.enqueue(kind: OutboxKinds.staffCheckIn, body: {});
    await t.engine.pass();
    expect(t.engine.activity, EngineActivity.signedOut);
    expect((await t.store.counts()).queued, 1);
    token = good;
    await t.engine.signedIn();
    expect(await t.store.all(), isEmpty);
  }, skip: skip);

  test('E-SYNC-5: a lesson removed on the server is removed from the phone, and the six-state status follows the real work', () async {
    final t = await phoneFor('teacher@demo.oruschools.example');
    final tombstones = OruApiTombstones(t.api);
    final c = SyncCoordinator(
      store: t.store,
      engine: t.engine,
      tombstones: tombstones,
      nowMs: () => t.clock,
      tasks: [
        // Adds and updates only: a removal can reach the phone no other way than the tombstone.
        PullTask('TimetableEntry', (store) async {
          try {
            await store.upsertRecords('TimetableEntry', [for (final e in (await t.api.timetableMine()).entries) (id: e.id, parentId: null, json: e.toJson())]);
          } on OruApiError catch (e) {
            throw failureOf(e);
          }
        }),
      ],
    );
    final states = <SyncState>[];
    final sub = c.watch().listen((s) => states.add(s.state));

    await c.syncNow();
    final before = [for (final r in await t.store.records('TimetableEntry')) r['id'] as String];
    expect(before, isNotEmpty);
    expect((await c.snapshot()).state, SyncState.synced);

    // The Academic admin removes one of her lessons, on the server.
    final admin = await signIn('academic@demo.oruschools.example');
    final me = await OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => admin)).meGet();
    final school = me.memberships.firstWhere((m) => m.school.subDomain == 'greenfield').school.id;
    final victim = before.first;
    final res = await http.delete(Uri.parse('$gateway/v1/academics/timetable/entries/$victim'), headers: {'authorization': 'Bearer $admin', 'x-school-id': school});
    expect(res.statusCode, anyOf(200, 204), reason: res.body);

    // Offline: the phone still shows it (and says it cannot reach the server). Online: it is gone.
    t.transport.offline = true;
    await c.syncNow();
    expect(c.pullStatus, isA<PullOffline>());
    expect((await c.snapshot()).state, SyncState.offline);
    expect(await t.store.record('TimetableEntry', victim), isNotNull);

    t.transport.offline = false;
    await c.syncNow();
    expect(await t.store.record('TimetableEntry', victim), isNull, reason: 'the tombstone removed it');
    expect((await t.store.records('TimetableEntry')).length, before.length - 1);
    expect(await t.store.cursor(tombstoneCursor), isNot(tombstoneBeginning));
    expect((await c.snapshot()).state, SyncState.synced);
    expect(states, containsAll([SyncState.synced, SyncState.offline]));
    await sub.cancel();
  }, skip: skip);
}
