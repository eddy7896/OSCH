import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_core/flutter_core.dart';

/// Language for development and device testing: `flutter run --dart-define=ORU_LOCALE=ur`. An explicit choice, as ADR-0006
/// requires; an unsupported code resolves to English. Production builds use English until the language picker ships.
const _locale = String.fromEnvironment('ORU_LOCALE', defaultValue: OruLocales.defaultCode);

/// The roles this app is for (ADR-0014 decision 1).
const _roles = <String>{'STAFF', 'HR_MANAGER', 'BURSAR', 'ACADEMIC_ADMIN', 'PRINCIPAL'};

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = OruAppConfig.fromEnvironment();
  if (config.problems.isNotEmpty) {
    // Not configured (a plain `flutter run`): show the themed shell and say why in the log, instead of a sign-in that cannot work.
    debugPrint('Not configured: ${config.problems.join('; ')}. See OruAppConfig for the --dart-define values.');
    runApp(const StaffApp(locale: Locale(_locale)));
    return;
  }
  final services = await OruServices.create(config, allowedRoles: _roles, pullTasks: staffPullTasks);
  runApp(OruStaffApp(services: services, title: (s) => s.appStaff, locale: const Locale(_locale), home: (context, svc, st) => OruStaffHome(services: svc, state: st)));
}

class StaffApp extends StatelessWidget {
  /// English is the primary language; another language is an explicit choice (ADR-0006), passed here once a language
  /// picker exists (Phase 4). The device language is not adopted automatically.
  const StaffApp({super.key, this.locale = const Locale(OruLocales.defaultCode)});

  final Locale locale;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: locale,
      onGenerateTitle: (context) => OruStrings.of(context).appStaff,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(),
      builder: oruAppBuilder(),
      home: const _FoundationScreen(),
    );
  }
}

/// Placeholder until the first real screen ships (see documentation/implementation_plan.md).
class _FoundationScreen extends StatelessWidget {
  const _FoundationScreen();

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final strings = OruStrings.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(OruSpacing.space4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, // "start" follows the text direction (right edge in RTL)
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(strings.appStaff, style: text.titleLarge),
              const SizedBox(height: OruSpacing.space2),
              Text(strings.scaffoldNotice, style: text.bodyLarge?.copyWith(color: OruColors.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
