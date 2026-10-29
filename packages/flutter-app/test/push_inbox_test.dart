import 'dart:async';
import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show services, pumpFor, host, phone;

class FakePush implements PushPort {
  String? current = 'fcm-token-one-1234';
  final _changes = StreamController<String>.broadcast();
  final _received = StreamController<void>.broadcast();
  final _opened = StreamController<void>.broadcast();
  @override
  Future<String?> token() async => current;
  @override
  Stream<String> get tokenChanges => _changes.stream;
  @override
  Stream<void> get received => _received.stream;
  @override
  Stream<void> get opened => _opened.stream;
  @override
  String get platform => 'IOS';
  void rotate(String t) => _changes.add(t);
  void arrive() => _received.add(null);
  void tap() => _opened.add(null);
}

class Calls {
  final log = <String>[];
  bool failRegister = false;
  Future<http.Response> handle(http.Request r) async {
    final p = r.url.path;
    if (p.endsWith('/devices')) {
      if (failRegister) throw http.ClientException('no network');
      log.add('${r.method} devices ${jsonDecode(r.body)['token']}${r.method == 'POST' ? ' ${jsonDecode(r.body)['platform']}' : ''}');
      return http.Response('', 204);
    }
    if (p.endsWith('/sync/tombstones')) {
      log.add('pull');
      return http.Response('{"items":[],"more":false,"next":"2026-01-01T00:00:00.000Z"}', 200, headers: {'content-type': 'application/json'});
    }
    return http.Response('{"items":[],"next":null}', 200, headers: {'content-type': 'application/json'});
  }
}

Future<OruServices> withPush(FakePush push, Calls calls) => OruServices.create(
      config,
      allowedRoles: const {'STAFF'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => false,
      identity: FakeIdentity(),
      push: push,
      httpClient: MockClient(calls.handle),
      accountSource: (token) async => Account(userId: 'u', email: 's@x', displayName: 'S', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'STAFF', defaultLanguage: 'en')]),
    );

Map<String, dynamic> notice(String id, String title, String at, {bool read = false}) => {'id': id, 'title': title, 'body': 'Body $id', 'category': 'leave', 'kind': 'k', 'createdAt': at, 'read': read, 'entityId': null, 'entityType': null};

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('this phone\'s push address is registered after sign-in, again when it changes, and removed at sign-out', () async {
    final push = FakePush();
    final calls = Calls();
    final svc = await withPush(push, calls);
    await svc.session.signInWithPassword('s@x.test', 'pw');
    await Future<void>.delayed(const Duration(milliseconds: 300));
    expect(calls.log.where((l) => l.startsWith('POST')), ['POST devices fcm-token-one-1234 IOS']);
    push.rotate('fcm-token-two-5678');
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(calls.log.where((l) => l.startsWith('POST')).last, 'POST devices fcm-token-two-5678 IOS');
    await svc.session.signOut(force: true);
    expect(calls.log.last, 'DELETE devices fcm-token-two-5678', reason: 'the next person on this phone does not get these notices');
    await svc.dispose();
  });

  test('a phone with no push service registers nothing and nothing breaks; a registration that fails is not an error', () async {
    final calls = Calls();
    final none = await withPush(FakePush()..current = null, calls);
    await none.session.signInWithPassword('s@x.test', 'pw');
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(calls.log.where((l) => l.contains('devices')), isEmpty);
    await none.dispose();
    final offline = Calls()..failRegister = true;
    final svc = await withPush(FakePush(), offline);
    await svc.session.signInWithPassword('s@x.test', 'pw');
    await Future<void>.delayed(const Duration(milliseconds: 200));
    await svc.session.signOut(force: true);
    await svc.dispose();
  });

  test('a push that arrives reads the lists again; a tap on it asks the app to open the notifications', () async {
    final push = FakePush();
    final calls = Calls();
    final svc = await withPush(push, calls);
    await svc.session.signInWithPassword('s@x.test', 'pw');
    await Future<void>.delayed(const Duration(milliseconds: 300));
    calls.log.clear();
    final opens = <int>[];
    final sub = svc.inboxRequests.listen((_) => opens.add(1));
    push.arrive();
    await Future<void>.delayed(const Duration(milliseconds: 300));
    expect(calls.log, contains('pull'));
    push.tap();
    await Future<void>.delayed(const Duration(milliseconds: 300));
    expect(opens, [1]);
    await sub.cancel();
    await svc.dispose();
  });

  test('the platform default sends nothing and finds no address', () async {
    expect(await const NoPush().token(), isNull);
  });

  testWidgets('the inbox reads from the phone with the network off: newest first, unread counted, opening one marks it read once', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kNotice, [
        (id: 'a', parentId: null, json: notice('a', 'Your leave was approved', '2026-10-20T08:00:00.000Z', read: true)),
        (id: 'b', parentId: null, json: notice('b', 'New announcement', '2026-10-28T08:00:00.000Z')),
        (id: 'c', parentId: null, json: notice('c', 'Leave to decide', '2026-10-27T08:00:00.000Z')),
      ]);
      await tester.pumpWidget(host(OruInboxScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('2 unread'), findsOneWidget);
      expect(tester.getTopLeft(find.text('New announcement')).dy, lessThan(tester.getTopLeft(find.text('Leave to decide')).dy));
      expect(tester.getTopLeft(find.text('Leave to decide')).dy, lessThan(tester.getTopLeft(find.text('Your leave was approved')).dy));
      await tester.tap(find.text('New announcement'));
      await pumpFor(tester);
      await tester.tap(find.text('New announcement'));
      await pumpFor(tester);
      expect((await svc.store.all()).where((e) => e.kind == 'notice.read').map((e) => e.body['noticeId']), ['b'], reason: 'once, however often it is tapped');
      expect(find.text('1 unread'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('no notifications says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(host(OruInboxScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('You have no notifications.'), findsOneWidget);
      await svc.dispose();
    });
  });
}
