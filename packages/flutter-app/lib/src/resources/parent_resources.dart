import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../parent/parent_data.dart' show kChild;
import 'resource_files.dart';
import 'resources_data.dart' show kResource;

enum OpenProblem { none, needsNet, failed, noViewer }

/// One subject's worksheets for one class, newest first.
class SubjectGroup {
  const SubjectGroup(this.subject, this.items);
  final String subject;
  final List<Map<String, dynamic>> items;
}

/// Pure: the resources of one class grouped by subject (subjects A to Z, newest first inside each).
List<SubjectGroup> groupBySubject(List<Map<String, dynamic>> all, String? classId) {
  final mine = [for (final r in all) if (classId != null && (r['class'] as Map<String, dynamic>)['id'] == classId) r];
  final bySubject = <String, List<Map<String, dynamic>>>{};
  for (final r in mine) {
    bySubject.putIfAbsent((r['subject'] as Map<String, dynamic>)['name'] as String, () => []).add(r);
  }
  final names = bySubject.keys.toList()..sort();
  return [
    for (final n in names) SubjectGroup(n, [...bySubject[n]!]..sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String))),
  ];
}

/// The Parent app's Resources tab: the worksheets and workbooks of the chosen child's class, from the phone's copy; opening one downloads it once and keeps it for offline reading.
class ParentResourcesController extends ChangeNotifier {
  ParentResourcesController(this.api, this.store, this.files) {
    for (final t in const [kResource, kChild]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruApi api;
  final OruLocalStore store;
  final ResourceFilesPort files;
  final _subs = <StreamSubscription<Object?>>[];

  List<Map<String, dynamic>>? children;
  List<Map<String, dynamic>> all = const [];
  final Set<String> kept = {};
  String? selectedId;
  String? openingId;
  OpenProblem problem = OpenProblem.none;
  bool _disposed = false;

  Map<String, dynamic>? get selected {
    final kids = children;
    if (kids == null || kids.isEmpty) return null;
    return kids.firstWhere((c) => c['id'] == selectedId, orElse: () => kids.first);
  }

  String? get classId => (selected?['class'] as Map<String, dynamic>?)?['id'] as String?;
  List<SubjectGroup> get groups => groupBySubject(all, classId);

  void select(String id) {
    selectedId = id;
    problem = OpenProblem.none;
    notifyListeners();
  }

  Future<void> _refresh() async {
    final kids = await store.records(kChild);
    final r = await store.records(kResource);
    // what the school removed, or what ended with the year, leaves the phone too
    await files.purgeExcept({for (final x in r) x['id'] as String});
    final have = <String>{};
    for (final x in r) {
      if (await files.cachedPath(x['id'] as String, x['fileName'] as String) != null) have.add(x['id'] as String);
    }
    if (_disposed) return;
    children = kids;
    all = r;
    kept
      ..clear()
      ..addAll(have);
    notifyListeners();
  }

  /// Opens the file: the copy on the phone if there is one, else downloaded now (needs a connection).
  Future<void> open(Map<String, dynamic> r) async {
    if (openingId != null) return;
    final id = r['id'] as String;
    final name = r['fileName'] as String;
    openingId = id;
    problem = OpenProblem.none;
    notifyListeners();
    try {
      var path = await files.cachedPath(id, name);
      if (path == null) {
        final signed = await api.resourcesDownload(id: id);
        path = await files.fetchAndKeep(id, name, signed.url);
        kept.add(id);
      }
      if (!await files.open(path)) problem = OpenProblem.noViewer;
    } on OruApiError catch (e) {
      problem = e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT' || e.code == 'UPSTREAM_UNAVAILABLE' ? OpenProblem.needsNet : OpenProblem.failed;
    } on DownloadFailed {
      problem = OpenProblem.needsNet;
    } finally {
      openingId = null;
      if (!_disposed) notifyListeners();
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
