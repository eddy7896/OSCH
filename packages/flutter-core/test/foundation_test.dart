import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

double _contrast(Color a, Color b) {
  final la = a.computeLuminance(), lb = b.computeLuminance();
  final hi = la > lb ? la : lb, lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  group('tokens (generated from documentation/design-system/tokens.json)', () {
    test('primary is Oru Indigo 600, not 500', () {
      expect(OruColors.primary, const Color(0xFF4F46E5));
      expect(OruColors.primary, isNot(const Color(0xFF6366F1)));
      expect(OruColors.onPrimary, const Color(0xFFFFFFFF));
    });

    test('density, spacing and radius follow the design system', () {
      expect(OruSize.controlTouch, 48);
      expect(OruSize.controlDriver, 64);
      expect(OruSpacing.space4, 16);
      expect(OruRadius.lg, 16);
      expect(OruRadius.full, 999);
    });

    test('no text style is smaller than 13px', () {
      for (final s in [
        OruText.display, OruText.title, OruText.heading, OruText.subheading, OruText.bodyLg,
        OruText.body, OruText.label, OruText.caption, OruText.stat, OruText.statSm, OruText.actionXl,
      ]) {
        expect(s.fontSize, greaterThanOrEqualTo(13));
      }
    });

    test('stat styles use tabular figures', () {
      expect(OruText.stat.fontFeatures, isNotEmpty);
    });

    test('product text pairs meet WCAG AA (4.5:1)', () {
      for (final bg in [OruColors.bg, OruColors.surface, OruColors.surfaceMuted, OruColors.surfaceBrand, OruColors.primarySoft]) {
        expect(_contrast(OruColors.text, bg), greaterThanOrEqualTo(4.5), reason: 'text on $bg');
        expect(_contrast(OruColors.textMuted, bg), greaterThanOrEqualTo(4.5), reason: 'textMuted on $bg');
      }
      expect(_contrast(OruColors.onPrimary, OruColors.primary), greaterThanOrEqualTo(4.5));
      expect(_contrast(OruColors.successFg, OruColors.successBg), greaterThanOrEqualTo(4.5));
      expect(_contrast(OruColors.dangerFg, OruColors.dangerBg), greaterThanOrEqualTo(4.5));
    });

    test('control borders and focus ring meet 3:1', () {
      expect(_contrast(OruColors.borderStrong, OruColors.surface), greaterThanOrEqualTo(3));
      expect(_contrast(OruColors.focus, OruColors.surface), greaterThanOrEqualTo(3));
    });
  });

  group('theme', () {
    test('is light-only Material 3 built from tokens', () {
      final t = OruTheme.light();
      expect(t.brightness, Brightness.light);
      expect(t.useMaterial3, isTrue);
      expect(t.colorScheme.primary, OruColors.primary);
      expect(t.scaffoldBackgroundColor, OruColors.bg);
    });

    test('density controls button height: touch 48, driver 64', () {
      double h(ThemeData t) => t.filledButtonTheme.style!.minimumSize!.resolve({})!.height;
      expect(h(OruTheme.light()), 48);
      expect(h(OruTheme.light(density: OruDensity.driver)), 64);
    });

    testWidgets('renders text with the bundled font family', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: OruTheme.light(),
        home: const Scaffold(body: Text('Good morning, Ayesha')),
      ));
      final style = tester.widget<Text>(find.text('Good morning, Ayesha'));
      final resolved = DefaultTextStyle.of(tester.element(find.byWidget(style))).style;
      expect(resolved.fontFamily, contains('NotoSans'));
    });
  });

  group('bundled fonts', () {
    test('every font asset declared in pubspec.yaml exists and is a TrueType file', () {
      final pubspec = File('pubspec.yaml').readAsStringSync();
      final assets = RegExp(r'asset:\s*(\S+)').allMatches(pubspec).map((m) => m.group(1)!).toList();
      expect(assets.length, greaterThanOrEqualTo(6)); // exact families/weights are asserted in i18n_test.dart against provenance.json
      for (final a in assets) {
        final f = File(a);
        expect(f.existsSync(), isTrue, reason: '$a is declared but missing');
        final head = f.readAsBytesSync().sublist(0, 4);
        expect(head, anyOf(equals([0, 1, 0, 0]), equals([0x74, 0x72, 0x75, 0x65])), reason: '$a is not a TrueType font');
      }
    });

    test('each bundled font ships with its licence', () {
      expect(File('assets/fonts/OFL-NotoSans.txt').existsSync(), isTrue);
      expect(File('assets/fonts/OFL-NotoSansDevanagari.txt').existsSync(), isTrue);
    });
  });
}
