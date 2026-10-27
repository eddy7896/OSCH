// Screen previews of the widget gallery for the Project Hub. Not a regression test: it only runs when SHOTS_DIR is set
// (`SHOTS_DIR=... LUCIDE_TTF=.../assets/lucide.ttf flutter test test/shots_test.dart`), loads the bundled fonts so the
// pictures show real letters, and writes `<SHOTS_DIR>/gallery-<lang>.png`.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _font(String family, File f) async {
  final l = FontLoader(family)..addFont(Future.value(ByteData.sublistView(f.readAsBytesSync())));
  await l.load();
}

Widget _gallery(String lang) {
  const stat = OruStatCard(label: 'Attendance today', value: '96.3%', icon: OruIconName.users, trend: '+2.5%', trendUp: true, trendLabel: 'vs. last week');
  return MaterialApp(
    locale: Locale(lang),
    debugShowCheckedModeBanner: false,
    localizationsDelegates: oruLocalizationsDelegates,
    supportedLocales: oruSupportedLocales,
    localeResolutionCallback: oruLocaleResolution,
    theme: OruTheme.light(locale: Locale(lang)),
    home: Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, spacing: 12, children: [
            const OruSyncStatus(state: OruSyncState.pending, pendingCount: 3, banner: true, actionLabel: 'Upload now', onAction: _n),
            const Wrap(spacing: 8, runSpacing: 8, children: [
              OruSyncStatus(state: OruSyncState.synced),
              OruSyncStatus(state: OruSyncState.saved),
              OruSyncStatus(state: OruSyncState.syncing),
              OruSyncStatus(state: OruSyncState.offline),
              OruSyncStatus(state: OruSyncState.failed),
            ]),
            const OruBanner(title: 'Attendance not taken', message: 'Class 5A has not been marked today.', tone: OruTone.warning),
            stat,
            OruCard(title: 'Class 5A', subtitle: 'Roll call', icon: OruIconName.users, action: OruLinkAction(label: 'View all', onPressed: _n), child: Column(children: const [
              OruListRow(title: 'Asha Rao', subtitle: 'Roll 1', leading: OruAvatar(name: 'Asha Rao'), trailing: OruStatusPill(status: OruAttendanceStatus.present, label: 'Present')),
              OruListRow(title: 'Vikram Shah', subtitle: 'Roll 2', leading: OruAvatar(name: 'Vikram Shah'), trailing: OruStatusPill(status: OruAttendanceStatus.late, label: 'Late')),
              OruListRow(title: 'Farida Khan', subtitle: 'Roll 3', leading: OruAvatar(name: 'Farida Khan'), trailing: OruStatusPill(status: OruAttendanceStatus.medical, label: 'Medical')),
            ])),
            OruTextField(label: 'Marks', hint: 'Out of 50', error: lang == 'en' ? 'Marks cannot be more than 50.' : null),
            const OruCheckbox(label: 'Mark all present', value: true, onChanged: null),
            OruSegmentedControl(label: 'View', value: 'b', onChanged: (_) {}, options: const [OruSegment(value: 'a', label: 'Day'), OruSegment(value: 'b', label: 'Week'), OruSegment(value: 'c', label: 'Month')]),
            const Row(spacing: 12, children: [
              Expanded(child: OruActionTile(title: 'Check in', description: 'At school', icon: OruIconName.mapPin, solid: true)),
              Expanded(child: OruActionTile(title: 'Leave', description: 'Ask', icon: OruIconName.leave, tone: OruTileTone.neutral)),
            ]),
            const OruEmptyState(title: 'No notices yet', description: 'They appear here.'),
            OruBottomNav(label: 'Main', active: 'b', onChanged: (_) {}, items: const [
              OruNavItem(key: 'a', label: 'Home', icon: OruIconName.home),
              OruNavItem(key: 'b', label: 'Attendance', icon: OruIconName.check, badge: 3, badgeLabel: '3'),
              OruNavItem(key: 'c', label: 'Leave', icon: OruIconName.leave),
              OruNavItem(key: 'd', label: 'More', icon: OruIconName.more),
            ]),
          ]),
        ),
      ),
    ),
  );
}

void _n() {}

void main() {
  final out = Platform.environment['SHOTS_DIR'];
  final lucide = Platform.environment['LUCIDE_TTF'];
  testWidgets('widget gallery pictures', skip: out == null || lucide == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory('assets/fonts').listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        final name = f.uri.pathSegments.last.split('-').first;
        await _font('packages/flutter_core/$name', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 1800 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    for (final lang in ['en', 'ur']) {
      await tester.pumpWidget(RepaintBoundary(key: ValueKey(lang), child: _gallery(lang)));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.runAsync(() async {
        final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(ValueKey(lang)));
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        Directory(out!).createSync(recursive: true);
        File('$out/gallery-$lang.png').writeAsBytesSync(bytes!.buffer.asUint8List());
      });
    }
  });
}
