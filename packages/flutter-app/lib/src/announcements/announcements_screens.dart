import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services.dart';
import '../sync_pill.dart';
import 'announcements_data.dart';

String dateWords(BuildContext context, String iso) {
  try {
    return DateFormat.yMMMd(Localizations.localeOf(context).toString()).format(DateTime.parse(iso).toLocal());
  } catch (_) {
    return iso;
  }
}

/// Announcements, read only, newest first. Works from the phone's copy.
class OruAnnouncementsScreen extends StatelessWidget {
  const OruAnnouncementsScreen({super.key, required this.services});
  final OruServices services;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: services.coordinator.syncNow,
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: services.store.watchRecords(kAnnouncement),
            builder: (context, snap) {
              final items = [...?snap.data]..sort(newestFirst);
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.navAnnouncements, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: services),
                const SizedBox(height: OruSpacing.space4),
                if (snap.hasData && items.isEmpty) OruEmptyState(title: s.navAnnouncements, description: s.mobAnnEmpty, icon: OruIconName.message),
                for (final a in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: a['title'] as String,
                        subtitle: '${dateWords(context, a['createdAt'] as String)} · ${s.mobAnnBy((a['author'] as Map<String, dynamic>)['name'] as String)}',
                        leading: const OruIcon(OruIconName.message, color: OruColors.primaryText),
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruAnnouncementScreen(announcement: a))),
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

class OruAnnouncementScreen extends StatelessWidget {
  const OruAnnouncementScreen({super.key, required this.announcement});
  final Map<String, dynamic> announcement;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.navAnnouncements)),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Text(announcement['title'] as String, style: text.titleLarge),
          const SizedBox(height: OruSpacing.space1),
          Text('${dateWords(context, announcement['createdAt'] as String)} · ${s.mobAnnBy((announcement['author'] as Map<String, dynamic>)['name'] as String)}', style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
          const SizedBox(height: OruSpacing.space4),
          Text(announcement['body'] as String, style: text.bodyLarge),
        ]),
      ),
    );
  }
}
