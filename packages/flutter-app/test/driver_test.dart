import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/widgets.dart' show Scrollable;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart' show OruButton;
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> route({String id = 'r1', String name = 'Lake Road morning'}) => {
      'id': id, 'name': name, 'direction': 'MORNING', 'startTime': '07:00', 'vehicle': null, 'driver': {'id': 'd', 'employeeId': 'E1', 'name': 'Ravi'},
      'stops': [{'id': 's1', 'sequence': 1, 'name': 'Lake Road', 'lat': 12.0, 'lng': 77.0, 'arrivalTime': '07:10'}, {'id': 's2', 'sequence': 2, 'name': 'Market', 'lat': null, 'lng': null, 'arrivalTime': null}],
    };

Map<String, dynamic> manifest(Map<String, dynamic> r) => {
      'route': r, 'capacity': 40, 'assigned': 2,
      'stops': [
        {'id': 's1', 'sequence': 1, 'name': 'Lake Road', 'arrivalTime': '07:10', 'students': [{'id': 'a', 'name': 'Asha Rao', 'enrollmentId': 'S-1', 'className': '5A'}, {'id': 'b', 'name': 'Bilal Khan', 'enrollmentId': 'S-2', 'className': '5A'}]},
        {'id': 's2', 'sequence': 2, 'name': 'Market', 'arrivalTime': null, 'students': []},
      ],
    };

class Gateway {
  final calls = <String>[];
  final bodies = <String, Object?>{};
  Future<http.Response> handle(http.Request r) async {
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    final p = r.url.path;
    calls.add('${r.method} $p');
    if (r.body.isNotEmpty) bodies['${r.method} $p'] = jsonDecode(r.body);
    if (p.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    if (p.endsWith('/transport/routes')) return json({'items': [route()]});
    if (p.endsWith('/manifest')) return json(manifest(route()));
    if (r.method == 'POST' && p.endsWith('/pings')) return json({'accepted': 1, 'ignored': 0});
    if (r.method == 'POST' && p.startsWith('/v1/trips')) {
      return json({'id': 'x', 'state': 'IN_PROGRESS', 'route': {'id': 'r1', 'name': 'R', 'direction': 'MORNING'}, 'vehicle': null, 'driver': 'Ravi', 'startedAt': '2026-11-11T07:00:00Z', 'endedAt': null, 'last': null, 'stale': true, 'stops': [], 'children': []});
    }
    return json({'items': [], 'next': null});
  }
}

class FakeLocation implements LocationPort {
  FakeLocation(this.fix);
  Fix? fix;
  @override
  Future<Fix?> current() async => fix;
}

Future<OruServices> phoneOf(Gateway g) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'DRIVER'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(g.handle),
    accountSource: (token) async => Account(userId: 'u', email: 'd@x', displayName: 'Ravi', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'DRIVER', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('d@x.test', 'pw');
  return svc;
}

SessionActive stateOf() {
  const school = SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'DRIVER', defaultLanguage: 'en');
  return SessionActive(Account(userId: 'u1', email: 'd@x.test', displayName: 'Ravi', schools: const [school]), school);
}

Future<void> press(WidgetTester tester, Finder f) async {
  await tester.scrollUntilVisible(f, 200, scrollable: find.byType(Scrollable).first);
  await tester.pump();
  await tester.tap(f);
}

