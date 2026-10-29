// Leave, cover duties and classes against the REAL gateway and Auth emulator with the demo school (`bash tools/tests/dart-gateway.sh`).
// Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set. Proves the pull tasks parse what the gateway sends, and the gate of P4-4d:
// a leave request made offline is sent once, even when the same entry is offered to the school twice.
import 'dart:async';
import 'dart:math' as math;
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

/// A working day inside the demo school's year on which [api]'s person has no leave yet: the demo school keeps the requests of earlier runs
/// and two on one day overlap.
Future<String> _freeDay(OruApi api, DateTime from, int span) async {
  final taken = [for (final r in (await api.leaveRequests()).items) (r.startDate, r.endDate)];
  var d = from.add(Duration(days: math.Random().nextInt(span)));
  for (var i = 0; i < span * 2; i++) {
    final iso = isoDate(d);
    if (d.weekday != DateTime.sunday && !taken.any((t) => iso.compareTo(t.$1) >= 0 && iso.compareTo(t.$2) <= 0)) return iso;
    d = d.add(const Duration(days: 1));
    if (d.isAfter(from.add(Duration(days: span)))) d = from;
  }
  throw StateError('no free day');
}

void main() {
  staffPull();
  approvals();
  inbox();
  checkIn();
  teacherCheckIn();
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
    final day = await _freeDay(svc.api, DateTime.utc(2027, 1, 1), 85);
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

// P4-5b against the real gateway: a check-in and a check-out made with no connection reach the school once, with the school's own time.
void checkIn() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  test('the demo clerk (a STAFF account with a staff record, not in today) checks in and out offline; the school stamps each once and a repeat changes nothing', () async {
    var online = false;
    final changes = StreamController<bool>.broadcast();
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'STAFF'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: changes.stream,
      isOnline: () async => online,
      pullTasks: (api) => [...checkInPullTasks(api)],
    );
    await svc.session.signInWithPassword('office@demo.oruschools.example', 'demo-pass-2027');
    online = true;
    changes.add(true);
    await svc.coordinator.syncNow();
    expect(svc.coordinator.pullStatus, isA<PullOk>());
    expect(await svc.store.record(kGeofence, 'school'), isNotNull);

    online = false;
    changes.add(false);
    final c = CheckInController(svc.store, location: _Nowhere());
    await Future<void>.delayed(const Duration(milliseconds: 200));
    final inPlan = await c.prepare(CheckKind.checkIn);
    expect(inPlan.verdict.reasonRequired, isFalse, reason: 'the demo school has set no point, so nobody is asked');
    await c.save(inPlan);
    await c.save(await c.prepare(CheckKind.checkOut));
    expect((await svc.store.all()).map((e) => e.kind), ['staff.checkIn', 'staff.checkOut']);

    online = true;
    changes.add(true);
    await svc.coordinator.syncNow();
    expect((await svc.store.all()).where((e) => e.kind.startsWith('staff.')), isEmpty, reason: 'both sent and accepted: ${(await svc.store.all()).map((e) => '${e.kind} ${e.state} ${e.lastErrorMessage}')}');
    final days = (await svc.api.staffAttendanceMine()).items..sort((a, b) => a.date.compareTo(b.date));
    final today = days.last;
    expect(today.checkIn, isNotNull);
    expect(today.checkOut, isNotNull);
    expect(today.checkInDeviceTime, isNotNull, reason: 'the phone\'s own time is kept as a note beside the school\'s');
    final firstIn = today.checkIn;
    // The same pair offered again changes nothing: the first check-in stands.
    await c.save(await c.prepare(CheckKind.checkIn));
    await svc.coordinator.syncNow();
    expect((await svc.api.staffAttendanceMine()).items.where((d) => d.date == today.date).single.checkIn, firstIn);
    c.dispose();
    await svc.dispose();
  }, skip: skip);
}

