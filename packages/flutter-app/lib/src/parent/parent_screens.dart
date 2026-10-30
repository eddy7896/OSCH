import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../attendance/attendance_screens.dart' show pillOfStatus, statusLabel;
import '../inbox/inbox_data.dart';
import '../inbox/inbox_screen.dart';
import '../services.dart';
import '../studentleave/parent_leave_screen.dart';
import '../studentleave/studentleave_data.dart';
import '../sync_pill.dart';
import 'parent_data.dart';
import 'parent_model.dart';

/// The pull for the Parent app: the children and their day, and the notifications.
List<PullTask> parentAppPullTasks(OruApi api) => [...parentPullTasks(api), ...studentLeavePullTasks(api), ...inboxPullTasks(api)];

String _isolate(String text) => '\u2066$text\u2069';

String _firstName(String full) => full.split(' ').first;

/// The Parent app once signed in: Home ("How is my child today?"), Notifications and More (the account). Academics, fees, messages and the bus map join it next.
class OruParentHome extends StatefulWidget {
  const OruParentHome({super.key, required this.services, required this.state, this.now});
  final OruServices services;
  final SessionActive state;
  final DateTime Function()? now;

  @override
  State<OruParentHome> createState() => _OruParentHomeState();
}

class _OruParentHomeState extends State<OruParentHome> {
  String _tab = 'home';
  late final InboxController _inbox = InboxController(widget.services.store);
  StreamSubscription<void>? _pushOpen;

  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
    _pushOpen = widget.services.inboxRequests.listen((_) {
      if (mounted) Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruInboxScreen(services: widget.services)));
    });
  }

  @override
  void dispose() {
    _pushOpen?.cancel();
    _inbox.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final svc = widget.services;
    final pages = <String, Widget>{
      'home': OruChildHomeScreen(services: svc, now: widget.now),
      'leave': OruParentLeaveScreen(services: svc, now: widget.now),
      'inbox': OruInboxScreen(services: svc),
      'more': _MorePage(services: svc, state: widget.state),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: ListenableBuilder(
        listenable: _inbox,
        builder: (context, _) => OruBottomNav(
          label: s.appParent,
          active: _tab,
          onChanged: (k) => setState(() => _tab = k),
          items: [
            OruNavItem(key: 'home', label: s.mobTabHome, icon: OruIconName.home),
            OruNavItem(key: 'leave', label: s.mobTabLeave, icon: OruIconName.leave),
            OruNavItem(key: 'inbox', label: s.mobMoreInbox, icon: OruIconName.bell, badge: _inbox.unread, badgeLabel: _inbox.unread > 0 ? s.mobInboxUnread('${_inbox.unread}') : null),
            OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more),
          ],
        ),
      ),
    );
  }
}

/// "How is {child} today?": today's attendance, the lessons, and the bus ride, for the chosen child. Reads only the phone, so it works with no connection after one sync.
class OruChildHomeScreen extends StatefulWidget {
  const OruChildHomeScreen({super.key, required this.services, this.now});
  final OruServices services;
  final DateTime Function()? now;

  @override
  State<OruChildHomeScreen> createState() => _OruChildHomeScreenState();
}

class _OruChildHomeScreenState extends State<OruChildHomeScreen> {
  late final ParentController _c = ParentController(widget.services.store, now: widget.now);

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
              final t = _c.today;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (kids == null)
                  const SizedBox.shrink()
                else if (kids.isEmpty)
                  OruEmptyState(title: s.appParent, description: s.mobParentNoChildren, icon: OruIconName.users)
                else ...[
                  if (kids.length > 1) ...[
                    if (kids.length <= 4)
                      OruSegmentedControl(label: s.mobParentChoose, value: _c.selectedId ?? '', options: [for (final k in kids) OruSegment(value: k['id'] as String, label: _firstName(k['name'] as String))], onChanged: _c.select)
                    else
                      for (final k in kids)
                        Padding(
                          padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                          child: OruCard(child: OruListRow(title: k['name'] as String, leading: OruIcon(k['id'] == _c.selectedId ? OruIconName.checkCircle : OruIconName.users, color: OruColors.primaryText), onPressed: () => _c.select(k['id'] as String))),
                        ),
                    const SizedBox(height: OruSpacing.space4),
                  ],
                  if (child != null) ...[
                    Semantics(header: true, child: Text(s.mobParentHow(_firstName(child['name'] as String)), style: text.titleLarge)),
                    if ((child['class'] as Map<String, dynamic>?) != null) Text(_isolate((child['class'] as Map<String, dynamic>)['name'] as String), style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                    const SizedBox(height: OruSpacing.space4),
                    if (t == null || !t.hasData) OruEmptyState(title: s.mobTodayTitle, description: s.mobParentFirstLoad, icon: OruIconName.cloudOff) else ..._cards(context, s, text, child, t),
                  ],
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }

  List<Widget> _cards(BuildContext context, OruStrings s, TextTheme text, Map<String, dynamic> child, ChildToday t) {
    final first = _firstName(child['name'] as String);
    return [
      OruCard(
        title: s.mobTodayAttendanceTitle,
        icon: OruIconName.check,
        child: Padding(
          padding: const EdgeInsets.all(OruSpacing.space4),
          child: t.attendanceStatus == null
              ? Text(s.mobParentNotTaken)
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  OruStatusPill(status: pillOfStatus(t.attendanceStatus!), label: statusLabel(s, t.attendanceStatus!, const {})),
                  if ((t.attendanceNote ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: Text(t.attendanceNote!, style: text.bodyMedium)),
                ]),
        ),
      ),
      const SizedBox(height: OruSpacing.space3),
      OruCard(
        title: s.mobParentLessons,
        icon: OruIconName.book,
        child: t.lessons.isEmpty
            ? Padding(padding: const EdgeInsets.all(OruSpacing.space4), child: Text(s.mobParentNoLessons))
            : Column(children: [
                for (final l in t.lessons)
                  OruListRow(title: l.subject, subtitle: [s.mobLvDates(_isolate(l.start), _isolate(l.end)), if (l.teacher != null) l.teacher!].join(' · '), leading: const OruIcon(OruIconName.book, color: OruColors.primaryText)),
              ]),
      ),
      const SizedBox(height: OruSpacing.space3),
      OruCard(
        title: s.mobParentRide,
        icon: OruIconName.bus,
        child: t.rides.isEmpty
            ? Padding(padding: const EdgeInsets.all(OruSpacing.space4), child: Text(s.mobParentNoRide(first)))
            : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                for (final r in t.rides)
                  OruListRow(
                    title: r.direction == 'MORNING' ? s.mobParentRideMorning(r.stop) : s.mobParentRideAfternoon(r.stop),
                    subtitle: [if (r.time != null) _isolate(r.time!), if (r.vehicle != null) r.vehicle!, if (r.driverName != null) s.mobParentDriver(r.driverName!)].join(' · '),
                    leading: const OruIcon(OruIconName.bus, color: OruColors.primaryText),
                  ),
              ]),
      ),
    ];
  }
}

class _MorePage extends StatelessWidget {
  const _MorePage({required this.services, required this.state});
  final OruServices services;
  final SessionActive state;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          OruAccountPanel(session: services.session, state: state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
        ]),
      ),
    );
  }
}
