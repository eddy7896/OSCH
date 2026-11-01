import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'resources_data.dart' show kResource;

/// Comments under a resource, kept per resource (the parent id is the resource id).
const kComment = 'Comment';

/// A parent may change their own comment for this long after posting; the school's clock decides, the phone's clock only decides whether to show the buttons.
const commentWindow = Duration(minutes: 5);
const commentMax = 500;

/// After the resources list: the comments of the 30 newest resources. A resource whose comments the person may not read (a colleague's, for a teacher) is skipped.
PullTask commentsPullTask(OruApi api) => PullTask(kComment, (store) async {
      final resources = await store.records(kResource);
      resources.sort((a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String));
      for (final r in resources.take(30)) {
        final id = r['id'] as String;
        try {
          final list = await api.commentsList(id: id);
          await store.replaceRecords(kComment, parentId: id, records: [for (final c in list.items) (id: c.id, json: c.toJson())]);
        } on OruApiError catch (e) {
          if (e.status == 403 || e.status == 404) continue;
          throw failureOf(e);
        }
      }
    });

/// One line in the thread: a comment the school has, or one still on this phone (saved, or refused for good).
class CommentRow {
  const CommentRow({required this.id, required this.kind, required this.name, required this.body, required this.hidden, required this.edited, required this.mine, required this.canChange, required this.replyToId, required this.createdAt, this.pending = false, this.refusal, this.entryId});
  final String id;

  /// PARENT, TEACHER or ADMIN.
  final String kind;
  final String name;
  final String? body;
  final bool hidden;
  final bool edited;
  final bool mine;
  final bool canChange;
  final String? replyToId;
  final String createdAt;
  final bool pending;
  final String? refusal;
  final String? entryId;
}

/// Pure: the school's comments oldest first, then the ones still on the phone. [now] is the phone's clock, used only to stop offering Edit and Delete after the window.
List<CommentRow> buildThread({required List<Map<String, dynamic>> comments, required List<OutboxEntry> outbox, required String resourceId, required DateTime now}) {
  final server = [...comments]..sort((a, b) => (a['createdAt'] as String).compareTo(b['createdAt'] as String));
  final rows = <CommentRow>[
    for (final c in server)
      () {
        final a = c['author'] as Map<String, dynamic>;
        final mine = a['mine'] == true;
        final created = DateTime.tryParse(c['createdAt'] as String) ?? now;
        return CommentRow(
          id: c['id'] as String,
          kind: a['kind'] as String,
          name: a['name'] as String,
          body: c['body'] as String?,
          hidden: c['hidden'] == true,
          edited: c['edited'] == true,
          mine: mine,
          canChange: mine && c['canChange'] == true && now.difference(created) < commentWindow,
          replyToId: c['replyToId'] as String?,
          createdAt: c['createdAt'] as String,
        );
      }(),
  ];
  for (final o in outbox) {
    if (o.kind != OutboxKinds.resourceCommentPost || o.body['resourceId'] != resourceId) continue;
    final failed = o.state == OutboxState.failed;
    rows.add(CommentRow(
      id: o.id, kind: '', name: '', body: o.body['body'] as String, hidden: false, edited: false, mine: true, canChange: false, replyToId: o.body['replyToId'] as String?,
      createdAt: '', pending: true, refusal: failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null, entryId: o.id,
    ));
  }
  return rows;
}

enum CommentProblem { none, needsNet, windowClosed, alreadyHidden, refused, tooLong, empty }

/// Keeps one resource's thread current from the phone's copy and the outbox. Posting is saved on the phone and sent once; editing, deleting and hiding need a connection.
class CommentsController extends ChangeNotifier {
  CommentsController(this.api, this.store, {required this.resourceId, DateTime Function()? now}) : _now = now ?? DateTime.now {
    _subs.add(store.watchRecords(kComment).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruApi api;
  final OruLocalStore store;
  final String resourceId;
  final DateTime Function() _now;
  final _subs = <StreamSubscription<Object?>>[];
  List<CommentRow>? thread;
  CommentProblem problem = CommentProblem.none;
  bool busy = false;
  bool _disposed = false;

  Future<void> _refresh() async {
    final c = await store.records(kComment, parentId: resourceId);
    final o = await store.all();
    if (_disposed) return;
    thread = buildThread(comments: c, outbox: o, resourceId: resourceId, now: _now());
    notifyListeners();
  }

  CommentProblem check(String text) {
    final t = text.trim();
    if (t.isEmpty) return CommentProblem.empty;
    if (t.length > commentMax) return CommentProblem.tooLong;
    return CommentProblem.none;
  }

  /// Saved on the phone at once; the engine sends it once (the entry id is its `clientId`).
  Future<bool> post(String text, {String? replyToId}) async {
    problem = check(text);
    if (problem != CommentProblem.none) {
      notifyListeners();
      return false;
    }
    await store.enqueue(kind: OutboxKinds.resourceCommentPost, body: {'resourceId': resourceId, 'body': text.trim(), 'replyToId': ?replyToId});
    await _refresh();
    return true;
  }

  Future<void> dismiss(String entryId) async {
    await store.dismiss(entryId);
    await _refresh();
  }

  Future<bool> edit(String id, String text) => _online(() => api.commentsEdit(id: resourceId, commentId: id, body: EditCommentDto(body: text.trim())), check: check(text));
  Future<bool> remove(String id) => _online(() => api.commentsRemove(id: resourceId, commentId: id));
  Future<bool> hide(String id) => _online(() => api.commentsHide(id: resourceId, commentId: id));

  Future<bool> _online(Future<Object?> Function() call, {CommentProblem check = CommentProblem.none}) async {
    if (check != CommentProblem.none) {
      problem = check;
      notifyListeners();
      return false;
    }
    busy = true;
    problem = CommentProblem.none;
    notifyListeners();
    try {
      await call();
      final list = await api.commentsList(id: resourceId);
      await store.replaceRecords(kComment, parentId: resourceId, records: [for (final c in list.items) (id: c.id, json: c.toJson())]);
      return true;
    } on OruApiError catch (e) {
      if (e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT' || e.code == 'UPSTREAM_UNAVAILABLE') {
        problem = CommentProblem.needsNet;
      } else if (e.status == 409) {
        final closed = e.details.any((d) => d.rule == 'editWindowClosed');
        problem = closed ? CommentProblem.windowClosed : CommentProblem.alreadyHidden;
      } else {
        problem = CommentProblem.refused;
      }
      return false;
    } finally {
      busy = false;
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
