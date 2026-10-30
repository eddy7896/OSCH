import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../today/today_data.dart' show kPeriod, kSchedule, isoDate;
import 'parent_model.dart';

/// The parent's children (id, name, enrolment id, relationship, class), and for each: the last two weeks of attendance (parent: the child), the class's lessons
/// (parent: the class) and the bus rides (parent: the child). A child is only ever one the gateway links to this account.
const kChild = 'Child';
const kChildAttendance = 'ChildAttendance';
const kChildLesson = 'ChildLesson';
const kChildRide = 'ChildRide';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// Reads that the school may not allow this account (the bell schedule, a timetable) leave the card empty instead of failing the whole sync.
Future<T?> _soft<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    if (e.status == 403 || e.status == 404) return null;
    throw failureOf(e);
  }
}

List<PullTask> parentPullTasks(OruApi api, {DateTime Function()? now}) {
  final clock = now ?? DateTime.now;
  return [
    PullTask(kChild, (store) async {
      final mine = await _guard(api.teachingMine);
      await store.replaceAllRecords(kChild, [for (final c in mine.children) (id: c.id, parentId: null as String?, json: c.toJson())]);
      final to = clock();
      final from = to.subtract(const Duration(days: 13));
      for (final c in mine.children) {
        final a = await _soft(() => api.attendanceStudent(id: c.id, from: isoDate(from), to: isoDate(to)));
        await store.replaceRecords(kChildAttendance, parentId: c.id, records: [for (final m in a?.marks ?? const <StudentMarkDto>[]) (id: m.date, json: {'date': m.date, 'status': m.status, 'note': m.note})]);
      }
      for (final classId in {for (final c in mine.children) if (c.class_ != null) c.class_!.id}) {
        final t = await _soft(() => api.timetableForClass(id: classId));
        await store.replaceRecords(kChildLesson, parentId: classId, records: [for (final e in t?.entries ?? const <ClassSlotDto>[]) (id: e.id, json: e.toJson())]);
      }
      final s = await _soft(api.scheduleGet);
      if (s != null) {
        await store.replaceAllRecords(kPeriod, [for (final p in s.periods) (id: p.id, parentId: null as String?, json: p.toJson())]);
        await store.replaceAllRecords(kSchedule, [(id: 'school', parentId: null as String?, json: {'workingDays': s.workingDays})]);
      }
    }),
    PullTask(kChildRide, (store) async {
      final r = await _soft(api.transportChildren);
      for (final c in r?.items ?? const <StudentSeatsDto>[]) {
        await store.replaceRecords(kChildRide, parentId: c.studentId, records: [for (final s in c.items) (id: s.direction, json: s.toJson())]);
      }
    }),
  ];
}

/// Keeps the Parent app's home current from the phone's own records: the children, which one is shown, and that child's day.
class ParentController extends ChangeNotifier {
  ParentController(this.store, {DateTime Function()? now}) : _now = now ?? DateTime.now {
    for (final t in const [kChild, kChildAttendance, kChildLesson, kChildRide, kPeriod, kSchedule]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruLocalStore store;
  final DateTime Function() _now;
  final _subs = <StreamSubscription<Object?>>[];
  List<Map<String, dynamic>>? children;
  String? selectedId;
  ChildToday? today;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  Map<String, dynamic>? get selected => children?.where((c) => c['id'] == selectedId).firstOrNull;

  Future<void> select(String id) async {
    selectedId = id;
    await store.saveDraft('parent', 'child', {'id': id});
    await _refresh();
  }

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final list = (await store.records(kChild))..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
        var pick = selectedId ?? (await store.draft('parent', 'child'))?['id'] as String?;
        if (list.isNotEmpty && !list.any((c) => c['id'] == pick)) pick = list.first['id'] as String;
        final child = list.where((c) => c['id'] == pick).firstOrNull;
        ChildToday? t;
        if (child != null) {
          final n = _now();
          final classId = (child['class'] as Map<String, dynamic>?)?['id'] as String?;
          t = buildChildToday(
            date: isoDate(n),
            weekday: weekdayOf(n),
            attendance: await store.records(kChildAttendance, parentId: pick),
            lessons: classId == null ? const [] : await store.records(kChildLesson, parentId: classId),
            periods: await store.records(kPeriod),
            schedule: await store.record(kSchedule, 'school'),
            rides: await store.records(kChildRide, parentId: pick),
          );
        }
        if (_disposed) return;
        children = list;
        selectedId = pick;
        today = t;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
