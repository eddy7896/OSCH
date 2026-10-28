import 'package:flutter_core/flutter_core.dart';

import 'local_store.dart';
import 'sync_engine.dart';
import 'sync_pull.dart';

/// The kinds of change a phone queues (ADR-0014 decision 4). Anything else is not written offline.
abstract final class OutboxKinds {
  /// Body: `{classId, date, lock?, marks: [...]}` (the gateway's SubmitDayDto plus where it goes).
  static const attendanceSubmit = 'attendance.submit';

  /// Body: `{examId, entries: [...]}`.
  static const marksSave = 'marks.save';

  /// Body: the gateway's CreateRequestDto.
  static const leaveCreate = 'leave.create';
  /// Body: `{position?: {lat, lng}, deviceTime?, reason?}`: what the phone knows when the person taps (the server decides the stamp).
  static const staffCheckIn = 'staff.checkIn';
  static const staffCheckOut = 'staff.checkOut';

  /// Body: `{noticeId}`.
  static const noticeRead = 'notice.read';
}

/// Sends a queued change to the gateway through the generated client. The outbox id goes as the gateway's own
/// `submissionId`/`clientId` where there is one (rule 1), so a repeat after a lost answer changes nothing. Every other kind
/// is repeat-safe by its nature (offline-sync.md).
class OruApiSender implements OutboxSender {
  OruApiSender(this.api);
  final OruApi api;

  @override
  Future<SendResult> send(OutboxEntry e) async {
    try {
      final b = e.body;
      switch (e.kind) {
        case OutboxKinds.attendanceSubmit:
          await api.attendanceSubmit(
            id: b['classId'] as String,
            date: b['date'] as String,
            body: SubmitDayDto.fromJson({...b, 'submissionId': e.id}),
          );
        case OutboxKinds.marksSave:
          await api.gradesSaveMarks(id: b['examId'] as String, body: SaveMarksDto.fromJson({...b, 'submissionId': e.id}));
        case OutboxKinds.leaveCreate:
          await api.leaveCreate(body: CreateRequestDto.fromJson({...b, 'clientId': e.id}));
        case OutboxKinds.staffCheckIn:
          await api.staffAttendanceCheckIn(body: StampDto.fromJson(b));
        case OutboxKinds.staffCheckOut:
          await api.staffAttendanceCheckOut(body: StampDto.fromJson(b));
        case OutboxKinds.noticeRead:
          await api.notificationsRead(id: b['noticeId'] as String);
        default:
          return SendResult.refused('UNKNOWN_KIND', message: e.kind);
      }
      return const SendResult.accepted();
    } on OruApiError catch (err) {
      if (err.needsSignIn) return const SendResult.signInNeeded();
      if (err.retryable) {
        return SendResult.retry(err.code, message: err.message, retryAfterSeconds: err.retryAfterSeconds, offline: err.code == 'NETWORK_ERROR' || err.code == 'TIMEOUT');
      }
      return SendResult.refused(err.code, message: err.message);
    }
  }
}

/// `GET /v1/sync/tombstones` through the generated client, as the coordinator's source of removals.
class OruApiTombstones implements TombstoneSource {
  OruApiTombstones(this.api, {this.pageSize = 200});
  final OruApi api;
  final int pageSize;

  @override
  Future<TombstonePage> since(String since) async {
    try {
      final r = await api.syncTombstones(since: since, limit: pageSize);
      return TombstonePage(removed: [for (final t in r.items) (entityType: t.entityType, entityId: t.entityId)], more: r.more, next: r.next);
    } on OruApiError catch (e) {
      // Removals are of lessons, cover, attendance and marks, so the gateway shows them only to roles that may read academics.
      // A bursar or an HR manager on the staff app has none to hear about: that is "nothing removed", not a failed sync.
      if (e.code == 'FORBIDDEN') return TombstonePage(removed: const [], more: false, next: since);
      throw failureOf(e);
    }
  }
}

/// How a pull maps the client's errors: no connection or a timeout is "offline"; anything else is the gateway's own code.
PullFailure failureOf(OruApiError e) => PullFailure(e.code, offline: e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT', message: e.message);
