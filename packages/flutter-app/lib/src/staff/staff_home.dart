import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import 'package:flutter_sync/flutter_sync.dart';

import '../approvals/approvals_screen.dart';
import '../announcements/announcements_data.dart';
import '../checkin/checkin_data.dart';
import '../inbox/inbox_data.dart';
import '../inbox/inbox_screen.dart';
import '../checkin/checkin_screen.dart';
import '../announcements/announcements_screens.dart';
import '../leave/leave_data.dart';
import '../leave/leave_model.dart';
import '../leave/leave_screens.dart';
import '../services.dart';
import '../sync_pill.dart';

/// What the Staff app pulls: her days and where the school is, her leave (requests, types, balances), the school's announcements and her notifications.
List<PullTask> staffPullTasks(OruApi api) => [...checkInPullTasks(api), ...leavePullTasks(api, cover: false, ownRequests: true), ...announcementsPullTasks(api), ...inboxPullTasks(api)];

/// The Staff app once signed in: Home, Attendance (check-in and check-out), Leave, More (announcements and the account), and for the Principal an Approvals tab.
class OruStaffHome extends StatefulWidget {
  const OruStaffHome({super.key, required this.services, required this.state, this.now, this.location = const GeolocatorLocation()});
  final OruServices services;
  final SessionActive state;
  final DateTime Function()? now;

  /// Where the phone is, for the check-in. Tests give a fixed one.
  final LocationPort location;

  @override
  State<OruStaffHome> createState() => _OruStaffHomeState();
}

class _OruStaffHomeState extends State<OruStaffHome> {
  String _tab = 'home';
  late final InboxController _inbox = InboxController(widget.services.store);
  StreamSubscription<void>? _pushOpen;

  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
    // A tap on a push opens the notifications.
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
      'home': _HomePage(services: svc, onOpen: (tab) => setState(() => _tab = tab)),
      'attendance': OruCheckInScreen(services: svc, location: widget.location, now: widget.now),
      'leave': OruLeaveScreen(services: svc, now: widget.now),
      // The Principal alone decides leave (ADR-0007); the school refuses anyone else, this only keeps the tab to the person it is for.
      if (widget.state.school.role == 'PRINCIPAL') 'approvals': OruApprovalsScreen(services: svc),
      'more': _AccountPage(services: svc, state: widget.state),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: ListenableBuilder(listenable: _inbox, builder: (context, _) => OruBottomNav(
        label: s.appStaff,
        active: _tab,
        onChanged: (k) => setState(() => _tab = k),
        items: [
          OruNavItem(key: 'home', label: s.mobTabHome, icon: OruIconName.home),
          OruNavItem(key: 'attendance', label: s.mobTabAttendance, icon: OruIconName.mapPin),
          OruNavItem(key: 'leave', label: s.mobTabLeave, icon: OruIconName.leave),
          if (widget.state.school.role == 'PRINCIPAL') OruNavItem(key: 'approvals', label: s.mobTabApprovals, icon: OruIconName.checkCircle),
          OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more, badge: _inbox.unread, badgeLabel: _inbox.unread > 0 ? s.mobInboxUnread('${_inbox.unread}') : null),
        ],
      )),
    );
  }
}

class _HomePage extends StatefulWidget {
  const _HomePage({required this.services, required this.onOpen});
  final OruServices services;
  final void Function(String tab) onOpen;

  @override
  State<_HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<_HomePage> {
  late final LeaveController _leave = LeaveController(widget.services.store);

  @override
  void dispose() {
    _leave.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final svc = widget.services;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: svc.coordinator.syncNow,
          child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            Semantics(header: true, child: Text(s.mobTabHome, style: text.titleLarge)),
            const SizedBox(height: OruSpacing.space3),
            OruSyncPill(services: svc),
            const SizedBox(height: OruSpacing.space4),
            ListenableBuilder(
              listenable: _leave,
              builder: (context, _) {
                final rows = _leave.view?.rows ?? const <LeaveRow>[];
                final waiting = rows.where((r) => r.status == LeaveStatus.pending).length;
                final saved = rows.where((r) => r.status == LeaveStatus.saved).length;
                return OruCard(
                  child: OruListRow(
                    title: s.mobTodayLeaveTitle,
                    subtitle: saved > 0 ? s.mobTodayLeaveSaved(saved) : (waiting > 0 ? s.mobTodayLeaveWaiting(waiting) : s.mobTodayLeaveNone),
                    leading: const OruIcon(OruIconName.leave, color: OruColors.primaryText),
                    onPressed: () => widget.onOpen('leave'),
                  ),
                );
              },
            ),
            const SizedBox(height: OruSpacing.space4),
            Text(s.mobAnnLatest, style: text.titleMedium),
            const SizedBox(height: OruSpacing.space2),
            StreamBuilder<List<Map<String, dynamic>>>(
              stream: svc.store.watchRecords(kAnnouncement),
              builder: (context, snap) {
                final items = ([...?snap.data]..sort(newestFirst)).take(3).toList();
                if (snap.hasData && items.isEmpty) return OruEmptyState(title: s.navAnnouncements, description: s.mobAnnEmpty, icon: OruIconName.message);
                return Column(children: [
                  for (final a in items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: OruListRow(
                          title: a['title'] as String,
                          subtitle: dateWords(context, a['createdAt'] as String),
                          leading: const OruIcon(OruIconName.message, color: OruColors.primaryText),
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruAnnouncementScreen(announcement: a))),
                        ),
                      ),
                    ),
                ]);
              },
            ),
          ]),
        ),
      ),
    );
  }
}

class _AccountPage extends StatelessWidget {
  const _AccountPage({required this.services, required this.state});
  final OruServices services;
  final SessionActive state;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          OruCard(child: OruListRow(title: s.mobMoreInbox, leading: const OruIcon(OruIconName.bell, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruInboxScreen(services: services))))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobMoreAnnouncements, leading: const OruIcon(OruIconName.message, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => Scaffold(appBar: AppBar(title: Text(s.mobMoreAnnouncements)), body: OruAnnouncementsScreen(services: services)))))),
          const SizedBox(height: OruSpacing.space4),
          OruAccountPanel(session: services.session, state: state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
        ]),
      ),
    );
  }
}
