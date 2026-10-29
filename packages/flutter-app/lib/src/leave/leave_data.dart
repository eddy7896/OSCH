import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../today/today_data.dart';
import 'leave_model.dart';

const kLeaveType = 'LeaveType';
const kLeaveBalance = 'LeaveBalance';
const kCoverDuty = 'CoverDuty';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the Leave tab and the cover list pull: the leave types, her balances, and the lessons she covers in the next two weeks.
/// Her own requests are already pulled for Today ([todayPullTasks]).
/// [cover] is off for apps that have no timetable (the Staff app). [ownRequests] is on there too: the Teacher app already pulls her requests for Today.
List<PullTask> leavePullTasks(OruApi api, {DateTime Function()? now, bool cover = true, bool ownRequests = false}) {
  final clock = now ?? DateTime.now;
  return [
    if (ownRequests) PullTask.list(kLeaveRequest, () => _guard(() async => [for (final r in (await api.leaveRequests()).items) (id: r.id, parentId: null as String?, json: r.toJson())])),
    PullTask.list(kLeaveType, () => _guard(() async => [for (final t in (await api.leaveTypes()).items) (id: t.id, parentId: null as String?, json: t.toJson())])),
    PullTask.list(kLeaveBalance, () => _guard(() async => [for (final b in (await api.leaveBalances()).items) (id: b.type.id, parentId: null as String?, json: b.toJson())])),
    if (cover) PullTask.list(kCoverDuty, () => _guard(() async {
          final from = clock();
          final r = await api.substitutionMine(from: isoDate(from), to: isoDate(from.add(const Duration(days: 14))));
          return [for (final d in r.items) (id: d.id, parentId: null as String?, json: d.toJson())];
        })),
  ];
}

/// Watches the local copy and the outbox and keeps a [LeaveView] current. Sending a request saves it on the phone and returns.
class LeaveController extends ChangeNotifier {
  LeaveController(this.store) {
    for (final t in const [kLeaveRequest, kLeaveType, kLeaveBalance]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  LeaveView? _view;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  LeaveView? get view => _view;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final v = buildLeave(
          requests: await store.records(kLeaveRequest),
          balances: await store.records(kLeaveBalance),
          types: await store.records(kLeaveType),
          outbox: await store.all(),
        );
        if (_disposed) return;
        _view = v;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  /// Saved on the phone at once; the engine sends it, and the school sees it once (the entry id is its `clientId`).
  Future<void> request(Map<String, dynamic> body) async {
    await store.enqueue(kind: 'leave.create', body: body);
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
