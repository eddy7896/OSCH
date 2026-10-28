import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import 'app_lock.dart';
import 'identity.dart';
import 'session.dart';

/// The words for a role, in the reader's language (the role's code if the app does not know it).
String oruRoleName(OruStrings s, String role) => switch (role) {
      'PRINCIPAL' => s.rolePrincipal,
      'MANAGEMENT' => s.roleManagement,
      'BURSAR' => s.roleBursar,
      'ACADEMIC_ADMIN' => s.roleAcademicAdmin,
      'SYSTEM_ADMIN' => s.roleSystemAdmin,
      'HR_MANAGER' => s.roleHrManager,
      'ACCOUNTANT' => s.roleAccountant,
      'ADMISSIONS_OFFICER' => s.roleAdmissionsOfficer,
      'TRANSPORT_MANAGER' => s.roleTransportManager,
      'OPERATIONS_MANAGER' => s.roleOperationsManager,
      'TEACHER' => s.roleTeacher,
      'STAFF' => s.roleStaff,
      'DRIVER' => s.roleDriver,
      'PARENT' => s.roleParent,
      _ => role,
    };

/// What the person is told when a sign-in step fails.
String oruAuthErrorText(OruStrings s, Object error) {
  if (error is AuthFailure) {
    return switch (error.code) {
      AuthFailureCode.invalidCredentials => s.authErrorCredentials,
      AuthFailureCode.tooManyAttempts => s.authErrorTooMany,
      AuthFailureCode.network => s.authErrorNetwork,
      AuthFailureCode.invalidCode || AuthFailureCode.codeExpired => s.authErrorCode,
      _ => s.authErrorGeneric,
    };
  }
  if (error is OruApiError && (error.code == 'NETWORK_ERROR' || error.code == 'TIMEOUT')) return s.authErrorNetwork;
  return s.authErrorGeneric;
}

/// Sign in by email and password, or by a code sent to the phone number. Shows the work in progress on the button (signing in is
/// one of the two things that may wait on the network, with payments).
class OruSignInScreen extends StatefulWidget {
  const OruSignInScreen({super.key, required this.session, required this.title, required this.appVerificationToken});
  final DeviceSession session;

  /// The app's name (`OruStrings.appTeacher`).
  final String title;

  /// The proof Firebase wants that a real app asks for a code (the platform's app check). The Auth emulator accepts anything.
  final Future<String> Function() appVerificationToken;

  @override
  State<OruSignInScreen> createState() => _OruSignInScreenState();
}

