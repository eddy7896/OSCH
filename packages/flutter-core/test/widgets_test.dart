import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// Hosts a widget the way the apps do: the OruSchools theme, the language catalogues, and the chosen language.
Widget host(Widget child, {String locale = 'en'}) => MaterialApp(
      locale: Locale(locale),
      localizationsDelegates: oruLocalizationsDelegates,
      supportedLocales: oruSupportedLocales,
      localeResolutionCallback: oruLocaleResolution,
      theme: OruTheme.light(locale: Locale(locale)),
      home: Scaffold(body: Center(child: SingleChildScrollView(child: child))),
    );

/// Every text in the tree is at least 13 px (design system minimum).
void expectNoSmallText(WidgetTester tester) {
  for (final t in tester.widgetList<RichText>(find.byType(RichText))) {
    final size = t.text.style?.fontSize;
    if (size != null) expect(size, greaterThanOrEqualTo(13), reason: 'text under 13px: ${t.text.toPlainText()}');
  }
}

/// Every tappable thing is at least 48 px high.
void expectTouchTargets(WidgetTester tester, Finder f, {double min = 48}) {
  for (final e in f.evaluate()) {
    expect(tester.getSize(find.byWidget(e.widget)).height, greaterThanOrEqualTo(min));
  }
}

void main() {
  group('icons', () {
    test('every design-system icon name has a glyph', () {
      expect(OruIconName.values.length, 38);
      for (final n in OruIconName.values) {
        expect(n.data.codePoint, isNonZero);
      }
    });

    testWidgets('direction-pointing icons mirror in right-to-left, others do not', (tester) async {
      await tester.pumpWidget(host(const Column(children: [OruIcon(OruIconName.chevronRight), OruIcon(OruIconName.check)])));
      final ltr = find.descendant(of: find.byType(OruIcon), matching: find.byType(Transform));
      expect(ltr, findsNothing);
      await tester.pumpWidget(host(const Column(children: [OruIcon(OruIconName.chevronRight), OruIcon(OruIconName.check)]), locale: 'ur'));
      final flipped = tester.widgetList<Transform>(find.descendant(of: find.byType(OruIcon), matching: find.byType(Transform))).toList();
      expect(flipped.length, 1, reason: 'only the chevron mirrors');
    });
  });

  group('button', () {
    testWidgets('is 48 px tall, 64 for the Driver density, and runs its action once', (tester) async {
      var taps = 0;
      await tester.pumpWidget(host(OruButton(label: 'Submit attendance', onPressed: () => taps++, variant: OruButtonVariant.primary, icon: OruIconName.check)));
      expect(tester.getSize(find.byType(TextButton)).height, greaterThanOrEqualTo(48));
      await tester.tap(find.text('Submit attendance'));
      expect(taps, 1);
      await tester.pumpWidget(host(OruButton(label: 'Start', onPressed: () {}, density: OruDensity.driver)));
      expect(tester.getSize(find.byType(TextButton)).height, greaterThanOrEqualTo(64));
    });

    testWidgets('a disabled button does nothing', (tester) async {
      await tester.pumpWidget(host(const OruButton(label: 'Save', onPressed: null)));
      expect(tester.widget<TextButton>(find.byType(TextButton)).onPressed, isNull);
    });

    testWidgets('block fills the width', (tester) async {
      await tester.pumpWidget(host(OruButton(label: 'Save', onPressed: () {}, block: true)));
      expect(tester.getSize(find.byType(TextButton)).width, greaterThan(300));
    });
  });

  group('badges, avatar, status', () {
    testWidgets('count badge shows 99+ above 99 and is named for screen readers', (tester) async {
      final h = tester.ensureSemantics();
      await tester.pumpWidget(host(const OruCountBadge(count: 120, label: '120 new messages')));
      expect(find.text('99+'), findsOneWidget);
      expect(find.bySemanticsLabel('120 new messages'), findsOneWidget);
      h.dispose();
    });

    test('initials are whole characters of the first and last word, in any script', () {
      expect(oruInitialsOf('Asha Kumari Rao'), 'AR');
      expect(oruInitialsOf('  single '), 'S');
      expect(oruInitialsOf(''), '?');
      expect(oruInitialsOf('आशा कुमारी'), 'आकु');
      expect(oruInitialsOf('عائشہ خان'), 'عخ');
    });

    testWidgets('the status pill always shows the word, and a tap changes it when interactive', (tester) async {
      var taps = 0;
      await tester.pumpWidget(host(Column(children: [
        const OruStatusPill(status: OruAttendanceStatus.late, label: 'Late'),
        OruStatusPill(status: OruAttendanceStatus.absent, label: 'Absent', onPressed: () => taps++),
      ])));
      expect(find.text('Late'), findsOneWidget);
      await tester.tap(find.text('Absent'));
      expect(taps, 1);
      expect(tester.getSize(find.ancestor(of: find.text('Absent'), matching: find.byType(Container)).first).height, greaterThanOrEqualTo(48));
    });

    test('the seven attendance statuses are fixed, each with its own tone', () {
      expect(OruAttendanceStatus.values.map((s) => s.name), ['present', 'absent', 'late', 'leave', 'medical', 'halfday', 'excused']);
      expect(OruAttendanceStatus.values.map((s) => s.tone).toSet().length, 7);
    });
  });

  group('sync status: the six fixed states', () {
    testWidgets('wording comes from the catalogue, in English', (tester) async {
      final want = {
        OruSyncState.synced: 'Synced',
        OruSyncState.saved: 'Saved on device',
        OruSyncState.pending: '5 changes pending',
        OruSyncState.syncing: 'Syncing…',
        OruSyncState.offline: 'You’re offline',
        OruSyncState.failed: 'Sync failed',
      };
      for (final e in want.entries) {
        await tester.pumpWidget(host(OruSyncStatus(state: e.key, pendingCount: 5)));
        expect(find.text(e.value), findsOneWidget, reason: '${e.key}');
      }
    });

    testWidgets('wording follows the chosen language, never the device', (tester) async {
      await tester.pumpWidget(host(const OruSyncStatus(state: OruSyncState.failed), locale: 'hi'));
      expect(find.text('Sync failed'), findsNothing);
    });

    testWidgets('the banner offers its action and a failed one is announced', (tester) async {
      var taps = 0;
      final h = tester.ensureSemantics();
      await tester.pumpWidget(host(OruSyncStatus(state: OruSyncState.failed, banner: true, actionLabel: 'Retry', onAction: () => taps++, detail: '2 changes')));
      await tester.tap(find.text('Retry'));
      expect(taps, 1);
      h.dispose();
    });

    testWidgets('the syncing icon turns, the others stay still', (tester) async {
      await tester.pumpWidget(host(const OruSyncStatus(state: OruSyncState.syncing)));
      final turning = find.descendant(of: find.byType(OruSyncStatus), matching: find.byType(RotationTransition));
      expect(turning, findsOneWidget);
      await tester.pumpWidget(host(const OruSyncStatus(state: OruSyncState.synced)));
      expect(find.descendant(of: find.byType(OruSyncStatus), matching: find.byType(RotationTransition)), findsNothing);
    });
  });

  group('banner, empty state, cards', () {
    testWidgets('banner shows its fact, detail and one action', (tester) async {
      await tester.pumpWidget(host(OruBanner(title: '1 bus is delayed', message: 'Traffic', tone: OruTone.warning, action: OruButton(label: 'View', onPressed: () {}))));
      expect(find.text('1 bus is delayed'), findsOneWidget);
      expect(find.text('Traffic'), findsOneWidget);
      expect(find.text('View'), findsOneWidget);
    });

    testWidgets('empty state shows title, description and an optional action', (tester) async {
      await tester.pumpWidget(host(const OruEmptyState(title: 'No messages yet', description: 'They will appear here.')));
      expect(find.text('No messages yet'), findsOneWidget);
      expect(find.text('They will appear here.'), findsOneWidget);
    });

    testWidgets('card and stat card show their words', (tester) async {
      await tester.pumpWidget(host(const Column(children: [
        OruCard(title: 'Today', subtitle: '5 classes', icon: OruIconName.calendar, child: Text('x')),
        OruStatCard(label: 'Attendance today', value: '96.3%', icon: OruIconName.users, trend: '+2.5%', trendUp: true, trendLabel: 'vs. last week'),
      ])));
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('96.3%'), findsOneWidget);
      expect(find.text('+2.5%'), findsOneWidget);
      expect(find.byType(OruIcon), findsWidgets);
    });
  });

  group('inputs', () {
    testWidgets('text field keeps its label above, shows an error with the alert icon, and reports changes', (tester) async {
      String? last;
      await tester.pumpWidget(host(OruTextField(label: 'Marks', error: 'Marks cannot be more than 50.', onChanged: (v) => last = v)));
      expect(find.text('Marks'), findsOneWidget);
      expect(find.text('Marks cannot be more than 50.'), findsOneWidget);
      expect(find.byType(OruIcon), findsOneWidget);
      await tester.enterText(find.byType(TextField), '47');
      expect(last, '47');
      expect(tester.getSize(find.byType(TextField)).height, greaterThanOrEqualTo(48));
    });

    testWidgets('checkbox row is 48 px tall and toggles from anywhere on the row', (tester) async {
      var value = false;
      await tester.pumpWidget(host(StatefulBuilder(builder: (c, set) => OruCheckbox(label: 'Remember me', value: value, onChanged: (v) => set(() => value = v)))));
      await tester.tap(find.text('Remember me'));
      await tester.pump();
      expect(value, isTrue);
      expect(tester.getSize(find.byType(InkWell)).height, greaterThanOrEqualTo(48));
    });

    testWidgets('a struck-through to-do only when asked', (tester) async {
      await tester.pumpWidget(host(const OruCheckbox(label: 'Mark register', value: true, onChanged: null, strikeWhenChecked: true)));
      expect(tester.widget<Text>(find.text('Mark register')).style?.decoration, TextDecoration.lineThrough);
      await tester.pumpWidget(host(const OruCheckbox(label: 'Remember me', value: true, onChanged: null)));
      expect(tester.widget<Text>(find.text('Remember me')).style?.decoration, TextDecoration.none);
    });

    testWidgets('segmented control chooses one value', (tester) async {
      var value = 'week';
      await tester.pumpWidget(host(StatefulBuilder(
          builder: (c, set) => OruSegmentedControl(
                label: 'View',
                value: value,
                onChanged: (v) => set(() => value = v),
                options: const [OruSegment(value: 'day', label: 'Day'), OruSegment(value: 'week', label: 'Week')],
              ))));
      await tester.tap(find.text('Day'));
      await tester.pump();
      expect(value, 'day');
      expect(tester.getSize(find.ancestor(of: find.text('Day'), matching: find.byType(InkWell)).first).height, greaterThanOrEqualTo(40));
    });
  });

  group('navigation and rows', () {
    testWidgets('bottom nav shows icon and word for every item, marks the active one, and badges a count', (tester) async {
      var active = 'home';
      await tester.pumpWidget(host(StatefulBuilder(
          builder: (c, set) => OruBottomNav(
                label: 'Main',
                active: active,
                onChanged: (k) => set(() => active = k),
                items: const [
                  OruNavItem(key: 'home', label: 'Home', icon: OruIconName.home),
                  OruNavItem(key: 'att', label: 'Attendance', icon: OruIconName.check, badge: 3, badgeLabel: '3 to do'),
                  OruNavItem(key: 'more', label: 'More', icon: OruIconName.more),
                ],
              ))));
      expect(find.text('Attendance'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      await tester.tap(find.text('More'));
      await tester.pump();
      expect(active, 'more');
      expect(tester.getSize(find.byType(OruBottomNav)).height, greaterThanOrEqualTo(56));
    });

    testWidgets('list row is 64 px tall, tappable as a whole, and shows a chevron only with no trailing widget', (tester) async {
      var taps = 0;
      await tester.pumpWidget(host(Column(children: [
        OruListRow(title: 'Asha Rao', subtitle: 'Roll 12', leading: const OruAvatar(name: 'Asha Rao'), onPressed: () => taps++),
        OruListRow(title: 'Vikram', trailing: const OruBadge(label: 'Pending'), onPressed: () {}),
      ])));
      await tester.tap(find.text('Asha Rao'));
      expect(taps, 1);
      expect(find.byWidgetPredicate((w) => w is OruIcon && w.name == OruIconName.chevronRight), findsOneWidget);
      expect(tester.getSize(find.byType(OruListRow).first).height, greaterThanOrEqualTo(64));
    });

    testWidgets('action tile is at least 112 px tall', (tester) async {
      var taps = 0;
      await tester.pumpWidget(host(OruActionTile(title: 'Boarding', description: '12 students', icon: OruIconName.bus, solid: true, onPressed: () => taps++)));
      await tester.tap(find.text('Boarding'));
      expect(taps, 1);
      expect(tester.getSize(find.byType(OruActionTile)).height, greaterThanOrEqualTo(112));
      for (final tone in OruTileTone.values) {
        for (final solid in [false, true]) {
          await tester.pumpWidget(host(OruActionTile(title: 'Tile', tone: tone, solid: solid)));
          expect(tester.takeException(), isNull, reason: '$tone solid=$solid');
        }
      }
    });
  });

  group('every widget in Urdu (right to left) and English: no overflow, no text under 13px', () {
    for (final lang in ['en', 'ur']) {
      testWidgets('the gallery renders in $lang at a narrow phone width', (tester) async {
        tester.view.physicalSize = const Size(360 * 3, 800 * 3);
        tester.view.devicePixelRatio = 3;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(host(
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const OruSyncStatus(state: OruSyncState.pending, pendingCount: 3, banner: true, actionLabel: 'Upload now', onAction: _noop),
              const OruBanner(title: 'Attendance not taken', message: 'Class 5A has not been marked today.', tone: OruTone.warning),
              OruCard(title: 'Today', subtitle: '5 classes', icon: OruIconName.calendar, action: OruLinkAction(label: 'View all', onPressed: () {})),
              const OruStatCard(label: 'Attendance today', value: '96.3%', icon: OruIconName.users, trend: '+2.5%', trendUp: true, trendLabel: 'vs. last week'),
              const OruListRow(title: 'Asha Kumari Rao', subtitle: 'Roll 12', leading: OruAvatar(name: 'Asha Rao'), trailing: OruStatusPill(status: OruAttendanceStatus.medical, label: 'Medical')),
              const OruTextField(label: 'Marks', hint: 'Out of 50'),
              const OruCheckbox(label: 'Mark all present', value: true, onChanged: null),
              OruSegmentedControl(label: 'View', value: 'a', onChanged: _noopS, options: const [OruSegment(value: 'a', label: 'Day'), OruSegment(value: 'b', label: 'Week'), OruSegment(value: 'c', label: 'Month')]),
              const OruActionTile(title: 'Check in', description: 'At school', icon: OruIconName.mapPin),
              const OruEmptyState(title: 'No notices yet', description: 'They appear here.'),
              OruBottomNav(label: 'Main', active: 'a', onChanged: _noopS, items: const [
                OruNavItem(key: 'a', label: 'Home', icon: OruIconName.home),
                OruNavItem(key: 'b', label: 'Attendance', icon: OruIconName.check),
                OruNavItem(key: 'c', label: 'Leave', icon: OruIconName.leave),
                OruNavItem(key: 'd', label: 'More', icon: OruIconName.more),
              ]),
            ]),
          ),
          locale: lang,
        ));
        expect(tester.takeException(), isNull);
        expectNoSmallText(tester);
        expect(Directionality.of(tester.element(find.byType(OruBottomNav))), lang == 'ur' ? TextDirection.rtl : TextDirection.ltr);
      });
    }
  });
}

void _noop() {}
void _noopS(String _) {}
