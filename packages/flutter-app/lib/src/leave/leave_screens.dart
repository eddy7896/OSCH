import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart';
import 'leave_data.dart';
import 'leave_model.dart';

String _isolate(String text) => '\u2066$text\u2069';

String _dateWords(BuildContext context, String iso) {
  try {
    return DateFormat.yMMMd(Localizations.localeOf(context).toString()).format(DateTime.parse(iso));
  } catch (_) {
    return iso;
  }
}

String _statusText(OruStrings s, LeaveStatus st) => switch (st) {
      LeaveStatus.pending => s.mobLvStatusPending,
      LeaveStatus.approved => s.mobLvStatusApproved,
      LeaveStatus.rejected => s.mobLvStatusRejected,
      LeaveStatus.cancelled => s.mobLvStatusCancelled,
      LeaveStatus.saved => s.mobLvSavedNotSent,
      LeaveStatus.failed => s.mobLvRefused,
    };

/// The Leave tab: what is left of each kind, her requests (including the ones still on the phone) and the button to ask.
class OruLeaveScreen extends StatefulWidget {
  const OruLeaveScreen({super.key, required this.services, this.now});
  final OruServices services;
  final DateTime Function()? now;

  @override
  State<OruLeaveScreen> createState() => _OruLeaveScreenState();
}

class _OruLeaveScreenState extends State<OruLeaveScreen> {
  late final LeaveController _c = LeaveController(widget.services.store);

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
              final v = _c.view;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobTabLeave, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                OruButton(
                  label: s.mobLvAsk,
                  variant: OruButtonVariant.primary,
                  block: true,
                  icon: OruIconName.plus,
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruLeaveFormScreen(controller: _c, now: widget.now))),
                ),
                const SizedBox(height: OruSpacing.space4),
                if (v != null && v.balances.isNotEmpty) ...[
                  Text(s.mobLvBalances, style: text.titleMedium),
                  const SizedBox(height: OruSpacing.space2),
                  OruCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      for (final b in v.balances)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: OruSpacing.space1),
                          child: Text(b.recorded ? s.mobLvBalanceLine(b.type, _isolate(b.remaining), _isolate(b.allowed)) : s.mobLvBalanceUnset(b.type), style: text.bodyMedium),
                        ),
                    ]),
                  ),
                  const SizedBox(height: OruSpacing.space4),
                ],
                Text(s.mobLvRequests, style: text.titleMedium),
                const SizedBox(height: OruSpacing.space2),
                if (v == null)
                  const SizedBox.shrink()
                else if (v.rows.isEmpty)
                  OruEmptyState(title: s.mobLvRequests, description: s.mobLvNone, icon: OruIconName.leave)
                else
                  for (final r in v.rows)
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          OruListRow(
                            title: r.type,
                            subtitle: s.mobLvDates(_dateWords(context, r.startDate), _dateWords(context, r.endDate)) + (r.days == null ? '' : ' · ${s.mobLvDays(_isolate(r.days!))}'),
                            leading: OruIcon(r.status == LeaveStatus.saved ? OruIconName.device : (r.status == LeaveStatus.failed ? OruIconName.alert : OruIconName.leave), color: r.status == LeaveStatus.failed ? OruColors.dangerFg : OruColors.primaryText),
                            trailing: null,
                          ),
                          Padding(
                            padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, bottom: OruSpacing.space2),
                            child: Text(_statusText(s, r.status), style: text.bodySmall),
                          ),
                          if (r.status == LeaveStatus.failed)
                            OruBanner(
                              title: s.mobLvRefused,
                              message: s.mobLvRefusedConflict,
                              tone: OruTone.danger,
                              action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.id)),
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

/// The form: type, first and last day, half day for a single day, a short reason. Send saves on the phone and returns at once.
class OruLeaveFormScreen extends StatefulWidget {
  const OruLeaveFormScreen({super.key, required this.controller, this.now});
  final LeaveController controller;
  final DateTime Function()? now;

  @override
  State<OruLeaveFormScreen> createState() => _OruLeaveFormScreenState();
}