class _OruSignInScreenState extends State<OruSignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = TextEditingController();
  final _code = TextEditingController();
  bool _byPhone = false;
  String? _sessionInfo;
  bool _busy = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    final s = OruStrings.of(context);
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await action();
    } on NoAccessInThisApp {
      if (mounted) setState(() => _error = s.mobNoAccessTitle);
    } catch (e) {
      if (mounted) setState(() => _error = oruAuthErrorText(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool get _phoneLooksRight => RegExp(r'^\+\d[\d ]{7,}$').hasMatch(_phone.text.trim());

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final signingIn = _busy;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(OruSpacing.space4),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Semantics(header: true, child: Text(widget.title, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space2),
                Text(s.webSignInIntro, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                const SizedBox(height: OruSpacing.space5),
                if (_error != null) ...[
                  OruBanner(title: _error!, tone: OruTone.danger, message: _error == s.mobNoAccessTitle ? s.webNoAccessBody : null),
                  const SizedBox(height: OruSpacing.space4),
                ],
                if (_notice != null) ...[OruBanner(title: _notice!, tone: OruTone.info), const SizedBox(height: OruSpacing.space4)],
                if (!_byPhone) ..._emailFields(s) else ..._phoneFields(s),
                const SizedBox(height: OruSpacing.space4),
                Center(
                  child: OruLinkAction(
                    label: _byPhone ? s.actionSignInEmail : s.actionSignInPhone,
                    onPressed: signingIn
                        ? null
                        : () => setState(() {
                              _byPhone = !_byPhone;
                              _error = null;
                              _notice = null;
                              _sessionInfo = null;
                            }),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _emailFields(OruStrings s) => [
        OruTextField(label: s.authEmailLabel, controller: _email, keyboardType: TextInputType.emailAddress, textDirection: TextDirection.ltr, enabled: !_busy),
        const SizedBox(height: OruSpacing.space4),
        OruTextField(label: s.authPasswordLabel, controller: _password, obscureText: true, textDirection: TextDirection.ltr, enabled: !_busy),
        const SizedBox(height: OruSpacing.space2),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: OruLinkAction(
            label: s.authForgot,
            onPressed: _busy
                ? null
                : () async {
                    if (_email.text.trim().isEmpty) {
                      setState(() => _error = s.authResetNeedsEmail);
                      return;
                    }
                    await _run(() async {
                      try {
                        await widget.session.sendPasswordReset(_email.text.trim());
                      } on AuthFailure catch (e) {
                        // The same answer whether or not the address has an account: nobody learns which do.
                        if (e.code == AuthFailureCode.network) rethrow;
                      }
                      if (mounted) setState(() => _notice = s.authResetSent);
                    });
                  },
          ),
        ),
        const SizedBox(height: OruSpacing.space4),
        OruButton(
          label: _busy ? s.authSigningIn : s.actionSignIn,
          variant: OruButtonVariant.primary,
          block: true,
          onPressed: _busy ? null : () => _run(() => widget.session.signInWithPassword(_email.text.trim(), _password.text)),
        ),
      ];

  List<Widget> _phoneFields(OruStrings s) {
    final sent = _sessionInfo != null;
    return [
      OruTextField(label: s.authPhoneLabel, hint: s.authPhoneHint.replaceFirst('+91 98765 43210', '\u2066+91 98765 43210\u2069'), // the example number keeps its own direction in right-to-left text
         controller: _phone, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, enabled: !_busy && !sent, icon: OruIconName.phone),
      if (sent) ...[
        const SizedBox(height: OruSpacing.space2),
        Text(s.mobCodeSentTo('\u2066${_phone.text.trim()}\u2069'), // the number keeps its own direction inside a right-to-left sentence
             style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: OruSpacing.space4),
        OruTextField(label: s.authCodeLabel, controller: _code, keyboardType: TextInputType.number, textDirection: TextDirection.ltr, enabled: !_busy),
        const SizedBox(height: OruSpacing.space4),
        OruButton(
          label: _busy ? s.authSigningIn : s.actionVerifyCode,
          variant: OruButtonVariant.primary,
          block: true,
          onPressed: _busy ? null : () => _run(() => widget.session.confirmPhoneCode(_sessionInfo!, _code.text.trim())),
        ),
        const SizedBox(height: OruSpacing.space2),
        Center(child: OruLinkAction(label: s.mobActionChangeNumber, onPressed: _busy ? null : () => setState(() => _sessionInfo = null))),
      ] else ...[
        const SizedBox(height: OruSpacing.space4),
        OruButton(
          label: s.actionSendCode,
          variant: OruButtonVariant.primary,
          block: true,
          onPressed: _busy
              ? null
              : () {
                  if (!_phoneLooksRight) {
                    setState(() => _error = s.authErrorPhone);
                    return;
                  }
                  _run(() async {
                    final info = await widget.session.sendPhoneCode(_phone.text.trim(), await widget.appVerificationToken());
                    if (mounted) setState(() => _sessionInfo = info);
                  });
                },
        ),
      ],
    ];
  }
}

/// Several schools fit this app: the person picks one.
class OruSchoolChoiceScreen extends StatelessWidget {
  const OruSchoolChoiceScreen({super.key, required this.session, required this.state});
  final DeviceSession session;
  final SessionChoosingSchool state;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(OruSpacing.space4),
          children: [
            Semantics(header: true, child: Text(s.mobSchoolChoiceTitle, style: text.titleLarge)),
            const SizedBox(height: OruSpacing.space2),
            Text(s.mobSchoolChoiceBody, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
            const SizedBox(height: OruSpacing.space4),
            for (final o in state.options)
              OruCard(
                child: OruListRow(
                  title: o.name,
                  subtitle: oruRoleName(s, o.role),
                  leading: OruAvatar(name: o.name),
                  onPressed: () => session.chooseSchool(o.id),
                ),
              ),
            const SizedBox(height: OruSpacing.space4),
            OruButton(label: s.actionSignOut, icon: OruIconName.x, onPressed: () => session.signOut(force: true)),
          ],
        ),
      ),
    );
  }
}

/// The optional app lock, closed: nothing of the work is shown until the phone confirms the person.
class OruLockScreen extends StatefulWidget {
  const OruLockScreen({super.key, required this.lock});
  final AppLock lock;

  @override
  State<OruLockScreen> createState() => _OruLockScreenState();
}

class _OruLockScreenState extends State<OruLockScreen> {
  bool _failed = false;

  Future<void> _unlock() async {
    final ok = await widget.lock.unlock();
    if (mounted && !ok) setState(() => _failed = true);
  }

  @override
  void initState() {
    super.initState();
    // Ask as soon as the lock appears; the button is for a second try.
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(OruSpacing.space4),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              OruEmptyState(title: s.mobLockTitle, description: s.mobLockBody, icon: OruIconName.device),
              if (_failed) ...[OruBanner(title: s.mobUnlockFailed, tone: OruTone.warning), const SizedBox(height: OruSpacing.space4)],
              OruButton(label: s.mobActionUnlock, variant: OruButtonVariant.primary, onPressed: _unlock),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Asks before signing out, and says what would be lost.
Future<void> oruConfirmSignOut(BuildContext context, DeviceSession session) async {
  final s = OruStrings.of(context);
  final owed = await session.owedChanges?.call() ?? 0;
  if (!context.mounted) return;
  final go = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(s.mobSignOutTitle),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(s.mobSignOutBody),
        if (owed > 0) ...[const SizedBox(height: OruSpacing.space3), Text(s.mobSignOutOwed(owed), style: TextStyle(color: OruColors.dangerFg, fontWeight: FontWeight.w600))],
      ]),
      actions: [
        OruButton(label: s.mobActionStaySignedIn, variant: OruButtonVariant.secondary, onPressed: () => Navigator.pop(ctx, false)),
        OruButton(label: owed > 0 ? s.mobActionSignOutAnyway : s.actionSignOut, variant: OruButtonVariant.danger, onPressed: () => Navigator.pop(ctx, true)),
      ],
    ),
  );
  if (go == true) await session.signOut(force: true);
}

