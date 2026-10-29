// Leave, cover duties and classes against the REAL gateway and Auth emulator with the demo school (`bash tools/tests/dart-gateway.sh`).
// Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set. Proves the pull tasks parse what the gateway sends, and the gate of P4-4d:
// a leave request made offline is sent once, even when the same entry is offered to the school twice.
import 'dart:async';
import 'dart:io';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
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
  staffPull();
  approvals();
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('the demo teacher pulls leave types, balances, cover duties, classes and students; a request made offline is sent once', () async {
    var online = false;
    final changes = StreamController<bool>.broadcast();
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: changes.stream,
      isOnline: () async => online,
      pullTasks: (api) => [...todayPullTasks(api), ...leavePullTasks(api), ...classesPullTasks(api)],
    );
    await svc.session.signInWithPassword('teacher@demo.oruschools.example', 'demo-pass-2027');
    online = true;
    changes.add(true);
    await svc.coordinator.syncNow();
    final st = svc.coordinator.pullStatus;
    expect(st, isA<PullOk>(), reason: '${st is PullFailed ? st.code : st}');

    final types = await svc.store.records(kLeaveType);
    expect(types, isNotEmpty);
    expect(await svc.store.records(kLeaveBalance), isNotEmpty);
    final classes = await svc.store.records(kMyClass);
    expect(classes, isNotEmpty);
    final own = classes.where((c) => c['classTeacher'] == true).toList();
    expect(own, isNotEmpty);
    expect((await svc.store.records(kClassStudent, parentId: own.first['id'] as String)), isNotEmpty, reason: 'the class she is class teacher of has students');
    expect(await svc.store.records(kTerm), isNotEmpty);

    // Made with no network: saved on the phone, not sent.
    online = false;
    changes.add(false);
    final before = (await svc.api.leaveRequests()).items.length;
    // A different day each run, inside the demo school's academic year (2026-27): the demo school keeps the requests of earlier runs, and two on one day overlap.
    final d = DateTime.utc(2027, 1, 1).add(Duration(days: DateTime.now().millisecondsSinceEpoch ~/ 1000 % 85));
    final day = isoDate(d);
    final reason = 'offline once ${DateTime.now().millisecondsSinceEpoch}';
    final body = leaveBody(typeId: types.first['id'] as String, start: day, end: day, half: 'MORNING', reason: reason);
    final entry = await svc.store.enqueue(kind: 'leave.create', body: body);
    expect((await svc.api.leaveRequests()).items.length, before);

    // The same entry offered twice (a lost reply, a retry): the school holds one request.
    online = true;
    changes.add(true);
    await svc.coordinator.syncNow();
    expect((await svc.store.all()).where((e) => e.kind == 'leave.create'), isEmpty, reason: 'sent and gone from the outbox: ${(await svc.store.all()).map((e) => '${e.state} ${e.attempts} ${e.lastErrorCode} ${e.lastErrorMessage}')}');
    final sender = OruApiSender(svc.api);
    final again = await sender.send(entry);
    expect(again.toString(), isNot(contains('refused')), reason: 'a repeat is answered, not refused');
    final mine = (await svc.api.leaveRequests()).items.where((r) => r.reason == reason).toList();
    expect(mine, hasLength(1), reason: 'sent once');
    expect(mine.single.half, 'MORNING');

    await svc.dispose();
  }, skip: skip);
}

// The Staff app's pulls for a non-teaching role: the HR manager's leave and the school's announcements.
void staffPull() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  test('the demo HR manager pulls her leave and the announcements for the Staff app', () async {
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'HR_MANAGER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      pullTasks: staffPullTasks,
    );
    await svc.session.signInWithPassword('hr@demo.oruschools.example', 'demo-pass-2027');
    await svc.coordinator.syncNow();
    final st = svc.coordinator.pullStatus;
    expect(st, isA<PullOk>(), reason: '${st is PullFailed ? st.code : st}');
    expect(await svc.store.records(kLeaveType), isNotEmpty);
    await svc.dispose();
  }, skip: skip);
}

// P4-5c against the real gateway: the Principal decides a teacher's request; the HR manager, who may not, is refused.
void approvals() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  Future<OruServices> as(String email, Set<String> roles) async {
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: roles,
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
    );
    await svc.session.signInWithPassword(email, 'demo-pass-2027');
    return svc;
  }

  test('the Principal approves a teacher\'s request from the phone\'s controller; HR is refused', () async {
    final teacher = await as('teacher@demo.oruschools.example', const {'TEACHER'});
    final principal = await as('principal@demo.oruschools.example', const {'PRINCIPAL'});
    final hr = await as('hr@demo.oruschools.example', const {'HR_MANAGER'});
    final types = (await teacher.api.leaveTypes()).items;
    final day = isoDate(DateTime.utc(2026, 11, 1).add(Duration(days: DateTime.now().millisecondsSinceEpoch ~/ 1000 % 60)));
    final made = await teacher.api.leaveCreate(body: CreateRequestDto(clientId: 'appr-${DateTime.now().millisecondsSinceEpoch}', leaveTypeId: types.first.id, startDate: day, endDate: day, half: null, reason: 'approval test'));
    expect(made.status, 'PENDING');

    final asHr = ApprovalsController(hr.api);
    await asHr.approve(made.id);
    expect(asHr.problem, ApprovalsProblem.refused, reason: 'HR can never approve');

    final c = ApprovalsController(principal.api);
    await c.load();
    expect(c.items!.any((x) => x['id'] == made.id), isTrue);
    await c.approve(made.id);
    expect(c.items!.any((x) => x['id'] == made.id), isFalse);
    final after = (await teacher.api.leaveRequests()).items.firstWhere((r) => r.id == made.id);
    expect(after.status, 'APPROVED');
    for (final s in [teacher, principal, hr]) {
      await s.dispose();
    }
  }, skip: skip);
}
