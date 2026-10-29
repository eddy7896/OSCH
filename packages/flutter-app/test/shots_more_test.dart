// Screen previews of the later phone screens (leave, check-in, announcements, notifications, classes, report card, cover duties, approvals, the Today check-in card)
// for the Project Hub. Not a regression test: it only runs when SHOTS_DIR, LUCIDE_TTF and FONTS_DIR are set; it writes `<SHOTS_DIR>/<screen>-<lang>.png`.
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'approvals_test.dart' as appr show Fake, principalServices;

Future<void> _font(String family, File f) async {
  final l = FontLoader(family)..addFont(Future.value(ByteData.sublistView(f.readAsBytesSync())));
  await l.load();
}

const reportCard = {
  'academicYearId': 'y', 'class': {'id': 'c', 'name': '5 B'}, 'grade': 'A', 'pending': 1, 'percent': '84.0', 'term': {'id': 't1', 'name': 'Term 1'}, 'totalMarks': '252', 'totalMaxMarks': '300',
  'student': {'id': 'st1', 'name': 'Asha Rao', 'enrollmentId': 'S-001'},
  'subjects': [
    {'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MATH'}, 'marks': '88', 'maxMarks': '100', 'grade': 'A', 'pending': 0, 'percent': '88.0', 'exams': []},
    {'subject': {'id': 's', 'name': 'Science', 'code': 'SCI'}, 'marks': '81', 'maxMarks': '100', 'grade': 'A', 'pending': 0, 'percent': '81.0', 'exams': []},
    {'subject': {'id': 'e', 'name': 'English', 'code': 'ENG'}, 'marks': '83', 'maxMarks': '100', 'grade': 'A', 'pending': 1, 'percent': '83.0', 'exams': []},
  ],
};

