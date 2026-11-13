// The Driver app on a REAL simulator or phone against the local gateway and Auth emulator with the demo school: the demo driver signs in, sees the North loop with who rides, starts a trip,
// the phone's position goes to the school (set it with `xcrun simctl location <device> set <lat>,<lng>` and allow location with `xcrun simctl privacy <device> grant location com.oruschools.driver`),
// and the trip is ended. The test holds the trip open for HOLD_SECONDS so a script can watch the school's side (the parent's and the school's view of the bus).
//   flutter test integration_test/trip_flow_test.dart -d <device-id> --dart-define=ORU_GATEWAY_URL=http://127.0.0.1:3100 --dart-define=ORU_AUTH_EMULATOR=127.0.0.1:9099 --dart-define=HOLD_SECONDS=75
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
const _hold = int.fromEnvironment('HOLD_SECONDS', defaultValue: 75);

Future<void> until(WidgetTester tester, Finder f, {int seconds = 30}) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (f.evaluate().isNotEmpty) return;
  }
  fail('never appeared: $f; on screen: ${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data ?? w.textSpan?.toPlainText()).toList()}, exception: ${tester.takeException()}');
}

Future<void> wait(WidgetTester tester, int seconds) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
}

Future<void> shot(WidgetTester tester, String name) async {
  // ignore: avoid_print
  print('SHOT:$name');
  await wait(tester, 2);
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('sign in, see the North loop and who rides, start a trip, the position reaches the school, end the trip', (tester) async {
    const roles = {'DRIVER'};
    final clean = await OruServices.create(_config, allowedRoles: roles);
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final svc = await OruServices.create(_config, allowedRoles: roles, pullTasks: driverAppPullTasks);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appDriver, density: OruDensity.driver, home: (context, svc, st) => OruDriverHome(services: svc, state: st)));
    await until(tester, find.text('Email address'));
    await shot(tester, 'driver-01-sign-in');
    await tester.enterText(find.byType(TextField).at(0), 'driver@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    await until(tester, find.text('Your routes'));
    await until(tester, find.text('North loop'));
    await until(tester, find.text('Synced'));
    await shot(tester, 'driver-02-routes');
    await tester.tap(find.text('North loop'));
    await until(tester, find.text('Start trip'));
    await until(tester, find.textContaining('student'));
    await shot(tester, 'driver-03-route');

    await tester.tap(find.text('Start trip'));
    await until(tester, find.text('Trip in progress'));
    // ignore: avoid_print
    print('TRIP_STARTED');
    await until(tester, find.text('All positions have been sent'), seconds: 40);
    expect(find.textContaining('Location is off'), findsNothing, reason: 'the simulator was given a location');
    await shot(tester, 'driver-04-trip-sending');
    await wait(tester, _hold);
    await shot(tester, 'driver-05-trip-later');

    await tester.tap(find.text('End trip').first);
    await until(tester, find.text('Keep going'));
    await shot(tester, 'driver-06-end-ask');
    await tester.tap(find.text('End trip').last);
    await until(tester, find.text('Your routes'));
    await until(tester, find.text('Synced'), seconds: 40);
    // ignore: avoid_print
    print('TRIP_ENDED');
    await shot(tester, 'driver-07-after');

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
