import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

Map<String, dynamic> req(String id, String status, String start, {String student = 'Aarav Rao'}) => {
      'id': id,
      'status': status,
      'startDate': start,
      'endDate': start,
      'half': null,
      'reason': 'Fever',
      'student': {'id': 's-$id', 'name': student, 'enrollmentId': 'E1', 'className': 'Grade 5 A'},
      'requestedBy': {'id': 'p1', 'name': 'Meera Rao'},
      'decision': {'at': null, 'by': null, 'note': null},
      'createdAt': '2026-10-30T08:00:00Z',
      'updatedAt': '2026-10-30T08:00:00Z',
    };

OutboxEntry decision(String leaveId, {bool approve = true, String state = OutboxState.queued}) => OutboxEntry(
      id: 'sl-$leaveId', seq: 1, kind: OutboxKinds.studentLeaveDecide, body: {'id': leaveId, 'approve': approve}, state: state, attempts: 0, nextAttemptAtMs: null,
      lastErrorCode: state == OutboxState.failed ? 'CONFLICT' : null, lastErrorMessage: state == OutboxState.failed ? 'Already decided' : null, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('waiting requests come first, oldest day first; a queued decision closes the buttons; a refusal is kept with its entry', () {
    final rows = buildStudentLeave(
      requests: [req('a', 'APPROVED', '2026-11-09'), req('b', 'PENDING', '2026-11-05'), req('c', 'PENDING', '2026-11-03'), req('d', 'PENDING', '2026-11-04')],
      outbox: [decision('c'), decision('d', state: OutboxState.failed)],
    );
    expect(rows.map((r) => r.id), ['c', 'd', 'b', 'a']);
    expect(rows[0].queued, 'approve');
    expect(rows[0].open, isFalse);
    expect(rows[1].refusal, 'Already decided');
    expect(rows[1].refusedEntryId, 'sl-d');
    expect(rows[1].open, isTrue, reason: 'a refused decision can be tried again after it is dismissed');
    expect(buildStudentLeave(requests: [req('a', 'APPROVED', '2026-11-09'), req('b', 'PENDING', '2026-11-05')], outbox: const [], waitingOnly: true).map((r) => r.id), ['b']);
  });

  test('a decision already made by the school hides the queued one', () {
    final rows = buildStudentLeave(requests: [req('a', 'DECLINED', '2026-11-03')], outbox: [decision('a')]);
    expect(rows.single.queued, isNull);
  });

  testWidgets('works from the phone: Approve saves one decision on the phone, twice is still one, and the buttons go', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kStudentLeave, [
        (id: 'a', parentId: null, json: req('a', 'PENDING', '2026-11-03')),
        (id: 'b', parentId: null, json: req('b', 'APPROVED', '2026-11-01', student: 'Isha Das')),
      ]);
      await tester.pumpWidget(host(OruStudentLeaveScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('Aarav Rao · Grade 5 A'), findsOneWidget);
      expect(find.text('Isha Das · Grade 5 A'), findsNothing, reason: 'only waiting ones by default');
      await tester.tap(find.text('Approve'));
      await pumpFor(tester);
      final queued = (await svc.store.all()).where((e) => e.kind == OutboxKinds.studentLeaveDecide).toList();
      expect(queued, hasLength(1));
      expect(queued.single.body, {'id': 'a', 'approve': true});
      expect(find.text('Approve'), findsNothing);
      expect(find.text('Your decision is saved on this phone and will be sent when there is a connection.'), findsOneWidget);
      await tester.tap(find.text('All'));
      await pumpFor(tester);
      expect(find.text('Isha Das · Grade 5 A'), findsOneWidget);
      expect(find.text('Approved'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
