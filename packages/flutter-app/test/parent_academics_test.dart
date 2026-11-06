import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart' show Scrollable;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart' show PulledRecord;
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);
DateTime today() => DateTime(2026, 11, 2, 9); // a Monday
const kid = {'id': 'k1', 'name': 'Asha Rao', 'enrollmentId': 'S-1', 'relationship': 'MOTHER', 'class': {'id': 'c5', 'name': '5 B'}};

Map<String, dynamic> lesson(String id, String day, String period, String subject) => {'id': id, 'day': day, 'periodId': period, 'subject': {'id': subject, 'name': subject, 'code': subject}, 'staff': {'id': 't', 'name': 'Tara Teacher', 'employeeId': 'E1'}};
final periods = [
  {'id': 'p1', 'label': 'P1', 'startTime': '08:00', 'endTime': '08:40', 'isBreak': false},
  {'id': 'p2', 'label': 'Break', 'startTime': '08:40', 'endTime': '09:00', 'isBreak': true},
  {'id': 'p3', 'label': 'P2', 'startTime': '09:00', 'endTime': '09:40', 'isBreak': false},
];

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kChild, [rec('k1', Map<String, dynamic>.from(kid))]);
  await s.store.replaceRecords(kChildLesson, parentId: 'c5', records: [
    (id: 'e1', json: lesson('e1', 'MON', 'p3', 'Science')),
    (id: 'e2', json: lesson('e2', 'MON', 'p1', 'Mathematics')),
    (id: 'e3', json: lesson('e3', 'TUE', 'p1', 'English')),
    (id: 'e4', json: lesson('e4', 'MON', 'p2', 'Break')),
  ]);
  await s.store.replaceAllRecords(kPeriod, [for (final p in periods) rec(p['id'] as String, Map<String, dynamic>.from(p))]);
  await s.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']})]);
  await s.store.replaceRecords(kChildAttendance, parentId: 'k1', records: [
    (id: '2026-11-02', json: {'date': '2026-11-02', 'status': 'LATE', 'note': 'Bus was late'}),
    (id: '2026-10-30', json: {'date': '2026-10-30', 'status': 'ABSENT', 'note': null}),
    (id: '2026-10-29', json: {'date': '2026-10-29', 'status': 'PRESENT', 'note': null}),
  ]);
  await s.store.replaceAllRecords(kChildExam, [
    rec('x1', {'id': 'x1', 'title': 'Unit test 2', 'examDate': '2026-11-10', 'class': {'id': 'c5', 'name': '5 B'}, 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MAT'}, 'term': {'id': 't1', 'name': 'Term 1'}, 'maxMarks': '50', 'maxTenths': 500}),
    rec('x2', {'id': 'x2', 'title': 'Other class exam', 'examDate': '2026-11-10', 'class': {'id': 'c9', 'name': '9 A'}, 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MAT'}, 'term': {'id': 't1', 'name': 'Term 1'}, 'maxMarks': '50', 'maxTenths': 500}),
  ]);
  await s.store.replaceAllRecords(kStudentLeave, [
    rec('l1', {'id': 'l1', 'status': 'APPROVED', 'startDate': '2026-11-04', 'endDate': '2026-11-05', 'half': null, 'reason': 'Wedding', 'student': {'id': 'k1', 'name': 'Asha Rao', 'enrollmentId': 'S-1', 'className': '5 B'}, 'requestedBy': {'id': 'p', 'name': 'Parvati'}, 'decision': null, 'createdAt': '', 'updatedAt': ''}),
    rec('l2', {'id': 'l2', 'status': 'PENDING', 'startDate': '2026-11-12', 'endDate': '2026-11-12', 'half': null, 'reason': 'x', 'student': {'id': 'k1', 'name': 'Asha Rao', 'enrollmentId': 'S-1', 'className': '5 B'}, 'requestedBy': {'id': 'p', 'name': 'Parvati'}, 'decision': null, 'createdAt': '', 'updatedAt': ''}),
  ]);
  await s.store.replaceAllRecords(kTerm, [rec('t1', {'id': 't1', 'name': 'Term 1'})]);
  await s.store.upsertRecords(kReportCard, [(id: 'k1|t1', parentId: null, json: {'subjects': [{'subject': {'id': 'm', 'name': 'Mathematics'}, 'marks': '42', 'maxMarks': '50', 'grade': 'A2'}], 'totalMarks': '42', 'percent': '84', 'grade': 'A2', 'pending': 0})]);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('the week: school days in order, breaks left out, lessons by start time; with no schedule the days with lessons are used', () {
    final lessons = [lesson('e1', 'MON', 'p3', 'Science'), lesson('e2', 'MON', 'p1', 'Mathematics'), lesson('e3', 'TUE', 'p1', 'English'), lesson('e4', 'MON', 'p2', 'Break')];
    final w = buildWeek(lessons: lessons, periods: periods, schedule: {'workingDays': ['MON', 'TUE', 'WED']});
    expect(w.map((d) => d.code), ['MON', 'TUE', 'WED']);
    expect(w.first.lessons.map((l) => l.subject), ['Mathematics', 'Science']);
    expect(w[2].lessons, isEmpty);
    expect(buildWeek(lessons: lessons, periods: periods, schedule: null).map((d) => d.code), ['MON', 'TUE']);
  });

  test('the month: statuses and counts, approved leave only, exams of the class, the first weekday', () {
    final m = buildMonth(
      year: 2026, month: 11,
      attendance: [{'date': '2026-11-02', 'status': 'LATE', 'note': 'n'}, {'date': '2026-11-03', 'status': 'LATE', 'note': null}],
      leave: [{'status': 'APPROVED', 'startDate': '2026-11-04', 'endDate': '2026-11-05'}, {'status': 'PENDING', 'startDate': '2026-11-12', 'endDate': '2026-11-12'}, {'status': 'DECLINED', 'startDate': '2026-11-20', 'endDate': '2026-11-20'}],
      exams: [{'examDate': '2026-11-10', 'title': 'Unit test', 'subject': {'name': 'Maths'}}],
    );
    expect(m.days, hasLength(30));
    expect(m.counts, {'LATE': 2});
    expect(m.leading, 6, reason: '1 November 2026 is a Sunday: six empty cells when Monday is first');
    expect(m.days[3].onLeave && m.days[4].onLeave, isTrue);
    expect(m.days[11].onLeave, isFalse, reason: 'a request that is only waiting is not shown as leave');
    expect(m.days[9].exams.single.title, 'Unit test');
    expect(m.days[1].note, 'n');
  });

  testWidgets('the timetable opens on today\'s weekday, from the phone alone, and switches day', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruChildTimetableScreen(services: svc, child: Map<String, dynamic>.from(kid), now: today)));
      await pumpFor(tester);
      expect(find.text('Asha\'s week'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Science'), findsOneWidget);
      expect(find.text('Break'), findsNothing);
      expect(find.text('English'), findsNothing);
      await tester.tap(find.text('Tuesday'));
      await pumpFor(tester);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Mathematics'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('the calendar: today\'s details, an exam day, approved leave, the summary, and the month before', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruChildCalendarScreen(services: svc, child: Map<String, dynamic>.from(kid), now: today)));
      await pumpFor(tester);
      expect(find.text('November 2026'), findsOneWidget);
      expect(find.text('Bus was late'), findsOneWidget, reason: 'today is selected and shows what the school recorded');
      await tester.tap(find.bySemanticsLabel(RegExp('November 10, 2026')));
      await pumpFor(tester);
      expect(find.text('Unit test 2: Mathematics'), findsOneWidget);
      expect(find.text('Other class exam: Mathematics'), findsNothing);
      await tester.tap(find.bySemanticsLabel(RegExp('November 4, 2026')));
      await pumpFor(tester);
      expect(find.text('Approved leave'), findsWidgets);
      await tester.tap(find.bySemanticsLabel(RegExp('November 12, 2026')));
      await pumpFor(tester);
      expect(find.text('Nothing is recorded for this day.'), findsOneWidget, reason: 'a waiting request is not leave');
      await tester.tap(find.text('Earlier'));
      await pumpFor(tester);
      expect(find.text('October 2026'), findsOneWidget);
      expect(find.text('This month'), findsOneWidget);
      expect(find.text('Absent'), findsWidgets);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('Home gets three rows for the chosen child; Report card opens the saved card with no connection', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruChildHomeScreen(services: svc, now: today)));
      await pumpFor(tester);
      await tester.dragUntilVisible(find.text('Report card'), find.byType(Scrollable).first, const Offset(0, -300));
      expect(find.text('More about Asha'), findsOneWidget);
      expect(find.text('Timetable'), findsOneWidget);
      expect(find.text('Calendar'), findsOneWidget);
      await tester.tap(find.text('Report card'));
      await pumpFor(tester, 10);
      expect(find.textContaining('42'), findsWidgets, reason: 'the saved card is shown: marks out of 50');
      expect(find.textContaining('Grade A2'), findsWidgets);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
