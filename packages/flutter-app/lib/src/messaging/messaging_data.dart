import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../today/today_data.dart' show kTeachingClass;

/// Conversations (P5-3d, ADR-0018): the threads, the messages of each (the parent id is the thread id), and the messages sent to a whole class.
const kThread = 'Thread';
const kMessage = 'Message';
const kBroadcast = 'Broadcast';

const messageMax = 1000;
const broadcastTitleMax = 120;
const broadcastBodyMax = 2000;

/// How many conversations keep their words on the phone, and how many sent class messages keep their counts.
const _threadsKept = 30;
const _broadcastsKept = 10;

Future<T?> _soft<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    if (e.status == 403 || e.status == 404) return null;
    throw failureOf(e);
  }
}

/// After the lists: the conversations with their messages, then the class messages (for a teacher the newest also get their counts).
List<PullTask> messagingPullTasks(OruApi api) => [
      PullTask(kThread, (store) async {
        final list = await _soft(api.messagesThreads);
        if (list == null) return;
        await store.replaceAllRecords(kThread, [for (final t in list.items) (id: t.id, parentId: null as String?, json: t.toJson())]);
        final sorted = [...list.items]..sort((a, b) => (b.lastMessageAt ?? '').compareTo(a.lastMessageAt ?? ''));
        for (final t in sorted.take(_threadsKept)) {
          final d = await _soft(() => api.messagesThread(id: t.id));
          if (d == null) continue;
          await store.replaceRecords(kMessage, parentId: t.id, records: [for (final m in d.messages) (id: m.id, json: m.toJson())]);
        }
      }),
      PullTask(kBroadcast, (store) async {
        final list = await _soft(api.broadcastsList);
        if (list == null) return;
        final rows = <PulledRecord>[];
        var detailed = 0;
        for (final b in list.items) {
          var json = b.toJson();
          // A teacher's list has no counts; the newest few are fetched whole so the counts are on the phone.
          if (b.students.isEmpty && b.read == null && detailed < _broadcastsKept) {
            final d = await _soft(() => api.broadcastsOne(id: b.id));
            if (d != null) {
              json = d.toJson();
              detailed++;
            }
          }
          rows.add((id: b.id, parentId: null as String?, json: json));
        }
        await store.replaceAllRecords(kBroadcast, rows);
      }),
    ];

/// One line in a conversation: a message the school has, or one still on this phone (saved, or refused for good).
class MessageRow {
  const MessageRow({required this.id, required this.mine, required this.body, required this.hidden, required this.canHide, required this.createdAt, this.pending = false, this.refusal, this.entryId});
  final String id;
  final bool mine;
  final String? body;
  final bool hidden;
  final bool canHide;
  final String createdAt;
  final bool pending;
  final String? refusal;
  final String? entryId;
}

/// Pure: the school's messages oldest first, then the ones still on the phone. A message that was sent shows once: the outbox entry id is its `clientId`, and a sent entry is gone from the outbox.
List<MessageRow> buildMessages({required List<Map<String, dynamic>> messages, required List<OutboxEntry> outbox, required String threadId}) {
  final server = [...messages]..sort((a, b) => (a['createdAt'] as String).compareTo(b['createdAt'] as String));
  return [
    for (final m in server)
      MessageRow(id: m['id'] as String, mine: m['mine'] == true, body: m['body'] as String?, hidden: m['hidden'] == true, canHide: m['mine'] == true && m['canHide'] == true, createdAt: m['createdAt'] as String),
    for (final o in outbox)
      if (o.kind == OutboxKinds.messageSend && o.body['threadId'] == threadId)
        MessageRow(
          id: o.id, mine: true, body: o.body['body'] as String, hidden: false, canHide: false, createdAt: '', pending: true, entryId: o.id,
          refusal: o.state == OutboxState.failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null,
        ),
  ];
}

/// One line in the list of conversations.
class ThreadRow {
  const ThreadRow({required this.id, required this.studentId, required this.student, required this.otherName, required this.otherKind, required this.lastMessageAt, required this.unread});
  final String id;
  final String studentId;
  final String student;
  final String otherName;
  final String otherKind;
  final String? lastMessageAt;
  final bool unread;
}

