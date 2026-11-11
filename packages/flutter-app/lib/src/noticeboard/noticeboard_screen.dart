import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'noticeboard_data.dart';

String categoryLabel(OruStrings s, String category) => switch (category) {
      'HOLIDAY' => s.nbdCatHOLIDAY,
      'EXAM' => s.nbdCatEXAM,
      'EVENT' => s.nbdCatEVENT,
      'FEES' => s.nbdCatFEES,
      'TRANSPORT' => s.nbdCatTRANSPORT,
      _ => s.nbdCatGENERAL,
    };

/// The parents' Notice board, read only. Works from the phone's copy; pinned posts first.
class OruNoticeBoardScreen extends StatelessWidget {
  const OruNoticeBoardScreen({super.key, required this.services, this.now});
  final OruServices services;
  final DateTime Function()? now;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.navNoticeBoard)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: services.coordinator.syncNow,
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: services.store.watchRecords(kNoticePost),
            builder: (context, snap) {
              final items = visibleNotices([...?snap.data], (now ?? DateTime.now)());
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: services),
                const SizedBox(height: OruSpacing.space4),
                if (snap.hasData && items.isEmpty) OruEmptyState(title: s.navNoticeBoard, description: s.mobNbEmpty, icon: OruIconName.message),
                for (final n in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: n['title'] as String,
                        subtitle: [
                          if (n['pinned'] == true) s.nbdPinnedTag,
                          categoryLabel(s, n['category'] as String),
                          dateWords(context, n['createdAt'] as String),
                        ].join(' · '),
                        leading: OruIcon(OruIconName.message, color: OruColors.primaryText),
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruNoticeScreen(notice: n))),
                      ),
                    ),
                  ),
              ]);
            },
          ),
        ),
      ),
    );
  }
}

class OruNoticeScreen extends StatelessWidget {
  const OruNoticeScreen({super.key, required this.notice});
  final Map<String, dynamic> notice;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final author = (notice['author'] as Map<String, dynamic>)['name'] as String;
    return Scaffold(
      appBar: AppBar(title: Text(s.navNoticeBoard)),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Text(notice['title'] as String, style: text.titleLarge),
          const SizedBox(height: OruSpacing.space1),
          Text('${categoryLabel(s, notice['category'] as String)} · ${dateWords(context, notice['createdAt'] as String)} · ${s.mobAnnBy(author)}', style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
          const SizedBox(height: OruSpacing.space4),
          Text(notice['body'] as String, style: text.bodyLarge),
        ]),
      ),
    );
  }
}