class _OruLeaveFormScreenState extends State<OruLeaveFormScreen> {
  late DateTime _start = _today();
  late DateTime _end = _today();
  String? _typeId;
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
    final first = _today().subtract(const Duration(days: 30));
    final d = await showDatePicker(context: context, initialDate: start ? _start : _end, firstDate: first, lastDate: first.add(const Duration(days: 760)));
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
    final a = isoDate(_start);
    final b = isoDate(_end);
    if (checkLeave(typeId: _typeId, start: a, end: b) != LeaveProblem.none) {
      setState(() => _tried = true);
      return;
    }
    await widget.controller.request(leaveBody(typeId: _typeId!, start: a, end: b, half: _half ? _halfPart : null, reason: _reason.text));
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final types = widget.controller.view?.types ?? const [];
    final a = isoDate(_start);
    final b = isoDate(_end);
    final problem = _tried ? checkLeave(typeId: _typeId, start: a, end: b) : LeaveProblem.none;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobLvFormTitle)),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Text(s.mobLvType, style: text.titleMedium),
          const SizedBox(height: OruSpacing.space2),
          if (types.isEmpty)
            OruBanner(title: s.mobLvType, message: s.mobLvNoTypes, icon: OruIconName.cloudOff)
          else
            for (final t in types)
              Padding(
                padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                child: OruCard(
                  child: OruCheckbox(label: t['name'] as String, value: _typeId == t['id'], onChanged: (_) => setState(() => _typeId = t['id'] as String)),
                ),
              ),
          if (problem == LeaveProblem.noType) Text(s.mobLvErrType, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
          const SizedBox(height: OruSpacing.space3),
          OruCard(child: OruListRow(title: s.mobLvStart, subtitle: _dateWords(context, a), leading: const OruIcon(OruIconName.calendar, color: OruColors.primaryText), onPressed: () => _pick(true))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobLvEnd, subtitle: _dateWords(context, b), leading: const OruIcon(OruIconName.calendar, color: OruColors.primaryText), onPressed: () => _pick(false))),
          if (problem == LeaveProblem.endBeforeStart) Text(s.mobLvErrEnd, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
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
          OruTextField(label: s.mobLvReason, controller: _reason, multiline: true),
          const SizedBox(height: OruSpacing.space4),
          OruButton(label: s.mobLvSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: _send),
        ]),
      ),
    );
  }
}

/// Lessons she covers for colleagues on leave in the next two weeks.
class OruCoverScreen extends StatelessWidget {
  const OruCoverScreen({super.key, required this.services});
  final OruServices services;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.mobMoreCover)),
      body: SafeArea(
        child: StreamBuilder<List<Map<String, dynamic>>>(
          stream: services.store.watchRecords(kCoverDuty),
          builder: (context, snap) {
            var items = snap.data;
            if (items != null) {
              items = [...items]..sort((x, y) => '${x['date']}${(x['period'] as Map<String, dynamic>)['startTime']}'.compareTo('${y['date']}${(y['period'] as Map<String, dynamic>)['startTime']}'));
            }
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              OruSyncPill(services: services),
              const SizedBox(height: OruSpacing.space4),
              if (items == null)
                const SizedBox.shrink()
              else if (items.isEmpty)
                OruEmptyState(title: s.mobMoreCover, description: s.mobCoverEmpty, icon: OruIconName.users)
              else
                for (final d in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: s.mobCoverLine(_isolate((d['class'] as Map<String, dynamic>)['name'] as String), (d['subject'] as Map<String, dynamic>)['name'] as String, (d['period'] as Map<String, dynamic>)['label'] as String),
                        subtitle: '${_dateWords(context, d['date'] as String)} · ${(d['period'] as Map<String, dynamic>)['startTime']}–${(d['period'] as Map<String, dynamic>)['endTime']} · ${s.mobCoverFor((d['covering'] as Map<String, dynamic>)['name'] as String)}',
                        leading: const OruIcon(OruIconName.users, color: OruColors.primaryText),
                      ),
                    ),
                  ),
            ]);
          },
        ),
      ),
    );
  }
}