/// Who is signed in, where, the app-lock switch and sign out. The More screen of the apps will hold this; until then it is the
/// signed-in home.
class OruAccountPanel extends StatefulWidget {
  const OruAccountPanel({super.key, required this.session, required this.state, this.lock, this.syncStatus});
  final DeviceSession session;
  final SessionActive state;
  final AppLock? lock;

  /// The app's `OruSyncStatus`, built from the sync coordinator (flutter-auth knows nothing of sync).
  final Widget? syncStatus;

  @override
  State<OruAccountPanel> createState() => _OruAccountPanelState();
}

class _OruAccountPanelState extends State<OruAccountPanel> {
  bool _noLockOnPhone = false;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final st = widget.state;
    final name = st.account.displayName?.trim().isNotEmpty == true ? st.account.displayName! : st.account.email;
    final lock = widget.lock;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      OruCard(
        child: OruListRow(
          title: s.mobSignedInAs(name),
          subtitle: s.mobSchoolRole(oruRoleName(s, st.school.role), st.school.name),
          leading: OruAvatar(name: name),
        ),
      ),
      if (widget.syncStatus != null) ...[const SizedBox(height: OruSpacing.space3), widget.syncStatus!],
      if (st.needsNetworkSignIn) ...[const SizedBox(height: OruSpacing.space3), OruBanner(title: s.syncOffline, tone: OruTone.neutral, icon: OruIconName.cloudOff)],
      if (lock != null) ...[
        const SizedBox(height: OruSpacing.space4),
        OruCheckbox(
          label: s.mobAppLockTitle,
          description: _noLockOnPhone ? s.mobAppLockUnavailable : s.mobAppLockBody,
          value: lock.enabled,
          onChanged: (on) async {
            if (on) {
              final ok = await lock.enable();
              _noLockOnPhone = !ok && !await lock.port.isAvailable();
            } else {
              await lock.disable();
              _noLockOnPhone = false;
            }
            if (mounted) setState(() {});
          },
        ),
      ],
      const SizedBox(height: OruSpacing.space4),
      OruButton(label: s.actionSignOut, icon: OruIconName.x, onPressed: () => oruConfirmSignOut(context, widget.session)),
    ]);
  }
}

/// Decides what the person sees: the opening moment, sign-in, the school choice, the lock, or the app itself.
class OruSessionGate extends StatefulWidget {
  const OruSessionGate({
    super.key,
    required this.session,
    required this.title,
    required this.appVerificationToken,
    required this.signedIn,
    this.lock,
  });
  final DeviceSession session;
  final String title;
  final Future<String> Function() appVerificationToken;

  /// The app, shown once a school is open (and the lock, if any, is open).
  final Widget Function(BuildContext context, SessionActive state) signedIn;
  final AppLock? lock;

  @override
  State<OruSessionGate> createState() => _OruSessionGateState();
}

class _OruSessionGateState extends State<OruSessionGate> with WidgetsBindingObserver {
  bool _restored = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    () async {
      await widget.lock?.restore();
      await widget.session.restore();
      if (mounted) setState(() => _restored = true);
    }();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) widget.lock?.onBackgrounded();
    if (state == AppLifecycleState.resumed) widget.lock?.onResumed();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    if (!_restored) {
      return Scaffold(body: Center(child: Text(s.mobOpening, style: Theme.of(context).textTheme.bodyLarge)));
    }
    return StreamBuilder<SessionState>(
      stream: widget.session.changes,
      initialData: widget.session.state,
      builder: (context, snap) {
        final st = snap.data ?? widget.session.state;
        return switch (st) {
          SessionSignedOut() => OruSignInScreen(session: widget.session, title: widget.title, appVerificationToken: widget.appVerificationToken),
          SessionChoosingSchool() => OruSchoolChoiceScreen(session: widget.session, state: st),
          SessionActive() => widget.lock == null
              ? widget.signedIn(context, st)
              : StreamBuilder<bool>(
                  stream: widget.lock!.lockedChanges,
                  initialData: widget.lock!.locked,
                  builder: (context, lockSnap) => (lockSnap.data ?? false) ? OruLockScreen(lock: widget.lock!) : widget.signedIn(context, st),
                ),
        };
      },
    );
  }
}
