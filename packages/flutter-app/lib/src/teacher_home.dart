import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import 'services.dart';
import 'sync_pill.dart';
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
  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
  }

  @override
  Widget build(BuildContext context) {
    return OruTodayScreen(
      services: widget.services,
      now: widget.now,
      onOpenAccount: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _AccountPage(services: widget.services, state: widget.state))),
    );
  }
}

class _AccountPage extends StatefulWidget {
  const _AccountPage({required this.services, required this.state});
  final OruServices services;
  final SessionActive state;

  @override
  State<_AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<_AccountPage> {
  StreamSubscription<SessionState>? _watch;

  @override
  void initState() {
    super.initState();
    // Signing out (or losing the school) from here must not leave this page on top of the sign-in screen.
    _watch = widget.services.session.changes.listen((st) {
      if (st is! SessionActive && mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    });
  }

  @override
  void dispose() {
    _watch?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final services = widget.services;
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Row(children: [
            OruLinkAction(label: s.actionBack, onPressed: () => Navigator.of(context).pop()),
          ]),
          OruAccountPanel(session: services.session, state: widget.state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
        ]),
      ),
    );
  }
}
