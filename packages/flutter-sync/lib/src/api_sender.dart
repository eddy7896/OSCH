import 'package:flutter_core/flutter_core.dart';

import 'local_store.dart';
import 'sync_engine.dart';

/// The kinds of change a phone queues (ADR-0014 decision 4). Anything else is not written offline.
abstract final class OutboxKinds {
  /// Body: `{classId, date, lock?, marks: [...]}` (the gateway's SubmitDayDto plus where it goes).
  static const attendanceSubmit = 'attendance.submit';

  /// Body: `{examId, entries: [...]}`.
  static const marksSave = 'marks.save';

  /// Body: the gateway's CreateRequestDto.
  static const leaveCreate = 'leave.create';
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
          await api.staffAttendanceCheckIn();
        case OutboxKinds.staffCheckOut:
          await api.staffAttendanceCheckOut();
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
