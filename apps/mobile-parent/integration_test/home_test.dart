// The Parent app on a REAL simulator or phone against the local gateway and Auth emulator with the demo school (`bash tools/demo-stack.sh`, or ./start-all.sh).
// The whole first run: the demo parent signs in, is asked to read and agree to the privacy notice before anything about her child opens, agrees, sees how her child is today with the
// bus, reads the notice board (the test expects a pinned notice "Sports day on Friday", posted beforehand by the Academic admin), finds the account, withdraws her consent from
// More, Privacy (the app closes again) and agrees again. Start from a parent who has NOT consented yet (the demo school's own state): after a run, withdraw her consent through the
// gateway (POST /v1/consent {noticeVersion: 1, language: 'en', given: false}) before running it again. `print('SHOT:<name>')` marks the moments a script may photograph (xcrun simctl io <device> screenshot).
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
  fail('never appeared: $f; on screen: ${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data ?? w.textSpan?.toPlainText()).toList()}, exception: ${tester.takeException()}');
}

/// Lets a script photograph the screen: the marker is printed, then the app keeps drawing for a moment.
Future<void> shot(WidgetTester tester, String name) async {
  // ignore: avoid_print
  print('SHOT:$name');
  for (var i = 0; i < 25; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    await Future<void>.delayed(const Duration(milliseconds: 60));
  }
}

Future<void> tapText(WidgetTester tester, String text, {bool last = false}) async {
  // the item may not be built yet (lists build lazily): scroll with the plain finder, then tap the one found
  await tester.scrollUntilVisible(find.text(text), 250, scrollable: find.byType(Scrollable).first);
  await tester.pump();
  await tester.tap(last ? find.text(text).last : find.text(text).first);
}

/// The newest screen's back button (earlier screens stay in the stack, so there can be several).
Future<void> back(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Back').last);
  await tester.pump(const Duration(milliseconds: 600));
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final skip = _config.gatewayUrl.isEmpty || _config.authEmulator == null ? 'give ORU_GATEWAY_URL and ORU_AUTH_EMULATOR as --dart-define' : null;

  testWidgets('first run: sign in, agree to the privacy notice, the child\'s day with the bus, the notice board, withdraw and agree again', (tester) async {
    const roles = {'PARENT'};
    final clean = await OruServices.create(_config, allowedRoles: roles);
    await clean.session.restore();
    await clean.session.signOut(force: true);
    await clean.dispose();

    final svc = await OruServices.create(_config, allowedRoles: roles, pullTasks: parentAppPullTasks);
    await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appParent, home: (context, svc, st) => OruParentHome(services: svc, state: st)));
    await until(tester, find.text('Email address'));
    await shot(tester, 'parent-01-sign-in');
    await tester.enterText(find.byType(TextField).at(0), 'parent@demo.oruschools.example');
    await tester.enterText(find.byType(TextField).at(1), 'demo-pass-2027');
    await tester.tap(find.text('Sign in'));

    // nothing about the child opens before she has agreed
    await until(tester, find.text('Privacy and consent'));
    expect(find.textContaining('How is '), findsNothing);
    await shot(tester, 'parent-02-consent');
    await tapText(tester, 'Continue');
    await until(tester, find.text('Tick the box to continue.'));
    await shot(tester, 'parent-03-consent-needs-box');
    await tapText(tester, 'I have read this and I agree');
    await tapText(tester, 'Continue');

    await until(tester, find.textContaining('How is '));
    expect((await svc.api.consentStatus()).current, isTrue, reason: 'the school holds her answer');
    await until(tester, find.text('Synced'));
    await shot(tester, 'parent-04-home');
    await tester.scrollUntilVisible(find.textContaining('To school: '), 300, scrollable: find.descendant(of: find.byType(OruChildHomeScreen), matching: find.byType(Scrollable)).first);
    expect(find.textContaining('Driver: Salim Dar'), findsWidgets);
    await shot(tester, 'parent-05-home-bus');
    expect((await svc.store.records(kChild)), hasLength(1));

    await tester.tap(find.text('More'));
    await tester.pump(const Duration(milliseconds: 500));
    await tapText(tester, 'Notice board');
    await until(tester, find.text('Sports day on Friday'));
    expect(find.textContaining('Pinned'), findsWidgets);
    await shot(tester, 'parent-06-notice-board');
    await tester.tap(find.text('Sports day on Friday'));
    await until(tester, find.textContaining('Bring your sports kit'));
    await shot(tester, 'parent-07-notice');
    await back(tester);
    await back(tester);

    await tapText(tester, 'Privacy');
    await until(tester, find.textContaining('You agreed on'));
    await shot(tester, 'parent-08-privacy');
    await tapText(tester, 'Withdraw my consent');
    await until(tester, find.textContaining('no longer show your child'));
    await shot(tester, 'parent-09-withdraw-ask');
    await tester.tap(find.text('Withdraw').last);
    await until(tester, find.text('Privacy and consent'));
    expect((await svc.api.consentStatus()).current, isFalse, reason: 'withdrawn at the school');
    expect(find.textContaining('How is '), findsNothing);
    await shot(tester, 'parent-10-closed-again');

    await tapText(tester, 'I have read this and I agree');
    await tapText(tester, 'Continue');
    await until(tester, find.textContaining('Signed in as')); // she was in More when she withdrew, so the app opens on More again
    expect((await svc.api.consentStatus()).current, isTrue);
    await shot(tester, 'parent-11-open-again');
    await tester.tap(find.text('Home').last);
    await until(tester, find.textContaining('How is '));

    await tester.tap(find.text('Notifications').last);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.tap(find.text('More'));
    await until(tester, find.textContaining('Signed in as'));
    await tester.pumpWidget(const SizedBox());
    await svc.session.signOut(force: true);
    await svc.dispose();
  }, skip: skip != null);
}
