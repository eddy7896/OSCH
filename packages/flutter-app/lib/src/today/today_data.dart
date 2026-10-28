import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'today_model.dart';

/// Local record types the Today screen reads. `TimetableEntry` is the gateway's own name so that a removed lesson (a tombstone) finds it.
const kTimetableEntry = 'TimetableEntry';
const kPeriod = 'Period';
const kSchedule = 'Schedule';
const kTeachingClass = 'TeachingClass';
const kAttendanceDay = 'AttendanceDay';

/// A student of one of her classes, as the class day lists them (parent: the class).
const kClassStudent = 'ClassStudent';
const kAttendanceStatus = 'AttendanceStatus';
const kLeaveRequest = 'LeaveRequest';

String isoDate(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the Teacher app pulls for the Today screen: her week's lessons, the bell schedule, her classes, which of them have attendance
/// today, and her own leave. Each is replaced whole (the lists are small); `updatedSince` is used by the screens that need it.
List<PullTask> todayPullTasks(OruApi api, {DateTime Function()? now}) {
  final clock = now ?? DateTime.now;
  return [
    PullTask.list(kTimetableEntry, () => _guard(() async => [for (final e in (await api.timetableMine()).entries) (id: e.id, parentId: null as String?, json: e.toJson())])),
    PullTask(kPeriod, (store) async {
      final s = await _guard(api.scheduleGet);
      await store.replaceAllRecords(kPeriod, [for (final p in s.periods) (id: p.id, parentId: null as String?, json: p.toJson())]);
      await store.replaceAllRecords(kSchedule, [(id: 'school', parentId: null as String?, json: {'workingDays': s.workingDays})]);
    }),
    PullTask(kTeachingClass, (store) async {
      final mine = await _guard(api.teachingMine);
      // Only the classes she is class teacher of: those are the classes whose daily attendance she takes.
      await store.replaceAllRecords(kTeachingClass, [for (final c in mine.classTeacherOf) (id: c.id, parentId: null as String?, json: c.toJson())]);
      // Each class's day today: whether it was taken or locked, and who is in the class with their status. One call per class.
      final date = isoDate(clock());
      final days = <PulledRecord>[];
      for (final c in mine.classTeacherOf) {
        final d = await _guard(() => api.attendanceDay(id: c.id, date: date));
        days.add((id: '${c.id}|$date', parentId: c.id, json: {'classId': c.id, 'date': date, 'submitted': d.submitted, 'locked': d.locked}));
        await store.replaceRecords(kClassStudent, parentId: c.id, records: [for (final st in d.students) (id: st.id, json: st.toJson())]);
      }
      await store.replaceAllRecords(kAttendanceDay, days);
    }),
    PullTask(kAttendanceStatus, (store) async {
      final list = await _guard(api.attendanceStatuses);
      await store.replaceAllRecords(kAttendanceStatus, [for (final x in list.items) (id: x.status, parentId: null as String?, json: x.toJson())]);
    }),
    PullTask.list(kLeaveRequest, () => _guard(() async => [for (final r in (await api.leaveRequests()).items) (id: r.id, parentId: null as String?, json: r.toJson())])),
  ];
}

/// Watches the local copy and the outbox and keeps a [TodayModel] current. Reads only the phone: the screen works with the network off.
class TodayController extends ChangeNotifier {
  TodayController(this.store, {DateTime Function()? now}) : _now = now ?? DateTime.now {
    for (final t in const [kTimetableEntry, kPeriod, kSchedule, kTeachingClass, kAttendanceDay, kLeaveRequest]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final DateTime Function() _now;
  final _subs = <StreamSubscription<Object?>>[];
  TodayModel? _model;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  TodayModel? get model => _model;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final m = await _build();
        if (_disposed) return;
        _model = m;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  Future<TodayModel> _build() async {
    final n = _now();
    return buildToday(
      date: isoDate(n),
      weekday: weekdayNames[n.weekday % 7],
      nowMinutes: n.hour * 60 + n.minute,
      timetable: await store.records(kTimetableEntry),
      periods: await store.records(kPeriod),
      teachingClasses: await store.records(kTeachingClass),
      attendanceDays: await store.records(kAttendanceDay),
      leaveRequests: await store.records(kLeaveRequest),
      schedule: await store.record(kSchedule, 'school'),
      outbox: await store.all(),
    );
  }

  /// The clock moved on (a minute passed): lessons that ended drop off.
  void tick() => unawaited(_refresh());

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
