import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

DateTime fixedNow() => DateTime(2026, 11, 2, 9);

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kLeaveType, [(id: 't1', parentId: null, json: {'id': 't1', 'name': 'Casual leave', 'paid': true, 'quotaDays': '12'})]);
  await s.store.replaceAllRecords(kLeaveBalance, [(id: 't1', parentId: null, json: {'type': {'id': 't1', 'name': 'Casual leave'}, 'allowedDays': '12', 'remainingDays': '10.5', 'recorded': true})]);
  await s.store.replaceAllRecords(kLeaveRequest, [(id: 'r1', parentId: null, json: {'id': 'r1', 'status': 'PENDING', 'startDate': '2026-10-20', 'endDate': '2026-10-20', 'days': '0.5', 'type': {'id': 't1', 'name': 'Casual leave'}})]);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('balances and requests show; a request made with no network is saved on the phone once and listed as not sent', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruLeaveScreen(services: svc, now: fixedNow)));
      await pumpFor(tester);
      expect(find.text('Casual leave: \u206610.5\u2069 of \u206612\u2069 days left'), findsOneWidget);
      expect(find.text('Waiting for the Principal'), findsOneWidget);

      await tester.tap(find.text('Ask for leave').first);
      await pumpFor(tester);
      await tester.tap(find.text('Send request'));
      await pumpFor(tester, 5);
      expect(find.text('Choose a type of leave.'), findsOneWidget, reason: 'refused on the phone, nothing saved');
      expect(await svc.store.all(), isEmpty);

      await tester.tap(find.text('Casual leave'));
      await pumpFor(tester, 5);
      await tester.enterText(find.byType(TextField), 'Family function');
      await pumpFor(tester, 5);
      await tester.tap(find.text('Send request'));
      await pumpFor(tester);
      final queued = (await svc.store.all()).where((e) => e.kind == 'leave.create').toList();
      expect(queued, hasLength(1));
      expect(queued.single.body, {'leaveTypeId': 't1', 'startDate': '2026-11-02', 'endDate': '2026-11-02', 'reason': 'Family function'});
      expect(find.text('Saved on this phone, not sent yet'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
