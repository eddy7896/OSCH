// Screen previews of the messaging phone screens (P5-3d): conversations, a conversation, class messages for a teacher and a parent, the form for a message to a class
// for the Project Hub. Not a regression test: it only runs when SHOTS_DIR, LUCIDE_TTF and FONTS_DIR are set; it writes `<SHOTS_DIR>/<screen>-<lang>.png`.
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

Future<OruServices> services({Set<String> roles = const {'TEACHER'}}) => OruServices.create(
      config,
      allowedRoles: roles,
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => false,
      identity: FakeIdentity(),
      httpClient: MockClient((r) async => http.Response('{}', 200, headers: {'content-type': 'application/json'})),
      accountSource: (token) async => Account(userId: 'u1', email: 'tara@x.test', displayName: 'Tara Teacher', schools: const [SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en')]),
    );

PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);


Map<String, dynamic> thread(String id, String other, String kind, String student, String last, {bool unread = false}) => {
      'id': id, 'student': {'id': 'st1', 'name': student}, 'other': {'userId': 'u2', 'kind': kind, 'name': other}, 'lastMessageAt': last, 'unread': unread,
    };
Map<String, dynamic> msg(String id, String body, {bool mine = false, bool canHide = false, String at = '2026-11-11T07:47:00Z'}) => {'id': id, 'mine': mine, 'body': body, 'hidden': false, 'canHide': canHide, 'createdAt': at};

void main() {
  final out = Platform.environment['SHOTS_DIR'];
  final lucide = Platform.environment['LUCIDE_TTF'];
  final fonts = Platform.environment['FONTS_DIR'];
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  testWidgets('messaging screens', skip: out == null || lucide == null || fonts == null, (tester) async {
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

    await tester.runAsync(() async {
      // The teacher's phone: conversations, one conversation (with a reply waiting to be sent), her class and the class messages she sent.
      final svc = await services();
      await svc.store.replaceAllRecords(kThread, [
        rec('t1', thread('t1', 'Parvati Rao', 'PARENT', 'Aarav Sharma', '2026-11-11T07:50:00Z', unread: true)),
        rec('t2', thread('t2', 'Meera Das', 'PARENT', 'Aditya Das', '2026-11-09T09:10:00Z')),
      ]);
      await svc.store.replaceRecords(kMessage, parentId: 't1', records: [
        (id: 'm1', json: msg('m1', 'Good morning. Parvati here. Aarav has a fever today, can he skip the maths test?')),
        (id: 'm2', json: msg('m2', 'Good morning. Yes, he can write it when he is back. Please rest well.', mine: true, canHide: true, at: '2026-11-11T07:48:00Z')),
        (id: 'm3', json: msg('m3', 'Thank you so much.', at: '2026-11-11T07:50:00Z')),
      ]);
      await svc.store.replaceAllRecords(kTeachingClass, [rec('c1', {'id': 'c1', 'name': '1 A'})]);
      await svc.store.replaceAllRecords(kBroadcast, [
        rec('b1', {
          'id': 'b1', 'title': 'Field trip on Friday', 'body': 'We are visiting the science museum on Friday. Please send a packed lunch and a water bottle. Return by 3 pm.', 'class': {'id': 'c1', 'name': '1 A'},
          'sender': {'userId': 'u1', 'name': 'Tara Teacher'}, 'sentAt': '2026-11-10T08:00:00Z', 'students': <dynamic>[], 'read': null,
          'stats': {'targetStudents': 4, 'reachedStudents': 1, 'unreachable': [{'id': 's2', 'name': 'Aditya Das'}, {'id': 's3', 'name': 'Imran Singh'}, {'id': 's4', 'name': 'Neel Bose'}], 'parents': 1, 'readBy': 0},
        }),
      ]);
      for (final lang in ['en', 'ur']) {
        await show(OruMessagesScreen(services: svc, forParent: false), lang);
        await snap('teacher-messages', lang);
      }
      final row = buildThreads(threads: await svc.store.records(kThread), outbox: const []).first;
      await svc.store.enqueue(kind: 'message.send', body: {'threadId': 't1', 'body': 'See you on Monday, take care.'});
      for (final lang in ['en', 'ur']) {
        await show(OruConversationScreen(services: svc, thread: row), lang);
        await snap('conversation', lang);
      }
      for (final lang in ['en', 'ur']) {
        await show(OruBroadcastsScreen(services: svc, forParent: false), lang);
        await tester.tap(find.textContaining('Field trip').first);
        await pumpFor(10);
        await snap('teacher-class-messages', lang);
      }
      await show(OruBroadcastComposeScreen(services: svc, controller: BroadcastsController(svc.store)), 'en');
      await tester.enterText(find.byType(TextField).first, 'Parent meeting on Saturday');
      await tester.enterText(find.byType(TextField).last, 'Please come at 10 am. The class teacher will share the term plan.');
      await pumpFor(10);
      await snap('class-message-form', 'en');
      await svc.dispose();

      // The parent's phone: the same class message, new for them, with the reply button.
      final p = await services(roles: {'PARENT'});
      await p.store.replaceAllRecords(kBroadcast, [
        rec('b1', {
          'id': 'b1', 'title': 'Field trip on Friday', 'body': 'We are visiting the science museum on Friday. Please send a packed lunch and a water bottle. Return by 3 pm.', 'class': {'id': 'c1', 'name': '1 A'},
          'sender': {'userId': 'u1', 'name': 'Tara Teacher'}, 'sentAt': '2026-11-10T08:00:00Z', 'students': [{'id': 'st1', 'name': 'Aarav Sharma'}], 'read': false, 'stats': null,
        }),
      ]);
      for (final lang in ['en', 'ur']) {
        await show(OruBroadcastsScreen(services: p, forParent: true), lang);
        await tester.tap(find.textContaining('Field trip').first);
        await pumpFor(10);
        await snap('parent-class-messages', lang);
      }
      await p.dispose();
    });
  });
}
