import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:geolocator/geolocator.dart';

import '../today/today_data.dart' show isoDate;
import 'checkin_model.dart';

const kStaffDay = 'StaffDay';
const kGeofence = 'Geofence';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// What the Attendance tab pulls: the last two weeks of her own days (the school's times) and where the school is.
List<PullTask> checkInPullTasks(OruApi api, {DateTime Function()? now}) {
  final clock = now ?? DateTime.now;
  return [
    PullTask.list(kStaffDay, () => _guard(() async {
          final to = clock();
          final r = await api.staffAttendanceMine(from: isoDate(to.subtract(const Duration(days: 14))), to: isoDate(to));
          return [for (final d in r.items) (id: d.date, parentId: null as String?, json: d.toJson())];
        })),
    PullTask(kGeofence, (store) async {
      final g = await _guard(api.staffAttendanceGeofence);
      await store.replaceAllRecords(kGeofence, [(id: 'school', parentId: null as String?, json: g.toJson())]);
    }),
  ];
}

/// Where the phone is. A port, so tests need no GPS.
abstract class LocationPort {
  /// Null when the person said no, location is off, or no fix came in time. Never throws.
  Future<Fix?> current();
}

/// For the summary card, which only reads: it never asks where the phone is.
class NoLocation implements LocationPort {
  const NoLocation();
  @override
  Future<Fix?> current() async => null;
}

class GeolocatorLocation implements LocationPort {
  const GeolocatorLocation({this.timeout = const Duration(seconds: 10)});
  final Duration timeout;

  @override
  Future<Fix?> current() async {
    try {
      // The plugin's own time limit does not cover every wait (a permission question nobody answers), so the whole thing is bounded here.
      return await _find().timeout(timeout + const Duration(seconds: 5));
    } catch (_) {
      return null;
    }
  }

  Future<Fix?> _find() async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) return null;
    final p = await Geolocator.getCurrentPosition(locationSettings: LocationSettings(accuracy: LocationAccuracy.high, timeLimit: timeout));
    return Fix(lat: p.latitude, lng: p.longitude, accuracyM: p.accuracy);
  }
}

enum CheckKind { checkIn, checkOut }

/// What the person is about to send: where the phone is and whether the school will want a reason.
class CheckPlan {
  const CheckPlan({required this.kind, required this.fix, required this.verdict});
  final CheckKind kind;
  final Fix? fix;
  final Verdict verdict;
}

/// Keeps a [CheckInView] current from the phone's own records and the outbox, and saves a check-in or check-out on the phone.
class CheckInController extends ChangeNotifier {
  CheckInController(this.store, {required this.location, DateTime Function()? now}) : _now = now ?? DateTime.now {
    _subs.add(store.watchRecords(kStaffDay).listen((_) => _refresh()));
    _subs.add(store.watchCounts().listen((_) => _refresh()));
    _refresh();
  }

  final OruLocalStore store;
  final LocationPort location;
  final DateTime Function() _now;
  final _subs = <StreamSubscription<Object?>>[];
  CheckInView? _view;
  bool locating = false;
  bool _busy = false;
  bool _again = false;
  bool _disposed = false;

  CheckInView? get view => _view;

  Future<void> _refresh() async {
    if (_busy) {
      _again = true;
      return;
    }
    _busy = true;
    try {
      do {
        _again = false;
        final date = isoDate(_now());
        final v = buildCheckIn(date: date, day: await store.record(kStaffDay, date), outbox: await store.all());
        if (_disposed) return;
        _view = v;
        notifyListeners();
      } while (_again);
    } finally {
      _busy = false;
    }
  }

  /// Finds the phone and works out whether a reason is wanted. Takes up to the location timeout; the rest of the screen stays usable.
  Future<CheckPlan> prepare(CheckKind kind) async {
    locating = true;
    notifyListeners();
    try {
      final fix = await location.current();
      final fence = Geofence.fromJson(await store.record(kGeofence, 'school'));
      return CheckPlan(kind: kind, fix: fix, verdict: judge(fence, fix));
    } finally {
      locating = false;
      if (!_disposed) notifyListeners();
    }
  }

  /// Saved on the phone at once; the school's own clock decides the time when it arrives. The phone's time goes along as a note.
  Future<void> save(CheckPlan plan, {String? reason}) async {
    await store.enqueue(kind: plan.kind == CheckKind.checkIn ? 'staff.checkIn' : 'staff.checkOut', body: stampBody(fix: plan.fix, now: _now(), reason: reason));
    await _refresh();
  }

  Future<void> dismissRefusal() async {
    final id = _view?.refusedEntryId;
    if (id != null) await store.dismiss(id);
    await _refresh();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}
