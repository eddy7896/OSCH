import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import 'services.dart';
import 'sync_pill.dart';
import 'attendance/attendance_screens.dart';
import 'marks/marks_screens.dart';
import 'today/today_screen.dart';

/// The Teacher app once signed in: Today, with the account one tap away. More tabs join it as attendance, marks and leave ship.
class OruTeacherHome extends StatefulWidget {
  const OruTeacherHome({super.key, required this.services, required this.state, this.now});
  final OruServices services;
  final SessionActive state;
  final DateTime Function()? now;

  @override
  State<OruTeacherHome> createState() => _OruTeacherHomeState();
}

class _OruTeacherHomeState extends State<OruTeacherHome> {
  String _tab = 'today';

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
      'today': OruTodayScreen(services: svc, now: widget.now, onOpenAccount: () => setState(() => _tab = 'more'), onOpenAttendance: () => setState(() => _tab = 'attendance')),
      'attendance': OruAttendanceListScreen(services: svc, now: widget.now),
      'marks': OruMarksListScreen(services: svc),
      'more': _MorePage(services: svc, state: widget.state),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: OruBottomNav(
        label: s.appTeacher,
        active: _tab,
        onChanged: (k) => setState(() => _tab = k),
        items: [
          OruNavItem(key: 'today', label: s.mobTodayTitle, icon: OruIconName.home),
          OruNavItem(key: 'attendance', label: s.mobTabAttendance, icon: OruIconName.check),
          OruNavItem(key: 'marks', label: s.mobTabMarks, icon: OruIconName.book),
          OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more),
        ],
      ),
    );
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