/// Pure: newest conversation first; one with an unread message shows as unread unless it was opened here since (a `thread.read` change is waiting).
List<ThreadRow> buildThreads({required List<Map<String, dynamic>> threads, required List<OutboxEntry> outbox}) {
  final opened = {for (final o in outbox) if (o.kind == OutboxKinds.threadRead) o.body['threadId'] as String};
  final rows = [
    for (final t in threads)
      ThreadRow(
        id: t['id'] as String,
        studentId: (t['student'] as Map<String, dynamic>)['id'] as String,
        student: (t['student'] as Map<String, dynamic>)['name'] as String,
        otherName: (t['other'] as Map<String, dynamic>)['name'] as String,
        otherKind: (t['other'] as Map<String, dynamic>)['kind'] as String,
        lastMessageAt: t['lastMessageAt'] as String?,
        unread: t['unread'] == true && !opened.contains(t['id']),
      ),
  ];
  rows.sort((a, b) => (b.lastMessageAt ?? '').compareTo(a.lastMessageAt ?? ''));
  return rows;
}

enum MessageProblem { none, empty, tooLong, needsNet, refused }

MessageProblem checkText(String text, int max) {
  final t = text.trim();
  if (t.isEmpty) return MessageProblem.empty;
  return t.length > max ? MessageProblem.tooLong : MessageProblem.none;
}

MessageProblem _problemOf(OruApiError e) => (e.code == 'NETWORK_ERROR' || e.code == 'TIMEOUT' || e.code == 'UPSTREAM_UNAVAILABLE') ? MessageProblem.needsNet : MessageProblem.refused;

