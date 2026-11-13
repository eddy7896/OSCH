import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/widgets.dart' show SizedBox;
import 'package:flutter_core/flutter_core.dart' show OruBadge;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> stop(String id, int n, String name, {bool reached = false, int? eta, String? at}) => {'id': id, 'sequence': n, 'name': name, 'lat': 12.0, 'lng': 77.0, 'plannedTime': at, 'reached': reached, 'etaMinutes': eta};

Map<String, dynamic> trip({String id = 't1', List<Map<String, dynamic>>? stops, Map<String, dynamic>? last = const {'lat': 12.0, 'lng': 77.0, 'speedKmh': 30, 'recordedAt': '2026-11-12T07:30:00.000Z'}, bool stale = false, List<Map<String, dynamic>>? children, String? fetchedAt}) => {
      'id': id, 'state': 'IN_PROGRESS', 'route': {'id': 'r1', 'name': 'North loop', 'direction': 'MORNING'}, 'vehicle': 'Bus 3 (KA-01)', 'driver': 'Salim Dar', 'startedAt': '2026-11-12T07:00:00.000Z', 'endedAt': null,
      'last': last, 'stale': stale, 'children': children ?? [{'id': 'k1', 'name': 'Aarav Sharma', 'stopId': 's2'}],
      'stops': stops ?? [stop('s1', 1, 'Lake Road', reached: true, at: '07:10'), stop('s2', 2, 'Market', eta: 3, at: '07:25'), stop('s3', 3, 'School gate', eta: 8, at: '07:40')],
      'fetchedAt': ?fetchedAt,
    };

const child = {'id': 'k1', 'name': 'Aarav Sharma'};

class Gateway {
  List<Map<String, dynamic>> trips = [];
  bool offline = false;
  int asked = 0;
  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    http.Response json(Object o) => http.Response(jsonEncode(o), 200, headers: {'content-type': 'application/json'});
    if (r.url.path.endsWith('/trips/active')) {
      asked++;
      return json({'items': trips});
    }
    if (r.url.path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    return json({'items': [], 'next': null});
  }
}

