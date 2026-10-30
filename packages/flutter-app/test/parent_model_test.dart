import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> lesson(String id, String day, String period, String subject, [String? teacher]) => {'id': id, 'day': day, 'periodId': period, 'subject': {'id': subject, 'name': subject, 'code': subject}, 'staff': teacher == null ? null : {'id': 't', 'name': teacher, 'employeeId': 'E1'}};
Map<String, dynamic> period(String id, String start, String end, {bool brk = false}) => {'id': id, 'label': id, 'startTime': start, 'endTime': end, 'isBreak': brk};
Map<String, dynamic> ride(String direction, String stop, String? time) => {'direction': direction, 'stop': {'id': 's', 'name': stop, 'sequence': 1, 'arrivalTime': time}, 'vehicle': {'registration': 'KA-1', 'label': 'Bus 3'}, 'driverName': 'Salim Dar', 'route': {'id': 'r', 'name': 'North'}};

ChildToday build({List<Map<String, dynamic>> attendance = const [], List<Map<String, dynamic>> lessons = const [], List<Map<String, dynamic>> rides = const [], String weekday = 'MON', Map<String, dynamic>? schedule, List<Map<String, dynamic>>? periods}) => buildChildToday(
      date: '2026-11-02', weekday: weekday, attendance: attendance, lessons: lessons, rides: rides, schedule: schedule,
      periods: periods ?? [period('p1', '08:00', '08:40'), period('br', '08:40', '09:00', brk: true), period('p2', '09:00', '09:40')],
    );

void main() {
  test('nothing loaded yet says so, so the screen can ask for one connection', () {
    final t = build(periods: const []);
    expect(t.hasData, isFalse);
    expect([t.attendanceStatus, t.lessons, t.rides], [null, isEmpty, isEmpty]);
  });

  test('today\'s attendance is the school\'s record for today; an earlier day does not count; none yet is null', () {
    expect(build(attendance: [{'date': '2026-10-30', 'status': 'ABSENT', 'note': null}], schedule: {'workingDays': ['MON']}).attendanceStatus, isNull);
    final t = build(attendance: [{'date': '2026-10-30', 'status': 'ABSENT', 'note': null}, {'date': '2026-11-02', 'status': 'LATE', 'note': 'Bus was late'}]);
    expect([t.attendanceStatus, t.attendanceNote], ['LATE', 'Bus was late']);
  });

  test('lessons are today\'s, in time order, breaks and other days left out; a day the school is closed has none', () {
    final lessons = [lesson('a', 'MON', 'p2', 'Science', 'Bilal Khan'), lesson('b', 'MON', 'p1', 'Maths'), lesson('c', 'MON', 'br', 'Lunch'), lesson('d', 'TUE', 'p1', 'Art')];
    final t = build(lessons: lessons, schedule: {'workingDays': ['MON', 'TUE']});
    expect(t.lessons.map((l) => [l.subject, l.start, l.teacher]), [['Maths', '08:00', null], ['Science', '09:00', 'Bilal Khan']]);
    expect(build(lessons: lessons, weekday: 'SUN', schedule: {'workingDays': ['MON', 'TUE']}).lessons, isEmpty);
  });

  test('rides: the morning first, then the afternoon, with stop, time, vehicle and the driver\'s name', () {
    final t = build(rides: [ride('AFTERNOON', 'School gate', '15:30'), ride('MORNING', 'Lake Road', '07:20')]);
    expect(t.rides.map((r) => [r.direction, r.stop, r.time]), [['MORNING', 'Lake Road', '07:20'], ['AFTERNOON', 'School gate', '15:30']]);
    expect([t.rides.first.vehicle, t.rides.first.driverName], ['Bus 3', 'Salim Dar']);
  });

  test('the weekday names are the gateway\'s', () {
    expect([weekdayOf(DateTime(2026, 11, 1)), weekdayOf(DateTime(2026, 11, 2)), weekdayOf(DateTime(2026, 11, 7))], ['SUN', 'MON', 'SAT']);
  });
}
