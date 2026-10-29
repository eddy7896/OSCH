import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

// The same school and distances as the gateway's geofence.spec.ts, so the phone asks for a reason in exactly the places the gateway does.
const school = Geofence(lat: 12.9716, lng: 77.5946, radiusM: 150, marginM: 50, hardRingM: 500);
Fix north(double m) => Fix(lat: school.lat + m / 111195, lng: school.lng);

OutboxEntry entry(String kind, {String state = OutboxState.queued, String? msg, String id = 'o1'}) => OutboxEntry(
      id: id, seq: 1, kind: kind, body: const {}, state: state, attempts: 0, nextAttemptAtMs: null, lastErrorCode: 'INVALID_REQUEST', lastErrorMessage: msg, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

void main() {
  group('judge: the two rings, as the gateway', () {
    test('inside the grounds and the margin: nothing asked', () {
      for (final m in [0.0, 120.0, 199.0]) {
        final v = judge(school, north(m));
        expect([v.reasonRequired, v.needsConfirm], [false, false], reason: '$m m');
      }
    });
    test('the soft ring is radius plus margin: 201 m is outside it', () {
      final v = judge(school, north(201));
      expect([v.reasonRequired, v.needsConfirm], [true, false]);
    });
    test('between the soft ring and 500 m a reason is asked, HR need not confirm; beyond 500 m HR must', () {
      expect(judge(school, north(400)).needsConfirm, isFalse);
      expect(judge(school, north(520)).needsConfirm, isTrue);
      expect(judge(school, north(5000)).reasonRequired, isTrue);
    });
    test('the distance is whole metres', () {
      expect(judge(school, north(333)).distanceM, inInclusiveRange(332, 334));
    });
    test('no position asks for a reason; no point set asks nothing', () {
      final noFix = judge(school, null);
      expect([noFix.reasonRequired, noFix.distanceM], [true, null]);
      expect(judge(null, null).reasonRequired, isFalse);
      expect(judge(null, north(9000)).reasonRequired, isFalse);
    });
    test('distance: zero for the same point, about 111 km for a degree of latitude', () {
      expect(distanceMetres(1, 2, 1, 2), 0);
      expect(distanceMetres(0, 0, 1, 0), closeTo(111195, 10));
    });
    test('a school that has not set its point is no fence', () {
      expect(Geofence.fromJson({'configured': false, 'lat': null, 'lng': null, 'radiusM': null, 'marginM': 50, 'hardRingM': 500}), isNull);
      expect(Geofence.fromJson({'configured': true, 'lat': 12.9, 'lng': 77.5, 'radiusM': 150, 'marginM': 50, 'hardRingM': 500})!.radiusM, 150);
    });
  });

  group('today\'s check-in on screen', () {
    test('nothing yet: Check in', () {
      final v = buildCheckIn(date: '2026-11-02', day: null, outbox: const []);
      expect([v.stage, v.canCheckIn, v.canCheckOut], [DayStage.notIn, true, false]);
    });
    test('a check-in saved on the phone counts, so Check out can follow it before anything is sent', () {
      final v = buildCheckIn(date: '2026-11-02', day: null, outbox: [entry('staff.checkIn')]);
      expect([v.savedIn, v.canCheckIn, v.canCheckOut], [true, false, true]);
      final both = buildCheckIn(date: '2026-11-02', day: null, outbox: [entry('staff.checkIn'), entry('staff.checkOut', id: 'o2')]);
      expect([both.savedOut, both.canCheckOut], [true, false]);
    });
    test('the school\'s record wins: in, then out', () {
      final inDay = buildCheckIn(date: 'd', day: {'checkIn': '2026-11-02T03:30:00.000Z', 'checkOut': null, 'needsConfirmation': false, 'confirmedAt': null}, outbox: const []);
      expect([inDay.stage, inDay.canCheckIn, inDay.canCheckOut, inDay.savedIn], [DayStage.checkedIn, false, true, false]);
      final out = buildCheckIn(date: 'd', day: {'checkIn': '2026-11-02T03:30:00.000Z', 'checkOut': '2026-11-02T10:30:00.000Z'}, outbox: const []);
      expect([out.stage, out.canCheckIn, out.canCheckOut], [DayStage.checkedOut, false, false]);
    });
    test('a far check-in waits for HR until it is confirmed', () {
      final waiting = buildCheckIn(date: 'd', day: {'checkIn': 'x', 'needsConfirmation': true, 'confirmedAt': null}, outbox: const []);
      expect(waiting.waitingHr, isTrue);
      final done = buildCheckIn(date: 'd', day: {'checkIn': 'x', 'needsConfirmation': true, 'confirmedAt': '2026-11-02T11:00:00.000Z'}, outbox: const []);
      expect(done.waitingHr, isFalse);
    });
    test('a refusal from the school is carried until dismissed, with its entry', () {
      final v = buildCheckIn(date: 'd', day: null, outbox: [entry('staff.checkIn', state: OutboxState.failed, msg: 'reason: reasonRequired')]);
      expect([v.refusal, v.refusedEntryId], ['reason: reasonRequired', 'o1']);
      expect(v.canCheckIn, isTrue, reason: 'a refused check-in can be made again');
    });
  });

  test('the body: position, the phone\'s time as a note, a trimmed reason cut at 300', () {
    final b = stampBody(fix: const Fix(lat: 1, lng: 2, accuracyM: 8), now: DateTime.utc(2026, 11, 2, 3, 30), reason: '  clinic  ');
    expect(b, {'position': {'lat': 1.0, 'lng': 2.0, 'accuracyM': 8.0}, 'deviceTime': '2026-11-02T03:30:00.000Z', 'reason': 'clinic'});
    final bare = stampBody(fix: null, now: DateTime.utc(2026, 11, 2), reason: '   ');
    expect(bare.keys, ['deviceTime']);
    expect(stampBody(fix: null, now: DateTime.utc(2026), reason: 'x' * 400)['reason'], hasLength(300));
  });
}