Future<OruServices> phoneOf(Gateway g) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'PARENT'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(g.handle),
    accountSource: (token) async => Account(userId: 'u', email: 'p@x', displayName: 'Parvati', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'PARENT', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('p@x.test', 'pw');
  return svc;
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);
  final now = DateTime.parse('2026-11-12T07:31:00Z');

  group('what one bus means for one child', () {
    test('their stop, the estimate, and that the bus has not passed it yet', () {
      final v = buildBusViews([trip(fetchedAt: '2026-11-12T07:30:30Z')], 'k1', now).single;
      expect(v.childStop!['name'], 'Market');
      expect(v.passed, false);
      expect(v.etaMinutes, 3);
      expect(v.noPosition, false);
      expect(v.quiet, false);
      expect(v.copyFrom, isNull, reason: 'fetched half a minute ago');
    });
    test('a bus that has passed their stop; a stop with no estimate', () {
      final passed = buildBusViews([trip(stops: [stop('s1', 1, 'Lake Road', reached: true), stop('s2', 2, 'Market', reached: true)])], 'k1', now).single;
      expect(passed.passed, true);
      final none = buildBusViews([trip(stops: [stop('s2', 2, 'Market')])], 'k1', now).single;
      expect(none.etaMinutes, isNull);
    });
    test('started with no position yet; gone quiet; and a copy older than 3 minutes says when it was fetched', () {
      expect(buildBusViews([trip(last: null, stale: true)], 'k1', now).single.noPosition, true);
      final quiet = buildBusViews([trip(stale: true)], 'k1', now).single;
      expect(quiet.quiet, true);
      expect(quiet.noPosition, false);
      expect(buildBusViews([trip(fetchedAt: '2026-11-12T07:20:00Z')], 'k1', now).single.copyFrom, isNotNull);
    });
    test('only the buses that carry this child', () {
      final other = trip(id: 't2', children: [{'id': 'k9', 'name': 'Other', 'stopId': 's1'}]);
      expect(buildBusViews([trip(), other], 'k1', now).map((v) => v.trip['id']), ['t1']);
      expect(buildBusViews([other], 'k1', now), isEmpty);
    });
  });

  test('the pull keeps the buses in progress and when it fetched them; a trip that ended is gone at the next pull', () async {
    final g = Gateway()..trips = [trip()];
    final svc = await phoneOf(g);
    await refreshBus(svc, now: () => now);
    final kept = await svc.store.records(kParentTrip);
    expect(kept.single['id'], 't1');
    expect(kept.single['fetchedAt'], '2026-11-12T07:31:00.000Z');
    g.trips = [];
    await refreshBus(svc, now: () => now);
    expect(await svc.store.records(kParentTrip), isEmpty);
    g.offline = true;
    g.trips = [trip()];
    await expectLater(refreshBus(svc, now: () => now), throwsA(anything));
    await svc.dispose();
  });

  testWidgets('the bus screen: where it is for this child, the stops, then it moves and the screen follows without a pull; and says so when there is no bus', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final g = Gateway()..trips = [trip()];
      final svc = await phoneOf(g);
      await tester.pumpWidget(host(OruBusScreen(services: svc, child: child, every: const Duration(milliseconds: 400), now: () => now)));
      await pumpFor(tester, 20);
      expect(find.text('Where is the bus?'), findsOneWidget);
      expect(find.textContaining('Aarav\'s stop'), findsOneWidget);
      expect(find.textContaining('about 3 minutes'), findsWidgets);
      expect(find.textContaining('Salim Dar'), findsOneWidget);
      expect(find.textContaining('Reached'), findsOneWidget);
      expect(find.widgetWithText(OruBadge, 'Aarav'), findsOneWidget, reason: 'their own stop is marked');
      expect(find.textContaining('rough estimate'), findsOneWidget);
      // the bus moves past Market: the next ask changes the screen
      g.trips = [trip(stops: [stop('s1', 1, 'Lake Road', reached: true), stop('s2', 2, 'Market', reached: true), stop('s3', 3, 'School gate', eta: 4)])];
      await pumpFor(tester, 40);
      expect(find.textContaining('has passed Aarav'), findsOneWidget);
      expect(g.asked, greaterThan(1));
      // the trip ends
      g.trips = [];
      await pumpFor(tester, 40);
      expect(find.textContaining('not on a trip right now'), findsOneWidget);
      await tester.pumpWidget(host(const SizedBox()));
      await svc.dispose();
    });
  });

  testWidgets('no connection: the last copy stays and says when it was from; a bus gone quiet says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final g = Gateway();
      final svc = await phoneOf(g);
      await svc.store.replaceAllRecords(kParentTrip, [(id: 't1', parentId: null, json: trip(fetchedAt: '2026-11-12T07:20:00Z', stale: true))]);
      g.offline = true;
      await tester.pumpWidget(host(OruBusScreen(services: svc, child: child, every: const Duration(hours: 1), now: () => now)));
      await pumpFor(tester, 20);
      expect(find.textContaining('This is how it was at'), findsOneWidget);
      expect(find.textContaining('No new position for a few minutes'), findsOneWidget);
      expect(find.textContaining('Aarav\'s stop'), findsOneWidget);
      await tester.pumpWidget(host(const SizedBox()));
      await svc.dispose();
    });
  });

  testWidgets('Urdu: right to left, no overflow', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final g = Gateway()..trips = [trip()];
      final svc = await phoneOf(g);
      await tester.pumpWidget(host(OruBusScreen(services: svc, child: child, every: const Duration(hours: 1), now: () => now), locale: 'ur'));
      await pumpFor(tester, 25);
      expect(find.text('بس کہاں ہے؟'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(host(const SizedBox()));
      await svc.dispose();
    });
  });
}
