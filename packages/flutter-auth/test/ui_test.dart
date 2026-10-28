import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

class FakePort implements DeviceLockPort {
  bool available = true;
  bool passes = true;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<bool> authenticate() async => passes;
}

Widget app(Widget home, {String locale = 'en'}) => MaterialApp(
      locale: Locale(locale),
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(locale: Locale(locale)),
      home: home,
    );

Widget gate(Rig t, {AppLock? lock, String locale = 'en'}) => app(
      OruSessionGate(
        session: t.session,
        lock: lock,
        title: 'OruSchools Teacher',
        appVerificationToken: () async => 'emulator',
        signedIn: (context, st) => Scaffold(body: SingleChildScrollView(child: OruAccountPanel(session: t.session, state: st, lock: lock))),
      ),
      locale: locale,
    );


Future<void> fillAndSignIn(WidgetTester tester, {String email = 'ann@x.test', String pw = 'pw'}) async {
  final fields = find.byType(TextField);
  await tester.enterText(fields.at(0), email);
  await tester.enterText(fields.at(1), pw);
  await tester.tap(find.text('Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(360 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('opens, shows the sign-in screen, and a right password lands in the app with the school and role named', (tester) async {
    phone(tester);
    final t = Rig();
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    expect(find.text('OruSchools Teacher'), findsOneWidget);
    expect(find.text('Email address'), findsOneWidget);
    await fillAndSignIn(tester);
    expect(find.text('Signed in as Ann'), findsOneWidget);
    expect(find.text('Teacher at School s1'), findsOneWidget);
    expect(find.text('Sign out'), findsOneWidget);
  });

  testWidgets('a wrong password says so in the person\'s words and keeps the screen', (tester) async {
    phone(tester);
    final t = Rig();
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await fillAndSignIn(tester, pw: 'nope');
    expect(find.text('The email or password is not correct.'), findsOneWidget);
    expect(find.text('Email address'), findsOneWidget);
  });

  testWidgets('an account with no school in this app is told so, with what to do', (tester) async {
    phone(tester);
    final t = Rig();
    t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s1', 'DRIVER')]);
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await fillAndSignIn(tester);
    expect(find.text('This account cannot use this app'), findsOneWidget);
    expect(find.text('Ask your school\'s administrator to add you, then sign in again.'), findsOneWidget);
  });

  testWidgets('forgot password: asks for the email first, then gives the same answer for any address', (tester) async {
    phone(tester);
    final t = Rig();
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    expect(find.text('Enter your email address first.'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(0), 'nobody@x.test');
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    expect(find.text('If an account exists for that address, an email to set a new password is on its way.'), findsOneWidget);
  });

  testWidgets('a phone number: checked first, then a code, a wrong code is refused, the right one signs in', (tester) async {
    phone(tester);
    final t = Rig();
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Use a mobile number instead'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), '98765');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(find.text('Enter the number with its country code.'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(0), '+91 98765 43210');
    await tester.tap(find.text('Send code'));
    await tester.pumpAndSettle();
    expect(find.textContaining('+91 98765 43210'), findsWidgets);
    expect(find.textContaining('We sent a code to'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(1), '000000');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();
    expect(find.text('That code is not correct or has expired.'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(1), '123456');
    await tester.tap(find.text('Verify code'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out'), findsOneWidget);
  });

  testWidgets('several schools: the list names each school and the role there; choosing one opens it', (tester) async {
    phone(tester);
    final t = Rig();
    t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: 'Ann', schools: [school('s1', 'TEACHER', name: 'Greenfield'), school('s2', 'TEACHER', name: 'Riverside')]);
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await fillAndSignIn(tester);
    expect(find.text('Choose your school'), findsOneWidget);
    expect(find.text('Greenfield s1'), findsOneWidget);
    expect(find.text('Teacher'), findsNWidgets(2));
    await tester.tap(find.text('Riverside s2'));
    await tester.pumpAndSettle();
    expect(t.session.schoolId, 's2');
    expect(find.text('Teacher at Riverside s2'), findsOneWidget);
  });

  testWidgets('a saved session opens straight into the app, and says it is offline when it could not refresh', (tester) async {
    phone(tester);
    final t = Rig();
    await t.session.signInWithPassword('ann@x.test', 'pw');
    t.identity.refreshFails = const AuthFailure(AuthFailureCode.network);
    t.session = t.make();
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    expect(find.text('Signed in as Ann'), findsOneWidget);
    expect(find.text('You’re offline'), findsOneWidget);
  });

  testWidgets('sign out asks first, says how many changes would be lost, and "stay" keeps everything', (tester) async {
    phone(tester);
    final t = Rig();
    t.owed = 2;
    await tester.pumpWidget(gate(t));
    await tester.pumpAndSettle();
    await fillAndSignIn(tester);
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out of this phone?'), findsOneWidget);
    expect(find.text('2 changes have not reached the school yet and will be lost.'), findsOneWidget);
    await tester.tap(find.text('Stay signed in'));
    await tester.pumpAndSettle();
    expect(t.session.state, isA<SessionActive>());
    expect(t.wipes, 0);
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out anyway'));
    await tester.pumpAndSettle();
    expect(t.session.state, isA<SessionSignedOut>());
    expect(t.wipes, 1);
    expect(find.text('Email address'), findsOneWidget);
  });

  testWidgets('the app lock: switched on only by passing the phone\'s check; after a long absence the work is hidden until it is passed', (tester) async {
    phone(tester);
    final t = Rig();
    final port = FakePort();
    int now = 1000;
    final lock = AppLock(port: port, storage: MemorySecureStorage(), graceMs: 60000, nowMs: () => now);
    await tester.pumpWidget(gate(t, lock: lock));
    await tester.pumpAndSettle();
    await fillAndSignIn(tester);
    port.available = false;
    await tester.tap(find.text('Ask for my fingerprint, face or screen lock'));
    await tester.pumpAndSettle();
    expect(find.text('This phone has no screen lock set up.'), findsOneWidget);
    expect(lock.enabled, isFalse);
    port.available = true;
    await tester.tap(find.text('Ask for my fingerprint, face or screen lock'));
    await tester.pumpAndSettle();
    expect(lock.enabled, isTrue);

    lock.onBackgrounded();
    now += 120000;
    port.passes = false;
    lock.onResumed();
    await tester.pumpAndSettle();
    expect(find.text('Locked'), findsOneWidget);
    expect(find.text('Signed in as Ann'), findsNothing, reason: 'nothing of the work shows while locked');
    expect(find.text('We could not confirm it is you. Try again.'), findsOneWidget);
    port.passes = true;
    await tester.tap(find.text('Unlock'));
    await tester.pumpAndSettle();
    expect(find.text('Signed in as Ann'), findsOneWidget);
    expect(t.session.state, isA<SessionActive>(), reason: 'locking never signs out');
  });

  for (final lang in ['ur', 'hi']) {
    testWidgets('$lang: the sign-in and school screens fit a 360 px phone without overflow, text at least 13 px, controls at least 48 px', (tester) async {
      phone(tester);
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: 'Ann', schools: [school('s1', 'TEACHER'), school('s2', 'TEACHER')]);
      await tester.pumpWidget(gate(t, locale: lang));
      await tester.pumpAndSettle();
      void check() {
        for (final r in tester.widgetList<RichText>(find.byType(RichText))) {
          final size = r.text.style?.fontSize;
          if (size != null) expect(size, greaterThanOrEqualTo(13));
        }
        for (final b in tester.widgetList(find.byType(TextButton))) {
          expect(tester.getSize(find.byWidget(b)).height, greaterThanOrEqualTo(48));
        }
      }

      check();
      expect(tester.takeException(), isNull);
      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'ann@x.test');
      await tester.enterText(fields.at(1), 'pw');
      await tester.tap(find.byType(TextButton).at(1)); // the primary button follows the "forgot" link
      await tester.pumpAndSettle();
      check();
      expect(tester.takeException(), isNull);
      if (lang == 'ur') expect(Directionality.of(tester.element(find.byType(Scaffold).first)), TextDirection.rtl);
    });
  }
}
