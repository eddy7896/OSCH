import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import 'package:flutter_sync/flutter_sync.dart';

import '../announcements/announcements_data.dart';
import '../announcements/announcements_screens.dart';
import '../leave/leave_data.dart';
import '../leave/leave_model.dart';
import '../leave/leave_screens.dart';
import '../services.dart';
import '../sync_pill.dart';

/// What the Staff app pulls: her leave (requests, types, balances) and the school's announcements.
List<PullTask> staffPullTasks(OruApi api) => [...leavePullTasks(api, cover: false, ownRequests: true), ...announcementsPullTasks(api)];

/// The Staff app once signed in: Home, Leave, Announcements, More (the account). Check-in and the Principal's approvals join it next.
class OruStaffHome extends StatefulWidget {
  const OruStaffHome({super.key, required this.services, required this.state, this.now});
  final OruServices services;
  final SessionActive state;
  final DateTime Function()? now;

  @override
  State<OruStaffHome> createState() => _OruStaffHomeState();
}

class _OruStaffHomeState extends State<OruStaffHome> {
  String _tab = 'home';

  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final svc = widget.services;
    final pages = <String, Widget>{
      'home': _HomePage(services: svc, onOpen: (tab) => setState(() => _tab = tab)),
      'leave': OruLeaveScreen(services: svc, now: widget.now),
      'announcements': OruAnnouncementsScreen(services: svc),
      'more': _AccountPage(services: svc, state: widget.state),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: OruBottomNav(
        label: s.appStaff,
        active: _tab,
        onChanged: (k) => setState(() => _tab = k),
        items: [
          OruNavItem(key: 'home', label: s.mobTabHome, icon: OruIconName.home),
          OruNavItem(key: 'leave', label: s.mobTabLeave, icon: OruIconName.leave),
          OruNavItem(key: 'announcements', label: s.navAnnouncements, icon: OruIconName.message),
          OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more),
        ],
      ),
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
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          OruAccountPanel(session: services.session, state: state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
        ]),
      ),
    );
  }
}
