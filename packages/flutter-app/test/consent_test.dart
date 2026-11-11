import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/widgets.dart' show Scrollable;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> status({required bool given, int? version = 1, String? at = '2026-11-10T08:00:00.000Z'}) => {
      'noticeVersion': 1,
      'purposes': [{'purpose': 'SCHOOL_USE', 'required': true, 'given': given, 'noticeVersion': given ? version : null, 'recordedAt': given ? at : null}],
      'current': given && version == 1,
    };

/// A school that holds one parent's consent and refuses nothing else.
class School {
  School({this.given = false});
  bool given;
  bool offline = false;
  final posts = <Map<String, dynamic>>[];

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    final p = r.url.path;
    if (p.endsWith('/consent') && r.method == 'GET') return json(status(given: given));
    if (p.endsWith('/consent') && r.method == 'POST') {
      final b = jsonDecode(r.body) as Map<String, dynamic>;
      posts.add(b);
      given = b['given'] as bool;
      return json(status(given: given));
    }
    if (p.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    return json({'items': [], 'next': null});
  }
}

Future<OruServices> phoneOf(School s) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'PARENT'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(s.handle),
    accountSource: (token) async => Account(userId: 'u', email: 'p@x', displayName: 'Parvati Rao', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'PARENT', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('p@x.test', 'pw');
  return svc;
}

SessionActive stateOf() {
  const school = SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'PARENT', defaultLanguage: 'en');
  return SessionActive(Account(userId: 'u1', email: 'p@x.test', displayName: 'Parvati Rao', schools: const [school]), school);
}

Future<void> press(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 200, scrollable: find.byType(Scrollable).first);
  await tester.pump();
  await tester.tap(f);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('first run: the notice comes first; Continue needs the box; agreeing is recorded with the version and language and opens the app', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School();
      final svc = await phoneOf(school);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester);
      expect(find.text('Privacy and consent'), findsOneWidget);
      expect(find.text('Home'), findsNothing, reason: 'nothing of the app opens before the answer');
      await press(tester, find.text('Continue'));
      await pumpFor(tester);
      expect(find.text('Tick the box to continue.'), findsOneWidget);
      expect(school.posts, isEmpty);
      await press(tester, find.text('I have read this and I agree'));
      await pumpFor(tester);
      await press(tester, find.text('Continue'));
      await pumpFor(tester, 40);
      expect(school.posts.single, {'noticeVersion': 1, 'language': 'en', 'given': true});
      expect(find.text('Privacy and consent'), findsNothing);
      expect(find.text('Home'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('not agreeing says what that means and records nothing', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School();
      final svc = await phoneOf(school);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester);
      await press(tester, find.text('I do not agree'));
      await pumpFor(tester);
      expect(find.textContaining('Without your consent the app cannot show'), findsOneWidget);
      expect(school.posts, isEmpty);
      await pumpFor(tester, 40);
      await svc.dispose();
    });
  });

  testWidgets('no connection: the answer is not kept and the parent is told; the notice stays', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School();
      final svc = await phoneOf(school);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester);
      school.offline = true;
      await press(tester, find.text('I have read this and I agree'));
      await pumpFor(tester);
      await press(tester, find.text('Continue'));
      await pumpFor(tester, 40);
      expect(find.textContaining('could not be saved'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget, reason: 'still on the notice');
      await pumpFor(tester, 40);
      await svc.dispose();
    });
  });

  testWidgets('already consented and offline: the app opens from what the phone remembers', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School(given: true);
      final svc = await phoneOf(school);
      await svc.store.upsertRecords(kConsentState, [(id: 'me', parentId: null, json: status(given: true))]);
      school.offline = true;
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester, 40);
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Privacy and consent'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('the school says consent is gone (withdrawn on another phone, or a new notice): the data closes', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School(given: false);
      final svc = await phoneOf(school);
      await svc.store.upsertRecords(kConsentState, [(id: 'me', parentId: null, json: status(given: true))]);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester, 60);
      expect(find.text('Privacy and consent'), findsOneWidget);
      expect(find.text('Home'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('More, Privacy: shows when the parent agreed; withdrawing asks first, tells the school, and closes the app\'s data', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final school = School(given: true);
      final svc = await phoneOf(school);
      await svc.store.upsertRecords(kConsentState, [(id: 'me', parentId: null, json: status(given: true))]);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: stateOf())));
      await pumpFor(tester, 40);
      await tester.tap(find.text('More'));
      await pumpFor(tester);
      await press(tester, find.text('Privacy'));
      await pumpFor(tester, 30);
      expect(find.textContaining('You agreed on'), findsOneWidget);
      await press(tester, find.text('Withdraw my consent'));
      await pumpFor(tester);
      await press(tester, find.text('Keep my consent'));
      await pumpFor(tester);
      expect(school.posts, isEmpty, reason: 'keeping it changes nothing');
      await press(tester, find.text('Withdraw my consent'));
      await pumpFor(tester);
      await tester.tap(find.text('Withdraw').last);
      await pumpFor(tester, 60);
      expect(school.posts.single['given'], false);
      expect(find.text('Privacy and consent'), findsOneWidget);
      await svc.dispose();
    });
  });
}
