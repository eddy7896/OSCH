// The Staff app's own screens on a REAL simulator or phone against the local gateway and Auth emulator with the demo school:
// the HR manager signs in and lands on Home; Leave shows the leave types she can ask for; Announcements opens; More holds the account.
// Same setup as signin_test.dart.
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _config = OruAppConfig(
  gatewayUrl: String.fromEnvironment('ORU_GATEWAY_URL'),
  firebaseApiKey: 'fake',
  authEmulator: String.fromEnvironment('ORU_AUTH_EMULATOR') == '' ? null : String.fromEnvironment('ORU_AUTH_EMULATOR'),
);

Future<void> until(WidgetTester tester, Finder f, {int seconds = 25}) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (f.evaluate().isNotEmpty) return;
  }
  fail('never appeared: $f');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('the HR manager signs in to Home, sees Leave and Announcements, and finds the account under More', (tester) async {
    const roles = {'STAFF', 'HR_MANAGER', 'BURSAR', 'ACADEMIC_ADMIN', 'PRINCIPAL'};
    final clean = await OruServices.create(_config, allowedRoles: roles);
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final svc = await OruServices.create(_config, allowedRoles: roles, pullTasks: staffPullTasks);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appStaff, home: (context, svc, st) => OruStaffHome(services: svc, state: st)));
    await until(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'hr@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await until(tester, find.text('Latest announcements'));
    await until(tester, find.text('Synced'));

    await tester.tap(find.text('Leave').last);
    await tester.pumpAndSettle();
    await until(tester, find.text('Ask for leave'));
    expect((await svc.store.records(kLeaveType)), isNotEmpty);

    await tester.tap(find.text('Announcements').last);
    await tester.pumpAndSettle();

    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    await until(tester, find.textContaining('Signed in as'));

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
