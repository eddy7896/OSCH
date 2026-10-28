import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;

Future<OruServices> services() => OruServices.create(
      config,
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      identity: FakeIdentity(),
      pullTasks: todayPullTasks,
      httpClient: MockClient((r) async => http.Response(
            r.url.path.endsWith('/sync/tombstones') ? '{"items":[],"more":false,"next":"2026-01-01T00:00:00.000Z"}' : r.url.path.endsWith('/academics/schedule') ? '{"periods":[],"workingDays":["MON","TUE","WED","THU","FRI","SAT"]}' : r.url.path.endsWith('/academics/mine') ? '{"staff":null,"subjects":[],"classes":[],"classTeacherOf":[],"children":[]}' : r.url.path.endsWith('/timetable/mine') ? '{"academicYearId":"y","staffId":null,"entries":[],"next":null}' : '{"items":[],"next":null}',
            200,
            headers: {'content-type': 'application/json'},
          )),
      accountSource: (token) async => Account(
        userId: 'u1', email: 'tara@x.test', displayName: 'Tara Teacher',
        schools: [const SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en')],
      ),
    );

Future<void> pumpFor(WidgetTester tester, [int steps = 30]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('sign in lands on Today; Account opens the account page; signing out from it brings the sign-in screen back on top', (tester) async {
    tester.view.physicalSize = const Size(360 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appTeacher, home: (context, svc, st) => OruTeacherHome(services: svc, state: st)));
      await pumpFor(tester, 10);
      await tester.enterText(find.byType(TextField).at(0), 'ann@x.test');
      await tester.enterText(find.byType(TextField).at(1), 'pw');
      await tester.tap(find.text('Sign in'));
      await pumpFor(tester);
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('Leave'), findsOneWidget);
      expect(find.text('Synced'), findsOneWidget);

      await tester.tap(find.text('Account'));
      await pumpFor(tester, 10);
      expect(find.text('Signed in as Tara Teacher'), findsOneWidget);
      expect(find.text('Teacher at Greenfield'), findsOneWidget);
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      expect(find.text('Signed in as Tara Teacher'), findsNothing, reason: 'the account page was closed');
      expect(find.text('Today'), findsOneWidget);

      await tester.tap(find.text('Account'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      await tester.tap(find.text('Sign out'));
      await pumpFor(tester, 10);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Sign out')));
      await pumpFor(tester);
      expect(find.text('Email address'), findsOneWidget, reason: 'the sign-in screen, not the account page left on top of it');
      expect(find.text('Signed in as Tara Teacher'), findsNothing);
      expect(find.text('Today'), findsNothing);
      await svc.dispose();
    });
  });
}
