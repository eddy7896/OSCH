import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('cover duties list the lesson, the day and who she covers for', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kCoverDuty, [
        (id: 'd1', parentId: null, json: {'id': 'd1', 'date': '2026-11-03', 'class': {'id': 'c', 'name': '5A'}, 'subject': {'id': 's', 'name': 'Mathematics'}, 'period': {'id': 'p', 'label': 'P2', 'startTime': '09:00', 'endTime': '09:45'}, 'covering': {'id': 'x', 'name': 'Ravi Kumar', 'employeeId': 'E1'}}),
      ]);
      await tester.pumpWidget(host(OruCoverScreen(services: svc)));
      await pumpFor(tester);
      expect(find.textContaining('Mathematics'), findsOneWidget);
      expect(find.textContaining('Ravi Kumar'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('classes: the class teacher\'s class opens its students and the report card shows what the phone kept when the network is gone', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kMyClass, [
        (id: 'c1', parentId: null, json: {'id': 'c1', 'name': '5A', 'classTeacher': true}),
        (id: 'c2', parentId: null, json: {'id': 'c2', 'name': '6B', 'classTeacher': false}),
      ]);
      await svc.store.replaceRecords(kClassStudent, parentId: 'c1', records: [(id: 'st1', json: {'id': 'st1', 'name': 'Asha Rao', 'enrollmentId': 'S-001'})]);
      await svc.store.replaceAllRecords(kTerm, [(id: 't1', parentId: null, json: {'id': 't1', 'name': 'Term 1', 'academicYearId': 'y'})]);
      await svc.store.upsertRecords(kReportCard, [
        (id: 'st1|t1', parentId: null, json: {'totalMarks': '80', 'totalMaxMarks': '100', 'percent': '80', 'grade': 'A', 'pending': 0, 'subjects': [{'subject': {'id': 'm', 'name': 'Mathematics'}, 'marks': '40', 'maxMarks': '50', 'grade': 'A', 'pending': 0, 'percent': '80', 'exams': []}]}),
      ]);
      await tester.pumpWidget(host(OruClassesScreen(services: svc)));
      await pumpFor(tester);
      expect(find.text('5A'), findsOneWidget);
      expect(find.text('6B'), findsOneWidget);
      await tester.tap(find.text('5A'));
      await pumpFor(tester);
      expect(find.text('Asha Rao'), findsOneWidget);
      await tester.tap(find.text('Asha Rao'));
      await pumpFor(tester, 30);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Report cards load when you are connected.'), findsOneWidget, reason: 'the copy on the phone is shown with a note that it is not live');
      await svc.dispose();
    });
  });
}
