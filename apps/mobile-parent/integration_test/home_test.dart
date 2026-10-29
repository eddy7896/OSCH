// The Parent app on a REAL simulator or phone against the local gateway and Auth emulator with the demo school: the demo parent signs in and sees
// "How is {child} today?" with the child's lessons and the bus, then finds Notifications and, under More, the account. Same setup as the other apps' tests.
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
  }
  fail('never appeared: $f; on screen: ${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data ?? w.textSpan?.toPlainText()).toList()}, exception: ${tester.takeException()}, widgets: ${tester.allWidgets.map((w) => w.runtimeType.toString()).where((n) => n.startsWith('Oru') || n.contains('Scaffold')).toSet().toList()}');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('the demo parent signs in, sees how her child is today with the bus, and finds notifications and the account under More', (tester) async {
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
    await until(tester, find.textContaining('How is '));
    await tester.scrollUntilVisible(find.textContaining('To school: '), 300, scrollable: find.descendant(of: find.byType(OruChildHomeScreen), matching: find.byType(Scrollable)).first);
    expect(find.textContaining('Driver: Salim Dar'), findsWidgets);
    expect((await svc.store.records(kChild)), hasLength(1));

    await tester.tap(find.text('Notifications').last);
    await tester.pumpAndSettle();
    await until(tester, find.textContaining('notifications'));
    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    await until(tester, find.textContaining('Signed in as'));

    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
