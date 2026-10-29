import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

Map<String, dynamic> ann(String id, String title, String at) => {'id': id, 'title': title, 'body': 'Body of $title', 'createdAt': at, 'updatedAt': at, 'withdrawn': false, 'author': {'id': 'p', 'name': 'Priya Principal'}};

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('announcements: newest first from the phone\'s copy, and one opens in full; none says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(host(OruAnnouncementsScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('There are no announcements yet.'), findsOneWidget);
      await svc.store.replaceAllRecords(kAnnouncement, [
        (id: 'a', parentId: null, json: ann('a', 'Sports day', '2026-10-01T08:00:00.000Z')),
        (id: 'b', parentId: null, json: ann('b', 'Holiday notice', '2026-10-20T08:00:00.000Z')),
      ]);
      await pumpFor(tester);
      final first = tester.getTopLeft(find.text('Holiday notice')).dy;
      expect(first, lessThan(tester.getTopLeft(find.text('Sports day')).dy));
      await tester.tap(find.text('Sports day'));
      await pumpFor(tester, 30);
      expect(find.text('Body of Sports day'), findsOneWidget);
      expect(find.textContaining('Priya Principal'), findsOneWidget);
      await svc.dispose();
    });
  });
}
