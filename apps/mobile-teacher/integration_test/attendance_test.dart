// E-SYNC-1 from the phone's own screens, on a REAL simulator or phone against the local gateway and Auth emulator with the demo school:
// attendance taken with the network off syncs once when it returns. Same setup as signin_test.dart (see its header for the command).
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
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

  testWidgets('attendance taken on the phone with the sending paused is saved at once, and reaches the school exactly once when sending resumes', (tester) async {
    // start from nothing
    final clean = await OruServices.create(_config, allowedRoles: const {'TEACHER'});
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final online = StreamController<bool>.broadcast();
    final svc = await OruServices.create(_config, allowedRoles: const {'TEACHER'}, pullTasks: todayPullTasks, online: online.stream, isOnline: () async => false);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appTeacher, home: (context, svc, st) => OruTeacherHome(services: svc, state: st)));
    await untilFound(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'teacher@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await untilFound(tester, find.text('Today'));

    // Her classes and rosters arrive (reading works), but the phone is told it has no connection, so nothing is sent.
    await until(tester, () => true, 'settle', seconds: 1);
    await tester.tap(find.text('Attendance').last);
    await tester.pumpAndSettle();
    final classes = await svc.store.records(kTeachingClass);
    await until(tester, () => false, 'wait for the pull', seconds: 0).catchError((_) {});
    for (var i = 0; i < 100 && (await svc.store.records(kTeachingClass)).isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    expect(classes.isNotEmpty || (await svc.store.records(kTeachingClass)).isNotEmpty, isTrue, reason: 'the demo teacher is class teacher of a class');
    final cls = (await svc.store.records(kTeachingClass)).first;
    final roster = await svc.store.records(kClassStudent, parentId: cls['id'] as String);
    expect(roster, isNotEmpty);
    roster.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
    final first = roster.first;

    // What the school has for the first student now, so that this run changes it to something different.
    final today = isoDate(DateTime.now());
    final before = (await svc.api.attendanceDay(id: cls['id'] as String, date: today)).students.firstWhere((s) => s.id == first['id']).status;
    final target = before == 'LATE' ? 'MEDICAL' : 'LATE';
    final targetWord = target == 'LATE' ? 'Late' : 'Medical';

    await untilFound(tester, find.text(cls['name'] as String));
    await tester.tap(find.text(cls['name'] as String));
    await untilFound(tester, find.text(first['name'] as String));
    await tester.tap(find.text('Mark all present'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(first['name'] as String));
    await tester.pumpAndSettle();
    await tester.tap(find.text(targetWord).last);
    await tester.pumpAndSettle();
    expect(find.text('1 exception'), findsOneWidget);
    await tester.tap(find.text('Save attendance'));
    await untilFound(tester, find.text('Saved on this phone. It reaches the school when you are connected.'));

    // Saved on the phone, not at the school.
    expect((await svc.store.all()).where((e) => e.kind == 'attendance.submit'), hasLength(1));
    final stillBefore = (await svc.api.attendanceDay(id: cls['id'] as String, date: today)).students.firstWhere((s) => s.id == first['id']).status;
    expect(stillBefore, before, reason: 'the school has not heard yet');

    // The connection returns: it is sent once, and the phone empties.
    online.add(true);
    await until(tester, () => svc.engine.activity != EngineActivity.sending, 'engine idle', seconds: 2);
    for (var i = 0; i < 200 && (await svc.store.all()).isNotEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(await svc.store.all(), isEmpty, reason: 'sent and accepted');
    final after = (await svc.api.attendanceDay(id: cls['id'] as String, date: today)).students.firstWhere((s) => s.id == first['id']).status;
    expect(after, target);

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
    await online.close();
  }, skip: skip != null);
}
