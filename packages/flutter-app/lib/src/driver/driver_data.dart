import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../checkin/checkin_data.dart' show LocationPort;

const kDriverRoute = 'DriverRoute';
const kDriverManifest = 'DriverManifest';
const kDriverTrip = 'DriverTrip';

/// How often the bus position is sent while a trip runs (ADR-0015 decision 5).
const kPingEvery = Duration(seconds: 30);

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the Driver app pulls: the routes the driver drives (with their stops) and, for each, who rides stop by stop. Both lists are the truth, so a route taken away disappears.
List<PullTask> driverPullTasks(OruApi api) => [
      PullTask(kDriverRoute, (store) async {
        final routes = (await _guard(api.transportRoutes)).items;
        await store.replaceAllRecords(kDriverRoute, [for (final r in routes) (id: r.id, parentId: null as String?, json: r.toJson())]);
        final manifests = <({String id, String? parentId, Map<String, dynamic> json})>[];
        for (final r in routes) {
          final m = await _guard(() => api.transportManifest(id: r.id));
          manifests.add((id: r.id, parentId: r.id, json: m.toJson()));
        }
        await store.replaceAllRecords(kDriverManifest, manifests);
      }),
    ];

final _random = Random.secure();
String newUuid() {
  final b = List<int>.generate(16, (_) => _random.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  String h(int from, int to) => b.sublist(from, to).map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h(0, 4)}-${h(4, 6)}-${h(6, 8)}-${h(8, 10)}-${h(10, 16)}';
}

/// The driver's trip, kept on the phone so it survives the app being closed: the trip's start, each position and the end are queued like any other change and sent when there is a connection, in
/// order. A trip started with no connection is the same trip when it is sent (the phone chose its id).
class TripController extends ChangeNotifier {
  TripController(this.store, {required this.location, this.every = kPingEvery, DateTime Function()? now, String Function()? newId})
      : _now = now ?? DateTime.now,
        _newId = newId ?? newUuid {
    _subs.add(store.watchRecords(kDriverTrip).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final LocationPort location;
  final Duration every;
  final DateTime Function() _now;
  final String Function() _newId;
  final _subs = <StreamSubscription<Object?>>[];
  Timer? _timer;
  bool _disposed = false;
  bool _ticking = false;

  /// The trip in progress on this phone, or null.
  Map<String, dynamic>? current;

  /// The phone could not tell where it is at the last try: location is off, or the driver said no.
  bool locationOff = false;

  /// Positions queued and not yet accepted by the school.
  int waiting = 0;

  /// The school refused the start (for example another trip is running on the route): the code and words it gave.
  String? refusedReason;

  bool get running => current != null && current!['state'] == 'RUNNING';

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }

  Future<void> _refresh() async {
    final trips = await store.records(kDriverTrip);
    final open = trips.where((t) => t['state'] == 'RUNNING').toList();
    final outbox = await store.all();
    if (_disposed) return;
    current = open.isEmpty ? null : open.first;
    waiting = outbox.where((o) => o.kind == OutboxKinds.tripPing && o.state != OutboxState.failed).length;
    final id = current?['id'] as String?;
    final start = id == null ? null : outbox.where((o) => o.id == id).firstOrNull;
    refusedReason = start != null && start.state == OutboxState.failed ? (start.lastErrorMessage ?? start.lastErrorCode ?? '') : null;
    if (running) {
      _timer ??= Timer.periodic(every, (_) => unawaited(tick()));
    } else {
      _timer?.cancel();
      _timer = null;
    }
    notifyListeners();
  }

  /// Starts the trip on [route] (one of the driver's route records). Saved on the phone first; sent when it can be.
  Future<void> start(Map<String, dynamic> route) async {
    if (running) return;
    final id = _newId(); // the older, ended trips are dropped from the phone here
    await store.replaceAllRecords(kDriverTrip, [
      (id: id, parentId: null, json: {'id': id, 'routeId': route['id'], 'routeName': route['name'], 'direction': route['direction'], 'state': 'RUNNING', 'startedAt': _now().toUtc().toIso8601String()}),
    ]);
    await store.enqueue(kind: OutboxKinds.tripStart, id: id, body: {'id': id, 'routeId': route['id']});
    unawaited(tick());
  }

  /// Takes the phone's position and queues it behind the trip's start. Called every [every] while the trip runs; a failed attempt (no fix) is noted and the next one tries again.
  Future<void> tick() async {
    final trip = current;
    if (trip == null || !running || _ticking) return;
    _ticking = true;
    try {
      final fix = await location.current();
      if (_disposed) return;
      locationOff = fix == null;
      if (fix != null) {
        final speed = fix.speedKmh;
        await store.enqueue(kind: OutboxKinds.tripPing, parentId: trip['id'] as String, body: {
          'tripId': trip['id'],
          'lat': fix.lat,
          'lng': fix.lng,
          if (speed != null) 'speedKmh': speed.clamp(0, 200).round(),
          'recordedAt': _now().toUtc().toIso8601String(),
        });
      }
      notifyListeners();
    } finally {
      _ticking = false;
    }
  }

  /// Ends the trip. Saved first, sent after the positions already queued.
  Future<void> end() async {
    final trip = current;
    if (trip == null) return;
    _timer?.cancel();
    _timer = null;
    await store.upsertRecords(kDriverTrip, [(id: trip['id'] as String, parentId: null, json: {...trip, 'state': 'ENDED', 'endedAt': _now().toUtc().toIso8601String()})]);
    await store.enqueue(kind: OutboxKinds.tripEnd, parentId: trip['id'] as String, body: {'tripId': trip['id']});
  }
}
