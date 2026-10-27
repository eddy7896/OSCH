// The generated client against the REAL gateway, on the real Auth and Data Connect emulators, with the demo school in them.
// Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set; `tools/tests/dart-gateway.sh` starts all of it and runs this.
// Read-only: it never changes the school. It proves the generated models parse what the gateway really sends, that
// credentials and the school header work, and that a refusal arrives as an OruApiError with the gateway's code.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

final gateway = Platform.environment['ORU_GATEWAY_URL'];
final authHost = Platform.environment['ORU_AUTH_EMULATOR'];
const phrase = 'demo-pass-2027';

Future<String> signIn(String email) async {
  final r = await http.post(Uri.parse('http://$authHost/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake'),
      headers: {'content-type': 'application/json'}, body: jsonEncode({'email': email, 'password': phrase, 'returnSecureToken': true}));
  expect(r.statusCode, 200, reason: 'could not sign $email in: ${r.body}');
  return (jsonDecode(r.body) as Map<String, dynamic>)['idToken'] as String;
}

Future<OruApi> apiFor(String email) async {
  final token = await signIn(email);
  String? school;
  final t = OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => token, getSchoolId: () => school);
  final me = await OruApi(t).meGet();
  school = me.memberships.firstWhere((m) => m.school.subDomain == 'greenfield').school.id;
  return OruApi(t);
}

void main() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;

  test('a teacher: who she is, her classes and week, the fixed seven statuses, her leave and inbox all parse', () async {
    final token = await signIn('teacher@demo.oruschools.example');
    final me = await OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => token)).meGet();
    expect(me.user.email, 'teacher@demo.oruschools.example');
    final membership = me.memberships.firstWhere((m) => m.school.subDomain == 'greenfield');
    expect(membership.role, 'TEACHER');

    final api = await apiFor('teacher@demo.oruschools.example');
    final mine = await api.teachingMine();
    expect(mine.staff, isNotNull, reason: 'the account is linked to a staff record');
    expect(mine.classes, isNotEmpty);

    final week = await api.timetableMine();
    expect(week.entries, isNotEmpty);

    final statuses = await api.attendanceStatuses();
    expect(statuses.items.map((s) => s.status).toList(), ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'MEDICAL', 'HALF_DAY', 'EXCUSED']);

    final schedule = await api.scheduleGet();
    expect(schedule.periods, isNotEmpty);

    expect((await api.leaveRequests()).items, isNotEmpty);
    expect((await api.leaveTypes()).items, isNotEmpty);
    await api.leaveBalances();
    await api.staffAttendanceMine();

    final inbox = await api.notificationsList();
    expect(inbox.unreadCount, greaterThanOrEqualTo(0));

    final tombstones = await api.syncTombstones(since: '2020-01-01T00:00:00Z');
    expect(tombstones.items, isA<List<TombstoneDto>>());
  }, skip: skip);

  test('the Academic admin side: classes, terms, exams, a marks grid, a roster and a report card parse', () async {
    final api = await apiFor('academic@demo.oruschools.example');
    final classes = (await api.academicsClasses()).items;
    expect(classes, isNotEmpty);
    final terms = (await api.gradesTerms()).items;
    final exams = (await api.gradesExams()).items;
    expect(exams, isNotEmpty);
    final grid = await api.gradesGrid(id: exams.first.id);
    expect(grid.rows, isNotEmpty);
    final students = await api.studentsList(pageSize: 5);
    expect(students.items, isNotEmpty);
    final card = await api.gradesReportCard(studentId: students.items.first.id, termId: terms.first.id);
    expect(card.subjects, isA<List<dynamic>>());
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final day = await api.attendanceDay(id: classes.first.id, date: today);
    expect(day.classId, classes.first.id);
  }, skip: skip);

  test('a refusal arrives as the gateway\'s own code: a teacher may not approve leave; no token means AUTH_REQUIRED; a stranger school is refused', () async {
    final api = await apiFor('teacher@demo.oruschools.example');
    await expectLater(
        api.leaveApprove(id: '00000000-0000-4000-8000-000000000000'), throwsA(isA<OruApiError>().having((e) => e.code, 'code', anyOf('FORBIDDEN', 'NOT_FOUND'))));
    final noToken = OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getSchoolId: () => '00000000-0000-4000-8000-000000000000'));
    await expectLater(noToken.teachingMine(), throwsA(isA<OruApiError>().having((e) => e.needsSignIn, 'needsSignIn', isTrue)));
    final token = await signIn('teacher@demo.oruschools.example');
    final stranger = OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: (_) => token, getSchoolId: () => '00000000-0000-4000-8000-000000000000'));
    await expectLater(stranger.teachingMine(), throwsA(isA<OruApiError>().having((e) => e.status, 'status', anyOf(403, 404))));
  }, skip: skip);
}
