import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'inbox_data.dart';

/// The person's notifications, newest first. Reads from the phone, so it works with no connection; unread ones are marked, and opening
/// one marks it read (saved on the phone, sent when it can be).
class OruInboxScreen extends StatefulWidget {
  const OruInboxScreen({super.key, required this.services});
  final OruServices services;

  @override
  State<OruInboxScreen> createState() => _OruInboxScreenState();
}

class _OruInboxScreenState extends State<OruInboxScreen> {
  late final InboxController _c = InboxController(widget.services.store);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobMoreInbox)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final items = _c.items;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                if (_c.unread > 0) Text(s.mobInboxUnread('${_c.unread}'), style: text.titleMedium),
                const SizedBox(height: OruSpacing.space2),
                if (items != null && items.isEmpty) OruEmptyState(title: s.mobMoreInbox, description: s.mobInboxEmpty, icon: OruIconName.bell),
                for (final i in items ?? const <InboxItem>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: i.notice['title'] as String,
                        subtitle: '${i.notice['body']}\n${dateWords(context, i.notice['createdAt'] as String)}',
                        leading: OruIcon(i.read ? OruIconName.checkCircle : OruIconName.bell, color: i.read ? OruColors.textMuted : OruColors.primaryText),
                        onPressed: () => _c.open(i),
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
