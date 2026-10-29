// The Staff app's own screens on a REAL simulator or phone against the local gateway and Auth emulator with the demo school:
// the clerk signs in and lands on Home, checks in and out from the Attendance tab (location allowed beforehand, the simulator's position
// set: `xcrun simctl privacy <id> grant location com.oruschools.staff` and `xcrun simctl location <id> set 12.9716,77.5946`), sees Leave,
// and finds Announcements and the account under More. Same setup as signin_test.dart.
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

  testWidgets('the clerk signs in to Home, checks in and out, sees Leave, and finds Announcements and the account under More', (tester) async {
    const roles = {'STAFF', 'HR_MANAGER', 'BURSAR', 'ACADEMIC_ADMIN', 'PRINCIPAL'};
    final clean = await OruServices.create(_config, allowedRoles: roles);
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final svc = await OruServices.create(_config, allowedRoles: roles, pullTasks: staffPullTasks);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appStaff, home: (context, svc, st) => OruStaffHome(services: svc, state: st)));
    await until(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'office@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await until(tester, find.text('Latest announcements'));
    await until(tester, find.text('Synced'));

    await tester.tap(find.text('Attendance').last);
    await tester.pumpAndSettle();
    // The demo clerk is not in today on a fresh stack; a day already made on this stack (an earlier run) is left as it is.
    await until(tester, find.byWidgetPredicate((w) => w is Text && ((w.data ?? '').startsWith('You have not checked in') || (w.data ?? '').startsWith('Checked in at'))));
    if (find.text('Check in').evaluate().isNotEmpty) {
      await tester.tap(find.text('Check in'));
      await until(tester, find.textContaining('Checked in at'), seconds: 40); // the phone finds its position, saves, and the school stamps it
    }
    if (find.text('Check out').evaluate().isNotEmpty) {
      await tester.tap(find.text('Check out'));
      await until(tester, find.textContaining('Checked out at'), seconds: 40);
    }
    expect(await svc.store.all(), isEmpty, reason: 'everything reached the school');

    await tester.tap(find.text('Leave').last);
    await tester.pumpAndSettle();
    await until(tester, find.text('Ask for leave'));
    expect((await svc.store.records(kLeaveType)), isNotEmpty);

    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    await until(tester, find.textContaining('Signed in as'));
    await tester.tap(find.text('Announcements').last);
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Notifications').last);
    await tester.pumpAndSettle();
    await until(tester, find.byType(OruInboxScreen));

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
