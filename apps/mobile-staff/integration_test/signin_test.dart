// Device sign-in on a REAL simulator or phone against the local gateway and Auth emulator with the demo school
// (`bash tools/tests/dart-gateway.sh` with ORU_KEEP=1 starts them), using the phone's real Keychain/Keystore, SQLite file and
// connectivity. Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are given as --dart-define:
//   flutter test integration_test/signin_test.dart -d <device-id> \
//     --dart-define=ORU_GATEWAY_URL=http://127.0.0.1:3200 --dart-define=ORU_AUTH_EMULATOR=127.0.0.1:9099
// (an Android emulator reaches the computer at 10.0.2.2 instead of 127.0.0.1)
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _config = OruAppConfig(
  gatewayUrl: String.fromEnvironment('ORU_GATEWAY_URL'),
  firebaseApiKey: 'fake',
  authEmulator: String.fromEnvironment('ORU_AUTH_EMULATOR') == '' ? null : String.fromEnvironment('ORU_AUTH_EMULATOR'),
);

Future<OruServices> open() => OruServices.create(_config, allowedRoles: const {'STAFF', 'HR_MANAGER', 'BURSAR', 'ACADEMIC_ADMIN', 'PRINCIPAL'});

Future<void> show(WidgetTester tester, OruServices svc) async {
  await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appStaff));
  await tester.pump(const Duration(milliseconds: 500));
}

Future<void> until(WidgetTester tester, Finder f, {int seconds = 20}) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (f.evaluate().isNotEmpty) return;
  }
  fail('never appeared: $f');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('sign in, close the app and open it again (still in), sign out (everything gone)', (tester) async {
    // A run that failed half way leaves its sign-in on the simulator; start from nothing.
    final clean = await open();
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    var svc = await open();
    await show(tester, svc);
    await until(tester, find.text('Email address'));

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'hr@demo.oruschools.example');
    await tester.enterText(fields.at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await until(tester, find.textContaining('Signed in as'));
    expect(find.textContaining('HR manager at'), findsOneWidget);
    await until(tester, find.text('Synced'));

    // The app is closed and opened again: the Keychain still holds the session, the database file is still there.
    await tester.pumpWidget(const SizedBox());
    await svc.dispose();
    svc = await open();
    await show(tester, svc);
    await until(tester, find.textContaining('Signed in as'));
    expect(find.text('Email address'), findsNothing);
    await until(tester, find.text('Synced'));

    // Sign out: asked first, then the sign-in screen is back and the phone holds nothing of them.
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out of this phone?'), findsOneWidget);
    await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Sign out')));
    await until(tester, find.text('Email address'));
    expect(await svc.store.all(), isEmpty);
    expect(await svc.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), isNull);

    await tester.pumpWidget(const SizedBox());
    await svc.dispose();
    svc = await open();
    await show(tester, svc);
    await until(tester, find.text('Email address'));
    await tester.pumpWidget(const SizedBox());
    await svc.dispose();
  }, skip: skip != null);
}
