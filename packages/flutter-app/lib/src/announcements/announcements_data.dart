import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

const kAnnouncement = 'Announcement';

/// What the Announcements tab and Home read: every announcement the school has posted that is not withdrawn. The whole list is the
/// truth, so one withdrawn on the server disappears from the phone at the next pull.
List<PullTask> announcementsPullTasks(OruApi api) => [
      PullTask.list(kAnnouncement, () async {
        try {
          return [
            for (final a in (await api.announcementsList()).items)
              if (!a.withdrawn) (id: a.id, parentId: null as String?, json: a.toJson()),
          ];
        } on OruApiError catch (e) {
          throw failureOf(e);
        }
      }),
    ];

/// Newest first.
int newestFirst(Map<String, dynamic> a, Map<String, dynamic> b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String);
