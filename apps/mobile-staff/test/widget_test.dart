import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_staff/main.dart';

void main() {
  testWidgets('Staff app boots in English with the light theme (primary language)', (tester) async {
    await tester.pumpWidget(const StaffApp());
    expect(find.text('OruSchools Staff'), findsOneWidget);
    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.theme!.brightness, Brightness.light);
    expect(app.theme!.colorScheme.primary, OruColors.primary);
    expect(app.darkTheme, isNull, reason: 'no dark mode in v1 (decision DS-1)');
    expect(app.locale, const Locale('en'));
  });

  testWidgets('Staff app in Urdu: translated title, right-to-left, Nastaliq font', (tester) async {
    await tester.pumpWidget(const StaffApp(locale: Locale('ur')));
    expect(tester.takeException(), isNull);
    expect(find.textContaining('OruSchools'), findsWidgets);
    expect(find.text('OruSchools Staff'), findsNothing);
    final title = tester.widget<Text>(find.byType(Text).first);
    final ctx = tester.element(find.byWidget(title));
    expect(Directionality.of(ctx), TextDirection.rtl);
    expect(Theme.of(ctx).textTheme.bodyLarge!.fontFamily, contains('NotoNastaliqUrdu'));
  });

  testWidgets('Staff app in Kashmiri does not crash (Flutter has no Kashmiri localizations) and is right-to-left', (tester) async {
    await tester.pumpWidget(const StaffApp(locale: Locale('ks')));
    expect(tester.takeException(), isNull);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.rtl);
  });

  testWidgets('Staff app in Hindi shows the Hindi title', (tester) async {
    await tester.pumpWidget(const StaffApp(locale: Locale('hi')));
    expect(tester.takeException(), isNull);
    expect(find.textContaining('OruSchools'), findsWidgets);
    expect(Directionality.of(tester.element(find.byType(Scaffold))), TextDirection.ltr);
  });
}
