import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart' show TextField;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> cm(String id, String kind, String name, String body, {bool mine = false, bool hidden = false, bool canChange = false, String? replyTo, String at = '2026-11-01T10:00:00Z'}) => {
      'id': id, 'resourceId': 'r1', 'author': {'kind': kind, 'name': name, 'mine': mine}, 'body': hidden && kind == 'PARENT' ? null : body, 'hidden': hidden, 'edited': false, 'replyToId': replyTo, 'canChange': canChange, 'createdAt': at, 'updatedAt': at,
    };

class Gateway {
  final calls = <String>[];
  bool offline = false;
  String? conflict; // a rule to answer edits with
  List<Map<String, dynamic>> comments = [];

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    final path = r.url.path;
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    calls.add('${r.method} $path');
    if (path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    final m = RegExp(r'/resources/r1/comments(?:/([^/]+)(/hide)?)?$').firstMatch(path);
    if (m != null) {
      final id = m.group(1);
      if (r.method == 'GET' && id == null) return json({'items': comments});
      if (conflict != null && (r.method == 'PUT' || r.method == 'DELETE')) return json({'error': {'code': 'CONFLICT', 'message': 'no', 'requestId': 'r', 'details': [{'field': 'comment', 'rule': conflict}]}}, 409);
      if (r.method == 'PUT') {
        comments = [for (final c in comments) c['id'] == id ? {...c, 'body': (jsonDecode(r.body) as Map)['body'], 'edited': true} : c];
        return json(comments.firstWhere((c) => c['id'] == id));
      }
      if (r.method == 'DELETE') {
        comments = [for (final c in comments) if (c['id'] != id) c];
        return http.Response('', 204);
      }
      if (r.method == 'POST' && m.group(2) != null) {
        comments = [for (final c in comments) c['id'] == id ? {...c, 'hidden': true} : c];
        return json(comments.firstWhere((c) => c['id'] == id));
      }
    }
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

Future<void> load(OruServices s, List<Map<String, dynamic>> comments) => s.store.replaceRecords(kComment, parentId: 'r1', records: [for (final c in comments) (id: c['id'] as String, json: c)]);

OutboxEntry post(String id, {String state = OutboxState.queued}) => OutboxEntry(
      id: id, seq: 1, kind: OutboxKinds.resourceCommentPost, body: {'resourceId': 'r1', 'body': 'Waiting one'}, state: state, attempts: 0, nextAttemptAtMs: null,
      lastErrorCode: state == OutboxState.failed ? 'CONFLICT' : null, lastErrorMessage: null, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);
  final now = DateTime.utc(2026, 11, 1, 10, 2);

  test('the thread: the school\'s comments oldest first, then the ones on the phone; Edit and Delete stop after 5 minutes by the phone\'s clock', () {
    final rows = buildThread(
      comments: [cm('b', 'TEACHER', 'Tara Teach', 'Yes', at: '2026-11-01T10:01:00Z'), cm('a', 'PARENT', 'Asha', 'Question', mine: true, canChange: true), cm('c', 'PARENT', 'Asha', 'Old', mine: true, canChange: true, at: '2026-11-01T09:50:00Z')],
      outbox: [post('o1'), post('o2', state: OutboxState.failed)],
      resourceId: 'r1',
      now: now,
    );
    expect(rows.map((r) => r.id), ['c', 'a', 'b', 'o1', 'o2']);
    expect(rows.firstWhere((r) => r.id == 'a').canChange, isTrue);
    expect(rows.firstWhere((r) => r.id == 'c').canChange, isFalse, reason: 'posted 12 minutes ago');
    expect(rows.firstWhere((r) => r.id == 'o1').pending, isTrue);
    expect(rows.firstWhere((r) => r.id == 'o2').refusal, isNotNull);
  });

  testWidgets('a parent: signed "Parent of", hidden comments show no words, posting offline is saved once on the phone, privacy note shown', (tester) async {
    phone(tester);
    final g = Gateway()..offline = true;
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'PARENT');
      await load(svc, [cm('a', 'PARENT', 'Asha', 'Is page 4 needed?', mine: true, canChange: true, at: now.subtract(const Duration(minutes: 1)).toIso8601String()), cm('b', 'PARENT', 'Dev', 'secret words', hidden: true), cm('c', 'TEACHER', 'Tara Teach', 'Yes, page 4 too', replyTo: 'a')]);
      await tester.pumpWidget(host(OruCommentsScreen(services: svc, resourceId: 'r1', resourceTitle: 'Fractions', forParent: true, now: () => now)));
      await pumpFor(tester);
      expect(find.text('Parent of Asha'), findsOneWidget);
      expect(find.text('Hidden by the school'), findsOneWidget);
      expect(find.text('secret words'), findsNothing);
      expect(find.textContaining('In reply to Parent of Asha'), findsOneWidget);
      expect(find.text('Other parents of the class will see your child\'s first name next to your comment.'), findsOneWidget);
      expect(find.text('Hide'), findsNothing, reason: 'a parent cannot hide');

      await tester.tap(find.text('Send comment'));
      await pumpFor(tester, 5);
      expect(find.text('Write something first.'), findsOneWidget);
      expect(await svc.store.all(), isEmpty);
      await tester.enterText(find.byType(TextField).last, 'Thank you');
      await pumpFor(tester, 5);
      expect(find.text('9 of 500'), findsOneWidget);
      await tester.tap(find.text('Send comment'));
      await pumpFor(tester, 10);
      final queued = (await svc.store.all()).where((e) => e.kind == OutboxKinds.resourceCommentPost).toList();
      expect(queued, hasLength(1));
      expect(queued.single.body, {'resourceId': 'r1', 'body': 'Thank you'});
      expect(find.text('Saved on this phone, not sent yet'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a parent changes their own comment: Edit saves it, Delete removes it; with no connection or after the window the reason is said', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'PARENT');
      final mine = cm('a', 'PARENT', 'Asha', 'Frist', mine: true, canChange: true, at: now.subtract(const Duration(minutes: 1)).toIso8601String());
      g.comments = [mine];
      await load(svc, [mine]);
      await tester.pumpWidget(host(OruCommentsScreen(services: svc, resourceId: 'r1', resourceTitle: 'Fractions', forParent: true, now: () => now)));
      await pumpFor(tester);
      await tester.tap(find.text('Edit'));
      await pumpFor(tester);
      await tester.enterText(find.byType(TextField).first, 'First');
      await tester.tap(find.text('Save'));
      await pumpFor(tester, 10);
      expect(g.calls.any((c) => c.startsWith('PUT ')), isTrue);
      expect(find.text('First'), findsOneWidget);
      expect(find.textContaining('edited'), findsOneWidget);
      g.conflict = 'editWindowClosed';
      await tester.tap(find.text('Delete'));
      await pumpFor(tester, 10);
      expect(find.text('The 5 minutes for changing this comment are over.'), findsOneWidget);
      g.conflict = null;
      g.offline = true;
      await tester.tap(find.text('Delete'));
      await pumpFor(tester, 10);
      expect(find.text('Changing a comment needs a connection. Nothing was changed.'), findsOneWidget);
      g.offline = false;
      await tester.tap(find.text('Delete'));
      await pumpFor(tester, 10);
      expect(find.text('First'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a teacher: sees hidden words marked, hides another\'s comment only after asking; cannot hide her own', (tester) async {
    phone(tester);
    final g = Gateway();
    await tester.runAsync(() async {
      final svc = await phoneOf(g, 'TEACHER');
      final all = [cm('a', 'PARENT', 'Asha', 'A rude remark'), cm('b', 'TEACHER', 'Tara Teach', 'Please be kind', mine: true)];
      g.comments = all;
      await load(svc, all);
      await tester.pumpWidget(host(OruCommentsScreen(services: svc, resourceId: 'r1', resourceTitle: 'Fractions', canHide: true, now: () => now)));
      await pumpFor(tester);
      expect(find.text('Hide'), findsOneWidget, reason: 'only on the parent\'s comment');
      await tester.tap(find.text('Hide'));
      await pumpFor(tester);
      expect(g.calls.any((c) => c.endsWith('/hide')), isFalse, reason: 'asks first');
      expect(find.textContaining('Parents will no longer see its words'), findsOneWidget);
      await tester.tap(find.text('Hide').last);
      await pumpFor(tester, 10);
      expect(g.calls.any((c) => c.endsWith('/hide')), isTrue);
      expect(find.text('A rude remark'), findsOneWidget);
      expect(find.text('Hidden: parents cannot see these words'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
