// Marks entry from the phone's own screens, on a REAL simulator or phone against the local gateway and Auth emulator with the demo school:
// marks typed with the sending paused are saved at once and reach the school exactly once when sending resumes. Same setup as signin_test.dart.
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

  testWidgets('marks typed on the phone with the sending paused are saved at once, a mark above the maximum is refused on the phone, and the rest reaches the school once', (tester) async {
    final clean = await OruServices.create(_config, allowedRoles: const {'TEACHER'});
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final online = StreamController<bool>.broadcast();
    final svc = await OruServices.create(_config,
        allowedRoles: const {'TEACHER'}, pullTasks: (api) => [...todayPullTasks(api), ...marksPullTasks(api)], online: online.stream, isOnline: () async => false);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appTeacher, home: (context, svc, st) => OruTeacherHome(services: svc, state: st)));
    await untilFound(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'teacher@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await untilFound(tester, find.text('Today'));

    for (var i = 0; i < 150 && (await svc.store.records(kExam)).isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    final exams = await svc.store.records(kExam);
    expect(exams, isNotEmpty, reason: 'the demo teacher has an exam to enter marks for');
    final exam = exams.first;
    for (var i = 0; i < 50 && (await svc.store.records(kExamStudent, parentId: exam['id'] as String)).isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    final roster = await svc.store.records(kExamStudent, parentId: exam['id'] as String)
      ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
    expect(roster.length, greaterThanOrEqualTo(2));

    await tester.tap(find.text('Marks').last);
    await tester.pumpAndSettle();
    await untilFound(tester, find.text(exam['title'] as String));
    await tester.tap(find.text(exam['title'] as String).first);
    // Several exams may share a title: find which one opened from what the screen shows (its maximum and its students).
    await untilFound(tester, find.textContaining(' out of '));
    final header = tester.widgetList<Text>(find.textContaining(' out of ')).map((t) => t.data!).firstWhere((t) => t.contains('·'));
    final openedTenths = (double.parse(RegExp(r'out of ([\d.]+)').firstMatch(header)!.group(1)!) * 10).round();
    Map<String, dynamic>? openedExam;
    List<Map<String, dynamic>> openedRoster = const [];
    for (final e in exams.where((e) => e['title'] == exam['title'] && (e['maxTenths'] as num).toInt() == openedTenths)) {
      final r = await svc.store.records(kExamStudent, parentId: e['id'] as String)
        ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
      if (r.length >= 2 && find.text(r.first['name'] as String).evaluate().isNotEmpty && find.text(r[1]['name'] as String).evaluate().isNotEmpty) {
        openedExam = e;
        openedRoster = r;
        break;
      }
    }
    expect(openedExam, isNotNull, reason: 'the exam that opened is one of the pulled exams');
    final maxTenthsOpened = (openedExam!['maxTenths'] as num).toInt();

    // a mark above the maximum is refused ON THE PHONE
    final boxes = find.byWidgetPredicate((w) => w is TextField && w.controller != null);
    await tester.enterText(boxes.at(0), '${maxTenthsOpened ~/ 10 + 1}');
    await untilFound(tester, find.textContaining('Marks cannot be more than')); // the draft is written to the phone's database first
    expect(find.textContaining('Marks cannot be more than'), findsOneWidget);
    expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Save marks')).onPressed, isNull);

    // a valid mark for the second student (a value different from what the school has now)
    final haveSecond = openedRoster[1]['marksTenths'] as num?;
    final typed = haveSecond == 15 ? '2.5' : '1.5';
    await tester.enterText(boxes.at(0), '');
    await until(tester, () => find.textContaining('Marks cannot be more than').evaluate().isEmpty, 'the error clears');
    await tester.enterText(boxes.at(1), typed);
    await until(tester, () => tester.widget<TextButton>(find.widgetWithText(TextButton, 'Save marks')).onPressed != null, 'Save is on');
    await tester.tap(find.text('Save marks'));
    await untilFound(tester, find.text('Saved on this phone. It reaches the school when you are connected.'));
    final queued = (await svc.store.all()).where((e) => e.kind == 'marks.save').toList();
    expect(queued, hasLength(1));
    expect((queued.single.body['entries'] as List).length, lessThanOrEqualTo(2));

    // sending resumes: sent once, the phone empties, the school has the mark
    online.add(true);
    for (var i = 0; i < 200 && (await svc.store.all()).isNotEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    expect(await svc.store.all(), isEmpty, reason: 'sent and accepted');
    final grid = await svc.api.gradesGrid(id: openedExam['id'] as String);
    expect(grid.rows.firstWhere((r) => r.studentId == openedRoster[1]['studentId']).marks, typed);

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
    await online.close();
  }, skip: skip != null);
}
