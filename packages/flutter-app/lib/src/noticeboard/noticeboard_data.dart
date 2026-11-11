import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

const kNoticePost = 'NoticePost';

/// What the parents' Notice board reads: the posts the school has made for this parent's children that are live now. The server sends only
/// those, and the whole list is the truth, so a post withdrawn or expired on the server disappears from the phone at the next pull.
List<PullTask> noticeBoardPullTasks(OruApi api) => [
      PullTask.list(kNoticePost, () async {
        try {
          return [
            for (final n in (await api.noticeBoardList()).items)
              (id: n.id, parentId: null as String?, json: n.toJson()),
          ];
        } on OruApiError catch (e) {
          throw failureOf(e);
        }
      }),
    ];

/// The posts to show: one whose end time has passed while the phone was offline is dropped here, since the server cannot tell the phone.
/// Pinned first, then the newest.
List<Map<String, dynamic>> visibleNotices(Iterable<Map<String, dynamic>> all, DateTime now) {
  final out = [
    for (final n in all)
      if (!_ended(n, now)) n,
  ];
  out.sort((a, b) {
    final p = ((b['pinned'] as bool?) == true ? 1 : 0) - ((a['pinned'] as bool?) == true ? 1 : 0);
    if (p != 0) return p;
    return (b['createdAt'] as String).compareTo(a['createdAt'] as String);
  });
  return out;
}

bool _ended(Map<String, dynamic> n, DateTime now) {
  final e = n['expiresAt'] as String?;
  if (e == null) return false;
  final t = DateTime.tryParse(e);
  return t != null && !t.isAfter(now);
}