Future<OruServices> services({Set<String> roles = const {'TEACHER'}}) => OruServices.create(
      config,
      allowedRoles: roles,
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => false,
      identity: FakeIdentity(),
      httpClient: MockClient((r) async => http.Response(r.url.path.contains('report-cards') ? jsonEncode(reportCard) : '{}', 200, headers: {'content-type': 'application/json'})),
      accountSource: (token) async => Account(userId: 'u1', email: 'tara@x.test', displayName: 'Tara Teacher', schools: const [SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en')]),
    );

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);

class Here implements LocationPort {
  Here(this.fix);
  final Fix? fix;
  @override
  Future<Fix?> current() async => fix;
}

void main() {
  final out = Platform.environment['SHOTS_DIR'];
  final lucide = Platform.environment['LUCIDE_TTF'];
  final fonts = Platform.environment['FONTS_DIR'];
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('later screens', skip: out == null || lucide == null || fonts == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory(fonts!).listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        await _font('packages/flutter_core/${f.uri.pathSegments.last.split('-').first}', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    Future<void> pumpFor([int n = 20]) async {
      for (var i = 0; i < n; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    }

    Future<void> snap(String id, String lang) async {
      final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(const ValueKey('shot')));
      final image = await boundary.toImage(pixelRatio: 2);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      Directory(out!).createSync(recursive: true);
      File('$out/$id-$lang.png').writeAsBytesSync(bytes!.buffer.asUint8List());
    }

    Future<void> show(Widget home, String lang) async {
      await tester.pumpWidget(RepaintBoundary(
        key: const ValueKey('shot'),
        child: KeyedSubtree(
          key: UniqueKey(),
          child: MaterialApp(
            locale: Locale(lang),
            debugShowCheckedModeBanner: false,
            localizationsDelegates: oruLocalizationsDelegates,
            supportedLocales: oruSupportedLocales,
            localeResolutionCallback: oruLocaleResolution,
            theme: OruTheme.light(locale: Locale(lang)),
            home: home,
          ),
        ),
      ));
      await pumpFor();
    }

    final monday = DateTime(2026, 11, 2, 9, 5);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords(kLeaveType, [rec('t1', {'id': 't1', 'name': 'Casual leave', 'paid': true, 'quotaDays': '12'}), rec('t2', {'id': 't2', 'name': 'Sick leave', 'paid': true, 'quotaDays': '7.5'})]);
      await svc.store.replaceAllRecords(kLeaveBalance, [
        rec('t1', {'type': {'id': 't1', 'name': 'Casual leave'}, 'allowedDays': '12', 'remainingDays': '10.5', 'recorded': true}),
        rec('t2', {'type': {'id': 't2', 'name': 'Sick leave'}, 'allowedDays': '7.5', 'remainingDays': '7.5', 'recorded': true}),
      ]);
      await svc.store.replaceAllRecords(kLeaveRequest, [
        rec('r1', {'id': 'r1', 'status': 'APPROVED', 'startDate': '2026-10-12', 'endDate': '2026-10-12', 'days': '1', 'type': {'id': 't1', 'name': 'Casual leave'}}),
        rec('r2', {'id': 'r2', 'status': 'PENDING', 'startDate': '2026-11-09', 'endDate': '2026-11-10', 'days': '2', 'type': {'id': 't2', 'name': 'Sick leave'}}),
      ]);
      await svc.store.enqueue(kind: 'leave.create', body: {'leaveTypeId': 't1', 'startDate': '2026-11-20', 'endDate': '2026-11-20', 'reason': 'Family function'});
      for (final lang in ['en', 'ur']) {
        await show(OruLeaveScreen(services: svc, now: () => monday), lang);
        await snap('teacher-leave', lang);
      }
      await show(OruLeaveFormScreen(controller: LeaveController(svc.store), now: () => monday), 'en');
      await snap('teacher-leave-form', 'en');

      // check-in: not in yet, then the reason sheet for a position far from the school
      await svc.store.replaceAllRecords(kGeofence, [rec('school', {'configured': true, 'lat': 12.9716, 'lng': 77.5946, 'radiusM': 150, 'marginM': 50, 'hardRingM': 500})]);
      await svc.store.dismiss((await svc.store.all()).first.id);
      for (final lang in ['en', 'ur']) {
        await show(OruCheckInScreen(services: svc, location: Here(null), now: () => monday), lang);
        await snap('checkin', lang);
      }
      await show(OruCheckInScreen(services: svc, location: Here(Fix(lat: 12.9716 + 700 / 111195, lng: 77.5946)), now: () => monday), 'en');
      await tester.tap(find.byType(OruButton).first);
      await pumpFor(30);
      await snap('checkin-reason', 'en');
      await svc.store.replaceAllRecords(kStaffDay, [rec('2026-11-02', {'date': '2026-11-02', 'checkIn': DateTime(2026, 11, 2, 8, 42).toUtc().toIso8601String(), 'checkOut': null, 'needsConfirmation': true, 'confirmedAt': null})]);
      await show(OruCheckInScreen(services: svc, location: Here(null), now: () => monday), 'en');
      await snap('checkin-done', 'en');

      // announcements and notifications
      await svc.store.replaceAllRecords(kAnnouncement, [
        rec('a1', {'id': 'a1', 'title': 'Sports day on Friday', 'body': 'Bring kits.', 'createdAt': '2026-10-28T08:00:00.000Z', 'updatedAt': '2026-10-28T08:00:00.000Z', 'withdrawn': false, 'author': {'id': 'p', 'name': 'Priya Principal'}}),
        rec('a2', {'id': 'a2', 'title': 'Staff meeting moved to 4 pm', 'body': 'In the hall.', 'createdAt': '2026-10-20T08:00:00.000Z', 'updatedAt': '2026-10-20T08:00:00.000Z', 'withdrawn': false, 'author': {'id': 'p', 'name': 'Priya Principal'}}),
      ]);
      for (final lang in ['en', 'ur']) {
        await show(OruAnnouncementsScreen(services: svc), lang);
        await snap('announcements', lang);
      }
      await svc.store.replaceAllRecords(kNotice, [
        rec('n1', {'id': 'n1', 'title': 'You are covering a class', 'body': '5 B, Mathematics, Period 2 on Tuesday 3 November, covering for Ravi Kumar.', 'category': 'substitution', 'kind': 'k', 'createdAt': '2026-10-30T08:00:00.000Z', 'read': false}),
        rec('n2', {'id': 'n2', 'title': 'New announcement', 'body': 'Sports day on Friday', 'category': 'announcement', 'kind': 'k', 'createdAt': '2026-10-28T08:00:00.000Z', 'read': false}),
        rec('n3', {'id': 'n3', 'title': 'Your leave was approved', 'body': 'Casual leave, 12 October (1 day).', 'category': 'leave', 'kind': 'k', 'createdAt': '2026-10-11T08:00:00.000Z', 'read': true}),
      ]);
      for (final lang in ['en', 'ur']) {
        await show(OruInboxScreen(services: svc), lang);
        await snap('notifications', lang);
      }

      // classes, a student's report card, cover duties
      await svc.store.replaceAllRecords(kMyClass, [rec('c1', {'id': 'c1', 'name': '5 B', 'classTeacher': true}), rec('c2', {'id': 'c2', 'name': '6 A', 'classTeacher': false}), rec('c3', {'id': 'c3', 'name': '4 A', 'classTeacher': false})]);
      await svc.store.replaceRecords(kClassStudent, parentId: 'c1', records: [for (final n in ['Asha Rao', 'Bilal Khan', 'Chitra Nair']) (id: n, json: {'id': n, 'name': n, 'enrollmentId': 'S-00${n.length}'})]);
      await svc.store.replaceAllRecords(kTerm, [rec('t1', {'id': 't1', 'name': 'Term 1', 'academicYearId': 'y'}), rec('t2', {'id': 't2', 'name': 'Term 2', 'academicYearId': 'y'})]);
      for (final lang in ['en', 'ur']) {
        await show(OruClassesScreen(services: svc), lang);
        await snap('classes', lang);
      }
      await show(OruClassScreen(services: svc, cls: const {'id': 'c1', 'name': '5 B', 'classTeacher': true}), 'en');
      await snap('class-students', 'en');
      await svc.store.upsertRecords(kReportCard, [(id: 'st1|t1', parentId: null, json: Map<String, dynamic>.from(reportCard))]);
      await show(OruReportCardScreen(services: svc, student: const {'id': 'st1', 'name': 'Asha Rao', 'enrollmentId': 'S-001'}), 'en');
      await pumpFor(30);
      await snap('report-card', 'en');
      await svc.store.replaceAllRecords(kCoverDuty, [
        rec('d1', {'id': 'd1', 'date': '2026-11-03', 'class': {'id': 'c', 'name': '5 B'}, 'subject': {'id': 's', 'name': 'Mathematics'}, 'period': {'id': 'p', 'label': 'Period 2', 'startTime': '08:40', 'endTime': '09:20'}, 'covering': {'id': 'x', 'name': 'Ravi Kumar', 'employeeId': 'E1'}}),
        rec('d2', {'id': 'd2', 'date': '2026-11-05', 'class': {'id': 'c', 'name': '6 A'}, 'subject': {'id': 's', 'name': 'Science'}, 'period': {'id': 'p', 'label': 'Period 4', 'startTime': '10:20', 'endTime': '11:00'}, 'covering': {'id': 'x', 'name': 'Ravi Kumar', 'employeeId': 'E1'}}),
      ]);
      await show(OruCoverScreen(services: svc), 'en');
      await snap('cover-duties', 'en');

      // Today with the check-in card
      await svc.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']})]);
      await svc.store.replaceAllRecords(kPeriod, [for (final p in [('p1', '08:00', '08:40'), ('p2', '09:40', '10:20')]) rec(p.$1, {'id': p.$1, 'label': p.$1, 'startTime': p.$2, 'endTime': p.$3, 'isBreak': false})]);
      await svc.store.replaceAllRecords(kTimetableEntry, [rec('e1', {'id': 'e1', 'day': 'MON', 'periodId': 'p2', 'class': {'id': 'c5B', 'name': 'Class 5 B'}, 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MATH'}})]);
      await svc.store.replaceAllRecords(kTeachingClass, [rec('c5B', {'id': 'c5B', 'name': 'Class 5 B'})]);
      await show(OruTodayScreen(services: svc, now: () => monday, onOpenAccount: () {}, onOpenCheckIn: () {}), 'en');
      await snap('today-checkin', 'en');
      await svc.dispose();

      // the Principal's approvals, from a fake gateway
      final p = await appr.principalServices(appr.Fake());
      for (final lang in ['en', 'ur']) {
        await show(OruApprovalsScreen(services: p), lang);
        await snap('principal-approvals', lang);
      }
      await p.dispose();
    });
  });
}