Future<void> settle(OruLocalStore store) => Future<void>.delayed(const Duration(milliseconds: 100));

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('the pull keeps the driver\'s routes and, for each, who rides stop by stop', () async {
    final svc = await phoneOf(Gateway());
    for (final t in driverPullTasks(svc.api)) {
      await t.run(svc.store);
    }
    expect((await svc.store.records(kDriverRoute)).map((r) => r['id']), ['r1']);
    expect(((await svc.store.record(kDriverManifest, 'r1'))!['stops'] as List).length, 2);
    await svc.dispose();
  });

  test('a trip: saved on the phone first; each position waits behind the start; the end comes last; starting twice is one trip', () async {
    final svc = await phoneOf(Gateway());
    final loc = FakeLocation(const Fix(lat: 12.0003, lng: 77.0, speedKmh: 31.4));
    var n = 0;
    final c = TripController(svc.store, location: loc, every: const Duration(hours: 1), newId: () => 'trip-${++n}');
    await c.start(route());
    await c.start(route()); // a second tap while it runs changes nothing
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(c.running, true);
    expect(c.current!['routeName'], 'Lake Road morning');
    final queued = await svc.store.all();
    expect(queued.map((e) => e.kind), ['trip.start', 'trip.ping']);
    expect(queued[0].id, 'trip-1');
    expect(queued[0].body, {'id': 'trip-1', 'routeId': 'r1'});
    expect(queued[1].parentId, 'trip-1');
    expect(queued[1].body, containsPair('speedKmh', 31));
    expect(queued[1].body['tripId'], 'trip-1');
    expect(c.waiting, 1);

    loc.fix = null; // location turned off
    await c.tick();
    expect(c.locationOff, true);
    expect((await svc.store.all()).length, 2, reason: 'no position, nothing queued');
    loc.fix = const Fix(lat: 12.004, lng: 77.0);
    await c.tick();
    expect(c.locationOff, false);
    expect((await svc.store.all()).length, 3);

    await c.end();
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(c.running, false);
    final all = await svc.store.all();
    expect(all.map((e) => e.kind), ['trip.start', 'trip.ping', 'trip.ping', 'trip.end']);
    expect(all.last.parentId, 'trip-1');
    c.dispose();
    // a new trip drops the ended one from the phone
    final again = TripController(svc.store, location: loc, every: const Duration(hours: 1), newId: () => 'trip-2');
    await again.start(route());
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect((await svc.store.records(kDriverTrip)).map((t) => t['id']), ['trip-2']);
    again.dispose();
    await svc.dispose();
  });

  test('a trip survives the app being closed: the next start of the app finds it running', () async {
    final svc = await phoneOf(Gateway());
    final first = TripController(svc.store, location: FakeLocation(null), every: const Duration(hours: 1), newId: () => 't9');
    await first.start(route());
    await Future<void>.delayed(const Duration(milliseconds: 100));
    first.dispose();
    final second = TripController(svc.store, location: FakeLocation(null), every: const Duration(hours: 1));
    await Future<void>.delayed(const Duration(milliseconds: 200));
    expect(second.running, true);
    expect(second.current!['id'], 't9');
    second.dispose();
    await svc.dispose();
  });

  test('what is queued reaches the school as the right calls', () async {
    final g = Gateway();
    final svc = await phoneOf(g);
    final c = TripController(svc.store, location: FakeLocation(const Fix(lat: 12.5, lng: 77.5, speedKmh: 20)), every: const Duration(hours: 1), newId: () => 'tt1');
    await c.start(route());
    await Future<void>.delayed(const Duration(milliseconds: 200));
    await c.end();
    await Future<void>.delayed(const Duration(milliseconds: 100));
    final sender = OruApiSender(svc.api);
    for (final e in await svc.store.all()) {
      final r = await sender.send(e);
      expect(r.toString(), isNot(contains('refused')), reason: e.kind);
    }
    expect(g.calls, containsAllInOrder(['POST /v1/trips', 'POST /v1/trips/tt1/pings', 'POST /v1/trips/tt1/end']));
    expect(g.bodies['POST /v1/trips'], {'id': 'tt1', 'routeId': 'r1'});
    final ping = (g.bodies['POST /v1/trips/tt1/pings'] as Map)['pings'] as List;
    expect(ping.single, containsPair('lat', 12.5));
    expect(ping.single, containsPair('speedKmh', 20));
    c.dispose();
    await svc.dispose();
  });

  testWidgets('routes, a route with who rides, Start trip, the trip screen, and End trip', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await phoneOf(Gateway());
      for (final t in driverPullTasks(svc.api)) {
        await t.run(svc.store);
      }
      await tester.pumpWidget(host(OruDriverHome(services: svc, state: stateOf(), location: FakeLocation(const Fix(lat: 12, lng: 77)), every: const Duration(hours: 1))));
      await pumpFor(tester);
      expect(find.text('Your routes'), findsOneWidget);
      expect(find.text('Lake Road morning'), findsOneWidget);
      expect(find.textContaining('Morning · 2 stops, 2 students'), findsOneWidget);
      await tester.tap(find.text('Lake Road morning'));
      await pumpFor(tester, 30);
      expect(find.textContaining('Asha Rao'), findsOneWidget);
      expect(find.textContaining('2 students'), findsOneWidget);
      await tester.tap(find.text('Start trip'));
      await pumpFor(tester, 40);
      expect(find.text('Trip in progress'), findsOneWidget);
      expect(find.textContaining('every 30 seconds'), findsOneWidget);
      expect((await svc.store.all()).first.kind, 'trip.start');
      await tester.tap(find.text('End trip').first);
      await pumpFor(tester);
      expect(find.textContaining('no longer see the bus'), findsOneWidget);
      await tester.tap(find.text('Keep going'));
      await pumpFor(tester);
      expect((await svc.store.all()).map((e) => e.kind), isNot(contains('trip.end')));
      await tester.tap(find.text('End trip').first);
      await pumpFor(tester);
      await tester.tap(find.text('End trip').last);
      await pumpFor(tester, 40);
      expect((await svc.store.all()).map((e) => e.kind), contains('trip.end'));
      expect(find.text('Trip in progress'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('location off is said plainly; a trip the school refused says why; targets are at least 64 px', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await phoneOf(Gateway());
      for (final t in driverPullTasks(svc.api)) {
        await t.run(svc.store);
      }
      await tester.pumpWidget(host(OruDriverHome(services: svc, state: stateOf(), location: FakeLocation(null), every: const Duration(hours: 1))));
      await pumpFor(tester);
      await tester.tap(find.text('Lake Road morning'));
      await pumpFor(tester, 30);
      expect(tester.getSize(find.widgetWithText(OruButton, 'Start trip')).height, greaterThanOrEqualTo(64));
      await tester.tap(find.text('Start trip'));
      await pumpFor(tester, 40);
      expect(find.textContaining('Location is off'), findsOneWidget);
      final start = (await svc.store.all()).first;
      await svc.store.markRefused(start.id, code: 'CONFLICT', message: 'this route already has a trip in progress');
      await pumpFor(tester, 30);
      expect(find.textContaining('The school did not accept this trip'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('Urdu: right to left, no overflow', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await phoneOf(Gateway());
      for (final t in driverPullTasks(svc.api)) {
        await t.run(svc.store);
      }
      await tester.pumpWidget(host(OruDriverHome(services: svc, state: stateOf(), location: FakeLocation(null), every: const Duration(hours: 1)), locale: 'ur'));
      await pumpFor(tester);
      await tester.tap(find.text('Lake Road morning'));
      await pumpFor(tester, 30);
      await tester.tap(find.text('سفر شروع کریں'));
      await pumpFor(tester, 40);
      expect(find.text('سفر جاری ہے'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
