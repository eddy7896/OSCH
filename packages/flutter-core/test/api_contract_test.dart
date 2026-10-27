import 'dart:convert';
import 'dart:io';

import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// The generated Dart client is checked here against the committed contract, so it cannot drift from it even if someone
/// forgets `npm run generate:dart -w @oruschools/api-client` (the JS side also fails `npm test` when the files are stale).
void main() {
  final spec = jsonDecode(File('../../apps/api-gateway/openapi.json').readAsStringSync()) as Map<String, dynamic>;
  final paths = spec['paths'] as Map<String, dynamic>;

  test('every generated route is a real operation of the contract, with the same method and access class', () {
    expect(kOruRoutes, isNotEmpty);
    for (final r in kOruRoutes) {
      final item = paths[r.path] as Map<String, dynamic>?;
      expect(item, isNotNull, reason: '${r.method} ${r.path} is not in the contract');
      final op = item![r.method.toLowerCase()] as Map<String, dynamic>?;
      expect(op, isNotNull, reason: '${r.method} ${r.path}');
      expect(op!['operationId'], r.operationId);
      expect(op['x-access'], r.access.name, reason: r.operationId);
    }
  });

  test('the gateway error codes in the Dart client are exactly the contract\'s', () {
    final codes = (((spec['components'] as Map)['schemas'] as Map)['ErrorEnvelope'] as Map)['properties']['error']['properties']['code']['enum'] as List;
    expect(kGatewayErrorCodes, codes);
  });

  test('the phone apps can read and write every record a Phase 3 sync rule names', () {
    final names = kOruRoutes.map((r) => r.operationId).toSet();
    for (final op in [
      'Attendance_submit', // class day, idempotent by submissionId
      'Grades_saveMarks', // marks, idempotent by submissionId
      'Leave_create', // leave request, idempotent by clientId
      'StaffAttendance_checkIn',
      'StaffAttendance_checkOut',
      'Sync_tombstones',
      'Notifications_read',
    ]) {
      expect(names, contains(op));
    }
  });

  test('models round-trip: what the generated code reads is what it writes back', () {
    final j = {
      'submissionId': 'sub-1',
      'lock': true,
      'marks': [
        {'studentId': 'stu-1', 'status': 'ABSENT'},
      ],
    };
    final body = SubmitDayDto.fromJson(j);
    expect(body.submissionId, 'sub-1');
    expect(body.lock, isTrue);
    expect(body.marks.single.studentId, 'stu-1');
    expect(body.toJson(), j);
    // an optional field left out stays out of the request
    expect(const SubmitDayDto(marks: []).toJson(), {'marks': <dynamic>[]});
  });
}
