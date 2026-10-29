import 'package:flutter_sync/flutter_sync.dart';

enum LeaveStatus { pending, approved, rejected, cancelled, saved, failed }

/// One line of "Your requests": a request the school knows, or one still on this phone.
class LeaveRow {
  const LeaveRow({required this.id, required this.status, required this.type, required this.startDate, required this.endDate, required this.days, required this.refusal});
  final String id;
  final LeaveStatus status;
  final String type;
  final String startDate;
  final String endDate;

  /// Days as the school counted them; null while the request is only on the phone.
  final String? days;

  /// What the school said when it refused a request sent from the phone.
  final String? refusal;
}

class LeaveBalanceLine {
  const LeaveBalanceLine({required this.type, required this.allowed, required this.remaining, required this.recorded});
  final String type;
  final String allowed;
  final String remaining;

  /// False when the school has set no allowance for this type.
  final bool recorded;
}

class LeaveView {
  const LeaveView({required this.balances, required this.rows, required this.types});
  final List<LeaveBalanceLine> balances;
  final List<LeaveRow> rows;
  final List<Map<String, dynamic>> types;
}

LeaveStatus _statusOf(String s) => switch (s) {
      'APPROVED' => LeaveStatus.approved,
      'REJECTED' => LeaveStatus.rejected,
      'CANCELLED' => LeaveStatus.cancelled,
      _ => LeaveStatus.pending,
    };

/// Pure: the school's own requests plus the ones waiting on the phone (saved, or refused for good). A request that was sent shows once:
/// the outbox entry id is the `clientId`, and a sent entry is gone from the outbox.
LeaveView buildLeave({
  required List<Map<String, dynamic>> requests,
  required List<Map<String, dynamic>> balances,
  required List<Map<String, dynamic>> types,
  required List<OutboxEntry> outbox,
}) {
  final typeName = {for (final t in types) t['id'] as String: t['name'] as String};
  final rows = <LeaveRow>[];
  for (final o in outbox) {
    if (o.kind != 'leave.create') continue;
    final failed = o.state == OutboxState.failed;
    rows.add(LeaveRow(
      id: o.id,
      status: failed ? LeaveStatus.failed : LeaveStatus.saved,
      type: typeName[o.body['leaveTypeId']] ?? '',
      startDate: o.body['startDate'] as String,
      endDate: o.body['endDate'] as String,
      days: null,
      refusal: failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null,
    ));
  }
  rows.sort((a, b) => b.startDate.compareTo(a.startDate));
  final server = [
    for (final r in requests)
      LeaveRow(
        id: r['id'] as String,
        status: _statusOf(r['status'] as String),
        type: (r['type'] as Map<String, dynamic>)['name'] as String,
        startDate: r['startDate'] as String,
        endDate: r['endDate'] as String,
        days: r['days'] as String?,
        refusal: null,
      ),
  ]..sort((a, b) => b.startDate.compareTo(a.startDate));
  return LeaveView(
    balances: [
      for (final b in balances)
        LeaveBalanceLine(type: (b['type'] as Map<String, dynamic>)['name'] as String, allowed: b['allowedDays'] as String, remaining: b['remainingDays'] as String, recorded: b['recorded'] == true),
    ],
    rows: [...rows, ...server],
    types: types,
  );
}

enum LeaveProblem { none, noType, endBeforeStart }

/// Checked on the phone before anything is saved. Half a day is only for a single day.
LeaveProblem checkLeave({required String? typeId, required String start, required String end}) {
  if (typeId == null) return LeaveProblem.noType;
  if (end.compareTo(start) < 0) return LeaveProblem.endBeforeStart;
  return LeaveProblem.none;
}

Map<String, dynamic> leaveBody({required String typeId, required String start, required String end, String? half, String reason = ''}) => {
      'leaveTypeId': typeId,
      'startDate': start,
      'endDate': end,
      if (half != null && start == end) 'half': half,
      if (reason.trim().isNotEmpty) 'reason': reason.trim().length > 300 ? reason.trim().substring(0, 300) : reason.trim(),
    };
