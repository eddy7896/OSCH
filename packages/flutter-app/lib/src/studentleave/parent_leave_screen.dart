import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart' show isoDate;
import 'parent_leave_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

/// The Parent app's Leave tab: the requests for the children (the ones still on the phone first), Ask, and Cancel while a request is waiting.
class OruParentLeaveScreen extends StatefulWidget {
  const OruParentLeaveScreen({super.key, required this.services, this.now});
  final OruServices services;
  final DateTime Function()? now;

  @override
  State<OruParentLeaveScreen> createState() => _OruParentLeaveScreenState();
}

class _OruParentLeaveScreenState extends State<OruParentLeaveScreen> {
  late final ParentLeaveController _c = ParentLeaveController(widget.services.store);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  String _status(OruStrings s, String status) => switch (status) {
        'APPROVED' => s.mobSlApproved,
        'DECLINED' => s.mobSlDeclined,
        'CANCELLED' => s.mobSlCancelled,
        'SAVED' => s.mobLvSavedNotSent,
        'FAILED' => s.mobLvRefused,
        _ => s.mobSlWaiting,
      };

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
              final rows = _c.rows;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobTabLeave, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                OruButton(
                  label: s.mobPlAsk,
                  variant: OruButtonVariant.primary,
                  block: true,
                  icon: OruIconName.plus,
                  onPressed: _c.children.isEmpty ? null : () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruParentLeaveFormScreen(controller: _c, now: widget.now))),
                ),
                const SizedBox(height: OruSpacing.space4),
                if (rows != null && rows.isEmpty) OruEmptyState(title: s.mobTabLeave, description: s.mobPlNone, icon: OruIconName.leave),
                for (final r in rows ?? const <ParentLeaveRow>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        OruListRow(
                          title: r.child,
                          subtitle: [s.mobLvDates(_isolate(dateWords(context, r.startDate)), _isolate(dateWords(context, r.endDate))), if (r.half) s.mobSlHalf].join(' · '),
                          leading: OruIcon(r.status == 'SAVED' ? OruIconName.device : (r.status == 'FAILED' ? OruIconName.alert : OruIconName.leave), color: r.status == 'FAILED' ? OruColors.dangerFg : OruColors.primaryText),
                        ),
                        Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4, bottom: OruSpacing.space2), child: Text(_status(s, r.status), style: text.labelLarge)),
                        if (r.reason.isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4, bottom: OruSpacing.space2), child: Text(r.reason, style: text.bodyMedium)),
                        if ((r.note ?? '').isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4, bottom: OruSpacing.space2), child: Text(s.mobPlNote(r.note!), style: text.bodyMedium)),
                        if (r.cancelQueued) Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: OruBanner(title: s.mobPlCancelSaved, tone: OruTone.info, icon: OruIconName.cloudOff)),
                        if (r.refusal != null)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: OruBanner(title: s.mobPlRefused, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.refusedEntryId!))),
                          ),
                        if (r.canCancel) Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: OruButton(label: s.mobPlCancel, icon: OruIconName.x, onPressed: () => _c.cancel(r.id))),
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

/// The form: which child, first and last day, half a day for a single day, a short reason. Send saves on the phone and returns at once.
class OruParentLeaveFormScreen extends StatefulWidget {
  const OruParentLeaveFormScreen({super.key, required this.controller, this.now});
  final ParentLeaveController controller;
  final DateTime Function()? now;

  @override
  State<OruParentLeaveFormScreen> createState() => _OruParentLeaveFormScreenState();
}

class _OruParentLeaveFormScreenState extends State<OruParentLeaveFormScreen> {
  late DateTime _start = _today();
  late DateTime _end = _today();
  late String? _childId = widget.controller.children.length == 1 ? widget.controller.children.single['id'] as String : null;
  bool _half = false;
  String _halfPart = 'MORNING';
  final _reason = TextEditingController();
  bool _tried = false;

  DateTime _today() {
    final n = (widget.now ?? DateTime.now)();
    return DateTime(n.year, n.month, n.day);
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pick(bool start) async {
    final first = _today().subtract(const Duration(days: 7));
    final d = await showDatePicker(context: context, initialDate: start ? _start : _end, firstDate: first, lastDate: _today().add(const Duration(days: 365)));
    if (d == null) return;
    setState(() {
      if (start) {
        _start = d;
        if (_end.isBefore(d)) _end = d;
      } else {
        _end = d;
      }
    });
  }

  Future<void> _send() async {
    if (_childId == null || _end.isBefore(_start) || _reason.text.trim().isEmpty) {
      setState(() => _tried = true);
      return;
    }
    await widget.controller.ask(parentLeaveBody(studentId: _childId!, start: isoDate(_start), end: isoDate(_end), half: _half ? _halfPart : null, reason: _reason.text));
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final a = isoDate(_start);
    final b = isoDate(_end);
    return Scaffold(
      appBar: AppBar(title: Text(s.mobPlFormTitle)),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Text(s.mobPlChild, style: text.titleMedium),
          const SizedBox(height: OruSpacing.space2),
          for (final k in widget.controller.children)
            Padding(
              padding: const EdgeInsets.only(bottom: OruSpacing.space2),
              child: OruCard(child: OruCheckbox(label: k['name'] as String, value: _childId == k['id'], onChanged: (_) => setState(() => _childId = k['id'] as String))),
            ),
          if (_tried && _childId == null) Text(s.mobPlErrChild, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
          const SizedBox(height: OruSpacing.space3),
          OruCard(child: OruListRow(title: s.mobLvStart, subtitle: dateWords(context, a), leading: const OruIcon(OruIconName.calendar, color: OruColors.primaryText), onPressed: () => _pick(true))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobLvEnd, subtitle: dateWords(context, b), leading: const OruIcon(OruIconName.calendar, color: OruColors.primaryText), onPressed: () => _pick(false))),
          if (_tried && _end.isBefore(_start)) Text(s.mobLvErrEnd, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
          if (a == b) ...[
            const SizedBox(height: OruSpacing.space3),
            OruCheckbox(label: s.mobLvHalf, value: _half, onChanged: (v) => setState(() => _half = v)),
            if (_half)
              OruSegmentedControl(
                label: s.mobLvHalf,
                value: _halfPart,
                options: [OruSegment(value: 'MORNING', label: s.mobLvMorning), OruSegment(value: 'AFTERNOON', label: s.mobLvAfternoon)],
                onChanged: (v) => setState(() => _halfPart = v),
              ),
          ],
          const SizedBox(height: OruSpacing.space3),
          OruTextField(label: s.mobLvReason, controller: _reason, multiline: true, error: _tried && _reason.text.trim().isEmpty ? s.mobPlErrReason : null),
          const SizedBox(height: OruSpacing.space4),
          OruButton(label: s.mobLvSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: _send),
        ]),
      ),
    );
  }
}
