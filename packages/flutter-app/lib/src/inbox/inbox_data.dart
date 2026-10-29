import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

const kNotice = 'Notice';

/// The person's notifications, in their language as the gateway writes them (the 200 newest). The whole list replaces the phone's copy,
/// so a notice the school removed goes too; reading offline works from this copy.
List<PullTask> inboxPullTasks(OruApi api) => [
      PullTask.list(kNotice, () async {
        try {
          final r = await api.notificationsList(limit: 200);
          return [for (final n in r.items) (id: n.id, parentId: null as String?, json: n.toJson())];
        } on OruApiError catch (e) {
          throw failureOf(e);
        }
      }),
    ];

int newestFirstNotice(Map<String, dynamic> a, Map<String, dynamic> b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String);

/// A notice counts as read when the school says so or when a "read" is waiting on this phone.
bool isRead(Map<String, dynamic> notice, List<OutboxEntry> outbox) =>
    notice['read'] == true || outbox.any((o) => o.kind == 'notice.read' && o.body['noticeId'] == notice['id'] && o.state != OutboxState.failed);

/// Marking a notice read is saved on the phone first (it shows read at once) and sent when it can be. The school may already have it read
/// (read on another phone): marking twice is harmless.
Future<void> markNoticeRead(OruLocalStore store, String noticeId) async {
  final outbox = await store.all();
  if (outbox.any((o) => o.kind == 'notice.read' && o.body['noticeId'] == noticeId && o.state != OutboxState.failed)) return;
  await store.enqueue(kind: 'notice.read', body: {'noticeId': noticeId});
}

class InboxItem {
  const InboxItem(this.notice, this.read);
  final Map<String, dynamic> notice;
  final bool read;
}

/// The notices on the phone, newest first, with what is read; and how many are unread. Reads only the phone.
class InboxController extends ChangeNotifier {
  InboxController(this.store) {
    _subs.add(store.watchRecords(kNotice).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final _subs = <StreamSubscription<Object?>>[];
  List<InboxItem>? items;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  int get unread => items?.where((i) => !i.read).length ?? 0;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final outbox = await store.all();
        final list = [
          for (final n in (await store.records(kNotice))..sort(newestFirstNotice)) InboxItem(n, isRead(n, outbox)),
        ];
        if (_disposed) return;
        items = list;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  Future<void> open(InboxItem i) async {
    if (!i.read) await markNoticeRead(store, i.notice['id'] as String);
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