/// The list of conversations, kept current from the phone's copy and the outbox.
class ThreadsController extends ChangeNotifier {
  ThreadsController(this.store) {
    _subs.add(store.watchRecords(kThread).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<ThreadRow>? threads;
  bool _disposed = false;

  int get unread => threads?.where((t) => t.unread).length ?? 0;

  Future<void> _refresh() async {
    final t = await store.records(kThread);
    final o = await store.all();
    if (_disposed) return;
    threads = buildThreads(threads: t, outbox: o);
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

/// One conversation. Writing is saved on the phone and sent once; opening it is told to the school when there is a connection; hiding and reporting need one.
class ConversationController extends ChangeNotifier {
  ConversationController(this.api, this.store, {required this.threadId}) {
    _subs.add(store.watchRecords(kMessage).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
    _opened();
  }

  final OruApi api;
  final OruLocalStore store;
  final String threadId;
  final _subs = <StreamSubscription<Object?>>[];
  List<MessageRow>? rows;
  MessageProblem problem = MessageProblem.none;
  bool reported = false;
  bool busy = false;
  bool _disposed = false;

  Future<void> _refresh() async {
    final m = await store.records(kMessage, parentId: threadId);
    final o = await store.all();
    if (_disposed) return;
    rows = buildMessages(messages: m, outbox: o, threadId: threadId);
    notifyListeners();
  }

  /// Opening a conversation marks it read: queued, so it also works with no connection.
  Future<void> _opened() async {
    final t = await store.record(kThread, threadId);
    if (t != null && t['unread'] == true) await store.enqueue(kind: OutboxKinds.threadRead, body: {'threadId': threadId});
  }

  /// Saved on the phone at once; the engine sends it once.
  Future<bool> send(String text) async {
    problem = checkText(text, messageMax);
    if (problem != MessageProblem.none) {
      notifyListeners();
      return false;
    }
    await store.enqueue(kind: OutboxKinds.messageSend, body: {'threadId': threadId, 'body': text.trim()});
    await _refresh();
    return true;
  }

  Future<void> dismiss(String entryId) async {
    await store.dismiss(entryId);
    await _refresh();
  }

  Future<bool> hide(String messageId) => _online(() => api.messagesHide(id: threadId, messageId: messageId), reload: true);

  Future<bool> report(String messageId, String note) async {
    final ok = await _online(() => api.messagesReport(id: threadId, messageId: messageId, body: ReportMessageDto(note: note.trim().isEmpty ? null : note.trim())));
    if (ok) {
      reported = true;
      notifyListeners();
    }
    return ok;
  }

  Future<bool> _online(Future<Object?> Function() call, {bool reload = false}) async {
    busy = true;
    problem = MessageProblem.none;
    reported = false;
    notifyListeners();
    try {
      await call();
      if (reload) {
        final d = await api.messagesThread(id: threadId);
        await store.replaceRecords(kMessage, parentId: threadId, records: [for (final m in d.messages) (id: m.id, json: m.toJson())]);
      }
      return true;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
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

/// Starting a conversation needs the school: who may be written to about a student, then the conversation itself.
class NewMessageController extends ChangeNotifier {
  NewMessageController(this.api, this.store);
  final OruApi api;
  final OruLocalStore store;
  List<ContactDto>? contacts;
  MessageProblem problem = MessageProblem.none;
  bool busy = false;

  Future<void> choose(String studentId) async {
    contacts = null;
    problem = MessageProblem.none;
    busy = true;
    notifyListeners();
    try {
      contacts = (await api.messagesContacts(studentId: studentId)).items;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// The id of the conversation (new or the one that already existed), or null if it could not be opened.
  Future<String?> start(String studentId, String otherUserId) async {
    busy = true;
    problem = MessageProblem.none;
    notifyListeners();
    try {
      final t = await api.messagesStart(body: StartThreadDto(studentId: studentId, otherUserId: otherUserId));
      await store.upsertRecords(kThread, [(id: t.id, parentId: null, json: t.toJson())]);
      return t.id;
    } on OruApiError catch (e) {
      problem = _problemOf(e);
      return null;
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}

/// One line in a list of class messages.
class BroadcastRow {
  const BroadcastRow({required this.id, required this.title, required this.body, required this.className, required this.sentAt, required this.sender, required this.students, required this.unread, required this.stats, this.pending = false, this.refusal, this.entryId});
  final String id;
  final String title;
  final String body;
  final String className;
  final String sentAt;
  final String sender;

  /// For a parent: their own children it was sent for.
  final List<({String id, String name})> students;
  final bool unread;

  /// For the sender, when the phone has them: `{targetStudents, reachedStudents, unreachable: [{id, name}], parents, readBy}`.
  final Map<String, dynamic>? stats;
  final bool pending;
  final String? refusal;
  final String? entryId;
}

/// Pure: the school's class messages newest first, with a teacher's own that are still on the phone on top.
List<BroadcastRow> buildBroadcasts({required List<Map<String, dynamic>> items, required List<OutboxEntry> outbox, required Map<String, String> classNames}) {
  final server = [
    for (final b in items)
      BroadcastRow(
        id: b['id'] as String,
        title: b['title'] as String,
        body: b['body'] as String,
        className: (b['class'] as Map<String, dynamic>)['name'] as String,
        sentAt: b['sentAt'] as String,
        sender: (b['sender'] as Map<String, dynamic>)['name'] as String,
        students: [for (final s in (b['students'] as List<dynamic>? ?? const [])) (id: (s as Map<String, dynamic>)['id'] as String, name: s['name'] as String)],
        unread: b['read'] == false,
        stats: b['stats'] as Map<String, dynamic>?,
      ),
  ]..sort((a, b) => b.sentAt.compareTo(a.sentAt));
  final local = [
    for (final o in outbox)
      if (o.kind == OutboxKinds.broadcastSend)
        BroadcastRow(
          id: o.id, title: o.body['title'] as String, body: o.body['body'] as String, className: classNames[o.body['classId']] ?? '', sentAt: '', sender: '', students: const [], unread: false, stats: null,
          pending: true, entryId: o.id, refusal: o.state == OutboxState.failed ? (o.lastErrorMessage ?? o.lastErrorCode) : null,
        ),
  ];
  return [...local, ...server];
}

/// The class messages a person sees: a parent's (read and reply), or a teacher's own (with who was reached).
class BroadcastsController extends ChangeNotifier {
  BroadcastsController(this.store) {
    _subs.add(store.watchRecords(kBroadcast).listen((_) => _refresh()));
    _subs.add(store.watchRecords(kTeachingClass).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<BroadcastRow>? rows;
  bool _disposed = false;

  int get unread => rows?.where((r) => r.unread).length ?? 0;

  Future<void> _refresh() async {
    final b = await store.records(kBroadcast);
    final classes = await store.records(kTeachingClass);
    final o = await store.all();
    if (_disposed) return;
    rows = buildBroadcasts(items: b, outbox: o, classNames: {for (final c in classes) c['id'] as String: c['name'] as String});
    notifyListeners();
  }

  /// A parent opening one tells the school (queued), and it stops showing as new at once.
  Future<void> opened(BroadcastRow r) async {
    if (!r.unread) return;
    await store.enqueue(kind: OutboxKinds.broadcastRead, body: {'id': r.id});
    final have = await store.record(kBroadcast, r.id);
    if (have != null) await store.upsertRecords(kBroadcast, [(id: r.id, parentId: null, json: {...have, 'read': true})]);
  }

  /// Saved on the phone at once; the engine sends it once.
  Future<MessageProblem> send({required String classId, required String title, required String body}) async {
    final t = checkText(title, broadcastTitleMax);
    if (t != MessageProblem.none) return t;
    final b = checkText(body, broadcastBodyMax);
    if (b != MessageProblem.none) return b;
    await store.enqueue(kind: OutboxKinds.broadcastSend, body: {'classId': classId, 'title': title.trim(), 'body': body.trim()});
    await _refresh();
    return MessageProblem.none;
  }

  Future<void> dismiss(String entryId) async {
    await store.dismiss(entryId);
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
