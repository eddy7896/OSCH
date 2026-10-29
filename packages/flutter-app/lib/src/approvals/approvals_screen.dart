import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import 'approvals_data.dart';

/// The Principal's tab: leave requests waiting for a decision, Approve or Decline each. Needs a connection; the school decides who may.
class OruApprovalsScreen extends StatefulWidget {
  const OruApprovalsScreen({super.key, required this.services});
  final OruServices services;

  @override
  State<OruApprovalsScreen> createState() => _OruApprovalsScreenState();
}

class _OruApprovalsScreenState extends State<OruApprovalsScreen> {
  late final ApprovalsController _c = ApprovalsController(widget.services.api)..load();

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
          onRefresh: _c.load,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final items = _c.items;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobTabApprovals, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                if (_c.problem == ApprovalsProblem.offline) ...[
                  OruBanner(title: s.mobApprNeedsNet, tone: OruTone.warning, icon: OruIconName.cloudOff, action: OruButton(label: s.actionRetry, onPressed: _c.load)),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (_c.problem == ApprovalsProblem.refused) ...[
                  OruBanner(title: s.mobApprRefused, tone: OruTone.danger, icon: OruIconName.alert),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (items != null && items.isEmpty) OruEmptyState(title: s.mobTabApprovals, description: s.mobApprEmpty, icon: OruIconName.checkCircle),
                for (final r in items ?? const <Map<String, dynamic>>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        OruListRow(
                          title: s.mobApprLine((r['staff'] as Map<String, dynamic>)['name'] as String, (r['type'] as Map<String, dynamic>)['name'] as String),
                          subtitle: '${s.mobLvDates(dateWords(context, r['startDate'] as String), dateWords(context, r['endDate'] as String))} · ${s.mobLvDays('\u2066${r['days']}\u2069')}',
                          leading: const OruIcon(OruIconName.leave, color: OruColors.primaryText),
                        ),
                        if ((r['reason'] as String?)?.isNotEmpty ?? false)
                          Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4), child: Text(r['reason'] as String, style: text.bodyMedium)),
                        Padding(
                          padding: const EdgeInsets.all(OruSpacing.space3),
                          child: Row(children: [
                            Expanded(child: OruButton(label: s.mobApprApprove, variant: OruButtonVariant.primary, icon: OruIconName.check, onPressed: _c.busyId == null ? () => _c.approve(r['id'] as String) : null)),
                            const SizedBox(width: OruSpacing.space2),
                            Expanded(child: OruButton(label: s.mobApprReject, icon: OruIconName.x, onPressed: _c.busyId == null ? () => _c.reject(r['id'] as String) : null)),
                          ]),
                        ),
                      ]),
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
