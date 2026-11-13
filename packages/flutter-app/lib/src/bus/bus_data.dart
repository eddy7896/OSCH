import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../services.dart';

const kParentTrip = 'ParentTrip';

/// How long a copy of the bus's position can be old before the phone says so (the school marks the bus itself as quiet after 3 minutes).
const kOldCopy = Duration(minutes: 3);

/// The buses in progress that carry this parent's own children, with where each is and when it reaches each stop. The whole list is the truth (a trip that ended is gone), and each record
/// remembers when this phone fetched it, so the screen can say "this is how it was at ..." when there is no connection.
List<PullTask> parentBusPullTasks(OruApi api, {DateTime Function()? now}) => [
      PullTask.list(kParentTrip, () async {
        try {
          final at = (now ?? DateTime.now)().toUtc().toIso8601String();
          return [for (final t in (await api.tripsActive()).items) (id: t.id, parentId: null as String?, json: {...t.toJson(), 'fetchedAt': at})];
        } on OruApiError catch (e) {
          throw failureOf(e);
        }
      }),
    ];

/// Asks the school again now (the screen does this every 30 seconds while it is open). Throws when there is no connection; the phone's copy stays.
Future<void> refreshBus(OruServices services, {DateTime Function()? now}) async {
  for (final t in parentBusPullTasks(services.api, now: now)) {
    await t.run(services.store);
  }
}

/// What one bus means for one child: their stop, whether the bus has passed it, the estimate, and how fresh the news is.
class BusView {
  const BusView({required this.trip, required this.child, required this.childStop, required this.passed, required this.etaMinutes, required this.noPosition, required this.quiet, required this.copyFrom, required this.lastAt});
  final Map<String, dynamic> trip;
  final Map<String, dynamic> child;
  final Map<String, dynamic>? childStop;
  final bool passed;
  final int? etaMinutes;

  /// The bus has started but no position has reached the school yet.
  final bool noPosition;

  /// The school has had no new position for a few minutes.
  final bool quiet;

  /// Set when this phone's copy is older than [kOldCopy]: the time it was fetched.
  final DateTime? copyFrom;
  final DateTime? lastAt;

  List<Map<String, dynamic>> get stops => ((trip['stops'] as List?) ?? const []).cast<Map<String, dynamic>>();
}

/// Pure: the buses in [trips] that carry [childId], at time [now].
List<BusView> buildBusViews(List<Map<String, dynamic>> trips, String childId, DateTime now) {
  final out = <BusView>[];
  for (final trip in trips) {
    final kids = ((trip['children'] as List?) ?? const []).cast<Map<String, dynamic>>();
    final child = kids.where((k) => k['id'] == childId).firstOrNull;
    if (child == null) continue;
    final stops = ((trip['stops'] as List?) ?? const []).cast<Map<String, dynamic>>();
    final stop = stops.where((s) => s['id'] == child['stopId']).firstOrNull;
    final last = trip['last'] as Map<String, dynamic>?;
    final fetched = DateTime.tryParse((trip['fetchedAt'] as String?) ?? '');
    out.add(BusView(
      trip: trip,
      child: child,
      childStop: stop,
      passed: stop?['reached'] == true,
      etaMinutes: (stop?['etaMinutes'] as num?)?.toInt(),
      noPosition: last == null,
      quiet: last != null && trip['stale'] == true,
      copyFrom: fetched != null && now.difference(fetched) > kOldCopy ? fetched.toLocal() : null,
      lastAt: DateTime.tryParse((last?['recordedAt'] as String?) ?? '')?.toLocal(),
    ));
  }
  return out;
}
