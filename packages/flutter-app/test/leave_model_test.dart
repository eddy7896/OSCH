import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

OutboxEntry entry(String id, {String state = OutboxState.queued, String? msg}) => OutboxEntry(
      id: id, seq: 1, kind: 'leave.create', body: {'leaveTypeId': 't1', 'startDate': '2026-11-02', 'endDate': '2026-11-03'}, state: state, attempts: 0, nextAttemptAtMs: null,
      lastErrorCode: state == OutboxState.failed ? 'CONFLICT' : null, lastErrorMessage: msg, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

Map<String, dynamic> req(String id, String status, String start) => {'id': id, 'status': status, 'startDate': start, 'endDate': start, 'days': '1', 'type': {'id': 't1', 'name': 'Casual'}};

void main() {
  const types = [{'id': 't1', 'name': 'Casual', 'paid': true, 'quotaDays': '12'}];

  test('requests on the phone come first, with the school\'s own after, newest day first', () {
    final v = buildLeave(
      requests: [req('a', 'APPROVED', '2026-09-01'), req('b', 'PENDING', '2026-10-01')],
      balances: [{'type': {'id': 't1', 'name': 'Casual'}, 'allowedDays': '12', 'remainingDays': '10.5', 'recorded': true}],
      types: types,
      outbox: [entry('o1'), entry('o2', state: OutboxState.failed, msg: 'overlap')],
    );
    expect(v.rows.map((r) => r.status), [LeaveStatus.saved, LeaveStatus.failed, LeaveStatus.pending, LeaveStatus.approved]);
    expect(v.rows[1].refusal, 'overlap');
    expect(v.rows[0].type, 'Casual');
    expect(v.balances.single.remaining, '10.5');
  });

  test('a request that was sent leaves the outbox and shows once, as the school\'s', () {
    final v = buildLeave(requests: [req('a', 'PENDING', '2026-11-02')], balances: const [], types: types, outbox: const []);
    expect(v.rows, hasLength(1));
    expect(v.rows.single.status, LeaveStatus.pending);
  });

  test('checked on the phone: a type is needed and the last day cannot come first', () {
    expect(checkLeave(typeId: null, start: '2026-11-02', end: '2026-11-02'), LeaveProblem.noType);
    expect(checkLeave(typeId: 't1', start: '2026-11-03', end: '2026-11-02'), LeaveProblem.endBeforeStart);
    expect(checkLeave(typeId: 't1', start: '2026-11-02', end: '2026-11-02'), LeaveProblem.none);
  });

  test('the body keeps half only for a single day and cuts the reason at 300', () {
    expect(leaveBody(typeId: 't', start: '2026-11-02', end: '2026-11-02', half: 'MORNING', reason: ' flu '), {'leaveTypeId': 't', 'startDate': '2026-11-02', 'endDate': '2026-11-02', 'half': 'MORNING', 'reason': 'flu'});
    expect(leaveBody(typeId: 't', start: '2026-11-02', end: '2026-11-03', half: 'MORNING').containsKey('half'), isFalse);
    expect(leaveBody(typeId: 't', start: 'a', end: 'a', reason: 'x' * 400)['reason'], hasLength(300));
    expect(leaveBody(typeId: 't', start: 'a', end: 'a').containsKey('reason'), isFalse);
  });
}
