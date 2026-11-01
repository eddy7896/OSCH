import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:http/http.dart' as http;

/// The resources the person may see (a teacher: those of her classes) and the subjects she teaches.
const kResource = 'Resource';
const kMySubject = 'MySubject';

/// What a teacher may share (ADR-0016 decision 5), by file extension. The gateway checks the type again on the stored file.
const resourceTypes = <String, String>{
  'pdf': 'application/pdf',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const resourceMaxBytes = 20 * 1024 * 1024;

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the Resources screen pulls: the list (the school removes expired and removed ones, so the whole list replaces the phone's copy) and her subjects.
/// The resources list alone (a parent's app reads it for the classes of their linked children).
PullTask resourcesListPullTask(OruApi api) => PullTask.list(kResource, () => _guard(() async => [for (final r in (await api.resourcesList()).items) (id: r.id, parentId: null as String?, json: r.toJson())]));

List<PullTask> resourcesPullTasks(OruApi api) => [
      resourcesListPullTask(api),
      PullTask(kMySubject, (store) async {
        final mine = await _guard(api.teachingMine);
        await store.replaceAllRecords(kMySubject, [for (final s in mine.subjects) (id: s.id, parentId: null as String?, json: s.toJson())]);
      }),
    ];

/// A file the person chose: its name and every byte (a worksheet is at most 20 MB).
class PickedFile {
  const PickedFile({required this.name, required this.bytes});
  final String name;
  final Uint8List bytes;

  String get extension => name.contains('.') ? name.split('.').last.toLowerCase() : '';
  String? get contentType => resourceTypes[extension];
}

/// Chooses a file. A port, so tests need no phone.
abstract class FilePort {
  /// Null when the person cancelled.
  Future<PickedFile?> pick();
}

class PlatformFilePort implements FilePort {
  const PlatformFilePort();
  @override
  Future<PickedFile?> pick() async {
    final f = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: resourceTypes.keys.toList());
    if (f == null) return null;
    return PickedFile(name: f.name, bytes: await f.readAsBytes());
  }
}

/// Sends the file's bytes to the short-lived address the school gave. A port, so tests need no network.
abstract class UploadPort {
  /// Throws [UploadFailed] unless the storage accepted the file.
  Future<void> put({required String url, required Map<String, String> headers, required Uint8List bytes});
}

class UploadFailed implements Exception {
  const UploadFailed();
}

class HttpUploadPort implements UploadPort {
  const HttpUploadPort({this.timeout = const Duration(minutes: 3)});
  final Duration timeout;

  @override
  Future<void> put({required String url, required Map<String, String> headers, required Uint8List bytes}) async {
    try {
      // The length is part of the signature and the client sets it from the body, so it is not sent twice.
      final h = {for (final e in headers.entries) if (e.key.toLowerCase() != 'content-length') e.key: e.value};
      final r = await http.put(Uri.parse(url), headers: h, body: bytes).timeout(timeout);
      if (r.statusCode < 200 || r.statusCode >= 300) throw const UploadFailed();
    } on UploadFailed {
      rethrow;
    } catch (_) {
      throw const UploadFailed();
    }
  }
}

enum ResourceProblem { none, noClass, noSubject, noTitle, noFile, wrongType, tooBig, offline, notTeaching, refused, uploadFailed }

/// Checked on the phone before anything is asked of the network.
ResourceProblem checkResource({required String? classId, required String? subjectId, required String title, required PickedFile? file}) {
  if (classId == null) return ResourceProblem.noClass;
  if (subjectId == null) return ResourceProblem.noSubject;
  if (title.trim().isEmpty) return ResourceProblem.noTitle;
  if (file == null) return ResourceProblem.noFile;
  if (file.contentType == null) return ResourceProblem.wrongType;
  if (file.bytes.isEmpty) return ResourceProblem.noFile;
  if (file.bytes.length > resourceMaxBytes) return ResourceProblem.tooBig;
  return ResourceProblem.none;
}

ResourceProblem _problemOf(OruApiError e) {
  if (e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT' || e.code == 'UPSTREAM_UNAVAILABLE') return ResourceProblem.offline;
  if (e.status == 403) return ResourceProblem.notTeaching;
  return ResourceProblem.refused;
}

/// Keeps the list current from the phone's copy, and shares or removes a resource. Sharing and removing need a connection (a file is not queued): the screen says so in words.
class ResourcesController extends ChangeNotifier {
  ResourcesController(this.api, this.store, {required this.userId, this.onChanged}) {
    for (final t in const [kResource, kMySubject, 'MyClass']) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruApi api;
  final OruLocalStore store;

  /// The signed-in person: she may remove only what she shared.
  final String userId;

  /// Called after a change so the app can pull again at once.
  final Future<void> Function()? onChanged;
  final _subs = <StreamSubscription<Object?>>[];

  List<Map<String, dynamic>>? items;
  List<Map<String, dynamic>> classes = const [];
  List<Map<String, dynamic>> subjects = const [];
  ResourceProblem problem = ResourceProblem.none;
  bool busy = false;
  bool _disposed = false;

  bool isMine(Map<String, dynamic> r) => (r['uploadedBy'] as Map<String, dynamic>)['id'] == userId;

  Future<void> _refresh() async {
    final r = await store.records(kResource);
    final c = await store.records('MyClass');
    final s = await store.records(kMySubject);
    if (_disposed) return;
    items = [...r]..sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String));
    classes = c;
    subjects = s;
    notifyListeners();
  }

  /// The whole path: an upload address, the bytes, and the record. Returns true when the parents can see it.
  Future<bool> share({required String classId, required String subjectId, required String title, String note = '', required PickedFile file}) async {
    final check = checkResource(classId: classId, subjectId: subjectId, title: title, file: file);
    if (check != ResourceProblem.none) {
      problem = check;
      notifyListeners();
      return false;
    }
    busy = true;
    problem = ResourceProblem.none;
    notifyListeners();
    try {
      final ticket = await api.resourcesTicket(body: ResourceUploadRequestDto(classId: classId, subjectId: subjectId, contentType: file.contentType!, sizeBytes: file.bytes.length));
      await uploader.put(url: ticket.uploadUrl, headers: ticket.headers, bytes: file.bytes);
      await api.resourcesAdd(body: AddResourceDto(classId: classId, subjectId: subjectId, key: ticket.key, title: title.trim(), note: note.trim().isEmpty ? null : note.trim(), fileName: file.name));
      await onChanged?.call();
      return true;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
      return false;
    } on UploadFailed {
      problem = ResourceProblem.uploadFailed;
      return false;
    } finally {
      busy = false;
      if (!_disposed) notifyListeners();
    }
  }

  /// Set by the screen so tests can hand in a fake.
  UploadPort uploader = const HttpUploadPort();

  Future<bool> remove(String id) async {
    busy = true;
    problem = ResourceProblem.none;
    notifyListeners();
    try {
      await api.resourcesRemove(id: id);
      await store.replaceAllRecords(kResource, [
        for (final r in await store.records(kResource))
          if (r['id'] != id) (id: r['id'] as String, parentId: null as String?, json: r),
      ]);
      await onChanged?.call();
      return true;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
      return false;
    } finally {
      busy = false;
      if (!_disposed) notifyListeners();
    }
  }

  void clearProblem() {
    problem = ResourceProblem.none;
    notifyListeners();
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
