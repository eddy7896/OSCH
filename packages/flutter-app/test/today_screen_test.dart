import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'package:flutter_core/flutter_core.dart';

/// Monday 26 October 2026, 08:10.
DateTime monday() => DateTime(2026, 10, 26, 8, 10);

Future<OruServices> services() => OruServices.create(
      config,
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => false, // no network at all: the screen must work from what is on the phone
      identity: FakeIdentity(),
      httpClient: MockClient((r) async => http.Response('{}', 200)),
      accountSource: (token) async => Account(
        userId: 'u1', email: 'tara@x.test', displayName: 'Tara Teacher',
        schools: [const SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en')],
      ),
    );

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI']})]);
  await s.store.replaceAllRecords(kPeriod, [
    rec('p1', {'id': 'p1', 'label': 'One', 'startTime': '08:00', 'endTime': '08:40', 'isBreak': false}),
    rec('p2', {'id': 'p2', 'label': 'Two', 'startTime': '08:40', 'endTime': '09:20', 'isBreak': false}),
  ]);
  await s.store.replaceAllRecords(kTimetableEntry, [
    rec('e1', {'id': 'e1', 'day': 'MON', 'periodId': 'p1', 'class': {'id': 'c5', 'name': 'Class 5A'}, 'subject': {'id': 'm', 'name': 'Maths', 'code': 'MAT'}}),
    rec('e2', {'id': 'e2', 'day': 'MON', 'periodId': 'p2', 'class': {'id': 'c6', 'name': 'Class 6B'}, 'subject': {'id': 'e', 'name': 'English', 'code': 'ENG'}}),
  ]);
  await s.store.replaceAllRecords(kTeachingClass, [rec('c5', {'id': 'c5', 'name': 'Class 5A'}), rec('c6', {'id': 'c6', 'name': 'Class 6B'})]);
  await s.store.replaceAllRecords(kLeaveRequest, [rec('l1', {'id': 'l1', 'status': 'PENDING'})]);
}

Future<void> pumpFor(WidgetTester tester, [int steps = 20]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
}

Future<void> show(WidgetTester tester, OruServices svc, {String locale = 'en'}) async {
  tester.view.physicalSize = const Size(360 * 2, 780 * 2);
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(
    locale: Locale(locale),
    localizationsDelegates: oruLocalizationsDelegates,
    supportedLocales: oruSupportedLocales,
    localeResolutionCallback: oruLocaleResolution,
    theme: OruTheme.light(locale: Locale(locale)),
    home: OruTodayScreen(services: svc, now: monday, onOpenAccount: () {}),
  ));
  await pumpFor(tester);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('with the network off: next lessons, classes without attendance and leave waiting, all from the phone', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await show(tester, svc);
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('Next lessons'), findsOneWidget);
      expect(find.text('Maths'), findsOneWidget);
      expect(find.text('\u2066Class 5A\u2069, \u206608:00\u2069 to \u206608:40\u2069'), findsOneWidget);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('2 classes have no attendance yet'), findsOneWidget);
      expect(find.text('Class 5A'), findsOneWidget);
      expect(find.text('1 leave request waiting for the Principal'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a saved change shows at once as saved on the phone, and an attendance day from the server makes a class done', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await show(tester, svc);
      await svc.store.enqueue(kind: 'attendance.submit', body: {'classId': 'c5', 'date': '2026-10-26', 'marks': []});
      await svc.store.enqueue(kind: 'leave.create', body: {'leaveTypeId': 'x', 'startDate': '2026-11-02', 'endDate': '2026-11-02'});
      await pumpFor(tester);
      expect(find.text('1 class has no attendance yet'), findsOneWidget);
      expect(find.text('1 class saved on this phone, not sent yet'), findsOneWidget);
      expect(find.text('1 leave request saved on this phone, not sent yet'), findsOneWidget);
      await svc.store.upsertRecords(kAttendanceDay, [(id: 'c6|2026-10-26', parentId: 'c6', json: {'classId': 'c6', 'date': '2026-10-26', 'locked': false})]);
      await pumpFor(tester);
      expect(find.text('Attendance is taken for all your classes'), findsNothing, reason: 'Class 5A is only saved, not sent');
      expect(find.text('1 class has no attendance yet'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('a removed lesson (a tombstone) disappears from the screen', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await show(tester, svc);
      expect(find.text('English'), findsOneWidget);
      await svc.store.applyTombstone(entityType: kTimetableEntry, entityId: 'e2');
      await pumpFor(tester);
      expect(find.text('English'), findsNothing);
      expect(find.text('Maths'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('the first day, before anything was ever loaded: it says to connect once, and shows the sync state', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await show(tester, svc);
      expect(find.text('Connect once to load your day. After that it works without a connection.'), findsOneWidget);
      expect(find.text('Next lessons'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: right to left, translated, no overflow, text at least 13 px, controls at least 48 px', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await show(tester, svc, locale: 'ur');
      expect(find.text('آج'), findsOneWidget);
      expect(find.text('اگلے اسباق'), findsOneWidget);
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

  testWidgets('a Sunday: the school does not work, so no lessons and no attendance are asked for', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      tester.view.physicalSize = const Size(360 * 2, 780 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(MaterialApp(
        localizationsDelegates: oruLocalizationsDelegates,
        supportedLocales: oruSupportedLocales,
        theme: OruTheme.light(),
        home: OruTodayScreen(services: svc, now: () => DateTime(2026, 10, 25, 8, 10), onOpenAccount: () {}),
      ));
      await pumpFor(tester);
      expect(find.text('Today is not a school day'), findsOneWidget);
      expect(find.text('Next lessons'), findsNothing);
      expect(find.textContaining('have no attendance'), findsNothing);
      await svc.dispose();
    });
  });
}
