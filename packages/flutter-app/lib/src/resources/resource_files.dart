import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

/// Keeps a downloaded worksheet on the phone so it opens again with no connection, and opens it in the phone's own viewer.
/// A port, so tests need no phone.
abstract class ResourceFilesPort {
  /// The path of the copy on the phone, or null if the file has not been downloaded.
  Future<String?> cachedPath(String id, String fileName);

  /// Downloads from the short-lived address the school gave and keeps the file. Throws [DownloadFailed].
  Future<String> fetchAndKeep(String id, String fileName, String url);

  /// False when the phone has nothing that can open this kind of file.
  Future<bool> open(String path);

  /// Deletes the copies of every resource not in [keepIds] (the school removed it, or its year ended).
  Future<void> purgeExcept(Set<String> keepIds);
}

class DownloadFailed implements Exception {
  const DownloadFailed();
}

/// The files live in the app's own folder, named `<id>__<name>`, so a name can never reach outside it.
class DeviceResourceFiles implements ResourceFilesPort {
  const DeviceResourceFiles({this.timeout = const Duration(minutes: 3)});
  final Duration timeout;

  static String _safe(String name) => name.replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1f]'), '_');

  Future<Directory> _dir() async {
    final base = await getApplicationDocumentsDirectory();
    final d = Directory('${base.path}${Platform.pathSeparator}resources');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<File> _file(String id, String fileName) async => File('${(await _dir()).path}${Platform.pathSeparator}${id}__${_safe(fileName)}');

  @override
  Future<String?> cachedPath(String id, String fileName) async {
    try {
      final f = await _file(id, fileName);
      return await f.exists() ? f.path : null;
    } catch (_) {
      return null; // the phone's folder could not be read: the file counts as not downloaded
    }
  }

  @override
  Future<String> fetchAndKeep(String id, String fileName, String url) async {
    try {
      final r = await http.get(Uri.parse(url)).timeout(timeout);
      if (r.statusCode < 200 || r.statusCode >= 300 || r.bodyBytes.isEmpty) throw const DownloadFailed();
      final f = await _file(id, fileName);
      // written under a temporary name first, so a download cut short is never mistaken for the file
      final tmp = File('${f.path}.part');
      await tmp.writeAsBytes(r.bodyBytes, flush: true);
      await tmp.rename(f.path);
      return f.path;
    } on DownloadFailed {
      rethrow;
    } catch (_) {
      throw const DownloadFailed();
    }
  }

  @override
  Future<bool> open(String path) async {
    final r = await OpenFilex.open(path);
    return r.type == ResultType.done;
  }

  @override
  Future<void> purgeExcept(Set<String> keepIds) async {
    try {
      final d = await _dir();
      await for (final e in d.list()) {
        if (e is! File) continue;
        final id = e.uri.pathSegments.last.split('__').first;
        if (!keepIds.contains(id)) await e.delete();
      }
    } catch (_) {
      // best effort: a copy that stays costs space, never a crash
    }
  }
}
