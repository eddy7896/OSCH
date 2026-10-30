import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

const kStudentLeave = 'StudentLeave';

/// A parent's request for a child's leave, as the class teacher sees it. [queued] is a decision saved on this phone and not yet sent;
/// [refusal] is the school's answer when it would not take that decision (usually: the other approver decided first).
class StudentLeaveRow {
  const StudentLeaveRow({required this.json, required this.queued, required this.refusal, required this.refusedEntryId});
  final Map<String, dynamic> json;
  final String? queued;
  final String? refusal;
  final String? refusedEntryId;

  String get id => json['id'] as String;
  String get status => json['status'] as String;
  String get studentName => (json['student'] as Map<String, dynamic>)['name'] as String;
  String? get className => (json['student'] as Map<String, dynamic>)['className'] as String?;
  String get startDate => json['startDate'] as String;
  String get endDate => json['endDate'] as String;
  bool get half => json['half'] != null;
  String get reason => json['reason'] as String;
  String get requestedBy => (json['requestedBy'] as Map<String, dynamic>)['name'] as String;

  /// Can still be decided from this phone.
  bool get open => status == 'PENDING' && queued == null;
}

/// Pure: the school's requests with the decisions waiting on (or refused for) this phone laid over them. Waiting ones come first, oldest start first.
List<StudentLeaveRow> buildStudentLeave({required List<Map<String, dynamic>> requests, required List<OutboxEntry> outbox, bool waitingOnly = false}) {
  final decisions = {for (final o in outbox) if (o.kind == OutboxKinds.studentLeaveDecide) o.body['id'] as String: o};
  final rows = [
    for (final r in requests)
      () {
        final o = decisions[r['id']];
        final failed = o != null && o.state == OutboxState.failed;
        final decided = r['status'] != 'PENDING';
        return StudentLeaveRow(
          json: r,
          queued: o != null && !failed && !decided ? (o.body['approve'] == true ? 'approve' : 'decline') : null,
          refusal: failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null,
          refusedEntryId: failed ? o.id : null,
        );
      }(),
  ];
  rows.sort((a, b) {
    final w = (a.status == 'PENDING' ? 0 : 1).compareTo(b.status == 'PENDING' ? 0 : 1);
    return w != 0 ? w : (a.status == 'PENDING' ? a.startDate.compareTo(b.startDate) : b.startDate.compareTo(a.startDate));
  });
  return waitingOnly ? [for (final r in rows) if (r.status == 'PENDING') r] : rows;
}

/// What the Student leave screen pulls: every request the person may see, replacing the phone's copy.
List<PullTask> studentLeavePullTasks(OruApi api) => [
      PullTask.list(kStudentLeave, () async {
        try {
          return [for (final r in (await api.studentLeaveList()).items) (id: r.id, parentId: null as String?, json: r.toJson())];
        } on OruApiError catch (e) {
          throw failureOf(e);
        }
      }),
    ];

/// Keeps the list current from the phone's copy and the outbox. A decision is saved on the phone at once and sent when it can be.
class StudentLeaveController extends ChangeNotifier {
  StudentLeaveController(this.store) {
    _subs.add(store.watchRecords(kStudentLeave).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<Map<String, dynamic>>? _requests;
  List<OutboxEntry> _outbox = const [];
  bool waitingOnly = true;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  /// Null until the first read of the phone's copy.
  List<StudentLeaveRow>? get rows => _requests == null ? null : buildStudentLeave(requests: _requests!, outbox: _outbox, waitingOnly: waitingOnly);

  void showWaitingOnly(bool value) {
    waitingOnly = value;
    notifyListeners();
  }

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final r = await store.records(kStudentLeave);
        final o = await store.all();
        if (_disposed) return;
        _requests = r;
        _outbox = o;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  /// The entry id is made from the request, so tapping twice leaves one decision.
  Future<void> decide(String id, {required bool approve, String? note}) async {
    await store.enqueue(id: 'sl-$id', kind: OutboxKinds.studentLeaveDecide, body: {'id': id, 'approve': approve, if ((note ?? '').isNotEmpty) 'note': note});
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
