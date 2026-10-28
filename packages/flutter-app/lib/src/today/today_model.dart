import 'package:flutter_sync/flutter_sync.dart';

/// One lesson in "Next lessons".
class TodayLesson {
  const TodayLesson({required this.entryId, required this.subject, required this.className, required this.start, required this.end});
  final String entryId;
  final String subject;
  final String className;

  /// `HH:mm`, as the school's bell schedule writes it.
  final String start;
  final String end;
}

class TodayClass {
  const TodayClass({required this.id, required this.name});
  final String id;
  final String name;
}

/// What the Today screen shows, worked out from what is on the phone only (the local records and the outbox): no network is asked.
class TodayModel {
  const TodayModel({
    required this.hasData,
    required this.isSchoolDay,
    required this.nextLessons,
    required this.classesWithoutAttendance,
    required this.attendanceSaved,
    required this.leaveWaiting,
    required this.leaveSaved,
  });

  /// False before anything was ever loaded from the school (a fresh install that has not been online yet).
  final bool hasData;
  final bool isSchoolDay;
  final List<TodayLesson> nextLessons;

  /// Classes of this teacher with no attendance today, neither on the server nor saved on the phone.
  final List<TodayClass> classesWithoutAttendance;

  /// Classes whose attendance for today is saved on this phone and has not reached the school yet.
  final List<TodayClass> attendanceSaved;

  /// Leave requests the Principal has not decided yet.
  final int leaveWaiting;

  /// Leave requests saved on this phone and not sent yet.
  final int leaveSaved;
}

const weekdayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

int _minutes(String hhmm) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(hhmm);
  return m == null ? 0 : int.parse(m.group(1)!) * 60 + int.parse(m.group(2)!);
}

/// Pure: the same records, outbox and clock give the same screen. [date] is `YYYY-MM-DD`; [nowMinutes] is minutes since midnight
/// on the phone. The phone's clock is used only to say what is "next" on screen: it decides nothing that is sent (offline-sync rule 4).
TodayModel buildToday({
  required String date,
  required String weekday,
  required int nowMinutes,
  required List<Map<String, dynamic>> timetable,
  required List<Map<String, dynamic>> periods,
  required List<Map<String, dynamic>> teachingClasses,
  required List<Map<String, dynamic>> attendanceDays,
  required List<Map<String, dynamic>> leaveRequests,
  required Map<String, dynamic>? schedule,
  required List<OutboxEntry> outbox,
}) {
  final hasData = schedule != null || timetable.isNotEmpty || teachingClasses.isNotEmpty || leaveRequests.isNotEmpty;
  final workingDays = [for (final d in (schedule?['workingDays'] as List<dynamic>? ?? const [])) d as String];
  // With no schedule yet, assume a school day rather than hide a teacher's work.
  final isSchoolDay = workingDays.isEmpty || workingDays.contains(weekday);

  final period = {for (final p in periods) p['id'] as String: p};
  final lessons = <TodayLesson>[];
  if (isSchoolDay) {
    for (final e in timetable) {
      if (e['day'] != weekday) continue;
      final p = period[e['periodId']];
      if (p == null || p['isBreak'] == true) continue;
      if (_minutes(p['endTime'] as String) <= nowMinutes) continue; // over already
      lessons.add(TodayLesson(
        entryId: e['id'] as String,
        subject: (e['subject'] as Map<String, dynamic>)['name'] as String,
        className: (e['class'] as Map<String, dynamic>)['name'] as String,
        start: p['startTime'] as String,
        end: p['endTime'] as String,
      ));
    }
    lessons.sort((a, b) => _minutes(a.start).compareTo(_minutes(b.start)));
  }

  final doneOnServer = {for (final d in attendanceDays) if (d['date'] == date) d['classId'] as String};
  final savedOnPhone = <String>{
    for (final o in outbox)
      if (o.kind == 'attendance.submit' && o.body['date'] == date && (o.state == OutboxState.queued || o.state == OutboxState.sending)) o.body['classId'] as String,
  };
  final without = <TodayClass>[];
  final saved = <TodayClass>[];
  if (isSchoolDay) {
    for (final c in teachingClasses) {
      final id = c['id'] as String;
      final tc = TodayClass(id: id, name: c['name'] as String);
      if (doneOnServer.contains(id)) continue;
      (savedOnPhone.contains(id) ? saved : without).add(tc);
    }
  }

  return TodayModel(
    hasData: hasData,
    isSchoolDay: isSchoolDay,
    nextLessons: lessons,
    classesWithoutAttendance: without,
    attendanceSaved: saved,
    leaveWaiting: leaveRequests.where((r) => r['status'] == 'PENDING').length,
    leaveSaved: outbox.where((o) => o.kind == 'leave.create' && (o.state == OutboxState.queued || o.state == OutboxState.sending)).length,
  );
}
