import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_driver/main.dart';

void main() {
  testWidgets('Driver app boots in English with the light theme (primary language)', (tester) async {
    await tester.pumpWidget(const DriverApp());
    expect(find.text('OruSchools Driver'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme!.brightness, Brightness.light);
    expect(app.theme!.colorScheme.primary, OruColors.primary);
    expect(app.darkTheme, isNull, reason: 'no dark mode in v1 (decision DS-1)');
    expect(app.locale, const Locale('en'));
  });

  testWidgets('Driver app in Urdu: translated title, right-to-left, Nastaliq font', (tester) async {
    await tester.pumpWidget(const DriverApp(locale: Locale('ur')));
    expect(tester.takeException(), isNull);
    expect(find.textContaining('OruSchools'), findsWidgets);
    expect(find.text('OruSchools Driver'), findsNothing);
    final title = tester.widget<Text>(find.byType(Text).first);
    final ctx = tester.element(find.byWidget(title));
    expect(Directionality.of(ctx), TextDirection.rtl);
    expect(Theme.of(ctx).textTheme.bodyLarge!.fontFamily, contains('NotoNastaliqUrdu'));
  });

  testWidgets('Driver app in Kashmiri does not crash (Flutter has no Kashmiri localizations) and is right-to-left', (tester) async {
    await tester.pumpWidget(const DriverApp(locale: Locale('ks')));
    expect(tester.takeException(), isNull);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.rtl);
  });

  testWidgets('Driver app in Hindi shows the Hindi title', (tester) async {
    await tester.pumpWidget(const DriverApp(locale: Locale('hi')));
    expect(tester.takeException(), isNull);
    expect(find.textContaining('OruSchools'), findsWidgets);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.ltr);
  });
}
