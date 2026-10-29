// Leave from the phone's own screens, on a REAL simulator or phone against the local gateway and Auth emulator with the demo school:
// a request made with the sending paused is saved at once, listed as not sent, and reaches the school exactly once when sending resumes.
// Same setup as signin_test.dart.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _config = OruAppConfig(
  gatewayUrl: String.fromEnvironment('ORU_GATEWAY_URL'),
  firebaseApiKey: 'fake',
  authEmulator: String.fromEnvironment('ORU_AUTH_EMULATOR') == '' ? null : String.fromEnvironment('ORU_AUTH_EMULATOR'),
);

Future<void> until(WidgetTester tester, bool Function() check, String what, {int seconds = 25}) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (check()) return;
  }
  fail('never happened: $what');
}

Future<void> untilFound(WidgetTester tester, Finder f, {int seconds = 25}) => until(tester, () => f.evaluate().isNotEmpty, '$f', seconds: seconds);

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('a leave request made with the sending paused is saved on the phone, shown as not sent, and reaches the school once', (tester) async {
    final clean = await OruServices.create(_config, allowedRoles: const {'TEACHER'});
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final online = StreamController<bool>.broadcast();
    final svc = await OruServices.create(_config,
        allowedRoles: const {'TEACHER'}, pullTasks: (api) => [...todayPullTasks(api), ...leavePullTasks(api), ...classesPullTasks(api)], online: online.stream, isOnline: () async => false);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appTeacher, home: (context, svc, st) => OruTeacherHome(services: svc, state: st)));
    await untilFound(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'teacher@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await untilFound(tester, find.text('Today'));
    // Sending is paused, but the lists were pulled once at sign-in? Not with the device offline: connect for the pull, then pause.
    online.add(true);
    for (var i = 0; i < 150 && (await svc.store.records(kLeaveType)).isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    final types = await svc.store.records(kLeaveType);
    expect(types, isNotEmpty);
    online.add(false);
    await tester.pump(const Duration(milliseconds: 300));
    final before = (await svc.api.leaveRequests()).items.length;

    await tester.tap(find.text('Leave').last);
    await tester.pumpAndSettle();
    await untilFound(tester, find.text('Ask for leave'));
    await tester.tap(find.text('Ask for leave'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(types.first['name'] as String).first);
    await tester.pump(const Duration(milliseconds: 300));
    final reason = 'sim-${DateTime.now().millisecondsSinceEpoch}';
    await tester.enterText(find.byType(TextField), reason);
    await tester.pump(const Duration(milliseconds: 300));
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.scrollUntilVisible(find.text('Send request'), 200, scrollable: find.byType(Scrollable).last);
    await tester.tap(find.text('Send request'));
    await untilFound(tester, find.text('Saved on this phone, not sent yet'));
    final queued = (await svc.store.all()).where((e) => e.kind == 'leave.create').toList();
    expect(queued, hasLength(1));
    expect((await svc.api.leaveRequests()).items.length, before, reason: 'nothing reached the school while paused');

    online.add(true);
    for (var i = 0; i < 200 && (await svc.store.all()).isNotEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(await svc.store.all(), isEmpty, reason: 'sent and accepted');
    final mine = (await svc.api.leaveRequests()).items.where((r) => r.reason == reason).toList();
    expect(mine, hasLength(1), reason: 'sent once');

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
    await online.close();
  }, skip: skip != null);
}
