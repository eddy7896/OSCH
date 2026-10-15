// Runs ON A DEVICE (Android emulator / iOS simulator / phone):  flutter test integration_test -d <device-id>
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mobile_driver/main.dart';

Future<void> boot(WidgetTester tester, String code) async {
  await tester.pumpWidget(DriverApp(locale: Locale(code)));
  await tester.pumpAndSettle();
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('runs on a real mobile platform', (tester) async {
    debugPrint('PLATFORM=$defaultTargetPlatform');
    expect(defaultTargetPlatform, anyOf(TargetPlatform.android, TargetPlatform.iOS));
  });

  testWidgets('English (primary): title, light theme, left-to-right, no layout errors', (tester) async {
    await boot(tester, 'en');
    expect(find.text('OruSchools Driver'), findsOneWidget);
    final ctx = tester.element(find.byType(Scaffold));
    expect(Directionality.of(ctx), TextDirection.ltr);
    expect(Theme.of(ctx).brightness, Brightness.light);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Urdu: translated title, right-to-left, Nastaliq font chain, renders', (tester) async {
    await boot(tester, 'ur');
    final ctx = tester.element(find.byType(Scaffold));
    expect(Directionality.of(ctx), TextDirection.rtl);
    expect(find.text('OruSchools ڈرائیور'), findsOneWidget);
    expect(Theme.of(ctx).textTheme.bodyLarge!.fontFamily, contains('NotoNastaliqUrdu'));
    expect(tester.getSize(find.byType(Scaffold)).width, greaterThan(0));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Kashmiri (Flutter has no localizations for it): boots, right-to-left, English fallback text', (tester) async {
    await boot(tester, 'ks');
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.rtl);
    expect(find.text('OruSchools Driver'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Hindi: translated title, left-to-right', (tester) async {
    await boot(tester, 'hi');
    expect(find.textContaining('OruSchools'), findsWidgets);
    expect(find.text('OruSchools Driver'), findsNothing);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.ltr);
    expect(tester.takeException(), isNull);
  });

  testWidgets('every supported language boots with the registry direction and no errors', (tester) async {
    expect(OruLocales.all.length, 19);
    for (final l in OruLocales.all) {
      await boot(tester, l.code);
      expect(Directionality.of(tester.element(find.byType(Scaffold))), l.direction, reason: l.code);
      expect(tester.takeException(), isNull, reason: l.code);
    }
  });

  testWidgets('text never goes below 13 logical pixels (design system minimum); Driver controls are 64px', (tester) async {
    await boot(tester, 'en');
    for (final t in tester.widgetList<Text>(find.byType(Text))) {
      final size = t.style?.fontSize ?? DefaultTextStyle.of(tester.element(find.byWidget(t))).style.fontSize ?? 14;
      expect(size, greaterThanOrEqualTo(13));
    }
    final theme = Theme.of(tester.element(find.byType(Scaffold)));
    expect(theme.filledButtonTheme.style!.minimumSize!.resolve({})!.height, 64);
  });
}
