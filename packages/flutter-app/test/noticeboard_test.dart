import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

Map<String, dynamic> notice(String id, String title, String at, {bool pinned = false, String category = 'GENERAL', String? expiresAt}) => {
      'id': id,
      'title': title,
      'body': 'Body of $title',
      'category': category,
      'audience': 'ALL_PARENTS',
      'pinned': pinned,
      'publishAt': null,
      'expiresAt': expiresAt,
      'target': null,
      'author': {'id': 'p', 'name': 'Priya Principal'},
      'createdAt': at,
      'updatedAt': at,
      'withdrawn': false,
      'state': 'LIVE',
      'told': null,
    };

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('visibleNotices: pinned first, then newest; one past its end is dropped on the phone', () {
    final now = DateTime.parse('2026-11-10T00:00:00Z');
    final out = visibleNotices([
      notice('a', 'Old', '2026-10-01T08:00:00.000Z'),
      notice('b', 'New', '2026-11-01T08:00:00.000Z'),
      notice('c', 'Pinned old', '2026-09-01T08:00:00.000Z', pinned: true),
      notice('d', 'Ended', '2026-11-02T08:00:00.000Z', expiresAt: '2026-11-05T00:00:00.000Z'),
    ], now);
    expect([for (final n in out) n['title']], ['Pinned old', 'New', 'Old']);
  });

  testWidgets('notice board: from the phone\'s copy, pinned first, one opens in full; none says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(host(OruNoticeBoardScreen(services: svc, now: () => DateTime.parse('2026-11-10T00:00:00Z'))));
      await pumpFor(tester);
      expect(find.text('The school has no notices for you right now.'), findsOneWidget);
      await svc.store.replaceAllRecords(kNoticePost, [
        (id: 'a', parentId: null, json: notice('a', 'Sports day', '2026-11-08T08:00:00.000Z', category: 'EVENT')),
        (id: 'b', parentId: null, json: notice('b', 'Winter holiday', '2026-10-20T08:00:00.000Z', pinned: true, category: 'HOLIDAY')),
        (id: 'c', parentId: null, json: notice('c', 'Gone', '2026-10-21T08:00:00.000Z', expiresAt: '2026-11-01T00:00:00.000Z')),
      ]);
      await pumpFor(tester);
      expect(find.text('Gone'), findsNothing);
      expect(tester.getTopLeft(find.text('Winter holiday')).dy, lessThan(tester.getTopLeft(find.text('Sports day')).dy));
      expect(find.textContaining('Pinned'), findsOneWidget);
      await tester.tap(find.text('Sports day'));
      await pumpFor(tester, 30);
      expect(find.text('Body of Sports day'), findsOneWidget);
      expect(find.textContaining('Priya Principal'), findsOneWidget);
      await svc.dispose();
    });
  });
}
