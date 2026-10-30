import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'studentleave_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

/// "Student leave": parents' requests for their children, for the class teacher (and the Academic admin). Works from the phone's copy;
/// a decision is saved on the phone and sent when there is a connection.
class OruStudentLeaveScreen extends StatefulWidget {
  const OruStudentLeaveScreen({super.key, required this.services});
  final OruServices services;

  @override
  State<OruStudentLeaveScreen> createState() => _OruStudentLeaveScreenState();
}

class _OruStudentLeaveScreenState extends State<OruStudentLeaveScreen> {
  late final StudentLeaveController _c = StudentLeaveController(widget.services.store);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  String _statusLabel(OruStrings s, String status) => switch (status) {
        'APPROVED' => s.mobSlApproved,
        'DECLINED' => s.mobSlDeclined,
        'CANCELLED' => s.mobSlCancelled,
        _ => s.mobSlWaiting,
      };

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobSlTitle)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final rows = _c.rows;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                OruSegmentedControl(
                  label: s.mobSlTitle,
                  value: _c.waitingOnly ? 'waiting' : 'all',
                  options: [OruSegment(value: 'waiting', label: s.mobSlWaiting), OruSegment(value: 'all', label: s.mobSlAll)],
                  onChanged: (v) => _c.showWaitingOnly(v == 'waiting'),
                ),
                const SizedBox(height: OruSpacing.space3),
                if (rows != null && rows.isEmpty) OruEmptyState(title: s.mobSlTitle, description: _c.waitingOnly ? s.mobSlEmptyWaiting : s.mobSlEmptyAll, icon: OruIconName.checkCircle),
                for (final r in rows ?? const <StudentLeaveRow>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        OruListRow(
                          title: [r.studentName, if (r.className != null) r.className!].join(' · '),
                          subtitle: [
                            s.mobLvDates(_isolate(dateWords(context, r.startDate)), _isolate(dateWords(context, r.endDate))),
                            if (r.half) s.mobSlHalf,
                            s.mobSlBy(r.requestedBy),
                          ].join(' · '),
                          leading: const OruIcon(OruIconName.leave, color: OruColors.primaryText),
                          trailing: r.status == 'PENDING' ? null : Text(_statusLabel(s, r.status), style: text.labelLarge),
                        ),
                        if (r.reason.isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4), child: Text(r.reason, style: text.bodyMedium)),
                        if (r.queued != null)
                          Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: OruBanner(title: s.mobSlSaved, tone: OruTone.info, icon: OruIconName.cloudOff)),
                        if (r.refusal != null)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: OruBanner(title: s.mobSlRefused, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.refusedEntryId!))),
                          ),
                        if (r.open)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: Row(children: [
                              Expanded(child: OruButton(label: s.mobApprApprove, variant: OruButtonVariant.primary, icon: OruIconName.check, onPressed: () => _c.decide(r.id, approve: true))),
                              const SizedBox(width: OruSpacing.space2),
                              Expanded(child: OruButton(label: s.mobApprReject, icon: OruIconName.x, onPressed: () => _c.decide(r.id, approve: false))),
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
