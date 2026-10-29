import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';

enum ApprovalsProblem { none, offline, refused }

/// The Principal's leave requests waiting for a decision. Online only: a decision is never queued, so a request that someone else just
/// decided, or a refusal, is seen at once. Nothing is kept on the phone.
class ApprovalsController extends ChangeNotifier {
  ApprovalsController(this.api);
  final OruApi api;

  List<Map<String, dynamic>>? items;
  ApprovalsProblem problem = ApprovalsProblem.none;
  bool loading = false;
  String? busyId;
  bool _disposed = false;

  Future<void> load() async {
    loading = true;
    _notify();
    try {
      final r = await api.leaveRequests(status: 'PENDING');
      items = [for (final x in r.items) x.toJson()]..sort((a, b) => (a['startDate'] as String).compareTo(b['startDate'] as String));
      problem = ApprovalsProblem.none;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
    }
    loading = false;
    _notify();
  }

  ApprovalsProblem _problemOf(OruApiError e) => e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT' || e.code == 'UPSTREAM_UNAVAILABLE' ? ApprovalsProblem.offline : ApprovalsProblem.refused;

  Future<void> approve(String id) => _decide(id, () => api.leaveApprove(id: id));

  Future<void> reject(String id) => _decide(id, () => api.leaveReject(id: id, body: const RejectDto(note: null)));

  Future<void> _decide(String id, Future<Object?> Function() call) async {
    if (busyId != null) return;
    busyId = id;
    problem = ApprovalsProblem.none;
    _notify();
    try {
      await call();
      items = [...?items]..removeWhere((x) => x['id'] == id);
    } on OruApiError catch (e) {
      problem = _problemOf(e);
      if (problem == ApprovalsProblem.refused) {
        // Someone decided it first, or it was cancelled: show what is true now.
        busyId = null;
        await load();
        problem = ApprovalsProblem.refused;
      }
    }
    busyId = null;
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
