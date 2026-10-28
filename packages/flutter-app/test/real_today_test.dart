// The Today screen's data against the REAL gateway and Auth emulator with the demo school (`bash tools/tests/dart-gateway.sh`).
// Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set. Proves the pull tasks parse what the gateway really sends and that the
// local copy builds a Today model for the demo teacher with the network gone afterwards.
import 'dart:io';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

final gateway = Platform.environment['ORU_GATEWAY_URL'];
final authHost = Platform.environment['ORU_AUTH_EMULATOR'];

class _NoLock implements DeviceLockPort {
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<bool> authenticate() async => false;
}

void main() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('the demo teacher pulls her day once; the Today model is built from the phone alone', () async {
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      pullTasks: todayPullTasks,
    );
    await svc.session.signInWithPassword('teacher@demo.oruschools.example', 'demo-pass-2027');
    await svc.coordinator.syncNow();
    expect(svc.coordinator.pullStatus, isA<PullOk>(), reason: '${svc.coordinator.pullStatus is PullFailed ? (svc.coordinator.pullStatus as PullFailed).code : svc.coordinator.pullStatus}');

    expect((await svc.store.records(kTimetableEntry)), isNotEmpty);
    expect((await svc.store.records(kPeriod)), isNotEmpty);
    expect((await svc.store.records(kTeachingClass)), isNotEmpty);
    expect(await svc.store.record(kSchedule, 'school'), isNotNull);

    // Any weekday of the school: the model needs nothing but the local copy.
    final tt = await svc.store.records(kTimetableEntry);
    final day = tt.first['day'] as String;
    final model = buildToday(
      date: '2026-10-26', weekday: day, nowMinutes: 0,
      timetable: tt, periods: await svc.store.records(kPeriod), teachingClasses: await svc.store.records(kTeachingClass),
      attendanceDays: await svc.store.records(kAttendanceDay), leaveRequests: await svc.store.records(kLeaveRequest),
      schedule: await svc.store.record(kSchedule, 'school'), outbox: await svc.store.all(),
    );
    expect(model.hasData, isTrue);
    expect(model.nextLessons, isNotEmpty);
    expect(model.nextLessons.first.subject, isNotEmpty);
    expect(model.leaveWaiting, greaterThanOrEqualTo(1), reason: 'the demo teacher has a half-day sick leave pending');
    await svc.dispose();
  }, skip: skip);
}
