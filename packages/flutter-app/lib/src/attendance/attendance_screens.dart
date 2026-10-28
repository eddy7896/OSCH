import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:intl/intl.dart';

import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart';
import 'attendance_data.dart';
import 'attendance_model.dart';

OruAttendanceStatus _pillOf(String code) => switch (code) {
      'ABSENT' => OruAttendanceStatus.absent,
      'LATE' => OruAttendanceStatus.late,
      'LEAVE' => OruAttendanceStatus.leave,
      'MEDICAL' => OruAttendanceStatus.medical,
      'HALF_DAY' => OruAttendanceStatus.halfday,
      'EXCUSED' => OruAttendanceStatus.excused,
      _ => OruAttendanceStatus.present,
    };

/// The word for a status: the school's own name if it set one, else the app's wording in the person's language.
String statusLabel(OruStrings s, String code, Map<String, Map<String, dynamic>> labels) {
  final own = labels[code];
  if (own != null && own['isDefault'] == false) return own['label'] as String;
  return switch (code) {
    'ABSENT' => s.statusAbsent,
    'LATE' => s.statusLate,
    'LEAVE' => s.statusLeave,
    'MEDICAL' => s.statusMedical,
    'HALF_DAY' => s.statusHalfDay,
    'EXCUSED' => s.statusExcused,
    _ => s.statusPresent,
  };
}

Future<Map<String, Map<String, dynamic>>> loadLabels(OruLocalStore store) async => {for (final r in await store.records(kAttendanceStatus)) r['status'] as String: r};

String _isolate(String text) => '\u2066$text\u2069';

String _dateWords(BuildContext context, String iso) {
  try {
    return DateFormat.yMMMEd(Localizations.localeOf(context).toString()).format(DateTime.parse(iso));
  } catch (_) {
    return iso;
  }
}

String _stateWords(OruStrings s, ClassDayState st) => switch (st) {
      ClassDayState.todo => s.mobAttStateTodo,
      ClassDayState.saved => s.mobAttStateSaved,
      ClassDayState.taken => s.mobAttStateDone,
      ClassDayState.locked => s.mobAttStateLocked,
      ClassDayState.failed => s.mobAttStateFailed,
    };

(OruTone, OruIconName) _stateLook(ClassDayState st) => switch (st) {
      ClassDayState.todo => (OruTone.warning, OruIconName.alert),
      ClassDayState.saved => (OruTone.info, OruIconName.device),
      ClassDayState.taken => (OruTone.success, OruIconName.checkCircle),
      ClassDayState.locked => (OruTone.neutral, OruIconName.check),
      ClassDayState.failed => (OruTone.danger, OruIconName.alert),
    };

/// The classes the teacher takes attendance for, with where each stands today. Tap one to take it.
class OruAttendanceListScreen extends StatefulWidget {
  const OruAttendanceListScreen({super.key, required this.services, this.now});
  final OruServices services;
  final DateTime Function()? now;

  @override
  State<OruAttendanceListScreen> createState() => _OruAttendanceListScreenState();
}

