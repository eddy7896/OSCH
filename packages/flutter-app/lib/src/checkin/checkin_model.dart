import 'dart:math' as math;

import 'package:flutter_sync/flutter_sync.dart';

/// Where the school is, as the gateway tells it (`GET /v1/attendance/staff/geofence`). The gateway decides again on every check-in; the
/// phone only uses this to ask for a reason BEFORE sending, which it cannot do without a connection otherwise.
class Geofence {
  const Geofence({required this.lat, required this.lng, required this.radiusM, required this.marginM, required this.hardRingM});
  final double lat;
  final double lng;
  final double radiusM;
  final double marginM;
  final double hardRingM;

  /// Null when the school has set no point (nobody is then asked for a reason).
  static Geofence? fromJson(Map<String, dynamic>? j) {
    if (j == null || j['configured'] != true || j['lat'] == null || j['lng'] == null || j['radiusM'] == null) return null;
    return Geofence(lat: (j['lat'] as num).toDouble(), lng: (j['lng'] as num).toDouble(), radiusM: (j['radiusM'] as num).toDouble(), marginM: (j['marginM'] as num?)?.toDouble() ?? 50, hardRingM: (j['hardRingM'] as num?)?.toDouble() ?? 500);
  }
}

class Fix {
  const Fix({required this.lat, required this.lng, this.accuracyM});
  final double lat;
  final double lng;
  final double? accuracyM;
}

/// Metres between two points on the earth (haversine, the same as the gateway's, so both sides ask for a reason in the same places).
double distanceMetres(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371008.8;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final h = math.pow(math.sin(dLat / 2), 2) + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.min(1, math.sqrt(h.toDouble())));
}

class Verdict {
  const Verdict({required this.reasonRequired, required this.needsConfirm, required this.distanceM});
  final bool reasonRequired;
  final bool needsConfirm;

  /// Whole metres from the school point; null with no position or no point.
  final int? distanceM;
}

/// Mirrors the gateway's `judge`: no point set, nothing is asked; no position, a reason is asked; inside radius + margin, nothing is
/// asked; further, a reason is asked, and beyond the hard ring HR must confirm. It never blocks the check-in.
Verdict judge(Geofence? fence, Fix? fix) {
  if (fence == null) return const Verdict(reasonRequired: false, needsConfirm: false, distanceM: null);
  if (fix == null) return const Verdict(reasonRequired: true, needsConfirm: false, distanceM: null);
  final d = distanceMetres(fence.lat, fence.lng, fix.lat, fix.lng);
  if (d <= fence.radiusM + fence.marginM) return Verdict(reasonRequired: false, needsConfirm: false, distanceM: d.round());
  return Verdict(reasonRequired: true, needsConfirm: d > fence.hardRingM, distanceM: d.round());
}

enum DayStage { notIn, checkedIn, checkedOut }

/// What the Attendance tab shows for today.
class CheckInView {
  const CheckInView({required this.stage, required this.checkIn, required this.checkOut, required this.savedIn, required this.savedOut, required this.waitingHr, required this.refusal, required this.refusedEntryId});
  final DayStage stage;

  /// ISO timestamps from the school (its clock decides the time: offline-sync rule 4), or null.
  final String? checkIn;
  final String? checkOut;

  /// Saved on this phone, not sent yet.
  final bool savedIn;
  final bool savedOut;
  final bool waitingHr;

  /// What the school said when it refused a check-in or check-out sent from the phone.
  final String? refusal;
  final String? refusedEntryId;

  bool get canCheckIn => stage == DayStage.notIn && !savedIn;
  bool get canCheckOut => (stage == DayStage.checkedIn || savedIn) && stage != DayStage.checkedOut && !savedOut;
}

/// Pure: the school's record for [date] (or none) and the outbox give the screen. A saved check-in counts as "in" so that Check out can
/// follow it before anything has been sent; the engine sends them in the order they were saved.
CheckInView buildCheckIn({required String date, required Map<String, dynamic>? day, required List<OutboxEntry> outbox}) {
  final checkIn = day?['checkIn'] as String?;
  final checkOut = day?['checkOut'] as String?;
  bool pending(String kind) => outbox.any((o) => o.kind == kind && (o.state == OutboxState.queued || o.state == OutboxState.sending));
  final failed = outbox.where((o) => (o.kind == 'staff.checkIn' || o.kind == 'staff.checkOut') && o.state == OutboxState.failed).toList();
  final savedIn = checkIn == null && pending('staff.checkIn');
  final savedOut = checkOut == null && pending('staff.checkOut');
  final stage = checkOut != null ? DayStage.checkedOut : (checkIn != null ? DayStage.checkedIn : DayStage.notIn);
  return CheckInView(
    stage: stage,
    checkIn: checkIn,
    checkOut: checkOut,
    savedIn: savedIn,
    savedOut: savedOut,
    waitingHr: day?['needsConfirmation'] == true && day?['confirmedAt'] == null,
    refusal: failed.isEmpty ? null : (failed.last.lastErrorMessage ?? failed.last.lastErrorCode),
    refusedEntryId: failed.isEmpty ? null : failed.last.id,
  );
}

Map<String, dynamic> stampBody({required Fix? fix, required DateTime now, String? reason}) => {
      if (fix != null) 'position': {'lat': fix.lat, 'lng': fix.lng, if (fix.accuracyM != null) 'accuracyM': fix.accuracyM},
      'deviceTime': now.toUtc().toIso8601String(),
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim().length > 300 ? reason.trim().substring(0, 300) : reason.trim(),
    };
