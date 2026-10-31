import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart' show TextField;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;
import 'studentleave_test.dart' show req;

const kids = [{'id': 'c1', 'name': 'Aarav Rao'}, {'id': 'c2', 'name': 'Isha Rao'}];

OutboxEntry entry(String id, String kind, Map<String, dynamic> body, {String state = OutboxState.queued}) => OutboxEntry(
      id: id, seq: 1, kind: kind, body: body, state: state, attempts: 0, nextAttemptAtMs: null,
      lastErrorCode: state == OutboxState.failed ? 'CONFLICT' : null, lastErrorMessage: state == OutboxState.failed ? 'Already decided' : null, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('requests on the phone come first, the school\'s after (newest day first); a queued cancel closes the button; a refused cancel is kept', () {
    final rows = buildParentLeave(
      requests: [req('a', 'PENDING', '2026-11-03'), req('b', 'PENDING', '2026-11-09'), req('c', 'APPROVED', '2026-10-01')],
      children: kids,
      outbox: [
        entry('o1', OutboxKinds.studentLeaveCreate, parentLeaveBody(studentId: 'c2', start: '2026-11-12', end: '2026-11-12', reason: 'Fever')),
        entry('slc-a', OutboxKinds.studentLeaveCancel, {'id': 'a'}),
        entry('slc-b', OutboxKinds.studentLeaveCancel, {'id': 'b'}, state: OutboxState.failed),
      ],
    );
    expect(rows.map((r) => r.id), ['o1', 'b', 'a', 'c']);
    expect(rows[0].status, 'SAVED');
    expect(rows[0].child, 'Isha Rao');
    expect(rows[1].refusal, 'Already decided');
    expect(rows[1].refusedEntryId, 'slc-b');
    expect(rows[1].canCancel, isTrue);
    expect(rows[2].cancelQueued, isTrue);
    expect(rows[2].canCancel, isFalse);
    expect(rows[3].canCancel, isFalse);
  });

  test('the body keeps half only for a single day and cuts the reason at 300', () {
    expect(parentLeaveBody(studentId: 's', start: '2026-11-02', end: '2026-11-02', half: 'MORNING', reason: ' flu '), {'studentId': 's', 'startDate': '2026-11-02', 'endDate': '2026-11-02', 'half': 'MORNING', 'reason': 'flu'});
    expect(parentLeaveBody(studentId: 's', start: 'a', end: 'b', half: 'MORNING', reason: 'x').containsKey('half'), isFalse);
    expect(parentLeaveBody(studentId: 's', start: 'a', end: 'a', reason: 'x' * 400)['reason'], hasLength(300));
  });

  testWidgets('with no network: asking is saved once on the phone and listed as not sent; cancel is saved once', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kChild, [(id: 'c1', parentId: null, json: {'id': 'c1', 'name': 'Aarav Rao'})]);
      await svc.store.replaceAllRecords(kStudentLeave, [(id: 'a', parentId: null, json: req('a', 'PENDING', '2026-11-20'))]);
      await tester.pumpWidget(host(OruParentLeaveScreen(services: svc, now: () => DateTime(2026, 11, 2, 9))));
      await pumpFor(tester);
      expect(find.text('Cancel request'), findsOneWidget);

      await tester.tap(find.text('Ask for leave for my child'));
      await pumpFor(tester);
      await tester.tap(find.text('Send request'));
      await pumpFor(tester, 5);
      expect(find.text('Write a short reason.'), findsOneWidget, reason: 'refused on the phone, nothing saved');
      expect(await svc.store.all(), isEmpty);
      await tester.enterText(find.byType(TextField), 'Family function');
      await pumpFor(tester, 5);
      await tester.tap(find.text('Send request'));
      await pumpFor(tester);
      final queued = (await svc.store.all()).where((e) => e.kind == OutboxKinds.studentLeaveCreate).toList();
      expect(queued, hasLength(1));
      expect(queued.single.body, {'studentId': 'c1', 'startDate': '2026-11-02', 'endDate': '2026-11-02', 'reason': 'Family function'});
      expect(find.text('Saved on this phone, not sent yet'), findsOneWidget);

      await tester.tap(find.text('Cancel request'));
      await pumpFor(tester);
      expect((await svc.store.all()).where((e) => e.kind == OutboxKinds.studentLeaveCancel), hasLength(1));
      expect(find.text('Cancel request'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
