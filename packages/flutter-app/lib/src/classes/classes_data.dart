import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

/// The classes she teaches (class teacher or timetable) and, for her own, the students (the Today pull keeps them as [kClassStudent]); the terms; report cards already opened.
const kMyClass = 'MyClass';
const kTerm = 'Term';
const kReportCard = 'ReportCard';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

List<PullTask> classesPullTasks(OruApi api) => [
      PullTask(kMyClass, (store) async {
        final mine = await _guard(api.teachingMine);
        final own = {for (final c in mine.classTeacherOf) c.id};
        // Her class list: every class she teaches. Students and report cards are the gateway's to give only for the classes she is class teacher of.
        await store.replaceAllRecords(kMyClass, [for (final c in mine.classes) (id: c.id, parentId: null as String?, json: {...c.toJson(), 'classTeacher': own.contains(c.id)})]);
      }),
      PullTask.list(kTerm, () => _guard(() async => [for (final t in (await api.gradesTerms()).items) (id: t.id, parentId: null as String?, json: t.toJson())])),
    ];

/// The report card of one student for one term: fetched when she is connected, kept on the phone once seen. Read only.
class ReportCardController extends ChangeNotifier {
  ReportCardController(this.api, this.store, {required this.studentId}) {
    _load();
  }

  final OruApi api;
  final OruLocalStore store;
  final String studentId;

  List<Map<String, dynamic>> terms = const [];
  String? termId;
  Map<String, dynamic>? card;

  /// True when the card on screen is the copy kept on the phone, or none could be had.
  bool offline = false;
  bool loading = false;
  bool _disposed = false;

  Future<void> _load() async {
    terms = await store.records(kTerm);
    termId = terms.isEmpty ? null : terms.first['id'] as String;
    await _show();
  }

  Future<void> choose(String id) async {
    termId = id;
    await _show();
  }

  Future<void> _show() async {
    final t = termId;
    if (t == null) {
      _notify();
      return;
    }
    loading = true;
    _notify();
    final key = '$studentId|$t';
    try {
      final c = await api.gradesReportCard(studentId: studentId, termId: t);
      card = c.toJson();
      offline = false;
      await store.upsertRecords(kReportCard, [(id: key, parentId: null, json: card!)]);
    } on OruApiError {
      card = await store.record(kReportCard, key);
      offline = true;
    }
    loading = false;
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
