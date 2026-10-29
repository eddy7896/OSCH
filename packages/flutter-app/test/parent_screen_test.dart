import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/flutter_sync.dart' show PulledRecord;
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);
DateTime monday() => DateTime(2026, 11, 2, 9);
Map<String, dynamic> child(String id, String name, String cls) => {'id': id, 'name': name, 'enrollmentId': 'S-$id', 'relationship': 'MOTHER', 'class': {'id': 'c$cls', 'name': cls}};

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kChild, [rec('k1', child('k1', 'Asha Rao', '5 B')), rec('k2', child('k2', 'Rohan Rao', '2 A'))]);
  await s.store.replaceRecords(kChildAttendance, parentId: 'k1', records: [(id: '2026-11-02', json: {'date': '2026-11-02', 'status': 'LATE', 'note': 'Bus was late'})]);
  await s.store.replaceRecords(kChildLesson, parentId: 'c5 B', records: [(id: 'e1', json: {'id': 'e1', 'day': 'MON', 'periodId': 'p1', 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MATH'}, 'staff': {'id': 't', 'name': 'Tara Teacher', 'employeeId': 'E1'}})]);
  await s.store.replaceAllRecords(kPeriod, [rec('p1', {'id': 'p1', 'label': 'P1', 'startTime': '08:00', 'endTime': '08:40', 'isBreak': false})]);
  await s.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']})]);
  await s.store.replaceRecords(kChildRide, parentId: 'k1', records: [
    (id: 'MORNING', json: {'direction': 'MORNING', 'route': {'id': 'r', 'name': 'North loop'}, 'stop': {'id': 's', 'name': 'Lake Road', 'sequence': 1, 'arrivalTime': '07:20'}, 'vehicle': {'registration': 'KA-1', 'label': 'Bus 3'}, 'driverName': 'Salim Dar'}),
  ]);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('"How is Asha today?": attendance, the lessons and the bus, from the phone alone; the switcher moves to the other child, who has no bus', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await tester.pumpWidget(host(OruChildHomeScreen(services: svc, now: monday)));
      await pumpFor(tester);
      expect(find.text('How is Asha today?'), findsOneWidget);
      expect(find.text('Late'), findsOneWidget);
      expect(find.text('Bus was late'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.textContaining('Tara Teacher'), findsOneWidget);
      expect(find.text('To school: Lake Road'), findsOneWidget);
      expect(find.textContaining('Driver: Salim Dar'), findsOneWidget);
      await tester.tap(find.text('Rohan'));
      await pumpFor(tester);
      expect(find.text('How is Rohan today?'), findsOneWidget);
      expect(find.text('Attendance has not been taken yet today.'), findsOneWidget);
      expect(find.text('There are no lessons today.'), findsOneWidget);
      expect(find.text('No bus ride is set for Rohan.'), findsOneWidget);
      await svc.dispose();
    });
  });

  testWidgets('a parent with one child sees no switcher; with none, the school office is named; before anything is loaded, one connection is asked for', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final empty = await services();
      await tester.pumpWidget(host(OruChildHomeScreen(services: empty, now: monday)));
      await pumpFor(tester);
      expect(find.text('No child is linked to your account yet. Please ask the school office.'), findsOneWidget);
      await empty.store.replaceAllRecords(kChild, [rec('k1', child('k1', 'Asha Rao', '5 B'))]);
      await pumpFor(tester);
      expect(find.text('How is Asha today?'), findsOneWidget);
      expect(find.text('Choose a child'), findsNothing);
      expect(find.textContaining('Connect once to load'), findsOneWidget);
      await empty.dispose();
    });
  });

  testWidgets('the chosen child survives the app being closed', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      final first = ParentController(svc.store, now: monday);
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(first.selectedId, 'k1');
      await first.select('k2');
      first.dispose();
      final again = ParentController(svc.store, now: monday);
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(again.selectedId, 'k2');
      again.dispose();
      await svc.dispose();
    });
  });

  testWidgets('the signed-in Parent app has Home, Notifications and More; Home shows the child, Notifications the unread count, More the account', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      await svc.store.replaceAllRecords(kNotice, [rec('n1', {'id': 'n1', 'title': 'Fee reminder', 'body': 'Due on Friday.', 'category': 'fees', 'kind': 'k', 'createdAt': '2026-10-30T08:00:00.000Z', 'read': false})]);
      const school = SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'PARENT', defaultLanguage: 'en');
      final state = SessionActive(Account(userId: 'u1', email: 'p@x.test', displayName: 'Parvati Rao', schools: const [school]), school);
      await tester.pumpWidget(host(OruParentHome(services: svc, state: state, now: monday)));
      await pumpFor(tester);
      expect(find.text('How is Asha today?'), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
      await tester.tap(find.text('Notifications').last);
      await pumpFor(tester);
      expect(find.text('Fee reminder'), findsOneWidget);
      await tester.tap(find.text('More'));
      await pumpFor(tester);
      expect(find.textContaining('Signed in as Parvati Rao'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}

