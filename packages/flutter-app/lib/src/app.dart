import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'services.dart';

/// The app both phone apps share until their own screens arrive: sign-in, school choice, the lock, and a signed-in home with the
/// sync status and the account panel. [title] picks the app's name from the catalogue.
class OruStaffApp extends StatelessWidget {
  const OruStaffApp({super.key, required this.services, required this.title, this.home, this.locale = const Locale(OruLocales.defaultCode)});

  final OruServices services;

  /// The app once a school is open. Without it, the generic signed-in home (account and sync) is shown.
  final Widget Function(BuildContext context, OruServices services, SessionActive state)? home;
  final String Function(OruStrings) title;

  /// An explicit choice (ADR-0006), never the device language.
  final Locale locale;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: locale,
      onGenerateTitle: (context) => title(OruStrings.of(context)),
      debugShowCheckedModeBanner: false,
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(locale: locale),
      builder: oruAppBuilder(),
      home: Builder(builder: (context) {
        final s = OruStrings.of(context);
        services.lockReason.value = s.mobLockBody;
        return OruSessionGate(
          session: services.session,
          lock: services.lock,
          title: title(s),
          appVerificationToken: () async => services.config.appCheckToken,
          signedIn: (context, st) => home?.call(context, services, st) ?? OruSignedInHome(services: services, state: st),
        );
      }),
    );
  }
}

/// The first signed-in screen: who, where, how sync is doing. The feature screens replace the placeholder as they ship.
class OruSignedInHome extends StatefulWidget {
  const OruSignedInHome({super.key, required this.services, required this.state});
  final OruServices services;
  final SessionActive state;

  @override
  State<OruSignedInHome> createState() => _OruSignedInHomeState();
}

class _OruSignedInHomeState extends State<OruSignedInHome> {
  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final svc = widget.services;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: svc.coordinator.syncNow,
          child: ListView(
            padding: const EdgeInsets.all(OruSpacing.space4),
            children: [
              StreamBuilder<SyncSnapshot>(
                stream: svc.coordinator.watch(),
                builder: (context, snap) {
                  final shot = snap.data;
                  final state = shot == null ? OruSyncState.synced : oruSyncStateOf(shot.state);
                  final troubled = shot != null && shot.state != SyncState.synced && shot.state != SyncState.saved;
                  return OruAccountPanel(
                    session: svc.session,
                    state: widget.state,
                    lock: svc.lock,
                    syncStatus: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: OruSyncStatus(
                        state: state,
                        pendingCount: shot?.owed ?? 0,
                        banner: troubled,
                        actionLabel: state == OruSyncState.failed ? s.actionRetry : null,
                        onAction: state == OruSyncState.failed ? () => svc.coordinator.syncNow() : null,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: OruSpacing.space5),
              OruEmptyState(title: s.mobHomeSoonTitle, description: s.mobHomeSoonBody, icon: OruIconName.home),
            ],
          ),
        ),
      ),
    );
  }
}
