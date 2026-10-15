import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/cupertino.dart' show CupertinoLocalizations;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Locale locale, Widget Function(BuildContext) body, {OruDensity density = OruDensity.touch}) => MaterialApp(
      locale: locale,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(density: density),
      builder: oruAppBuilder(density: density),
      home: Scaffold(body: Builder(builder: body)),
    );

void main() {
  group('registry (generated from packages/i18n/locales.json)', () {
    test('English is first and primary; 19 languages; exactly the expected right-to-left set', () {
      expect(OruLocales.all.first.code, 'en');
      expect(OruLocales.all.first.tier, OruLocaleTier.primary);
      expect(OruLocales.all, hasLength(19));
      expect(OruLocales.all.where((l) => l.isRtl).map((l) => l.code).toSet(), {'ur', 'ks', 'sd', 'ps', 'fa', 'ar'});
    });

    test('direction is authoritative for Kashmiri even though Flutter does not know it', () {
      expect(OruLocales.textDirectionOf(const Locale('ks')), TextDirection.rtl);
      expect(OruLocales.textDirectionOf(const Locale('ur', 'PK')), TextDirection.rtl);
      expect(OruLocales.textDirectionOf(const Locale('doi')), TextDirection.ltr);
      expect(OruLocales.textDirectionOf(const Locale('xx')), TextDirection.ltr); // unknown -> English entry
    });

    test('every bundled font family named by the registry is declared in pubspec.yaml', () {
      final pubspec = File('pubspec.yaml').readAsStringSync();
      for (final family in OruFontFamilies.all) {
        expect(pubspec, contains('family: $family'), reason: family);
      }
      for (final l in OruLocales.all) {
        expect(OruFontFamilies.all, contains(l.fontFamily), reason: l.code);
      }
    });
  });

  group('every language loads in a real MaterialApp (no crash, correct direction, all Flutter libraries resolve)', () {
    for (final l in OruLocales.all) {
      testWidgets('${l.code} (${l.name})', (tester) async {
        late OruStrings strings;
        late TextDirection dir;
        await tester.pumpWidget(_app(l.locale, (ctx) {
          strings = OruStrings.of(ctx);
          dir = Directionality.of(ctx);
          MaterialLocalizations.of(ctx).okButtonLabel; // would throw for an unsupported locale with stock delegates
          WidgetsLocalizations.of(ctx);
          CupertinoLocalizations.of(ctx);
          return Text(strings.appTeacher);
        }));
        expect(tester.takeException(), isNull);
        expect(dir, l.direction, reason: '${l.code} must be ${l.direction}');
        expect(strings.appTeacher, isNotEmpty);
      });
    }
  });

  group('strings', () {
    Future<OruStrings> load(WidgetTester tester, String code) async {
      late OruStrings s;
      await tester.pumpWidget(_app(Locale(code), (c) {
        s = OruStrings.of(c);
        return const SizedBox();
      }));
      return s;
    }

    testWidgets('English is the primary language', (tester) async {
      final s = await load(tester, 'en');
      expect(s.appTeacher, 'OruSchools Teacher');
      expect(s.actionMarkAllPresent, 'Mark all present');
      expect(s.syncOffline, 'You’re offline');
    });

    testWidgets('Hindi and Urdu drafts are complete', (tester) async {
      final hi = await load(tester, 'hi');
      expect(hi.appTeacher, 'OruSchools शिक्षक');
      expect(hi.statusPresent, 'उपस्थित');
      final ur = await load(tester, 'ur');
      expect(ur.appTeacher, 'OruSchools اُستاد');
      expect(ur.statusPresent, 'حاضر');
      expect(ur.greetingMorning('عائشہ'), 'صبح بخیر، عائشہ');
    });

    testWidgets('languages without translations fall back to English per key (never blank, never a crash)', (tester) async {
      for (final code in ['ks', 'sd', 'ps', 'fa', 'ar', 'bn', 'as', 'mr', 'doi', 'gu', 'pa', 'or', 'ta', 'te', 'kn', 'ml']) {
        final s = await load(tester, code);
        expect(s.appTeacher, 'OruSchools Teacher', reason: code);
        expect(s.syncSynced, 'Synced', reason: code);
      }
    });

    testWidgets('plurals follow the language (English 0/1/5, Hindi, Urdu)', (tester) async {
      final en = await load(tester, 'en');
      expect([en.syncChangesPending(0), en.syncChangesPending(1), en.syncChangesPending(5)],
          ['0 changes pending', '1 change pending', '5 changes pending']);
      final hi = await load(tester, 'hi');
      expect(hi.syncChangesPending(5), '5 बदलाव लंबित');
      final ur = await load(tester, 'ur');
      expect(ur.syncChangesPending(1), '1 تبدیلی باقی ہے');
      expect(ur.syncChangesPending(5), '5 تبدیلیاں باقی ہیں');
    });

    test('English is the default: device language is not adopted automatically (ADR-0006)', () {
      expect(oruLocaleResolution(null, oruSupportedLocales), const Locale('en'));
      expect(oruLocaleResolution(const Locale('fr'), oruSupportedLocales), const Locale('en'));
      expect(oruLocaleResolution(const Locale('ur', 'PK'), oruSupportedLocales), const Locale('ur'));
      expect(oruLocaleResolution(const Locale('ks'), oruSupportedLocales), const Locale('ks'));
    });
  });

  group('typography per script', () {
    test('English style is returned untouched', () {
      expect(OruLocales.of(const Locale('en')).localize(OruText.body), same(OruText.body));
    });

    test('Urdu uses Nastaliq with a 2.0 minimum line height; the rest of the families stay as glyph fallbacks', () {
      final s = OruLocales.of(const Locale('ur')).localize(OruText.body);
      const p = 'packages/flutter_core'; // Flutter folds the package name into every family it resolves
      expect(s.fontFamily, '$p/NotoNastaliqUrdu');
      expect(s.height, greaterThanOrEqualTo(2.0)); // design body is 22/14 = 1.57
      expect(s.fontFamilyFallback, containsAll(['$p/NotoSans', '$p/NotoNaskhArabic', '$p/NotoSansDevanagari']));
      expect(s.fontFamilyFallback, isNot(contains('$p/NotoNastaliqUrdu')));
      expect(s.fontFamilyFallback!.every((f) => f.startsWith('$p/')), isTrue, reason: 'every fallback must resolve to the bundled package font');
    });

    test('Devanagari raises only the styles that are too tight (display 1.29 -> 1.5) and keeps the rest', () {
      final hi = OruLocales.of(const Locale('hi'));
      expect(hi.localize(OruText.display).height, 1.5);
      expect(hi.localize(OruText.body).height, closeTo(22 / 14, 0.001)); // already 1.57 >= 1.5
    });

    test('non-Latin scripts get NO letter-spacing (the design tracks display text -0.01em for Latin; it breaks joined scripts)', () {
      expect(OruText.display.letterSpacing, lessThan(0)); // the design value
      for (final code in ['hi', 'ur', 'ks', 'bn', 'ta', 'ar']) {
        expect(OruLocales.of(Locale(code)).localize(OruText.display).letterSpacing, 0, reason: code);
      }
      expect(OruLocales.of(const Locale('en')).localize(OruText.display).letterSpacing, lessThan(0)); // English keeps its tracking
    });

    test('theme carries the language font and line height', () {
      final ur = OruTheme.light(locale: const Locale('ur'));
      expect(ur.textTheme.bodyMedium!.fontFamily, 'packages/flutter_core/NotoNastaliqUrdu');
      expect(ur.textTheme.bodyMedium!.height, greaterThanOrEqualTo(2.0));
      expect(OruTheme.light().textTheme.bodyMedium!.fontFamily, 'packages/flutter_core/NotoSans');
    });
  });

  group('bundled fonts', () {
    final provenance = jsonDecode(File('assets/fonts/provenance.json').readAsStringSync()) as Map<String, dynamic>;

    test('glyph coverage report: every language\'s sample text is covered by the shipped fonts', () {
      final coverage = provenance['coverage'] as Map<String, dynamic>;
      expect(coverage.keys.toSet(), OruLocales.all.map((l) => l.code).toSet());
      for (final entry in coverage.entries) {
        expect((entry.value as Map)['missing'], isEmpty, reason: '${entry.key} is missing glyphs');
      }
    });

    test('size budget: all fonts together stay under 5 MB per app', () {
      expect(provenance['totalBytes'] as int, lessThan(5 * 1024 * 1024));
    });

    test('every declared font file exists, is TrueType, and has its licence', () {
      final families = provenance['families'] as Map<String, dynamic>;
      expect(families.keys.toSet(), OruFontFamilies.all.toSet());
      for (final f in families.entries) {
        expect(File('assets/fonts/OFL-${f.key}.txt').existsSync(), isTrue, reason: 'licence for ${f.key}');
        for (final file in (f.value['files'] as Map).keys) {
          final head = File('assets/fonts/$file').readAsBytesSync().sublist(0, 4);
          expect(head, anyOf(equals([0, 1, 0, 0]), equals([0x74, 0x72, 0x75, 0x65])), reason: file);
        }
      }
    });
  });

  testWidgets('visual showcase: renders every script with the real bundled fonts (inspected by a human; see build/i18n_showcase.png)',
      (tester) async {
    final provenance = jsonDecode(File('assets/fonts/provenance.json').readAsStringSync()) as Map<String, dynamic>;
    await tester.runAsync(() async {
      for (final family in (provenance['families'] as Map<String, dynamic>).entries) {
        final loader = FontLoader('packages/${OruFonts.package}/${family.key}');
        for (final file in (family.value['files'] as Map).keys) {
          loader.addFont(Future.value(ByteData.sublistView(File('assets/fonts/$file').readAsBytesSync())));
        }
        await loader.load();
      }
    });

    const rows = <(String, String)>[
      ('en', 'Good morning, Ayesha · Mark all present · ₹12,400'),
      ('hi', 'नमस्ते, विद्यालय में आपका स्वागत है। उपस्थिति दर्ज करें।'),
      ('ur', 'السلام علیکم، سکول میں خوش آمدید۔ حاضری لگائیں۔ ٹ ڈ ڑ ں ے ھ'),
      ('ks', 'اَسلام علیکم، سکوٗل منز خوش آمدید۔ ٲ ٳ ۄ ۆ ێ'),
      ('sd', 'ٻ ڀ ٺ ٽ ٿ ڄ ڃ ڇ ڍ ڊ ڏ ڌ ڙ ڦ ڪ ڳ ڱ ھ'),
      ('ps', 'ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ'),
      ('ar', 'مرحبا بكم في المدرسة'),
      ('bn', 'স্কুলে স্বাগতম। উপস্থিতি নিন।'),
      ('pa', 'ਸਕੂਲ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ। ਹਾਜ਼ਰੀ ਲਗਾਓ।'),
      ('gu', 'શાળામાં આપનું સ્વાગત છે. હાજરી પૂરો.'),
      ('or', 'ବିଦ୍ୟାଳୟକୁ ସ୍ୱାଗତ। ଉପସ୍ଥିତି ଦିଅନ୍ତୁ।'),
      ('ta', 'பள்ளிக்கு வரவேற்கிறோம். வருகைப் பதிவு.'),
      ('te', 'పాఠశాలకు స్వాగతం. హాజరు నమోదు చేయండి.'),
      ('kn', 'ಶಾಲೆಗೆ ಸ್ವಾಗತ. ಹಾಜರಾತಿ ದಾಖಲಿಸಿ.'),
      ('ml', 'സ്കൂളിലേക്ക് സ്വാഗതം. ഹാജർ രേഖപ്പെടുത്തുക.'),
    ];
    final key = GlobalKey();
    tester.view.physicalSize = const Size(900, 1500);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: OruTheme.light(),
      home: Scaffold(
        backgroundColor: OruColors.bg,
        body: RepaintBoundary(
          key: key,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              for (final (code, text) in rows)
                Builder(builder: (context) {
                  final l = OruLocales.of(Locale(code));
                  return Directionality(
                    textDirection: l.direction,
                    child: Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: OruColors.surface, border: Border.all(color: OruColors.border), borderRadius: BorderRadius.circular(8)),
                      child: Row(children: [
                        SizedBox(width: 40, child: Text(code, textDirection: TextDirection.ltr, style: OruText.caption.copyWith(color: OruColors.textMuted))),
                        Expanded(child: Text(text, style: l.localize(OruText.bodyLg).copyWith(color: OruColors.text))),
                      ]),
                    ),
                  );
                }),
            ]),
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 1.5);
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!;
      Directory('build').createSync(recursive: true);
      File('build/i18n_showcase.png').writeAsBytesSync(bytes.buffer.asUint8List());
    });
    expect(File('build/i18n_showcase.png').lengthSync(), greaterThan(10000));
  });
}
