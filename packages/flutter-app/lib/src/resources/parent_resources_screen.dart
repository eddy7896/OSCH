import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'parent_resources.dart';
import 'resource_files.dart';

String _firstName(String full) => full.split(' ').first;

/// The Parent app's Resources tab: the worksheets and workbooks the teachers shared with the child's class, by subject. Works from the phone's copy; a file needs a connection the first time it is opened.
class OruParentResourcesScreen extends StatefulWidget {
  const OruParentResourcesScreen({super.key, required this.services, this.files = const DeviceResourceFiles()});
  final OruServices services;
  final ResourceFilesPort files;

  @override
  State<OruParentResourcesScreen> createState() => _OruParentResourcesScreenState();
}

class _OruParentResourcesScreenState extends State<OruParentResourcesScreen> {
  late final ParentResourcesController _c = ParentResourcesController(widget.services.api, widget.services.store, widget.files);

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
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final kids = _c.children;
              final child = _c.selected;
              final groups = _c.groups;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobRsTitle, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (kids != null && kids.length > 1) ...[
                  OruSegmentedControl(label: s.mobParentChoose, value: (child?['id'] as String?) ?? '', options: [for (final k in kids) OruSegment(value: k['id'] as String, label: _firstName(k['name'] as String))], onChanged: _c.select),
                  const SizedBox(height: OruSpacing.space4),
                ],
                if (_c.problem != OpenProblem.none) ...[
                  OruBanner(
                    title: switch (_c.problem) {
                      OpenProblem.needsNet => s.mobRsNeedsNetOpen,
                      OpenProblem.noViewer => s.mobRsNoViewer,
                      _ => s.mobRsOpenFailed,
                    },
                    tone: _c.problem == OpenProblem.needsNet ? OruTone.warning : OruTone.danger,
                    icon: _c.problem == OpenProblem.needsNet ? OruIconName.cloudOff : OruIconName.alert,
                  ),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (child != null && groups.isEmpty) OruEmptyState(title: s.mobRsTitle, description: s.mobRsParentNone(_firstName(child['name'] as String)), icon: OruIconName.book),
                for (final g in groups) ...[
                  Text(g.subject, style: text.titleMedium),
                  const SizedBox(height: OruSpacing.space2),
                  for (final r in g.items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          OruListRow(
                            title: r['title'] as String,
                            subtitle: [(r['uploadedBy'] as Map<String, dynamic>)['name'] as String, dateWords(context, r['createdAt'] as String), if (_c.kept.contains(r['id'])) s.mobRsKept].join(' · '),
                            leading: const OruIcon(OruIconName.book, color: OruColors.primaryText),
                          ),
                          if (((r['note'] as String?) ?? '').isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4, bottom: OruSpacing.space2), child: Text(r['note'] as String, style: text.bodyMedium)),
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: OruButton(label: _c.openingId == r['id'] ? s.mobRsOpening : s.mobRsOpen, icon: OruIconName.chevronRight, onPressed: _c.openingId == null ? () => _c.open(r) : null),
                          ),
                        ]),
                      ),
                    ),
                  const SizedBox(height: OruSpacing.space3),
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }
}
