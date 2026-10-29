import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> req(String id, String who) => {
      'id': id, 'status': 'PENDING', 'startDate': '2026-11-03', 'endDate': '2026-11-03', 'days': '1', 'half': null, 'reason': 'Family function', 'createdAt': '2026-10-29T08:00:00.000Z',
      'staff': {'id': 's-$id', 'name': who, 'employeeId': 'E$id'}, 'type': {'id': 't', 'name': 'Casual leave', 'paid': true}, 'decision': null,
    };

/// A gateway that lists two pending requests, approves or declines on request, and can be told to refuse or to vanish.
class Fake {
  final pending = [req('1', 'Tara Teacher'), req('2', 'Ravi Kumar')];
  String? refuse; // an error code to answer decisions with
  bool offline = false;
  final decisions = <String>[];

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    final path = r.url.path;
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    if (path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    final m = RegExp(r'/leave/requests/([^/]+)/(approve|reject)$').firstMatch(path);
    if (m != null) {
      if (refuse != null) return json({'error': {'code': refuse, 'message': 'no', 'requestId': 'r'}}, 403);
      decisions.add('${m.group(2)} ${m.group(1)}');
      final done = pending.firstWhere((x) => x['id'] == m.group(1));
      pending.remove(done);
      return json({...done, 'status': m.group(2) == 'approve' ? 'APPROVED' : 'REJECTED'});
    }
    if (path.endsWith('/leave/requests')) return json({'items': pending, 'next': null});
    return json({'items': [], 'next': null});
  }
}

Future<OruServices> principalServices(Fake fake) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'PRINCIPAL'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(fake.handle),
    accountSource: (token) async => Account(userId: 'u', email: 'p@x', displayName: 'Priya', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'PRINCIPAL', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('p@x.test', 'pw');
  return svc;
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('pending requests are listed; Approve and Decline each decide one at once and it leaves the list', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final fake = Fake();
      final svc = await principalServices(fake);
      await tester.pumpWidget(host(OruApprovalsScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('Tara Teacher, Casual leave'), findsOneWidget);
      expect(find.text('Ravi Kumar, Casual leave'), findsOneWidget);
      await tester.tap(find.text('Approve').first);
      await pumpFor(tester);
      expect(fake.decisions, ['approve 1']);
      expect(find.text('Tara Teacher, Casual leave'), findsNothing);
      await tester.tap(find.text('Decline'));
      await pumpFor(tester);
      expect(fake.decisions, ['approve 1', 'reject 2']);
      expect(find.text('No leave requests are waiting for you.'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('with no connection a decision is NOT queued: it says so and nothing changes', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final fake = Fake();
      final svc = await principalServices(fake);
      await tester.pumpWidget(host(OruApprovalsScreen(services: svc)));
      await pumpFor(tester);
      fake.offline = true;
      await tester.tap(find.text('Approve').first);
      await pumpFor(tester);
      expect(find.text('Deciding needs a connection. Nothing was changed.'), findsOneWidget);
      expect(find.text('Tara Teacher, Casual leave'), findsOneWidget, reason: 'still waiting');
      expect(await svc.store.all(), isEmpty, reason: 'nothing was put in the outbox');
      await svc.dispose();
    });
  });

  testWidgets('a refusal from the school is shown and the list is read again', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final fake = Fake();
      final svc = await principalServices(fake);
      await tester.pumpWidget(host(OruApprovalsScreen(services: svc)));
      await pumpFor(tester);
      fake.refuse = 'CONFLICT';
      await tester.tap(find.text('Approve').first);
      await pumpFor(tester);
      expect(find.text('The school did not accept this decision.'), findsOneWidget);
      expect(fake.decisions, isEmpty);
      await svc.dispose();
    });
  });
}
