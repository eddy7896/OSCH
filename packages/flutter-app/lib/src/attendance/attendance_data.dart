import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../today/today_data.dart';
import 'attendance_model.dart';

String draftKey(String classId, String date) => '$classId|$date';

/// One class's attendance for one date, live from the phone's own database. Edits are kept as a draft (so they survive the app being
/// killed) until the teacher saves; saving puts one change in the outbox with its own id as the gateway's `submissionId` and returns at once.
class AttendanceController extends ChangeNotifier {
  AttendanceController(this.store, {required this.classId, required this.date}) {
    for (final t in const [kClassStudent, kAttendanceDay]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final String classId;
  final String date;
  final _subs = <StreamSubscription<Object?>>[];
  ClassDayView? _view;
  Map<String, String>? _draft;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  ClassDayView? get view => _view;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final saved = await store.draft('attendance', draftKey(classId, date));
        _draft ??= saved == null ? null : {for (final e in (saved['statuses'] as Map<String, dynamic>).entries) e.key: e.value as String};
        final v = buildClassDay(
          classId: classId,
          date: date,
          roster: await store.records(kClassStudent, parentId: classId),
          day: await store.record(kAttendanceDay, '$classId|$date'),
          outbox: await store.all(),
          draft: _draft,
        );
        if (_disposed) return;
        _view = v;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  Map<String, String> _current() => {for (final s in _view!.students) s.id: s.status};

  Future<void> _edit(Map<String, String> statuses) async {
    _draft = statuses;
    await store.saveDraft('attendance', draftKey(classId, date), {'statuses': statuses});
    await _refresh();
  }

  /// Everyone present: the quick start before marking the exceptions.
  Future<void> markAllPresent() => _edit({for (final s in _view!.students) s.id: 'PRESENT'});

  Future<void> setStatus(String studentId, String status) => _edit({..._current(), studentId: status});

  /// Saves on the phone and queues it for the school. Returns once it is saved on the phone: it never waits for the network.
  Future<void> save() async {
    final v = _view!;
    final statuses = _draft ?? _current();
    await store.enqueue(kind: 'attendance.submit', body: {'classId': classId, 'date': date, 'marks': marksToSend({for (final s in v.students) s.id: statuses[s.id] ?? 'PRESENT'})});
    await store.clearDraft('attendance', draftKey(classId, date));
    _draft = null;
    await _refresh();
  }

  /// The teacher has read why the school refused it.
  Future<void> dismissRefusal() async {
    final id = _view?.failedEntryId;
    if (id != null) await store.dismiss(id);
    await _refresh();
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

/// Today's state of each class she takes, for the list.
class AttendanceListController extends ChangeNotifier {
  AttendanceListController(this.store, {required this.date}) {
    for (final t in const [kTeachingClass, kClassStudent, kAttendanceDay]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final String date;
  final _subs = <StreamSubscription<Object?>>[];
  List<({String id, String name, ClassDayState state, int students})>? _items;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  List<({String id, String name, ClassDayState state, int students})>? get items => _items;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final classes = await store.records(kTeachingClass);
        final outbox = await store.all();
        final out = <({String id, String name, ClassDayState state, int students})>[];
        for (final c in classes) {
          final id = c['id'] as String;
          final roster = await store.records(kClassStudent, parentId: id);
          final v = buildClassDay(classId: id, date: date, roster: roster, day: await store.record(kAttendanceDay, '$id|$date'), outbox: outbox, draft: null);
          out.add((id: id, name: c['name'] as String, state: v.state, students: roster.length));
        }
        if (_disposed) return;
        _items = out;
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
