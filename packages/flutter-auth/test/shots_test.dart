// Screen previews of device sign-in for the Project Hub. Not a regression test: it only runs when SHOTS_DIR and LUCIDE_TTF are set
// (`SHOTS_DIR=... LUCIDE_TTF=.../lucide.ttf flutter test test/shots_test.dart`). It loads the bundled fonts so the pictures show
// real letters and writes `<SHOTS_DIR>/<screen>-<lang>.png`.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

Future<void> _font(String family, File f) async {
  final l = FontLoader(family)..addFont(Future.value(ByteData.sublistView(f.readAsBytesSync())));
  await l.load();
}

class _Port implements DeviceLockPort {
  @override
  Future<bool> isAvailable() async => true;
  @override
  Future<bool> authenticate() async => false;
}

void main() {
  final out = Platform.environment['SHOTS_DIR'];
  final lucide = Platform.environment['LUCIDE_TTF'];
  final fonts = Platform.environment['FONTS_DIR'];
  testWidgets('sign-in pictures', skip: out == null || lucide == null || fonts == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory(fonts!).listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        await _font('packages/flutter_core/${f.uri.pathSegments.last.split('-').first}', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    Future<void> snap(String id, String lang) async {
      await tester.runAsync(() async {
        final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(const ValueKey('shot')));
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        Directory(out!).createSync(recursive: true);
        File('$out/$id-$lang.png').writeAsBytesSync(bytes!.buffer.asUint8List());
      });
    }

    Widget app(Widget home, String lang) => RepaintBoundary(
          key: const ValueKey('shot'),
          child: KeyedSubtree(key: ValueKey(lang), child: MaterialApp(
            locale: Locale(lang),
            debugShowCheckedModeBanner: false,
            localizationsDelegates: oruLocalizationsDelegates,
            supportedLocales: oruSupportedLocales,
            localeResolutionCallback: oruLocaleResolution,
            theme: OruTheme.light(locale: Locale(lang)),
            home: home,
          )),
        );

    for (final lang in ['en', 'ur']) {
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'tara@greenfield.example', displayName: 'Tara Teacher', schools: [
            const SchoolChoice(id: 's1', name: 'Greenfield Public School', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en'),
            const SchoolChoice(id: 's2', name: 'Riverside Academy', subDomain: 'riverside', role: 'TEACHER', defaultLanguage: 'en'),
          ]);
      t.identity.accounts['tara@greenfield.example'] = 'pw';
      final lock = AppLock(port: _Port(), storage: MemorySecureStorage());
      Widget gate() => Builder(builder: (context) => OruSessionGate(
            session: t.session,
            lock: lock,
            title: OruStrings.of(context).appTeacher,
            appVerificationToken: () async => 'emulator',
            signedIn: (context, st) => Scaffold(
              body: SafeArea(
                child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                  OruAccountPanel(session: t.session, state: st, lock: lock, syncStatus: const Align(alignment: AlignmentDirectional.centerStart, child: OruSyncStatus(state: OruSyncState.synced))),
                  const SizedBox(height: OruSpacing.space5),
                  Builder(builder: (c) => OruEmptyState(title: OruStrings.of(c).mobHomeSoonTitle, description: OruStrings.of(c).mobHomeSoonBody, icon: OruIconName.home)),
                ]),
              ),
            ),
          ));

      await tester.pumpWidget(app(gate(), lang));
      await tester.pumpAndSettle();
      await snap('signin', lang);

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'tara@greenfield.example');
      await tester.enterText(fields.at(1), 'wrong');
      await tester.tap(find.byType(TextButton).at(1));
      await tester.pumpAndSettle();
      await snap('signin-error', lang);

      await tester.tap(find.byType(TextButton).last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).at(0), '+91 98765 43210');
      await tester.tap(find.byType(TextButton).at(0));
      await tester.pumpAndSettle();
      await snap('signin-phone-code', lang);

      await tester.tap(find.byType(TextButton).last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).at(0), 'tara@greenfield.example');
      await tester.enterText(find.byType(TextField).at(1), 'pw');
      await tester.tap(find.byType(TextButton).at(1));
      await tester.pumpAndSettle();
      await snap('school-choice', lang);

      await tester.tap(find.textContaining('Greenfield'));
      await tester.pumpAndSettle();
      await snap('home', lang);

      t.owed = 2;
      await tester.tap(find.byType(TextButton).last);
      await tester.pumpAndSettle();
      await snap('signout-confirm', lang);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.byType(TextButton)).first);
      await tester.pumpAndSettle();

      await tester.pumpWidget(app(OruLockScreen(lock: lock), lang));
      await tester.pumpAndSettle();
      await snap('lock', lang);
    }
  });
}