class _OruAttendanceListScreenState extends State<OruAttendanceListScreen> {
  late final AttendanceListController _c = AttendanceListController(widget.services.store, date: isoDate((widget.now ?? DateTime.now)()));

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
              final items = _c.items;
              return ListView(
                padding: const EdgeInsets.all(OruSpacing.space4),
                children: [
                  Semantics(header: true, child: Text(s.mobTabAttendance, style: text.titleLarge)),
                  Text(_dateWords(context, _c.date), style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                  const SizedBox(height: OruSpacing.space3),
                  OruSyncPill(services: widget.services),
                  const SizedBox(height: OruSpacing.space4),
                  if (items == null)
                    const SizedBox.shrink()
                  else if (items.isEmpty)
                    OruEmptyState(title: s.mobTabAttendance, description: s.mobAttNoClasses, icon: OruIconName.users)
                  else ...[
                    Text(s.mobAttClassesTitle, style: text.titleMedium),
                    const SizedBox(height: OruSpacing.space2),
                    for (final i in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                        child: OruCard(
                          child: OruListRow(
                            title: i.name,
                            subtitle: _stateWords(s, i.state),
                            leading: OruIcon(_stateLook(i.state).$2, color: _stateLook(i.state).$1.foreground),
                            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruAttendanceScreen(services: widget.services, classId: i.id, className: i.name, date: _c.date))),
                          ),
                        ),
                      ),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// One class, one day: "Mark all present", tap a student to set their status, Save. Saving is instant and never waits for the network.
class OruAttendanceScreen extends StatefulWidget {
  const OruAttendanceScreen({super.key, required this.services, required this.classId, required this.className, required this.date});
  final OruServices services;
  final String classId;
  final String className;
  final String date;

  @override
  State<OruAttendanceScreen> createState() => _OruAttendanceScreenState();
}

class _OruAttendanceScreenState extends State<OruAttendanceScreen> {
  late final AttendanceController _c = AttendanceController(widget.services.store, classId: widget.classId, date: widget.date);
  Map<String, Map<String, dynamic>> _labels = const {};

  @override
  void initState() {
    super.initState();
    loadLabels(widget.services.store).then((l) {
      if (mounted) setState(() => _labels = l);
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _pick(StudentRow st) async {
    final s = OruStrings.of(context);
    final chosen = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(shrinkWrap: true, children: [
          Padding(padding: const EdgeInsetsDirectional.fromSTEB(OruSpacing.space4, 0, OruSpacing.space4, OruSpacing.space2), child: Text(s.mobAttPickStatus(st.name), style: Theme.of(ctx).textTheme.titleMedium)),
          for (final code in attendanceStatusCodes)
            OruListRow(
              title: statusLabel(s, code, _labels),
              leading: OruIcon(_pillOf(code).icon, color: _pillOf(code).tone.foreground),
              trailing: code == st.status ? const OruIcon(OruIconName.check, color: OruColors.primaryText) : null,
              onPressed: () => Navigator.pop(ctx, code),
            ),
        ]),
      ),
    );
    if (chosen != null) await _c.setStatus(st.id, chosen);
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            final v = _c.view;
            final locked = v?.state == ClassDayState.locked;
            final canSave = v != null && v.hasRoster && v.students.isNotEmpty && !locked && (v.state == ClassDayState.todo || v.state == ClassDayState.failed || v.dirty);
            return Column(children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(OruSpacing.space4),
                  children: [
                    Align(alignment: AlignmentDirectional.centerStart, child: OruLinkAction(label: s.actionBack, onPressed: () => Navigator.of(context).pop())),
                    Semantics(header: true, child: Text(s.mobAttDateLine(_isolate(widget.className), _dateWords(context, widget.date)), style: text.titleLarge)),
                    const SizedBox(height: OruSpacing.space3),
                    OruSyncPill(services: widget.services),
                    const SizedBox(height: OruSpacing.space3),
                    if (v != null) ..._banners(s, v),
                    if (v == null) const SizedBox.shrink() else if (!v.hasRoster) OruEmptyState(title: s.mobTabAttendance, description: s.mobAttNotLoaded, icon: OruIconName.cloudOff) else if (v.students.isEmpty) OruEmptyState(title: s.mobTabAttendance, description: s.mobAttNoStudents, icon: OruIconName.users) else ...[
                      Row(children: [
                        Expanded(child: Text(v.exceptions == 0 ? s.mobAttEveryonePresent : s.mobAttExceptions(v.exceptions), style: text.titleSmall)),
                        OruButton(label: s.mobAttMarkAllPresent, icon: OruIconName.check, onPressed: locked ? null : _c.markAllPresent),
                      ]),
                      const SizedBox(height: OruSpacing.space2),
                      OruCard(
                        child: Column(children: [
                          for (final st in v.students)
                            OruListRow(
                              title: st.name,
                              subtitle: st.enrollmentId.isEmpty ? null : st.enrollmentId,
                              leading: OruAvatar(name: st.name),
                              trailing: OruStatusPill(status: _pillOf(st.status), label: statusLabel(s, st.status, _labels), onPressed: locked ? null : () => _pick(st)),
                              onPressed: locked ? null : () => _pick(st),
                            ),
                        ]),
                      ),
                    ],
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(OruSpacing.space4),
                child: OruButton(label: s.mobAttSave, variant: OruButtonVariant.primary, block: true, icon: OruIconName.check, onPressed: canSave ? () => _save() : null),
              ),
            ]);
          },
        ),
      ),
    );
  }

  Future<void> _save() async {
    await _c.save();
    // Saved on the phone; now let the engine send it. The screen has already moved on: nothing waits for the network.
    widget.services.coordinator.syncNow();
  }

  List<Widget> _banners(OruStrings s, ClassDayView v) {
    final gap = const SizedBox(height: OruSpacing.space3);
    return switch (v.state) {
      ClassDayState.locked => [OruBanner(title: s.mobAttLocked, tone: OruTone.neutral, icon: OruIconName.alert), gap],
      ClassDayState.saved => [OruBanner(title: s.mobAttSavedNotSent, tone: OruTone.info, icon: OruIconName.device), gap],
      ClassDayState.failed => [
          OruBanner(
            title: s.mobAttRefused,
            message: v.refusal == 'CONFLICT' ? s.mobAttRefusedLocked : null,
            tone: OruTone.danger,
            action: OruButton(label: s.actionDismiss, onPressed: _c.dismissRefusal),
          ),
          gap,
        ],
      _ => const [],
    };
  }
}
