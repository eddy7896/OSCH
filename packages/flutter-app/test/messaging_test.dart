import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart' show TextField, UniqueKey;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> thread(String id, {String other = 'Tara Teach', String kind = 'TEACHER', String student = 'Ravi Kumar', String? last = '2026-11-01T10:00:00Z', bool unread = false}) => {
      'id': id, 'student': {'id': 'st1', 'name': student}, 'other': {'userId': 'u2', 'kind': kind, 'name': other}, 'lastMessageAt': last, 'unread': unread,
    };

Map<String, dynamic> msg(String id, String body, {bool mine = false, bool hidden = false, bool canHide = false, String at = '2026-11-01T10:00:00Z'}) =>
    {'id': id, 'mine': mine, 'body': hidden ? null : body, 'hidden': hidden, 'canHide': canHide, 'createdAt': at};

Map<String, dynamic> bc(String id, {String title = 'Trip on Friday', List<Map<String, String>> students = const [], bool? read, Map<String, dynamic>? stats, String at = '2026-11-02T08:00:00Z'}) => {
      'id': id, 'title': title, 'body': 'Bring a packed lunch.', 'class': {'id': 'c1', 'name': '5A'}, 'sender': {'userId': 'u2', 'name': 'Tara Teach'}, 'sentAt': at, 'students': students, 'read': read, 'stats': stats,
    };

class Gateway {
  final calls = <String>[];
  final bodies = <String, Object?>{};
  bool offline = false;

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    final path = r.url.path;
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    calls.add('${r.method} $path');
    if (r.body.isNotEmpty) bodies['${r.method} $path'] = jsonDecode(r.body);
    if (path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    if (path.endsWith('/messages/contacts')) {
      return json({'items': [{'userId': 'u2', 'name': 'Tara Teach', 'label': 'CLASS_TEACHER', 'subjects': []}, {'userId': 'u3', 'name': 'Sam Sums', 'label': 'TEACHER', 'subjects': ['Maths']}]});
    }
    if (path.endsWith('/messages/threads') && r.method == 'POST') return json(thread('t9'));
    if (path.endsWith('/messages/threads')) return json({'items': [thread('t1', unread: true), thread('t2', other: 'Asha Rao', kind: 'PARENT', last: '2026-11-03T10:00:00Z')]});
    final one = RegExp(r'/messages/threads/([^/]+)$').firstMatch(path);
    if (one != null) return json({...thread(one.group(1)!), 'messages': [msg('m1', 'Hello')]});
    if (path.endsWith('/broadcasts') && r.method == 'GET') return json({'items': [bc('b1'), bc('b2', at: '2026-11-01T08:00:00Z')]});
    final bOne = RegExp(r'/broadcasts/([^/]+)$').firstMatch(path);
    if (bOne != null) {
      return json(bc(bOne.group(1)!, stats: {'targetStudents': 30, 'reachedStudents': 28, 'unreachable': [{'id': 's1', 'name': 'Ravi Kumar'}, {'id': 's2', 'name': 'Meena Rao'}], 'parents': 40, 'readBy': 12}));
    }
    if (r.method == 'POST' && path.endsWith('/messages')) return json(msg('m9', 'Hi', mine: true), 201);
    if (r.method == 'POST' && path.endsWith('/read')) return http.Response('', 204);
    if (r.method == 'POST' && path.endsWith('/broadcasts')) return json(bc('b9'), 201);
    if (r.method == 'POST' && path.endsWith('/hide')) return json(msg('m1', 'Hello', mine: true, hidden: true));
    if (r.method == 'POST' && path.endsWith('/report')) return http.Response('', 204);
    return json({'items': [], 'next': null});
  }
}

