// The Parent app's "Where is the bus?" on a REAL simulator or phone against the local gateway and Auth emulator with the demo school (`bash tools/demo-stack.sh`).
// The demo parent opens the bus screen while no bus runs ("not on a trip right now"), and then a script plays the driver through the gateway (start a trip, a position before the child's
// stop, a position at it, end the trip) while the screen stays open: the test expects the estimate, then "has passed", then no bus again. It prints BUS_OPEN when the screen is up (the script
// starts on that line) and SHOT:<name> for screenshots. The stops of the North loop need positions first (the Transport screen's Latitude and Longitude fields).
//   flutter test integration_test/bus_test.dart -d <device-id> --dart-define=ORU_GATEWAY_URL=http://127.0.0.1:3100 --dart-define=ORU_AUTH_EMULATOR=127.0.0.1:9099
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _config = OruAppConfig(
  gatewayUrl: String.fromEnvironment('ORU_GATEWAY_URL'),
  firebaseApiKey: 'fake',
  authEmulator: String.fromEnvironment('ORU_AUTH_EMULATOR') == '' ? null : String.fromEnvironment('ORU_AUTH_EMULATOR'),
);

Future<void> until(WidgetTester tester, Finder f, {int seconds = 30}) async {
  for (var i = 0; i < seconds * 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (f.evaluate().isNotEmpty) return;
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
  fail('never appeared: $f; on screen: ${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data ?? w.textSpan?.toPlainText()).toList()}, exception: ${tester.takeException()}');
}

Future<void> shot(WidgetTester tester, String name) async {
  // ignore: avoid_print
  print('SHOT:$name');
  for (var i = 0; i < 25; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    await Future<void>.delayed(const Duration(milliseconds: 60));
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('the parent watches the bus: none, then on its way with an estimate, then it has passed her child\'s stop, then none again', (tester) async {
    const roles = {'PARENT'};
    final clean = await OruServices.create(_config, allowedRoles: roles);
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final svc = await OruServices.create(_config, allowedRoles: roles, pullTasks: parentAppPullTasks);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appParent, home: (context, svc, st) => OruParentHome(services: svc, state: st)));
    await until(tester, find.text('Email address'));
    await tester.enterText(find.byType(TextField).at(0), 'parent@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));
    // she may be asked to agree first (the demo school starts with no consent)
    await until(tester, find.byWidgetPredicate((w) => w is Text && ((w.data ?? '').startsWith('How is ') || w.data == 'Privacy and consent')));
    if (find.text('Privacy and consent').evaluate().isNotEmpty) {
      await tester.scrollUntilVisible(find.text('I have read this and I agree'), 250, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('I have read this and I agree'));
      await tester.scrollUntilVisible(find.text('Continue'), 250, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Continue'));
      await until(tester, find.textContaining('How is '));
    }
    await until(tester, find.text('Synced'));
    await tester.scrollUntilVisible(find.text('Where is the bus?'), 300, scrollable: find.descendant(of: find.byType(OruChildHomeScreen), matching: find.byType(Scrollable)).first);
    await tester.tap(find.text('Where is the bus?'));
    await until(tester, find.textContaining('not on a trip right now'));
    await shot(tester, 'bus-01-none');
    // ignore: avoid_print
    print('BUS_OPEN');

    // the driver starts the trip and the bus is 180 m before the first stop: the screen follows within one refresh (30 seconds)
    await until(tester, find.textContaining('about'), seconds: 75);
    expect(find.textContaining('Salim Dar'), findsOneWidget);
    expect(find.textContaining('rough estimate'), findsOneWidget);
    await shot(tester, 'bus-02-on-its-way');
    // the bus reaches the child's stop (Market)
    await until(tester, find.textContaining('has passed'), seconds: 90);
    await shot(tester, 'bus-03-passed');
    expect(find.textContaining('Reached'), findsWidgets);
    // the trip ends
    await until(tester, find.textContaining('not on a trip right now'), seconds: 90);
    await shot(tester, 'bus-04-ended');
    // ignore: avoid_print
    print('BUS_DONE');

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
