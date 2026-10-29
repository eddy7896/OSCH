import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'marks_model.dart';

const kExam = 'Exam';
const kExamStudent = 'ExamStudent';

/// At most this many recent exams are kept on the phone (each needs its student list).
const maxExamsOnPhone = 30;

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// The exams she may enter marks for (the gateway's rule: a subject she teaches, in a class of hers) and each one's students with their marks.
List<PullTask> marksPullTasks(OruApi api) => [
      PullTask(kExam, (store) async {
        final mine = await _guard(api.teachingMine);
        final subjects = {for (final s in mine.subjects) s.id};
        final classes = {for (final c in mine.classes) c.id};
        final all = (await _guard(api.gradesExams)).items.where((e) => subjects.contains(e.subject.id) && classes.contains(e.class_.id)).toList()..sort((a, b) => b.examDate.compareTo(a.examDate));
        final exams = all.take(maxExamsOnPhone).toList();
        await store.replaceAllRecords(kExam, [for (final e in exams) (id: e.id, parentId: null as String?, json: e.toJson())]);
        final kept = {for (final e in exams) e.id};
        // Students of exams that are no longer kept go with them.
        for (final old in await store.records(kExamStudent)) {
          if (!kept.contains(old['examId'])) await store.replaceRecords(kExamStudent, parentId: old['examId'] as String, records: const []);
        }
        for (final e in exams) {
          final grid = await _guard(() => api.gradesGrid(id: e.id));
          await store.replaceRecords(kExamStudent, parentId: e.id, records: [for (final r in grid.rows) (id: r.studentId, json: {...r.toJson(), 'examId': e.id})]);
        }
      }),
    ];

String draftKeyOf(String examId) => examId;

/// One exam's marks, live from the phone's own database. What is typed is kept as a draft (so it survives the app being killed) until it is
/// saved; saving puts one change in the outbox with its own id as the gateway's `submissionId` and returns at once.
class MarksController extends ChangeNotifier {
  MarksController(this.store, {required this.examId, required this.maxTenths}) {
    for (final t in const [kExamStudent]) {
      _subs.add(store.watchRecords(t, parentId: examId).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final String examId;
  final int maxTenths;
  final _subs = <StreamSubscription<Object?>>[];
  ExamEntryView? _view;
  Map<String, MarkCell>? _draft;
  bool _loadedDraft = false;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  ExamEntryView? get view => _view;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        if (!_loadedDraft) {
          _loadedDraft = true;
          final saved = await store.draft('marks', draftKeyOf(examId));
          if (saved != null) {
            _draft = {for (final e in (saved['cells'] as Map<String, dynamic>).entries) e.key: MarkCell(text: (e.value as Map<String, dynamic>)['text'] as String, absent: e.value['absent'] as bool)};
          }
        }
        final v = buildExamEntry(examId: examId, maxTenths: maxTenths, roster: await store.records(kExamStudent, parentId: examId), outbox: await store.all(), draft: _draft);
        if (_disposed) return;
        _view = v;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  Map<String, MarkCell> _cells() => {for (final r in _view!.rows) r.studentId: r.cell};

  Future<void> _edit(Map<String, MarkCell> cells) async {
    _draft = cells;
    await store.saveDraft('marks', draftKeyOf(examId), {'cells': {for (final e in cells.entries) e.key: {'text': e.value.text, 'absent': e.value.absent}}});
    await _refresh();
  }

  /// A mark typed or cleared. Anything is kept (even a wrong mark, which shows its error and blocks Save).
  Future<void> setText(String studentId, String text) => _edit({..._cells(), studentId: MarkCell(text: text, absent: false)});

  Future<void> setAbsent(String studentId, bool absent) => _edit({..._cells(), studentId: MarkCell(text: '', absent: absent)});

  /// Saves on the phone and queues it for the school. Returns once it is saved on the phone: never waits for the network.
  Future<void> save() async {
    final v = _view!;
    if (!v.canSave) return;
    final entries = entriesToSend(v);
    await store.enqueue(kind: 'marks.save', body: {'examId': examId, 'entries': entries});
    await store.clearDraft('marks', draftKeyOf(examId));
    _draft = null;
    await _refresh();
  }

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

/// The exams on the phone with how far each is marked.
class ExamListController extends ChangeNotifier {
  ExamListController(this.store) {
    for (final t in const [kExam, kExamStudent]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<({Map<String, dynamic> exam, int marked, int total, ExamState state})>? _items;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  List<({Map<String, dynamic> exam, int marked, int total, ExamState state})>? get items => _items;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final exams = await store.records(kExam)
          ..sort((a, b) => (b['examDate'] as String).compareTo(a['examDate'] as String));
        final outbox = await store.all();
        final out = <({Map<String, dynamic> exam, int marked, int total, ExamState state})>[];
        for (final e in exams) {
          final p = examProgress(roster: await store.records(kExamStudent, parentId: e['id'] as String), outbox: outbox, examId: e['id'] as String);
          out.add((exam: e, marked: p.marked, total: p.total, state: p.state));
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
