import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;

DateTime monday() => DateTime(2026, 10, 26, 8, 10);

Future<OruServices> services({bool online = false}) async {
  final svc = await OruServices.create(
      config,
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => online,
      identity: FakeIdentity(),
      httpClient: MockClient((r) async => throw http.ClientException('no network')), // the phone is offline: sends fail like they do in a tunnel
      accountSource: (token) async => Account(userId: 'u', email: 't@x', displayName: 'T', schools: const [SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'g', role: 'TEACHER', defaultLanguage: 'en')]),
    );
  // Signed in with the phone offline: the engine is waiting for a connection, so what is saved stays saved.
  await svc.session.signInWithPassword('ann@x.test', 'pw');
  return svc;
}

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);

Future<void> load(OruServices s, {bool locked = false, bool taken = false}) async {
  await s.store.replaceAllRecords(kTeachingClass, [rec('c5', {'id': 'c5', 'name': 'Class 5A'}), rec('c6', {'id': 'c6', 'name': 'Class 6B'})]);
  await s.store.replaceRecords(kClassStudent, parentId: 'c5', records: [
    (id: 'a', json: {'id': 'a', 'name': 'Asha Rao', 'enrollmentId': 'S-001', 'status': 'PRESENT', 'note': null}),
    (id: 'b', json: {'id': 'b', 'name': 'Bilal Khan', 'enrollmentId': 'S-002', 'status': 'PRESENT', 'note': null}),
    (id: 'c', json: {'id': 'c', 'name': 'Chitra Nair', 'enrollmentId': 'S-003', 'status': 'PRESENT', 'note': null}),
  ]);
  await s.store.replaceRecords(kClassStudent, parentId: 'c6', records: [(id: 'd', json: {'id': 'd', 'name': 'Dev Shah', 'enrollmentId': 'S-004', 'status': 'PRESENT', 'note': null})]);
  await s.store.replaceAllRecords(kAttendanceDay, [
    (id: 'c5|2026-10-26', parentId: 'c5', json: {'classId': 'c5', 'date': '2026-10-26', 'submitted': taken || locked, 'locked': locked}),
    (id: 'c6|2026-10-26', parentId: 'c6', json: {'classId': 'c6', 'date': '2026-10-26', 'submitted': false, 'locked': false}),
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

Widget screen(OruServices s, {String locale = 'en'}) => host(OruAttendanceScreen(services: s, classId: 'c5', className: 'Class 5A', date: '2026-10-26'), locale: locale);

void phone(WidgetTester tester) {
  tester.view.physicalSize = const Size(360 * 2, 900 * 2);
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('the roster from the phone; Mark all present, set two exceptions, Save: one change in the outbox with the exceptions only, and no waiting for the network', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('Asha Rao'), findsOneWidget);
      expect(find.text('Everyone is present'), findsOneWidget);

      await tester.tap(find.text('Mark all present'));
      await pumpFor(tester, 5);
      // Bilal is absent
      await tester.tap(find.text('Bilal Khan'));
      await pumpFor(tester, 10);
      expect(find.text('Mark Bilal Khan'), findsOneWidget);
      await tester.tap(find.text('Absent').last);
      await pumpFor(tester, 10);
      // Chitra is late
      await tester.tap(find.text('Chitra Nair'));
      await pumpFor(tester, 10);
      await tester.tap(find.text('Late').last);
      await pumpFor(tester, 10);
      expect(find.text('2 exceptions'), findsOneWidget);

      await tester.tap(find.text('Save attendance'));
      await pumpFor(tester);
      final queued = (await svc.store.all()).where((e) => e.kind == 'attendance.submit').toList();
      expect(queued, hasLength(1));
      expect(queued.single.body['classId'], 'c5');
      expect(queued.single.body['date'], '2026-10-26');
      expect(queued.single.body['marks'], [{'studentId': 'b', 'status': 'ABSENT'}, {'studentId': 'c', 'status': 'LATE'}]);
      expect(find.text('Saved on this phone. It reaches the school when you are connected.'), findsOneWidget);
      expect(await svc.store.draft('attendance', 'c5|2026-10-26'), isNull, reason: 'the draft is gone once saved');
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('everyone present with no exceptions can be saved too (an empty list is still attendance taken)', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      await tester.tap(find.text('Save attendance'));
      await pumpFor(tester);
      expect((await svc.store.all()).single.body['marks'], isEmpty);
      await svc.dispose();
    });
  });

  testWidgets('a draft survives the app being killed: reopen and the marks are still there, nothing sent', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      await tester.tap(find.text('Bilal Khan'));
      await pumpFor(tester, 10);
      await tester.tap(find.text('Medical').last);
      await pumpFor(tester, 10);
      await tester.pumpWidget(const SizedBox()); // the screen is gone (the app was closed)
      await pumpFor(tester, 5);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('1 exception'), findsOneWidget);
      expect(find.text('Medical'), findsWidgets);
      expect(await svc.store.all(), isEmpty, reason: 'saved as a draft only');
      await svc.dispose();
    });
  });

  testWidgets('a locked day is read only: no Save, no picker, and it says why', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc, locked: true);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('This day is locked. Only the Academic administrator can change it.'), findsOneWidget);
      expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Save attendance')).onPressed, isNull);
      expect(tester.widget<TextButton>(find.widgetWithText(TextButton, 'Mark all present')).onPressed, isNull);
      await tester.tap(find.text('Bilal Khan'), warnIfMissed: false);
      await pumpFor(tester, 10);
      expect(find.text('Mark Bilal Khan'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('what the school refused is shown with the reason and can be dismissed; then the class can be taken again', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      final e = await svc.store.enqueue(kind: 'attendance.submit', body: {'classId': 'c5', 'date': '2026-10-26', 'marks': []});
      await svc.store.markSending(e.id);
      await svc.store.markRefused(e.id, code: 'CONFLICT', message: 'locked');
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('The school did not accept this attendance.'), findsOneWidget);
      expect(find.text('The day was locked before it arrived. Ask the Academic administrator to correct it.'), findsOneWidget);
      await tester.tap(find.text('Dismiss'));
      await pumpFor(tester);
      expect(find.text('The school did not accept this attendance.'), findsNothing);
      expect(await svc.store.all(), isEmpty);
      await svc.dispose();
    });
  });

  testWidgets('a class that was never loaded says to connect once', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('Connect once to load this class.'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('the class list: each class with where it stands today, a saved one marked, and tapping opens the roster', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await svc.store.enqueue(kind: 'attendance.submit', body: {'classId': 'c6', 'date': '2026-10-26', 'marks': []});
      await tester.pumpWidget(host(OruAttendanceListScreen(services: svc, now: monday)));
      await pumpFor(tester);
      expect(find.text('Your classes'), findsOneWidget);
      expect(find.text('Not taken yet'), findsOneWidget);
      expect(find.text('Saved on this phone'), findsOneWidget);
      await tester.tap(find.text('Class 5A'));
      await pumpFor(tester, 15);
      expect(find.text('Asha Rao'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('a teacher who is class teacher of nothing is told so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON']})]);
      await tester.pumpWidget(host(OruAttendanceListScreen(services: svc, now: monday)));
      await pumpFor(tester);
      expect(find.text('You are not the class teacher of any class, so you do not take attendance.'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: right to left, translated, no overflow, text at least 13 px, rows and buttons at least 48 px', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(screen(svc, locale: 'ur'));
      await pumpFor(tester);
      expect(find.text('حاضری محفوظ کریں'), findsOneWidget);
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

  testWidgets('the school\'s own name for a status is used when it set one', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await svc.store.replaceAllRecords(kAttendanceStatus, [rec('ABSENT', {'status': 'ABSENT', 'label': 'Away', 'isDefault': false}), rec('LATE', {'status': 'LATE', 'label': 'Late', 'isDefault': true})]);
      await svc.store.replaceRecords(kClassStudent, parentId: 'c5', records: [(id: 'a', json: {'id': 'a', 'name': 'Asha Rao', 'enrollmentId': 'S-001', 'status': 'ABSENT', 'note': null})]);
      await tester.pumpWidget(screen(svc));
      await pumpFor(tester);
      expect(find.text('Away'), findsOneWidget);
      expect(find.text('Absent'), findsNothing);
      await svc.dispose();
    });
  });
}
