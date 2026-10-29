// Screen previews of the Teacher app's Today screen for the Project Hub. Not a regression test: it only runs when SHOTS_DIR, LUCIDE_TTF and
// FONTS_DIR are set. It loads the bundled fonts so the pictures show real letters and writes `<SHOTS_DIR>/<screen>-<lang>.png`.
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

Future<void> _font(String family, File f) async {
  final l = FontLoader(family)..addFont(Future.value(ByteData.sublistView(f.readAsBytesSync())));
  await l.load();
}

Future<OruServices> services() => OruServices.create(
      config,
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => false,
      identity: FakeIdentity(),
      httpClient: MockClient((r) async => http.Response('{}', 200)),
      accountSource: (token) async => Account(userId: 'u1', email: 'tara@x.test', displayName: 'Tara Teacher', schools: const [SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'g', role: 'TEACHER', defaultLanguage: 'en')]),
    );

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kSchedule, [rec('school', {'workingDays': ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']})]);
  await s.store.replaceAllRecords(kPeriod, [
    for (final p in [('p1', '08:00', '08:40'), ('p2', '08:40', '09:20'), ('p3', '09:40', '10:20'), ('p4', '10:20', '11:00')])
      rec(p.$1, {'id': p.$1, 'label': p.$1, 'startTime': p.$2, 'endTime': p.$3, 'isBreak': false}),
  ]);
  Map<String, dynamic> e(String id, String period, String cls, String subject) =>
      {'id': id, 'day': 'MON', 'periodId': period, 'class': {'id': 'c$cls', 'name': 'Class $cls'}, 'subject': {'id': subject, 'name': subject, 'code': subject}};
  await s.store.replaceAllRecords(kTimetableEntry, [rec('e1', e('e1', 'p1', '5A', 'Mathematics')), rec('e2', e('e2', 'p2', '6B', 'Mathematics')), rec('e3', e('e3', 'p3', '5A', 'Science')), rec('e4', e('e4', 'p4', '7C', 'Mathematics'))]);
  await s.store.replaceAllRecords(kTeachingClass, [rec('c5A', {'id': 'c5A', 'name': 'Class 5A'}), rec('c6B', {'id': 'c6B', 'name': 'Class 6B'})]);
  await s.store.replaceAllRecords(kLeaveRequest, [rec('l1', {'id': 'l1', 'status': 'PENDING'})]);
}

void main() {
  final out = Platform.environment['SHOTS_DIR'];
  final lucide = Platform.environment['LUCIDE_TTF'];
  final fonts = Platform.environment['FONTS_DIR'];
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('Today pictures', skip: out == null || lucide == null || fonts == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory(fonts!).listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        await _font('packages/flutter_core/${f.uri.pathSegments.last.split('-').first}', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    Future<void> pumpFor() async {
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    }

    Future<void> snap(String id, String lang) async {
      // always called from inside the runAsync below
      final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(const ValueKey('shot')));
      final image = await boundary.toImage(pixelRatio: 2);
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      Directory(out!).createSync(recursive: true);
      File('$out/$id-$lang.png').writeAsBytesSync(bytes!.buffer.asUint8List());
    }

    Future<void> show(OruServices svc, String lang, DateTime Function() now) async {
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
            home: OruTodayScreen(services: svc, now: now, onOpenAccount: () {}),
          ),
        ),
      ));
      await pumpFor();
    }

    final monday = DateTime(2026, 10, 26, 8, 10);
    await tester.runAsync(() async {
      final svc = await services();
      await load(svc);
      for (final lang in ['en', 'ur']) {
        await show(svc, lang, () => monday);
        await snap('today', lang);
      }
      await svc.store.enqueue(kind: 'attendance.submit', body: {'classId': 'c5A', 'date': '2026-10-26', 'marks': []});
      await svc.store.enqueue(kind: 'leave.create', body: {'leaveTypeId': 'x', 'startDate': '2026-11-02', 'endDate': '2026-11-02'});
      await show(svc, 'en', () => monday);
      await snap('today-saved', 'en');
      await show(svc, 'en', () => DateTime(2026, 10, 25, 8, 10));
      await snap('today-sunday', 'en');
      await svc.dispose();
      final empty = await services();
      await show(empty, 'en', () => monday);
      await snap('today-first-load', 'en');
      await empty.dispose();
    });
  });

  testWidgets('Attendance pictures', skip: out == null || lucide == null || fonts == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory(fonts!).listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        await _font('packages/flutter_core/${f.uri.pathSegments.last.split('-').first}', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    Future<void> pumpFor() async {
      for (var i = 0; i < 20; i++) {
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

    Future<OruServices> fresh({bool locked = false}) async {
      final svc = await services();
      await svc.store.replaceAllRecords(kTeachingClass, [rec('c5', {'id': 'c5', 'name': 'Class 5A'}), rec('c6', {'id': 'c6', 'name': 'Class 6B'}), rec('c7', {'id': 'c7', 'name': 'Class 7C'})]);
      await svc.store.replaceRecords(kClassStudent, parentId: 'c5', records: [
        for (final n in [('a', 'Asha Rao'), ('b', 'Bilal Khan'), ('c', 'Chitra Nair'), ('d', 'Dev Shah'), ('e', 'Esha Verma'), ('f', 'Farhan Ali')])
          (id: n.$1, json: {'id': n.$1, 'name': n.$2, 'enrollmentId': 'S-00${n.$1.codeUnitAt(0) - 96}', 'status': 'PRESENT', 'note': null}),
      ]);
      await svc.store.replaceAllRecords(kAttendanceDay, [
        (id: 'c5|2026-10-26', parentId: 'c5', json: {'classId': 'c5', 'date': '2026-10-26', 'submitted': locked, 'locked': locked}),
        (id: 'c6|2026-10-26', parentId: 'c6', json: {'classId': 'c6', 'date': '2026-10-26', 'submitted': true, 'locked': false}),
        (id: 'c7|2026-10-26', parentId: 'c7', json: {'classId': 'c7', 'date': '2026-10-26', 'submitted': false, 'locked': false}),
      ]);
      return svc;
    }

    await tester.runAsync(() async {
      final svc = await fresh();
      for (final lang in ['en', 'ur']) {
        await show(OruAttendanceListScreen(services: svc, now: () => DateTime(2026, 10, 26, 8, 10)), lang);
        await snap('attendance-list', lang);
      }
      for (final lang in ['en', 'ur']) {
        await show(OruAttendanceScreen(services: svc, classId: 'c5', className: 'Class 5A', date: '2026-10-26'), lang);
        await tester.tap(find.byType(TextButton).at(1)); // Mark all present
        await pumpFor();
        await svc.store.saveDraft('attendance', 'c5|2026-10-26', {'statuses': {'a': 'PRESENT', 'b': 'ABSENT', 'c': 'LATE', 'd': 'PRESENT', 'e': 'MEDICAL', 'f': 'PRESENT'}});
        await show(OruAttendanceScreen(services: svc, classId: 'c5', className: 'Class 5A', date: '2026-10-26'), lang);
        await snap('attendance-marking', lang);
      }
      await svc.store.enqueue(kind: 'attendance.submit', body: {'classId': 'c5', 'date': '2026-10-26', 'marks': [{'studentId': 'b', 'status': 'ABSENT'}]});
      await svc.store.clearDraft('attendance', 'c5|2026-10-26');
      await show(OruAttendanceScreen(services: svc, classId: 'c5', className: 'Class 5A', date: '2026-10-26'), 'en');
      await snap('attendance-saved', 'en');
      await svc.dispose();
      final locked = await fresh(locked: true);
      await show(OruAttendanceScreen(services: locked, classId: 'c5', className: 'Class 5A', date: '2026-10-26'), 'en');
      await snap('attendance-locked', 'en');
      await locked.dispose();
    });
  });

  testWidgets('Marks pictures', skip: out == null || lucide == null || fonts == null, (tester) async {
    await tester.runAsync(() async {
      for (final f in Directory(fonts!).listSync().whereType<File>().where((f) => f.path.endsWith('.ttf'))) {
        await _font('packages/flutter_core/${f.uri.pathSegments.last.split('-').first}', f);
      }
      await _font('packages/lucide_icons_flutter/Lucide', File(lucide!));
    });
    tester.view.physicalSize = const Size(390 * 2, 900 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);

    Future<void> pumpFor() async {
      for (var i = 0; i < 20; i++) {
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

    const exam = {
      'id': 'e1', 'title': 'Unit 1', 'examDate': '2026-11-05', 'maxMarks': '50', 'maxTenths': 500,
      'class': {'id': 'c5', 'name': 'Class 5A'}, 'subject': {'id': 'm', 'name': 'Mathematics', 'code': 'MAT'}, 'term': {'id': 't', 'name': 'Term 1'},
    };
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceAllRecords('Exam', [
        (id: 'e1', parentId: null, json: Map<String, dynamic>.from(exam)),
        (id: 'e2', parentId: null, json: {...exam, 'id': 'e2', 'title': 'Unit 2', 'examDate': '2026-10-12', 'class': {'id': 'c6', 'name': 'Class 6B'}}),
      ]);
      await svc.store.replaceRecords('ExamStudent', parentId: 'e1', records: [
        (id: 'a', json: {'studentId': 'a', 'name': 'Asha Rao', 'enrollmentId': 'S-001', 'marksTenths': 425, 'marks': '42.5', 'absent': false, 'examId': 'e1'}),
        (id: 'b', json: {'studentId': 'b', 'name': 'Bilal Khan', 'enrollmentId': 'S-002', 'marksTenths': null, 'marks': null, 'absent': false, 'examId': 'e1'}),
        (id: 'c', json: {'studentId': 'c', 'name': 'Chitra Nair', 'enrollmentId': 'S-003', 'marksTenths': 0, 'marks': null, 'absent': true, 'examId': 'e1'}),
        (id: 'd', json: {'studentId': 'd', 'name': 'Dev Shah', 'enrollmentId': 'S-004', 'marksTenths': 380, 'marks': '38', 'absent': false, 'examId': 'e1'}),
      ]);
      await svc.store.replaceRecords('ExamStudent', parentId: 'e2', records: [(id: 'x', json: {'studentId': 'x', 'name': 'Esha Verma', 'enrollmentId': 'S-009', 'marksTenths': 300, 'marks': '30', 'absent': false, 'examId': 'e2'})]);
      for (final lang in ['en', 'ur']) {
        await show(OruMarksListScreen(services: svc), lang);
        await snap('marks-list', lang);
      }
      await svc.store.saveDraft('marks', 'e1', {'cells': {'a': {'text': '42.5', 'absent': false}, 'b': {'text': '51', 'absent': false}, 'c': {'text': '', 'absent': true}, 'd': {'text': '38', 'absent': false}}});
      for (final lang in ['en', 'ur']) {
        await show(OruMarksScreen(services: svc, exam: Map<String, dynamic>.from(exam)), lang);
        await snap('marks-entry-error', lang);
      }
      await svc.store.saveDraft('marks', 'e1', {'cells': {'a': {'text': '42.5', 'absent': false}, 'b': {'text': '45.5', 'absent': false}, 'c': {'text': '', 'absent': true}, 'd': {'text': '38', 'absent': false}}});
      await show(OruMarksScreen(services: svc, exam: Map<String, dynamic>.from(exam)), 'en');
      await snap('marks-entry', 'en');
      await svc.dispose();
    });
  });
}
