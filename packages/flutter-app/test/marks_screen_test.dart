import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;

Future<OruServices> services() async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'TEACHER'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient((r) async => throw http.ClientException('no network')),
    accountSource: (token) async => Account(userId: 'u', email: 't@x', displayName: 'T', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'TEACHER', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('ann@x.test', 'pw'); // signed in, phone offline: what is saved stays saved
  return svc;
}

const exam = {
  'id': 'e1', 'title': 'Unit 1', 'examDate': '2026-11-05', 'maxMarks': '50', 'maxTenths': 500,
  'class': {'id': 'c5', 'name': 'Class 5A'}, 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MAT'}, 'term': {'id': 't', 'name': 'Term 1'},
};

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kExam, [(id: 'e1', parentId: null, json: Map<String, dynamic>.from(exam))]);
  await s.store.replaceRecords(kExamStudent, parentId: 'e1', records: [
    (id: 'a', json: {'studentId': 'a', 'name': 'Asha Rao', 'enrollmentId': 'S-001', 'marksTenths': 400, 'marks': '40', 'absent': false, 'examId': 'e1'}),
    (id: 'b', json: {'studentId': 'b', 'name': 'Bilal Khan', 'enrollmentId': 'S-002', 'marksTenths': null, 'marks': null, 'absent': false, 'examId': 'e1'}),
    (id: 'c', json: {'studentId': 'c', 'name': 'Chitra Nair', 'enrollmentId': 'S-003', 'marksTenths': null, 'marks': null, 'absent': false, 'examId': 'e1'}),
  ]);
}

Future<void> pumpFor(WidgetTester tester, [int steps = 20]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

Widget host(Widget home, {String locale = 'en'}) => MaterialApp(
      locale: Locale(locale),
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(locale: Locale(locale)),
      home: home,
    );

Widget screen(OruServices s, {String locale = 'en'}) => host(OruMarksScreen(services: s, exam: Map<String, dynamic>.from(exam)), locale: locale);

void phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(360 * 2, 1400 * 2); // tall enough to see every row at once
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

Finder boxOf(String name) => find.byWidgetPredicate((w) => w is TextField && w.controller != null).at(['Asha Rao', 'Bilal Khan', 'Chitra Nair'].indexOf(name));

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('type marks in tenths, mark one student absent, Save: one change with only the students that changed, saved at once', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('Unit 1'), findsOneWidget);
      expect(tester.widget<TextField>(boxOf('Asha Rao')).controller!.text, '40');
      await tester.enterText(boxOf('Bilal Khan'), '42.5');
      await pumpFor(tester, 5);
      await tester.tap(find.text('Absent').last, warnIfMissed: true); // Chitra absent
      await pumpFor(tester, 10);
      await tester.tap(find.text('Save marks'));
      await pumpFor(tester);
      final queued = (await svc.store.all()).where((e) => e.kind == 'marks.save').toList();
      expect(queued, hasLength(1));
      expect(queued.single.body['examId'], 'e1');
      expect(queued.single.body['entries'], [{'studentId': 'b', 'marks': '42.5'}, {'studentId': 'c', 'absent': true}], reason: 'Asha did not change and is not sent');
      expect(find.text('Saved on this phone. It reaches the school when you are connected.'), findsOneWidget);
      expect(await svc.store.draft('marks', 'e1'), isNull);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a mark above the maximum or not a number is refused ON THE PHONE with the reason, and Save stays off until it is fixed', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      await tester.enterText(boxOf('Bilal Khan'), '51');
      await pumpFor(tester, 10);
      expect(find.text('Marks cannot be more than 50.'), findsOneWidget);
      expect(find.text('1 mark needs a correction'), findsOneWidget);
      expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Save marks')).onPressed, isNull);
      await tester.enterText(boxOf('Bilal Khan'), '4.25');
      await pumpFor(tester, 10);
      expect(find.text('Enter marks with at most one decimal, like 42 or 42.5.'), findsOneWidget);
      await tester.enterText(boxOf('Bilal Khan'), '50');
      await pumpFor(tester, 10);
      expect(find.textContaining('Marks cannot'), findsNothing);
      expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Save marks')).onPressed, isNotNull, reason: 'the maximum itself is allowed');
      expect(await svc.store.all(), isEmpty, reason: 'nothing wrong was ever queued');
      await svc.dispose();
    });
  });

  testWidgets('clearing a box that had a mark sends a clear; drafts survive the app being killed', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      await tester.enterText(boxOf('Asha Rao'), '');
      await pumpFor(tester, 10);
      await tester.pumpWidget(const SizedBox());
      await pumpFor(tester, 5);
      await tester.pumpWidget(screen(svc)); // reopened
      await pumpFor(tester);
      expect(tester.widget<TextField>(boxOf('Asha Rao')).controller!.text, '', reason: 'the draft came back');
      expect(await svc.store.all(), isEmpty);
      await tester.tap(find.text('Save marks'));
      await pumpFor(tester);
      expect((await svc.store.all()).single.body['entries'], [{'studentId': 'a'}]);
      await svc.dispose();
    });
  });

  testWidgets('what the school refused is shown with the reason and can be dismissed', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      final e = await svc.store.enqueue(kind: 'marks.save', body: {'examId': 'e1', 'entries': []});
      await svc.store.markSending(e.id);
      await svc.store.markRefused(e.id, code: 'VALIDATION_FAILED', message: 'Some fields are invalid (entries: aboveMaximum)');
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('The school did not accept these marks.'), findsOneWidget);
      expect(find.text('A mark was above the maximum. Check the marks and save again.'), findsOneWidget);
      await tester.tap(find.text('Dismiss'));
      await pumpFor(tester);
      expect(find.text('The school did not accept these marks.'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('the exam list: each exam with how far it is marked, saved changes counted, and tapping opens it', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruMarksListScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('Exams'), findsOneWidget);
      expect(find.text('Unit 1'), findsOneWidget);
      expect(find.text('1 of 3 marked'), findsOneWidget);
      expect(find.text('out of 50'), findsOneWidget);
      await svc.store.enqueue(kind: 'marks.save', body: {'examId': 'e1', 'entries': [{'studentId': 'b', 'marks': '30'}]});
      await pumpFor(tester);
      expect(find.text('2 of 3 marked'), findsOneWidget);
      await tester.tap(find.text('Unit 1'));
      await pumpFor(tester, 15);
      expect(find.text('Asha Rao'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('no exams to enter marks for, and an exam never loaded, are said plainly', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(host(OruMarksListScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('There are no exams for you to enter marks for.'), findsOneWidget);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('Connect once to load this exam.'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: right to left, translated, no overflow, text at least 13 px, buttons at least 48 px', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc, locale: 'ur'));
      await pumpFor(tester);
      expect(find.text('نمبر محفوظ کریں'), findsOneWidget);
      expect(Directionality.of(tester.element(find.byType(Scaffold).first)), TextDirection.rtl);
      for (final r in tester.widgetList<RichText>(find.byType(RichText))) {
        final size = r.text.style?.fontSize;
        if (size != null) expect(size, greaterThanOrEqualTo(13));
      }
      for (final b in tester.widgetList(find.byType(TextButton))) {
        expect(tester.getSize(find.byWidget(b)).height, greaterThanOrEqualTo(48));
      }
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
