import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

class FixedLocation implements LocationPort {
  FixedLocation(this.fix);
  Fix? fix;
  @override
  Future<Fix?> current() async => fix;
}

DateTime now() => DateTime(2026, 11, 2, 9, 5);
const school = {'configured': true, 'lat': 12.9716, 'lng': 77.5946, 'radiusM': 150, 'marginM': 50, 'hardRingM': 500};
Fix north(double m) => Fix(lat: 12.9716 + m / 111195, lng: 77.5946);

Future<OruServices> ready({Map<String, dynamic>? fence = school}) async {
  final svc = await services();
  if (fence != null) await svc.store.replaceAllRecords(kGeofence, [(id: 'school', parentId: null, json: Map<String, dynamic>.from(fence))]);
  return svc;
}

Future<void> show(WidgetTester tester, OruServices svc, FixedLocation loc) async {
  await tester.pumpWidget(host(OruCheckInScreen(services: svc, location: loc, now: now)));
  await pumpFor(tester);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('inside the school: Check in is saved at once with the position and the phone\'s time, nothing is asked; then Check out follows', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await ready();
      await show(tester, svc, FixedLocation(north(20)));
      expect(find.text('You have not checked in today.'), findsOneWidget);
      await tester.tap(find.text('Check in'));
      await pumpFor(tester);
      expect(find.text('Please say why'), findsNothing);
      final q = (await svc.store.all()).where((e) => e.kind == 'staff.checkIn').toList();
      expect(q, hasLength(1));
      expect((q.single.body['position'] as Map)['lat'], closeTo(12.9716, 0.001));
      expect(q.single.body['deviceTime'], isA<String>());
      expect(q.single.body.containsKey('reason'), isFalse);
      expect(find.text('Check-in saved on this phone, not sent yet'), findsOneWidget);
      expect(find.text('Check in'), findsNothing);
      await tester.tap(find.text('Check out'));
      await pumpFor(tester);
      expect((await svc.store.all()).map((e) => e.kind), ['staff.checkIn', 'staff.checkOut'], reason: 'sent in the order they were made');
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('outside the soft ring: a reason is asked first; an empty one is refused on the phone; the sent one goes with the check-in', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await ready();
      await show(tester, svc, FixedLocation(north(700)));
      await tester.tap(find.text('Check in'));
      await pumpFor(tester);
      expect(find.text('Please say why'), findsOneWidget);
      expect(find.text('You seem to be \u2066700\u2069 m from the school.'), findsOneWidget);
      expect(find.text('This is far from the school, so HR will confirm it.'), findsOneWidget);
      await tester.tap(find.text('Send'));
      await pumpFor(tester, 5);
      expect(find.text('Write a reason to go on.'), findsOneWidget);
      expect(await svc.store.all(), isEmpty);
      await tester.enterText(find.byType(TextField), 'Visiting the district office');
      await pumpFor(tester, 5);
      await tester.tap(find.text('Send'));
      await pumpFor(tester);
      final q = (await svc.store.all()).single;
      expect(q.body['reason'], 'Visiting the district office');
      await svc.dispose();
    });
  });

  testWidgets('no position (location off or refused): a reason is asked, and says why', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await ready();
      await show(tester, svc, FixedLocation(null));
      await tester.tap(find.text('Check in'));
      await pumpFor(tester);
      expect(find.text('This phone could not find where you are.'), findsOneWidget);
      expect(find.text('This is far from the school, so HR will confirm it.'), findsNothing);
      await svc.dispose();
    });
  });

  testWidgets('a school with no point set asks nothing, whatever the position', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await ready(fence: null);
      await show(tester, svc, FixedLocation(north(9000)));
      await tester.tap(find.text('Check in'));
      await pumpFor(tester);
      expect(find.text('Please say why'), findsNothing);
      expect(await svc.store.all(), hasLength(1));
      await svc.dispose();
    });
  });

  testWidgets('what the school recorded shows in the person\'s own time; a day waiting for HR says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await ready();
      await svc.store.replaceAllRecords(kStaffDay, [
        (id: '2026-11-02', parentId: null, json: {'date': '2026-11-02', 'checkIn': DateTime(2026, 11, 2, 8, 30).toUtc().toIso8601String(), 'checkOut': null, 'needsConfirmation': true, 'confirmedAt': null}),
      ]);
      await show(tester, svc, FixedLocation(north(0)));
      expect(find.textContaining('Checked in at'), findsOneWidget);
      expect(find.text('Waiting for HR to confirm'), findsOneWidget);
      expect(find.text('Check in'), findsNothing);
      expect(find.text('Check out'), findsOneWidget);
      await svc.dispose();
    });
  });
}
