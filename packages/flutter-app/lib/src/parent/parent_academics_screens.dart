import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../attendance/attendance_screens.dart' show pillOfStatus, statusLabel;
import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart' show isoDate, kPeriod, kSchedule;
import '../studentleave/studentleave_data.dart' show kStudentLeave;
import 'parent_academics.dart';
import 'parent_data.dart';

String _firstName(String full) => full.split(' ').first;

/// A weekday name in the person's language (Monday 1 January 2024 is a Monday).
String dayName(BuildContext context, String code) {
  final i = weekdayCodes.indexOf(code);
  return DateFormat.EEEE(Localizations.localeOf(context).toString()).format(DateTime(2024, 1, 1 + (i < 0 ? 0 : i)));
}

String _dayInitial(BuildContext context, int i) => DateFormat.E(Localizations.localeOf(context).toString()).format(DateTime(2024, 1, 1 + i));

/// Keeps one child's week current from the phone's copy.
class ChildWeekController extends ChangeNotifier {
  ChildWeekController(this.store, this.child) {
    for (final t in const [kChildLesson, kPeriod, kSchedule]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruLocalStore store;
  final Map<String, dynamic> child;
  final _subs = <StreamSubscription<Object?>>[];
  List<WeekDay>? week;
  bool _disposed = false;

  Future<void> _refresh() async {
    final classId = (child['class'] as Map<String, dynamic>?)?['id'] as String?;
    final w = buildWeek(
      lessons: classId == null ? const [] : await store.records(kChildLesson, parentId: classId),
      periods: await store.records(kPeriod),
      schedule: await store.record(kSchedule, 'school'),
    );
    if (_disposed) return;
    week = w;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}

/// The child's class timetable for the week. Reads only the phone, so it works with no connection after one sync.
class OruChildTimetableScreen extends StatefulWidget {
  const OruChildTimetableScreen({super.key, required this.services, required this.child, this.now});
  final OruServices services;
  final Map<String, dynamic> child;
  final DateTime Function()? now;

  @override
  State<OruChildTimetableScreen> createState() => _OruChildTimetableScreenState();
}

class _OruChildTimetableScreenState extends State<OruChildTimetableScreen> {
  late final ChildWeekController _c = ChildWeekController(widget.services.store, widget.child);
  String? _day;

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
      appBar: AppBar(title: Text(s.mobPaTimetable)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final week = _c.week;
              final todayCode = weekdayCodes[((widget.now ?? DateTime.now)().weekday - 1) % 7];
              final shown = _day ?? (week != null && week.any((d) => d.code == todayCode) ? todayCode : week?.firstOrNull?.code);
              final lessons = week?.where((d) => d.code == shown).firstOrNull?.lessons ?? const <WeekLesson>[];
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobPaTimetableOf(_firstName(widget.child['name'] as String)), style: text.titleLarge)),
                if ((widget.child['class'] as Map<String, dynamic>?) != null) Text((widget.child['class'] as Map<String, dynamic>)['name'] as String, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (week == null)
                  const SizedBox.shrink()
                else if (week.isEmpty)
                  OruEmptyState(title: s.mobPaTimetable, description: s.mobPaNoTimetable, icon: OruIconName.cloudOff)
                else ...[
                  Wrap(spacing: OruSpacing.space2, runSpacing: OruSpacing.space2, children: [
                    for (final d in week)
                      ChoiceChip(
                        label: Text(dayName(context, d.code)),
                        selected: d.code == shown,
                        onSelected: (_) => setState(() => _day = d.code),
                      ),
                  ]),
                  const SizedBox(height: OruSpacing.space4),
                  if (lessons.isEmpty)
                    Text(s.mobPaNoLessonsDay, style: text.bodyMedium)
                  else
                    for (final l in lessons)
                      Padding(
                        padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                        child: OruCard(
                          child: OruListRow(
                            title: l.subject,
                            subtitle: [s.mobLvDates(l.start, l.end), if (l.teacher != null) l.teacher!].join(' · '),
                            leading: const OruIcon(OruIconName.book, color: OruColors.primaryText),
                          ),
                        ),
                      ),
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }
}

/// Keeps one child's month current from the phone's copy.
class ChildMonthController extends ChangeNotifier {
  ChildMonthController(this.store, this.child, DateTime start) : _year = start.year, _month = start.month {
    for (final t in const [kChildAttendance, kChildExam, kStudentLeave]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruLocalStore store;
  final Map<String, dynamic> child;
  final _subs = <StreamSubscription<Object?>>[];
  int _year;
  int _month;
  MonthView? view;
  Map<String, Map<String, dynamic>> labels = const {};
  bool _disposed = false;

  int get year => _year;
  int get month => _month;

  void move(int by) {
    final d = DateTime(_year, _month + by, 1);
    _year = d.year;
    _month = d.month;
    _refresh();
  }

  Future<void> _refresh() async {
    final id = child['id'] as String;
    final classId = (child['class'] as Map<String, dynamic>?)?['id'] as String?;
    final leave = [for (final l in await store.records(kStudentLeave)) if ((l['student'] as Map<String, dynamic>)['id'] == id) l];
    final exams = [for (final e in await store.records(kChildExam)) if ((e['class'] as Map<String, dynamic>)['id'] == classId) e];
    final v = buildMonth(year: _year, month: _month, attendance: await store.records(kChildAttendance, parentId: id), leave: leave, exams: exams);
    if (_disposed) return;
    view = v;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}

/// The child's month: the days the school recorded (with the word and an icon, never colour alone), approved leave, and exams. Reads only the phone.
class OruChildCalendarScreen extends StatefulWidget {
  const OruChildCalendarScreen({super.key, required this.services, required this.child, this.now});
  final OruServices services;
  final Map<String, dynamic> child;
  final DateTime Function()? now;

  @override
  State<OruChildCalendarScreen> createState() => _OruChildCalendarScreenState();
}

class _OruChildCalendarScreenState extends State<OruChildCalendarScreen> {
  late final ChildMonthController _c = ChildMonthController(widget.services.store, widget.child, (widget.now ?? DateTime.now)());
  String? _picked;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final locale = Localizations.localeOf(context).toString();
    final today = isoDate((widget.now ?? DateTime.now)());
    return Scaffold(
      appBar: AppBar(title: Text(s.mobPaCalendar)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final v = _c.view;
              final picked = v?.days.where((d) => d.date == (_picked ?? today)).firstOrNull;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobPaCalendarOf(_firstName(widget.child['name'] as String)), style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                Row(children: [
                  OruButton(label: s.mobPaPrevMonth, icon: OruIconName.arrowLeft, onPressed: () => setState(() {
                        _picked = null;
                        _c.move(-1);
                      })),
                  Expanded(child: Center(child: Semantics(header: true, child: Text(DateFormat.yMMMM(locale).format(DateTime(_c.year, _c.month, 1)), style: text.titleMedium)))),
                  OruButton(label: s.mobPaNextMonth, icon: OruIconName.chevronRight, onPressed: () => setState(() {
                        _picked = null;
                        _c.move(1);
                      })),
                ]),
                const SizedBox(height: OruSpacing.space3),
                if (v != null) ...[
                  Row(children: [for (var i = 0; i < 7; i++) Expanded(child: Center(child: Text(_dayInitial(context, i), style: text.bodySmall?.copyWith(color: OruColors.textMuted))))]),
                  const SizedBox(height: OruSpacing.space1),
                  _Grid(view: v, today: today, picked: _picked ?? today, onPick: (d) => setState(() => _picked = d)),
                  const SizedBox(height: OruSpacing.space4),
                  if (picked != null) _Detail(day: picked, labels: _c.labels),
                  const SizedBox(height: OruSpacing.space4),
                  if (v.counts.isNotEmpty) ...[
                    Text(s.mobPaMonthSummary, style: text.titleMedium),
                    const SizedBox(height: OruSpacing.space2),
                    for (final e in v.counts.entries)
                      OruListRow(
                        title: statusLabel(s, e.key, _c.labels),
                        leading: OruIcon(pillOfStatus(e.key).icon, color: pillOfStatus(e.key).tone.foreground),
                        trailing: Text('${e.value}', style: text.titleMedium),
                      ),
                  ],
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }
}

class _Grid extends StatelessWidget {
  const _Grid({required this.view, required this.today, required this.picked, required this.onPick});
  final MonthView view;
  final String today;
  final String picked;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final cells = <Widget>[
      for (var i = 0; i < view.leading; i++) const SizedBox.shrink(),
      for (final d in view.days) _Cell(day: d, isToday: d.date == today, selected: d.date == picked, onTap: () => onPick(d.date), s: s),
    ];
    return GridView.count(crossAxisCount: 7, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 0.9, mainAxisSpacing: OruSpacing.space1, crossAxisSpacing: OruSpacing.space1, children: cells);
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.day, required this.isToday, required this.selected, required this.onTap, required this.s});
  final MonthDay day;
  final bool isToday;
  final bool selected;
  final VoidCallback onTap;
  final OruStrings s;

  @override
  Widget build(BuildContext context) {
    final pill = day.status == null ? null : pillOfStatus(day.status!);
    final label = [
      DateFormat.yMMMMd(Localizations.localeOf(context).toString()).format(DateTime.parse(day.date)),
      if (day.status != null) statusLabel(s, day.status!, const {}),
      if (day.onLeave) s.mobPaLeaveDay,
      if (day.exams.isNotEmpty) s.mobPaExamDay,
    ].join(', ');
    return Semantics(
      label: label,
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(OruRadius.sm),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: selected ? OruColors.primaryText : OruColors.border, width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(OruRadius.sm),
            color: pill?.tone.background,
          ),
          padding: const EdgeInsets.all(2),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('${day.day}', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: isToday ? FontWeight.w700 : FontWeight.w400)),
            Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
              if (pill != null) OruIcon(pill.icon, size: 14, color: pill.tone.foreground),
              if (day.onLeave) const OruIcon(OruIconName.leave, size: 14, color: OruColors.primaryText),
              if (day.exams.isNotEmpty) const OruIcon(OruIconName.book, size: 14, color: OruColors.primaryText),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.day, required this.labels});
  final MonthDay day;
  final Map<String, Map<String, dynamic>> labels;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final nothing = day.status == null && !day.onLeave && day.exams.isEmpty;
    return OruCard(
      title: DateFormat.yMMMMEEEEd(Localizations.localeOf(context).toString()).format(DateTime.parse(day.date)),
      icon: OruIconName.calendar,
      child: Padding(
        padding: const EdgeInsets.all(OruSpacing.space3),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (nothing) Text(s.mobPaDayNothing, style: text.bodyMedium),
          if (day.status != null) OruStatusPill(status: pillOfStatus(day.status!), label: statusLabel(s, day.status!, labels)),
          if ((day.note ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(top: OruSpacing.space1), child: Text(day.note!, style: text.bodyMedium)),
          if (day.onLeave) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: Row(children: [const OruIcon(OruIconName.leave, color: OruColors.primaryText), const SizedBox(width: OruSpacing.space2), Text(s.mobPaLeaveDay, style: text.bodyMedium)])),
          for (final e in day.exams) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: Row(children: [const OruIcon(OruIconName.book, color: OruColors.primaryText), const SizedBox(width: OruSpacing.space2), Expanded(child: Text(s.mobPaExamLine(e.title, e.subject), style: text.bodyMedium))])),
        ]),
      ),
    );
  }
}
