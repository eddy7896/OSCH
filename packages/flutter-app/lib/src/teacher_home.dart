import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import 'services.dart';
import 'sync_pill.dart';
import 'attendance/attendance_screens.dart';
import 'checkin/checkin_data.dart';
import 'checkin/checkin_screen.dart';
import 'classes/classes_screens.dart';
import 'inbox/inbox_data.dart';
import 'inbox/inbox_screen.dart';
import 'leave/leave_screens.dart';
import 'marks/marks_screens.dart';
import 'resources/resources_screen.dart';
import 'studentleave/studentleave_screen.dart';
import 'today/today_screen.dart';

/// The Teacher app once signed in: Today, with the account one tap away. More tabs join it as attendance, marks and leave ship.
class OruTeacherHome extends StatefulWidget {
  const OruTeacherHome({super.key, required this.services, required this.state, this.now, this.location = const GeolocatorLocation()});
  final OruServices services;
  final SessionActive state;
  final DateTime Function()? now;

  /// Where the phone is, for her own check-in. Tests give a fixed one.
  final LocationPort location;

  @override
  State<OruTeacherHome> createState() => _OruTeacherHomeState();
}

class _OruTeacherHomeState extends State<OruTeacherHome> {
  String _tab = 'today';
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

  /// Her own check-in and check-out, on its own page.
  void _openCheckIn() => Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (_) => Scaffold(appBar: AppBar(title: Text(OruStrings.of(context).mobCiCardTitle)), body: OruCheckInScreen(services: widget.services, location: widget.location, now: widget.now)),
      ));

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final svc = widget.services;
    final pages = <String, Widget>{
      'today': OruTodayScreen(services: svc, now: widget.now, onOpenAccount: () => setState(() => _tab = 'more'), onOpenAttendance: () => setState(() => _tab = 'attendance'), onOpenCheckIn: _openCheckIn),
      'attendance': OruAttendanceListScreen(services: svc, now: widget.now),
      'marks': OruMarksListScreen(services: svc),
      'leave': OruLeaveScreen(services: svc, now: widget.now),
      'more': _MorePage(services: svc, state: widget.state, onOpenCheckIn: _openCheckIn),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: ListenableBuilder(listenable: _inbox, builder: (context, _) => OruBottomNav(
        label: s.appTeacher,
        active: _tab,
        onChanged: (k) => setState(() => _tab = k),
        items: [
          OruNavItem(key: 'today', label: s.mobTodayTitle, icon: OruIconName.home),
          OruNavItem(key: 'attendance', label: s.mobTabAttendance, icon: OruIconName.check),
          OruNavItem(key: 'marks', label: s.mobTabMarks, icon: OruIconName.book),
          OruNavItem(key: 'leave', label: s.mobTabLeave, icon: OruIconName.leave),
          OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more, badge: _inbox.unread, badgeLabel: _inbox.unread > 0 ? s.mobInboxUnread('${_inbox.unread}') : null),
        ],
      )),
    );
  }
}

class _MorePage extends StatelessWidget {
  const _MorePage({required this.services, required this.state, required this.onOpenCheckIn});
  final OruServices services;
  final SessionActive state;
  final VoidCallback onOpenCheckIn;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          OruCard(child: OruListRow(title: s.mobCiOpen, leading: const OruIcon(OruIconName.mapPin, color: OruColors.primaryText), onPressed: onOpenCheckIn)),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobMoreInbox, leading: const OruIcon(OruIconName.bell, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruInboxScreen(services: services))))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobMoreClasses, leading: const OruIcon(OruIconName.users, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruClassesScreen(services: services))))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobMoreCover, leading: const OruIcon(OruIconName.calendar, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruCoverScreen(services: services))))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobRsTitle, leading: const OruIcon(OruIconName.book, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruResourcesScreen(services: services, userId: state.account.userId))))),
          const SizedBox(height: OruSpacing.space2),
          OruCard(child: OruListRow(title: s.mobSlTitle, leading: const OruIcon(OruIconName.leave, color: OruColors.primaryText), onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruStudentLeaveScreen(services: services))))),
          const SizedBox(height: OruSpacing.space4),
          OruAccountPanel(session: services.session, state: state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
        ]),
      ),
    );
  }
}
