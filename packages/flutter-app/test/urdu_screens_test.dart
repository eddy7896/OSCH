// E-MOB-1 for the newer phone screens: right to left in Urdu, the words translated, no overflow, text at least 13 px, every button and
// tappable row at least 48 px tall. The Today, attendance and marks screens have their own Urdu tests.
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_core/flutter_core.dart' show OruListRow;
import 'package:flutter_test/flutter_test.dart';

import 'approvals_test.dart' as appr show Fake, principalServices;
import 'marks_screen_test.dart' show services, pumpFor, host, phone;

Map<String, dynamic> ann(String id, String title) => {'id': id, 'title': title, 'body': 'Body', 'createdAt': '2026-10-20T08:00:00.000Z', 'updatedAt': '2026-10-20T08:00:00.000Z', 'withdrawn': false, 'author': {'id': 'p', 'name': 'Priya Principal'}};

Future<void> shown(WidgetTester tester, Widget screen, {String? urdu, String? english}) async {
  await tester.pumpWidget(host(screen, locale: 'ur'));
  await pumpFor(tester);
  if (urdu != null) expect(find.text(urdu), findsWidgets);
  if (english != null) expect(find.text(english), findsNothing, reason: 'the English word is not left in the Urdu screen');
  expect(Directionality.of(tester.element(find.byType(Scaffold).first)), TextDirection.rtl);
  for (final r in tester.widgetList<RichText>(find.byType(RichText))) {
    final size = r.text.style?.fontSize;
    if (size != null) expect(size, greaterThanOrEqualTo(13), reason: r.text.toPlainText());
  }
  for (final f in [find.byType(TextButton), find.byType(ElevatedButton), find.byType(OutlinedButton)]) {
    for (final b in tester.widgetList(f)) {
      expect(tester.getSize(find.byWidget(b)).height, greaterThanOrEqualTo(48));
    }
  }
  for (final row in tester.widgetList(find.byType(OruListRow))) {
    final r = row as OruListRow;
    if (r.onPressed != null) expect(tester.getSize(find.byWidget(row)).height, greaterThanOrEqualTo(48));
  }
  expect(tester.takeException(), isNull);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('Urdu: leave', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kLeaveType, [(id: 't1', parentId: null, json: {'id': 't1', 'name': 'Casual leave', 'paid': true, 'quotaDays': '12'})]);
      await svc.store.replaceAllRecords(kLeaveBalance, [(id: 't1', parentId: null, json: {'type': {'id': 't1', 'name': 'Casual leave'}, 'allowedDays': '12', 'remainingDays': '10.5', 'recorded': true})]);
      await svc.store.replaceAllRecords(kLeaveRequest, [(id: 'r1', parentId: null, json: {'id': 'r1', 'status': 'PENDING', 'startDate': '2026-10-20', 'endDate': '2026-10-20', 'days': '0.5', 'type': {'id': 't1', 'name': 'Casual leave'}})]);
      await shown(tester, OruLeaveScreen(services: svc), urdu: 'رخصت مانگیں', english: 'Ask for leave');
      await tester.tap(find.text('رخصت مانگیں').first);
      await pumpFor(tester);
      expect(find.text('Send request'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: check-in (the reason box too)', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kGeofence, [(id: 'school', parentId: null, json: {'configured': true, 'lat': 12.9716, 'lng': 77.5946, 'radiusM': 150, 'marginM': 50, 'hardRingM': 500})]);
      await shown(tester, OruCheckInScreen(services: svc, location: const NoLocation(), now: () => DateTime(2026, 11, 2, 9)), urdu: 'آپ نے آج چیک اِن نہیں کیا۔', english: 'Check in');
      await tester.tap(find.text('چیک اِن کریں'));
      await pumpFor(tester);
      expect(find.text('براہ کرم وجہ بتائیں'), findsOneWidget);
      expect(find.text('Please say why'), findsNothing);
      expect(Directionality.of(tester.element(find.text('براہ کرم وجہ بتائیں'))), TextDirection.rtl);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: approvals', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await appr.principalServices(appr.Fake());
      await shown(tester, OruApprovalsScreen(services: svc), urdu: 'منظور کریں', english: 'Approve');
      await svc.dispose();
    });
  });

  testWidgets('Urdu: notifications and announcements', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kNotice, [(id: 'a', parentId: null, json: {'id': 'a', 'title': 'عنوان', 'body': 'متن', 'category': 'leave', 'kind': 'k', 'createdAt': '2026-10-28T08:00:00.000Z', 'read': false, 'entityId': null, 'entityType': null})]);
      await shown(tester, OruInboxScreen(services: svc), urdu: 'اطلاعات', english: 'Notifications');
      await svc.store.replaceAllRecords(kAnnouncement, [(id: 'a', parentId: null, json: ann('a', 'کھیلوں کا دن'))]);
      await shown(tester, OruAnnouncementsScreen(services: svc), urdu: 'اعلانات', english: 'Announcements');
      await svc.dispose();
    });
  });

  testWidgets('Urdu: classes and cover duties', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kMyClass, [(id: 'c1', parentId: null, json: {'id': 'c1', 'name': '5A', 'classTeacher': true})]);
      await shown(tester, OruClassesScreen(services: svc), urdu: 'میری جماعتیں', english: 'My classes');
      await svc.store.replaceAllRecords(kCoverDuty, [(id: 'd1', parentId: null, json: {'id': 'd1', 'date': '2026-11-03', 'class': {'id': 'c', 'name': '5A'}, 'subject': {'id': 's', 'name': 'ریاضی'}, 'period': {'id': 'p', 'label': 'P2', 'startTime': '09:00', 'endTime': '09:45'}, 'covering': {'id': 'x', 'name': 'روی', 'employeeId': 'E1'}})]);
      await shown(tester, OruCoverScreen(services: svc), urdu: 'متبادل ڈیوٹی', english: 'Cover duties');
      await svc.dispose();
    });
  });
}
