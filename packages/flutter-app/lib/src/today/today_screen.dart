import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart';

import '../services.dart';
import '../sync_pill.dart';
import '../checkin/checkin_screen.dart';
import 'today_data.dart';
import 'today_model.dart';

String _dateText(BuildContext context, DateTime d) {
  try {
    return DateFormat.yMMMMEEEEd(Localizations.localeOf(context).toString()).format(d);
  } catch (_) {
    return OruFormat.formatDate(isoDate(d), withYear: true); // a language whose date symbols are not loaded: English words, never a crash
  }
}

/// A name or a time inside right-to-left text keeps its own order and its digits (without it "08:00 to 08:40" is jumbled in Urdu).
String _isolate(String text) => '\u2066$text\u2069';

/// The Teacher's first screen: what is next today, which classes still need attendance, and her leave. It reads only what is on the
/// phone, so it works with the network off after one sync; the sync state is always in view. Pull down to refresh.
class OruTodayScreen extends StatefulWidget {
  const OruTodayScreen({super.key, required this.services, required this.onOpenAccount, this.onOpenAttendance, this.onOpenCheckIn, this.now});
  final OruServices services;
  final VoidCallback onOpenAccount;

  /// Makes the attendance card a way in (the Teacher app switches to its Attendance tab).
  final VoidCallback? onOpenAttendance;

  /// Shows her own check-in card and makes it a way in (the Teacher app opens the check-in screen).
  final VoidCallback? onOpenCheckIn;

  /// For tests: the clock the screen believes in.
  final DateTime Function()? now;

  @override
  State<OruTodayScreen> createState() => _OruTodayScreenState();
}

class _OruTodayScreenState extends State<OruTodayScreen> {
  late final TodayController _controller = TodayController(widget.services.store, now: widget.now);
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(minutes: 1), (_) => _controller.tick());
  }

  @override
  void dispose() {
    _tick?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final now = (widget.now ?? DateTime.now)();
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _controller,
            builder: (context, _) {
              final m = _controller.model;
              return ListView(
                padding: const EdgeInsets.all(OruSpacing.space4),
                children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Semantics(header: true, child: Text(s.mobTodayTitle, style: text.titleLarge)),
                        Text(_dateText(context, now), style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                      ]),
                    ),
                    OruLinkAction(label: s.mobAccountLink, onPressed: widget.onOpenAccount),
                  ]),
                  const SizedBox(height: OruSpacing.space3),
                  OruSyncPill(services: widget.services),
                  const SizedBox(height: OruSpacing.space4),
                  if (widget.onOpenCheckIn != null) ...[
                    OruCheckInSummary(services: widget.services, onOpen: widget.onOpenCheckIn!, now: widget.now),
                    const SizedBox(height: OruSpacing.space3),
                  ],
                  if (m == null) const SizedBox.shrink() else if (!m.hasData) OruEmptyState(title: s.mobTodayTitle, description: s.mobTodayFirstLoad, icon: OruIconName.cloudOff) else ..._sections(context, s, m),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  List<Widget> _sections(BuildContext context, OruStrings s, TodayModel m) {
    return [
      if (!m.isSchoolDay)
        OruBanner(title: s.mobTodayNotSchoolDay, tone: OruTone.neutral, icon: OruIconName.calendar)
      else ...[
        OruCard(
          title: s.mobTodayNextLessons,
          icon: OruIconName.clock,
          child: m.nextLessons.isEmpty
              ? Padding(padding: const EdgeInsets.all(OruSpacing.space4), child: Text(s.mobTodayNoMoreLessons))
              : Column(children: [
                  for (final l in m.nextLessons)
                    OruListRow(title: l.subject, subtitle: s.mobTodayLessonLine(_isolate(l.className), _isolate(l.start), _isolate(l.end)), leading: const OruIcon(OruIconName.book, color: OruColors.primaryText)),
                ]),
        ),
        const SizedBox(height: OruSpacing.space3),
        OruCard(
          title: s.mobTodayAttendanceTitle,
          icon: OruIconName.check,
          action: widget.onOpenAttendance == null ? null : OruLinkAction(label: s.mobTabAttendance, onPressed: widget.onOpenAttendance!),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (m.classesWithoutAttendance.isEmpty && m.attendanceSaved.isEmpty)
              Padding(padding: const EdgeInsets.all(OruSpacing.space4), child: Text(s.mobTodayAttendanceAllDone))
            else ...[
              if (m.classesWithoutAttendance.isNotEmpty) ...[
                Padding(padding: const EdgeInsetsDirectional.fromSTEB(OruSpacing.space4, OruSpacing.space2, OruSpacing.space4, 0), child: Text(s.mobTodayAttendanceMissing(m.classesWithoutAttendance.length), style: Theme.of(context).textTheme.titleSmall)),
                for (final c in m.classesWithoutAttendance) OruListRow(title: c.name, leading: const OruIcon(OruIconName.users, color: OruColors.warningFg)),
              ],
              if (m.attendanceSaved.isNotEmpty) ...[
                Padding(padding: const EdgeInsetsDirectional.fromSTEB(OruSpacing.space4, OruSpacing.space2, OruSpacing.space4, 0), child: Text(s.mobTodayAttendanceSaved(m.attendanceSaved.length), style: Theme.of(context).textTheme.titleSmall)),
                for (final c in m.attendanceSaved) OruListRow(title: c.name, leading: const OruIcon(OruIconName.device, color: OruColors.infoFg)),
              ],
            ],
          ]),
        ),
      ],
      const SizedBox(height: OruSpacing.space3),
      OruCard(
        title: s.mobTodayLeaveTitle,
        icon: OruIconName.leave,
        child: Padding(
          padding: const EdgeInsets.all(OruSpacing.space4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(m.leaveWaiting == 0 ? s.mobTodayLeaveNone : s.mobTodayLeaveWaiting(m.leaveWaiting)),
            if (m.leaveSaved > 0) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: Text(s.mobTodayLeaveSaved(m.leaveSaved), style: TextStyle(color: OruColors.infoFg))),
          ]),
        ),
      ),
    ];
  }
}
