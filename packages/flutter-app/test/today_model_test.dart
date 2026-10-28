import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> entry(String id, String day, String period, {String cls = '5A', String subject = 'Maths'}) =>
    {'id': id, 'day': day, 'periodId': period, 'class': {'id': 'c-$cls', 'name': cls}, 'subject': {'id': 's-$subject', 'name': subject, 'code': subject.substring(0, 3).toUpperCase()}};

Map<String, dynamic> period(String id, String start, String end, {bool brk = false}) => {'id': id, 'label': id, 'startTime': start, 'endTime': end, 'isBreak': brk};

OutboxEntry outbox(String kind, Map<String, dynamic> body, {String state = OutboxState.queued, int seq = 1}) => OutboxEntry(
      id: 'o$seq', seq: seq, kind: kind, body: body, state: state, attempts: 0, nextAttemptAtMs: null, lastErrorCode: null, lastErrorMessage: null, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

final periods = [period('p1', '08:00', '08:40'), period('p2', '08:40', '09:20'), period('brk', '09:20', '09:40', brk: true), period('p3', '09:40', '10:20')];
const week = {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI']};

TodayModel build({
  int now = 8 * 60 + 10,
  String weekday = 'MON',
  List<Map<String, dynamic>>? timetable,
  List<Map<String, dynamic>> classes = const [],
  List<Map<String, dynamic>> days = const [],
  List<Map<String, dynamic>> leave = const [],
  Map<String, dynamic>? schedule = week,
  List<OutboxEntry> box = const [],
}) =>
    buildToday(
      date: '2026-10-26', weekday: weekday, nowMinutes: now, timetable: timetable ?? [], periods: periods, teachingClasses: classes, attendanceDays: days, leaveRequests: leave, schedule: schedule, outbox: box,
    );

void main() {
  group('next lessons', () {
    final tt = [entry('e3', 'MON', 'p3', subject: 'Science'), entry('e1', 'MON', 'p1'), entry('e2', 'MON', 'p2', cls: '6B', subject: 'English'), entry('x', 'TUE', 'p1'), entry('e4', 'MON', 'brk')];

    test('today\'s lessons that have not ended, in time order, without breaks and without other days', () {
      final m = build(timetable: tt, now: 8 * 60 + 10);
      expect(m.nextLessons.map((l) => l.entryId), ['e1', 'e2', 'e3']);
      expect(m.nextLessons.first.start, '08:00');
      expect(m.nextLessons[1].className, '6B');
    });

    test('a lesson that has ended drops off, including the minute it ends', () {
      expect(build(timetable: tt, now: 8 * 60 + 40).nextLessons.map((l) => l.entryId), ['e2', 'e3']);
      expect(build(timetable: tt, now: 9 * 60 + 20).nextLessons.map((l) => l.entryId), ['e3']);
      expect(build(timetable: tt, now: 10 * 60 + 20).nextLessons, isEmpty);
    });

    test('a day the school does not work shows no lessons and no attendance to take', () {
      final m = build(timetable: tt, weekday: 'SUN', classes: [{'id': 'c-5A', 'name': '5A'}]);
      expect(m.isSchoolDay, isFalse);
      expect(m.nextLessons, isEmpty);
      expect(m.classesWithoutAttendance, isEmpty);
    });

    test('before the schedule has ever been loaded it assumes a school day rather than hiding her work', () {
      expect(build(timetable: tt, schedule: null, weekday: 'SUN').isSchoolDay, isTrue);
    });
  });

  group('attendance today', () {
    final classes = [{'id': 'c-5A', 'name': '5A'}, {'id': 'c-6B', 'name': '6B'}, {'id': 'c-7C', 'name': '7C'}];

    test('a class with a day on the server is done; one saved on the phone is "saved"; the rest still need it', () {
      final m = build(
        classes: classes,
        days: [{'classId': 'c-5A', 'date': '2026-10-26', 'submitted': true, 'locked': false}],
        box: [outbox('attendance.submit', {'classId': 'c-6B', 'date': '2026-10-26'})],
      );
      expect(m.classesWithoutAttendance.map((c) => c.name), ['7C']);
      expect(m.attendanceSaved.map((c) => c.name), ['6B']);
    });

    test('yesterday\'s day and another date\'s saved change do not count as today', () {
      final m = build(
        classes: classes,
        days: [{'classId': 'c-5A', 'date': '2026-10-25', 'submitted': true, 'locked': true}],
        box: [outbox('attendance.submit', {'classId': 'c-6B', 'date': '2026-10-25'})],
      );
      expect(m.classesWithoutAttendance, hasLength(3));
      expect(m.attendanceSaved, isEmpty);
    });

    test('a change the server refused does not count as done (it still needs doing), and a sending one counts as saved', () {
      final m = build(
        classes: classes,
        box: [
          outbox('attendance.submit', {'classId': 'c-5A', 'date': '2026-10-26'}, state: OutboxState.failed, seq: 1),
          outbox('attendance.submit', {'classId': 'c-6B', 'date': '2026-10-26'}, state: OutboxState.sending, seq: 2),
        ],
      );
      expect(m.classesWithoutAttendance.map((c) => c.name), ['5A', '7C']);
      expect(m.attendanceSaved.map((c) => c.name), ['6B']);
    });

    test('a day that exists but was not submitted does not count as taken', () {
      final m = build(classes: classes, days: [{'classId': 'c-5A', 'date': '2026-10-26', 'submitted': false, 'locked': false}]);
      expect(m.classesWithoutAttendance, hasLength(3));
    });

    test('all done means the lists are empty', () {
      final m = build(classes: classes, days: [for (final c in classes) {'classId': c['id'], 'date': '2026-10-26', 'submitted': true, 'locked': true}]);
      expect(m.classesWithoutAttendance, isEmpty);
      expect(m.attendanceSaved, isEmpty);
    });
  });

  group('leave and first load', () {
    test('only requests the Principal has not decided count as waiting; saved ones are counted apart', () {
      final m = build(
        leave: [{'status': 'PENDING'}, {'status': 'APPROVED'}, {'status': 'REJECTED'}, {'status': 'CANCELLED'}, {'status': 'PENDING'}],
        box: [outbox('leave.create', {}, seq: 1), outbox('leave.create', {}, state: OutboxState.failed, seq: 2), outbox('marks.save', {}, seq: 3)],
      );
      expect((m.leaveWaiting, m.leaveSaved), (2, 1));
    });

    test('nothing loaded yet is reported as no data, so the screen can say "connect once"', () {
      expect(build(schedule: null).hasData, isFalse);
      expect(build(schedule: week).hasData, isTrue);
      expect(build(schedule: null, classes: [{'id': 'c', 'name': 'x'}]).hasData, isTrue);
    });
  });
}