class _Nowhere implements LocationPort {
  @override
  Future<Fix?> current() async => const Fix(lat: 12.9716, lng: 77.5946, accuracyM: 5);
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
    final day = await _freeDay(teacher.api, DateTime.utc(2026, 12, 1), 100);
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

// P4-6 against the real gateway: the Principal's notifications are pulled and read from the phone's copy; opening one is sent once; the phone's
// push address is kept on the account and removed again.
class _FixedPush implements PushPort {
  @override
  Future<String?> token() async => 'test-token-${DateTime.now().millisecondsSinceEpoch}';
  @override
  Stream<String> get tokenChanges => const Stream.empty();
  @override
  Stream<void> get received => const Stream.empty();
  @override
  Stream<void> get opened => const Stream.empty();
  @override
  String get platform => 'IOS';
}

void inbox() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  test('the Principal pulls her notifications, reads one (sent once) and the phone\'s push address is registered and removed', () async {
    final changes = StreamController<bool>.broadcast();
    // The phones this account already has (a run that stopped half way leaves one): this test adds one and takes it away again.
    final probe = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'PRINCIPAL'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
    );
    await probe.session.signInWithPassword('principal@demo.oruschools.example', 'demo-pass-2027');
    final phonesBefore = (await probe.api.devicesList()).items.length;
    await probe.dispose();
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'PRINCIPAL'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: changes.stream,
      isOnline: () async => true,
      push: _FixedPush(),
      pullTasks: (api) => [...inboxPullTasks(api)],
    );
    await svc.session.signInWithPassword('principal@demo.oruschools.example', 'demo-pass-2027');
    changes.add(true);
    await svc.coordinator.syncNow();
    expect(svc.coordinator.pullStatus, isA<PullOk>(), reason: '${svc.coordinator.pullStatus}');
    final notices = await svc.store.records(kNotice);
    expect(notices, isNotEmpty, reason: 'the demo school\'s leave notices reach the Principal');

    // The phone's push address is on the account.
    for (var i = 0; i < 50 && (await svc.api.devicesList()).items.length == phonesBefore; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    expect((await svc.api.devicesList()).items, hasLength(phonesBefore + 1));

    // Read from the phone's copy with the network gone, then opened: sent once.
    final c = InboxController(svc.store);
    await Future<void>.delayed(const Duration(milliseconds: 300));
    final first = c.items!.firstWhere((i) => !i.read);
    final unreadBefore = c.unread;
    changes.add(false);
    await c.open(first);
    await c.open(first);
    expect((await svc.store.all()).where((e) => e.kind == 'notice.read'), hasLength(1));
    await Future<void>.delayed(const Duration(milliseconds: 300));
    expect(c.unread, unreadBefore - 1);
    changes.add(true);
    await svc.coordinator.syncNow();
    expect((await svc.store.all()).where((e) => e.kind == 'notice.read'), isEmpty);
    final onServer = (await svc.api.notificationsList(limit: 200)).items.firstWhere((n) => n.id == first.notice['id']);
    expect(onServer.read, isTrue);
    c.dispose();

    await svc.session.signOut(force: true);
    final again = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'PRINCIPAL'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
    );
    await again.session.signInWithPassword('principal@demo.oruschools.example', 'demo-pass-2027');
    expect((await again.api.devicesList()).items, hasLength(phonesBefore), reason: 'signing out removed this phone\'s address');
    await again.dispose();
    await svc.dispose();
  }, skip: skip);
}

// P4-9 against the real gateway: a Teacher account may read her own days and where the school is (the Teacher app's check-in screen uses them).
void teacherCheckIn() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;
  test('the demo teacher pulls her own days and the school\'s point, and today shows as checked in', () async {
    final svc = await OruServices.create(
      OruAppConfig(gatewayUrl: gateway!, firebaseApiKey: 'fake', authEmulator: authHost),
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: _NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      pullTasks: (api) => [...checkInPullTasks(api)],
    );
    await svc.session.signInWithPassword('teacher@demo.oruschools.example', 'demo-pass-2027');
    await svc.coordinator.syncNow();
    expect(svc.coordinator.pullStatus, isA<PullOk>(), reason: '${svc.coordinator.pullStatus}');
    expect(await svc.store.record(kGeofence, 'school'), isNotNull);
    final days = await svc.store.records(kStaffDay);
    expect(days, isNotEmpty, reason: 'the demo seeds her check-in for today');
    await svc.dispose();
  }, skip: skip);
}