Future<OruServices> phoneOf(Gateway g, String role) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: {role},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(g.handle),
    accountSource: (token) async => Account(userId: 'u', email: 'x@x', displayName: 'X', schools: [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: role, defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('x@x.test', 'pw');
  return svc;
}

OutboxEntry entry(String kind, Map<String, dynamic> body, {String id = 'o1', String state = OutboxState.queued}) => OutboxEntry(
      id: id, seq: 1, kind: kind, body: body, state: state, attempts: 0, nextAttemptAtMs: null, lastErrorCode: state == OutboxState.failed ? 'CONFLICT' : null, lastErrorMessage: null,
      parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('the pull keeps the conversations with their messages, and a teacher\'s class messages with the counts', () async {
    final g = Gateway();
    final svc = await phoneOf(g, 'TEACHER');
    for (final t in messagingPullTasks(svc.api)) {
      await t.run(svc.store);
    }
    expect((await svc.store.records(kThread)).map((t) => t['id']), unorderedEquals(['t1', 't2']));
    expect((await svc.store.records(kMessage, parentId: 't1')).single['body'], 'Hello');
    final b = await svc.store.record(kBroadcast, 'b1');
    expect((b!['stats'] as Map)['reachedStudents'], 28, reason: 'a list without counts is completed from the single read');
    await svc.dispose();
  });

  test('the conversations: newest first; one opened here is no longer unread; the messages: the school\'s oldest first, then the ones on the phone', () {
    final rows = buildThreads(threads: [thread('t1', unread: true, last: '2026-11-01T10:00:00Z'), thread('t2', last: '2026-11-03T10:00:00Z'), thread('t3', unread: true, last: '2026-11-02T10:00:00Z')], outbox: [entry(OutboxKinds.threadRead, {'threadId': 't3'})]);
    expect(rows.map((r) => r.id), ['t2', 't3', 't1']);
    expect(rows.firstWhere((r) => r.id == 't3').unread, isFalse);
    expect(rows.firstWhere((r) => r.id == 't1').unread, isTrue);
    final m = buildMessages(
      messages: [msg('b', 'Second', at: '2026-11-01T10:05:00Z'), msg('a', 'First', mine: true, canHide: true)],
      outbox: [entry(OutboxKinds.messageSend, {'threadId': 't1', 'body': 'Waiting'}), entry(OutboxKinds.messageSend, {'threadId': 'other', 'body': 'Not here'}, id: 'o2'), entry(OutboxKinds.messageSend, {'threadId': 't1', 'body': 'Refused'}, id: 'o3', state: OutboxState.failed)],
      threadId: 't1',
    );
    expect(m.map((r) => r.body), ['First', 'Second', 'Waiting', 'Refused']);
    expect(m.first.canHide, isTrue);
    expect(m.last.refusal, isNotNull);
  });

  test('class messages: the teacher\'s own on the phone come first; a parent\'s unread ones are marked', () {
    final rows = buildBroadcasts(
      items: [bc('b1', read: false, students: [{'id': 'st1', 'name': 'Ravi Kumar'}]), bc('b2', read: true, at: '2026-11-03T08:00:00Z')],
      outbox: [entry(OutboxKinds.broadcastSend, {'classId': 'c1', 'title': 'Waiting', 'body': 'x'})],
      classNames: {'c1': '5A'},
    );
    expect(rows.map((r) => r.title), ['Waiting', 'Trip on Friday', 'Trip on Friday']);
    expect(rows.first.pending, isTrue);
    expect(rows.first.className, '5A');
    expect(rows.where((r) => r.unread), hasLength(1));
  });

  test('the sender maps each kind to the gateway, the entry id being the clientId', () async {
    final g = Gateway();
    final svc = await phoneOf(g, 'TEACHER');
    final sender = OruApiSender(svc.api);
    await sender.send(entry(OutboxKinds.messageSend, {'threadId': 't1', 'body': 'Hi'}, id: 'cid1'));
    await sender.send(entry(OutboxKinds.threadRead, {'threadId': 't1'}));
    await sender.send(entry(OutboxKinds.broadcastSend, {'classId': 'c1', 'title': 'T', 'body': 'B'}, id: 'cid2'));
    await sender.send(entry(OutboxKinds.broadcastRead, {'id': 'b1'}));
    expect(g.calls, containsAll(['POST /v1/messages/threads/t1/messages', 'POST /v1/messages/threads/t1/read', 'POST /v1/broadcasts', 'POST /v1/broadcasts/b1/read']));
    expect((g.bodies['POST /v1/messages/threads/t1/messages'] as Map)['clientId'], 'cid1');
    expect((g.bodies['POST /v1/broadcasts'] as Map)['clientId'], 'cid2');
    await svc.dispose();
  });

  testWidgets('a parent starts a conversation: chooses the child, then the teacher, and lands in it; offline it says so and changes nothing', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'PARENT');
      await svc.store.replaceAllRecords('Child', [(id: 'st1', parentId: null, json: {'id': 'st1', 'name': 'Ravi Kumar', 'class': {'id': 'c1', 'name': '5A'}, 'enrollmentId': 'E1', 'relationship': 'MOTHER'})]);
      await tester.pumpWidget(host(OruNewMessageScreen(services: svc, forParent: true)));
      await pumpFor(tester);
      expect(find.text('Choose a student'), findsOneWidget);
      g.offline = true;
      await tester.tap(find.textContaining('Ravi Kumar'));
      await pumpFor(tester, 10);
      expect(find.text('This needs a connection. Nothing was changed.'), findsOneWidget);
      g.offline = false;
      await tester.pumpWidget(host(OruNewMessageScreen(key: UniqueKey(), services: svc, forParent: true, studentId: 'st1')));
      await pumpFor(tester, 10);
      expect(find.text('Class teacher'), findsOneWidget);
      expect(find.text('Teacher of Maths'), findsOneWidget);
      await tester.tap(find.textContaining('Tara Teach'));
      await pumpFor(tester, 15);
      expect(g.calls, contains('POST /v1/messages/threads'));
      expect(find.text('Write a message'), findsOneWidget, reason: 'the conversation is open');
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a conversation: opening an unread one queues "read"; writing is saved once on the phone; empty is refused; a hidden message shows no words', (tester) async {
    phone(tester);
    final g = Gateway()..offline = true;
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'TEACHER');
      await svc.store.replaceAllRecords(kThread, [(id: 't1', parentId: null, json: thread('t1', unread: true))]);
      await svc.store.replaceRecords(kMessage, parentId: 't1', records: [(id: 'm1', json: msg('m1', 'Is he better?')), (id: 'm2', json: msg('m2', 'secret', mine: true, hidden: true, at: '2026-11-01T10:05:00Z'))]);
      final row = buildThreads(threads: await svc.store.records(kThread), outbox: const []).single;
      await tester.pumpWidget(host(OruConversationScreen(services: svc, thread: row)));
      await pumpFor(tester, 10);
      expect(find.text('Is he better?'), findsOneWidget);
      expect(find.text('secret'), findsNothing);
      expect(find.text('This message was hidden by the person who wrote it.'), findsOneWidget);
      expect((await svc.store.all()).where((e) => e.kind == OutboxKinds.threadRead), hasLength(1));
      await tester.tap(find.text('Send'));
      await pumpFor(tester, 5);
      expect(find.text('Write something first.'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, 'Yes, much better');
      await pumpFor(tester, 5);
      expect(find.text('16 of 1000'), findsOneWidget);
      await tester.tap(find.text('Send'));
      await pumpFor(tester, 10);
      final sent = (await svc.store.all()).where((e) => e.kind == OutboxKinds.messageSend).toList();
      expect(sent, hasLength(1));
      expect(sent.single.body, {'threadId': 't1', 'body': 'Yes, much better'});
      expect(find.text('Saved on this phone, not sent yet'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('hide asks first and is only offered on your own recent message; report is offered on theirs and asks first', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'PARENT');
      await svc.store.replaceAllRecords(kThread, [(id: 't1', parentId: null, json: thread('t1'))]);
      await svc.store.replaceRecords(kMessage, parentId: 't1', records: [(id: 'm1', json: msg('m1', 'Rude words')), (id: 'm2', json: msg('m2', 'Mine', mine: true, canHide: true, at: '2026-11-01T10:05:00Z'))]);
      final row = buildThreads(threads: await svc.store.records(kThread), outbox: const []).single;
      await tester.pumpWidget(host(OruConversationScreen(services: svc, thread: row)));
      await pumpFor(tester, 10);
      await tester.tap(find.text('Report'));
      await pumpFor(tester);
      expect(g.calls.any((c) => c.endsWith('/report')), isFalse, reason: 'asks first');
      expect(find.textContaining('The school will read this conversation'), findsOneWidget);
      await tester.tap(find.text('Report').last);
      await pumpFor(tester, 10);
      expect(g.calls.any((c) => c.endsWith('/messages/m1/report')), isTrue);
      expect(find.text('Reported. The school will look at it.'), findsOneWidget);
      await tester.tap(find.text('Hide'));
      await pumpFor(tester);
      expect(g.calls.any((c) => c.endsWith('/hide')), isFalse, reason: 'asks first');
      await tester.tap(find.text('Hide').last);
      await pumpFor(tester, 10);
      expect(g.calls.any((c) => c.endsWith('/messages/m2/hide')), isTrue);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a teacher sends to the class: saved once on the phone; her sent ones show who was reached and who must be called', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'TEACHER');
      await svc.store.replaceAllRecords(kTeachingClass, [(id: 'c1', parentId: null, json: {'id': 'c1', 'name': '5A'})]);
      for (final t in messagingPullTasks(svc.api)) {
        await t.run(svc.store);
      }
      await tester.pumpWidget(host(OruBroadcastsScreen(services: svc, forParent: false)));
      await pumpFor(tester, 10);
      await tester.tap(find.textContaining('Trip on Friday').first);
      await pumpFor(tester, 10);
      expect(find.text('28 of 30 students reached'), findsOneWidget);
      expect(find.text('12 of 40 parent accounts have opened it'), findsOneWidget);
      expect(find.text('No parent account yet. Please call:'), findsOneWidget);
      expect(find.textContaining('Meena Rao'), findsOneWidget);

      await tester.tap(find.text('Send to the whole class'));
      await pumpFor(tester, 10);
      await tester.tap(find.text('Send to parents'));
      await pumpFor(tester, 5);
      expect(find.text('Write a title of up to 120 characters.'), findsOneWidget);
      expect(find.text('Write a message of up to 2000 characters.'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, 'Holiday');
      await tester.enterText(find.byType(TextField).last, 'School is closed on Monday.');
      await pumpFor(tester, 5);
      await tester.tap(find.text('Send to parents'));
      await pumpFor(tester, 15);
      final sent = (await svc.store.all()).where((e) => e.kind == OutboxKinds.broadcastSend).toList();
      expect(sent, hasLength(1));
      expect(sent.single.body, {'classId': 'c1', 'title': 'Holiday', 'body': 'School is closed on Monday.'});
      expect(find.text('Holiday'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a parent reads a class message: opening it queues "read" once and offers a private reply; the teacher cannot be replied to inside it', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'PARENT');
      await svc.store.replaceAllRecords(kBroadcast, [(id: 'b1', parentId: null, json: bc('b1', read: false, students: [{'id': 'st1', 'name': 'Ravi Kumar'}]))]);
      await tester.pumpWidget(host(OruBroadcastsScreen(services: svc, forParent: true)));
      await pumpFor(tester, 10);
      expect(find.text('New'), findsOneWidget);
      expect(find.text('Send to the whole class'), findsNothing);
      await tester.tap(find.textContaining('Trip on Friday'));
      await pumpFor(tester, 10);
      expect(find.text('Bring a packed lunch.'), findsOneWidget);
      expect(find.textContaining('Ravi Kumar'), findsOneWidget);
      expect(find.text('Reply privately'), findsOneWidget);
      expect(find.text('New'), findsNothing);
      expect((await svc.store.all()).where((e) => e.kind == OutboxKinds.broadcastRead), hasLength(1));
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
