/// A lesson in the child's class on one day.
class ChildLesson {
  const ChildLesson({required this.subject, required this.teacher, required this.start, required this.end});
  final String subject;
  final String? teacher;

  /// `HH:mm`, as the school's bell schedule writes it.
  final String start;
  final String end;
}

/// One of the child's bus rides: where the child gets on (to school) or off (home).
class ChildRide {
  const ChildRide({required this.direction, required this.stop, required this.time, required this.vehicle, required this.driverName});
  final String direction; // MORNING or AFTERNOON
  final String stop;
  final String? time;
  final String? vehicle;
  final String? driverName;
}

/// What the Parent app's home says about one child on one day, worked out from what is on the phone only.
class ChildToday {
  const ChildToday({required this.hasData, required this.attendanceStatus, required this.attendanceNote, required this.lessons, required this.rides});

  /// False before anything was ever loaded for this child (a fresh install that has not been online yet).
  final bool hasData;

  /// The status the school recorded for today (`PRESENT`, `ABSENT`...), or null when attendance has not been taken yet.
  final String? attendanceStatus;
  final String? attendanceNote;
  final List<ChildLesson> lessons;
  final List<ChildRide> rides;
}

int _minutes(String hhmm) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(hhmm);
  return m == null ? 0 : int.parse(m.group(1)!) * 60 + int.parse(m.group(2)!);
}

const _weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/// Pure: the same records and day give the same card. [date] is `YYYY-MM-DD`; [weekday] is `MON`... of that date.
ChildToday buildChildToday({
  required String date,
  required String weekday,
  required List<Map<String, dynamic>> attendance,
  required List<Map<String, dynamic>> lessons,
  required List<Map<String, dynamic>> periods,
  required Map<String, dynamic>? schedule,
  required List<Map<String, dynamic>> rides,
}) {
  final mark = attendance.where((a) => a['date'] == date).toList();
  final period = {for (final p in periods) p['id'] as String: p};
  final workingDays = [for (final d in (schedule?['workingDays'] as List<dynamic>? ?? const [])) d as String];
  final isSchoolDay = workingDays.isEmpty || workingDays.contains(weekday);
  final today = <ChildLesson>[];
  if (isSchoolDay) {
    for (final e in lessons) {
      if (e['day'] != weekday) continue;
      final p = period[e['periodId']];
      if (p == null || p['isBreak'] == true) continue;
      today.add(ChildLesson(
        subject: (e['subject'] as Map<String, dynamic>)['name'] as String,
        teacher: (e['staff'] as Map<String, dynamic>?)?['name'] as String?,
        start: p['startTime'] as String,
        end: p['endTime'] as String,
      ));
    }
    today.sort((a, b) => _minutes(a.start).compareTo(_minutes(b.start)));
  }
  final rideList = [
    for (final r in rides)
      ChildRide(
        direction: r['direction'] as String,
        stop: (r['stop'] as Map<String, dynamic>)['name'] as String,
        time: (r['stop'] as Map<String, dynamic>)['arrivalTime'] as String?,
        vehicle: (r['vehicle'] as Map<String, dynamic>?)?['label'] as String?,
        driverName: r['driverName'] as String?,
      ),
  ]..sort((a, b) => a.direction.compareTo(b.direction)); // AFTERNOON before MORNING in text order: put the morning first below
  rideList.sort((a, b) => (a.direction == 'MORNING' ? 0 : 1).compareTo(b.direction == 'MORNING' ? 0 : 1));
  return ChildToday(
    hasData: attendance.isNotEmpty || lessons.isNotEmpty || rides.isNotEmpty || schedule != null,
    attendanceStatus: mark.isEmpty ? null : mark.first['status'] as String?,
    attendanceNote: mark.isEmpty ? null : mark.first['note'] as String?,
    lessons: today,
    rides: rideList,
  );
}

String weekdayOf(DateTime d) => _weekdays[d.weekday % 7];
