import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../classes/classes_data.dart' show kReportCard, kTerm;
import 'parent_data.dart' show kChild;

/// The exams of the classes of the parent's children (for the calendar). A separate type from the teacher's exam list, which has another shape.
const kChildExam = 'ChildExam';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the report card, timetable and calendar need besides the child's day: the terms, each child's report card for each term (a card the school cannot make yet is skipped),
/// and the exams of their classes. Runs after [parentPullTasks], which pulls the children.
List<PullTask> parentAcademicsPullTasks(OruApi api) => [
      PullTask.list(kTerm, () => _guard(() async => [for (final t in (await api.gradesTerms()).items) (id: t.id, parentId: null as String?, json: t.toJson())])),
      PullTask(kReportCard, (store) async {
        final kids = await store.records(kChild);
        final terms = await store.records(kTerm);
        for (final k in kids) {
          for (final t in terms) {
            final key = '${k['id']}|${t['id']}';
            try {
              final c = await api.gradesReportCard(studentId: k['id'] as String, termId: t['id'] as String);
              await store.upsertRecords(kReportCard, [(id: key, parentId: null as String?, json: c.toJson())]);
            } on OruApiError catch (e) {
              if (e.status == 404 || e.status == 403) continue; // not in a class that year, or nothing to report yet
              throw failureOf(e);
            }
          }
        }
      }),
      PullTask.list(kChildExam, () => _guard(() async => [for (final e in (await api.gradesExams()).items) (id: e.id, parentId: null as String?, json: e.toJson())])),
    ];

int _minutes(String hhmm) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(hhmm);
  return m == null ? 0 : int.parse(m.group(1)!) * 60 + int.parse(m.group(2)!);
}

const weekdayCodes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/// One lesson of the week.
class WeekLesson {
  const WeekLesson({required this.subject, required this.teacher, required this.start, required this.end});
  final String subject;
  final String? teacher;
  final String start;
  final String end;
}

class WeekDay {
  const WeekDay(this.code, this.lessons);
  final String code;
  final List<WeekLesson> lessons;
}

/// Pure: the class's week, school days in the school's order (Monday first), lessons by start time. With no schedule on the phone the days that have lessons are used.
List<WeekDay> buildWeek({required List<Map<String, dynamic>> lessons, required List<Map<String, dynamic>> periods, required Map<String, dynamic>? schedule}) {
  final period = {for (final p in periods) p['id'] as String: p};
  final working = [for (final d in (schedule?['workingDays'] as List<dynamic>? ?? const [])) d as String];
  final days = <String, List<WeekLesson>>{};
  for (final e in lessons) {
    final p = period[e['periodId']];
    if (p == null || p['isBreak'] == true) continue;
    (days[e['day'] as String] ??= []).add(WeekLesson(
      subject: (e['subject'] as Map<String, dynamic>)['name'] as String,
      teacher: (e['staff'] as Map<String, dynamic>?)?['name'] as String?,
      start: p['startTime'] as String,
      end: p['endTime'] as String,
    ));
  }
  final codes = [for (final c in weekdayCodes) if (working.isEmpty ? days.containsKey(c) : working.contains(c)) c];
  return [
    for (final c in codes) WeekDay(c, [...?days[c]]..sort((a, b) => _minutes(a.start).compareTo(_minutes(b.start)))),
  ];
}

/// One day of the month.
class MonthDay {
  const MonthDay({required this.date, required this.day, required this.status, required this.note, required this.onLeave, required this.exams});
  final String date;
  final int day;

  /// The status the school recorded, or null when nothing is recorded.
  final String? status;
  final String? note;

  /// An approved leave request covers this day.
  final bool onLeave;
  final List<({String title, String subject})> exams;
}

class MonthView {
  const MonthView({required this.year, required this.month, required this.days, required this.counts});
  final int year;
  final int month;
  final List<MonthDay> days;

  /// How many days of the month carry each status.
  final Map<String, int> counts;

  /// Empty cells before the 1st when weeks start on Monday.
  int get leading => DateTime(year, month, 1).weekday - 1;
}

String _iso(int y, int m, int d) => '${y.toString().padLeft(4, '0')}-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';

/// Pure: a month of the child's days from what is on the phone. [leave] holds the child's requests; only approved ones count.
MonthView buildMonth({
  required int year,
  required int month,
  required List<Map<String, dynamic>> attendance,
  required List<Map<String, dynamic>> leave,
  required List<Map<String, dynamic>> exams,
}) {
  final byDate = {for (final a in attendance) a['date'] as String: a};
  final approved = [for (final l in leave) if (l['status'] == 'APPROVED') (start: l['startDate'] as String, end: l['endDate'] as String)];
  final n = DateTime(year, month + 1, 0).day;
  final counts = <String, int>{};
  final days = <MonthDay>[];
  for (var d = 1; d <= n; d++) {
    final date = _iso(year, month, d);
    final a = byDate[date];
    final status = a?['status'] as String?;
    if (status != null) counts[status] = (counts[status] ?? 0) + 1;
    days.add(MonthDay(
      date: date,
      day: d,
      status: status,
      note: a?['note'] as String?,
      onLeave: approved.any((r) => date.compareTo(r.start) >= 0 && date.compareTo(r.end) <= 0),
      exams: [for (final e in exams) if (e['examDate'] == date) (title: e['title'] as String, subject: (e['subject'] as Map<String, dynamic>)['name'] as String)],
    ));
  }
  return MonthView(year: year, month: month, days: days, counts: counts);
}
