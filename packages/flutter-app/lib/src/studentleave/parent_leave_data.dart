import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../parent/parent_data.dart' show kChild;
import 'studentleave_data.dart' show kStudentLeave;

/// One line in the parent's list: a request the school has (any status) or one still on the phone (saved, or refused for good).
class ParentLeaveRow {
  const ParentLeaveRow({required this.id, required this.status, required this.child, required this.startDate, required this.endDate, required this.half, required this.reason, this.note, this.refusal, this.refusedEntryId, this.cancelQueued = false});

  /// The school's id, or the outbox entry id for a request that has not arrived.
  final String id;

  /// PENDING, APPROVED, DECLINED, CANCELLED, or SAVED / FAILED for a request on the phone.
  final String status;
  final String child;
  final String startDate;
  final String endDate;
  final bool half;
  final String reason;

  /// What the school wrote when it decided.
  final String? note;
  final String? refusal;

  /// The outbox entry to dismiss once the refusal has been read.
  final String? refusedEntryId;
  final bool cancelQueued;

  bool get canCancel => status == 'PENDING' && !cancelQueued;
}

/// Pure: the requests the school has (newest day first) with the ones still on the phone on top. A request that was sent shows once:
/// the outbox entry id is its `clientId`, and a sent entry is gone from the outbox.
List<ParentLeaveRow> buildParentLeave({required List<Map<String, dynamic>> requests, required List<Map<String, dynamic>> children, required List<OutboxEntry> outbox}) {
  final names = {for (final c in children) c['id'] as String: c['name'] as String};
  final cancels = {for (final o in outbox) if (o.kind == OutboxKinds.studentLeaveCancel && o.state != OutboxState.failed) o.body['id'] as String};
  final cancelRefused = {for (final o in outbox) if (o.kind == OutboxKinds.studentLeaveCancel && o.state == OutboxState.failed) o.body['id'] as String: o};
  final local = <ParentLeaveRow>[
    for (final o in outbox)
      if (o.kind == OutboxKinds.studentLeaveCreate)
        ParentLeaveRow(
          id: o.id,
          status: o.state == OutboxState.failed ? 'FAILED' : 'SAVED',
          child: names[o.body['studentId']] ?? '',
          startDate: o.body['startDate'] as String,
          endDate: o.body['endDate'] as String,
          half: o.body['half'] != null,
          reason: (o.body['reason'] as String?) ?? '',
          refusal: o.state == OutboxState.failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null,
          refusedEntryId: o.state == OutboxState.failed ? o.id : null,
        ),
  ];
  final server = [
    for (final r in requests)
      ParentLeaveRow(
        id: r['id'] as String,
        status: r['status'] as String,
        child: (r['student'] as Map<String, dynamic>)['name'] as String,
        startDate: r['startDate'] as String,
        endDate: r['endDate'] as String,
        half: r['half'] != null,
        reason: r['reason'] as String,
        note: (r['decision'] as Map<String, dynamic>?)?['note'] as String?,
        refusal: cancelRefused[r['id']] == null ? null : (cancelRefused[r['id']]!.lastErrorMessage ?? cancelRefused[r['id']]!.lastErrorCode),
        refusedEntryId: cancelRefused[r['id']]?.id,
        cancelQueued: cancels.contains(r['id']),
      ),
  ]..sort((a, b) => b.startDate.compareTo(a.startDate));
  return [...local, ...server];
}

/// The body saved for a request: what the school's create route takes, minus the `clientId` (the entry id).
Map<String, dynamic> parentLeaveBody({required String studentId, required String start, required String end, String? half, String reason = ''}) => {
      'studentId': studentId,
      'startDate': start,
      'endDate': end,
      if (half != null && start == end) 'half': half,
      'reason': reason.trim().length > 300 ? reason.trim().substring(0, 300) : reason.trim(),
    };

/// Keeps the list current from the phone's copy and the outbox. Asking and cancelling are saved on the phone and sent when they can be.
class ParentLeaveController extends ChangeNotifier {
  ParentLeaveController(this.store) {
    for (final t in const [kStudentLeave, kChild]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<ParentLeaveRow>? rows;
  List<Map<String, dynamic>> children = const [];
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final kids = await store.records(kChild);
        final r = buildParentLeave(requests: await store.records(kStudentLeave), children: kids, outbox: await store.all());
        if (_disposed) return;
        children = kids;
        rows = r;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  /// Saved on the phone at once; the school sees it once, whatever happens on the way (the entry id is its `clientId`).
  Future<void> ask(Map<String, dynamic> body) async {
    await store.enqueue(kind: OutboxKinds.studentLeaveCreate, body: body);
    await _refresh();
  }

  /// One cancel per request, however often it is tapped.
  Future<void> cancel(String id) async {
    await store.enqueue(id: 'slc-$id', kind: OutboxKinds.studentLeaveCancel, body: {'id': id});
    await _refresh();
  }

  Future<void> dismiss(String entryId) async {
    await store.dismiss(entryId);
    await _refresh();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
