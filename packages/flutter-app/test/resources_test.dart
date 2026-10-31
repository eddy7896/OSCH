import 'dart:convert';
import 'dart:typed_data';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart' show TextField;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;

Map<String, dynamic> res(String id, String title, {String by = 'u'}) => {
      'id': id, 'title': title, 'note': null, 'class': {'id': 'c5', 'name': 'Class 5A'}, 'subject': {'id': 'm', 'name': 'Mathematics'}, 'fileName': '$id.pdf',
      'contentType': 'application/pdf', 'sizeBytes': 1000, 'uploadedBy': {'id': by, 'name': by == 'u' ? 'Tara' : 'Ravi'}, 'createdAt': '2026-10-30T08:00:00Z', 'updatedAt': '2026-10-30T08:00:00Z',
    };

/// A gateway that gives an upload address, records what was added and removed, and can refuse or vanish.
class Fake {
  final calls = <String>[];
  final added = <Map<String, dynamic>>[];
  final removed = <String>[];
  int? refuseAddWith;
  bool offline = false;

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    final path = r.url.path;
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    calls.add('${r.method} $path');
    if (path.endsWith('/resources/uploads')) {
      if (refuseAddWith != null) return json({'error': {'code': 'FORBIDDEN', 'message': 'no', 'requestId': 'r'}}, refuseAddWith!);
      final b = jsonDecode(r.body) as Map<String, dynamic>;
      return json({'uploadUrl': 'https://private.example/put/k', 'method': 'PUT', 'headers': {'Content-Type': b['contentType'], 'Content-Length': '${b['sizeBytes']}'}, 'key': 'schools/s1/resources/${b['classId']}/x.pdf', 'expiresInSeconds': 300});
    }
    if (path.endsWith('/resources') && r.method == 'POST') {
      final b = jsonDecode(r.body) as Map<String, dynamic>;
      added.add(b);
      return json(res('new', b['title'] as String));
    }
    final m = RegExp(r'/resources/([^/]+)$').firstMatch(path);
    if (m != null && r.method == 'DELETE') {
      removed.add(m.group(1)!);
      return http.Response('', 204);
    }
    if (path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    return json({'items': [], 'next': null});
  }
}

class FakeFiles implements FilePort {
  FakeFiles(this.file);
  final PickedFile? file;
  @override
  Future<PickedFile?> pick() async => file;
}

class FakeUpload implements UploadPort {
  bool fail = false;
  final sent = <String>[];
  @override
  Future<void> put({required String url, required Map<String, String> headers, required Uint8List bytes}) async {
    if (fail) throw const UploadFailed();
    sent.add('$url ${bytes.length}');
  }
}

Future<OruServices> teacher(Fake fake) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'TEACHER'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(fake.handle),
    accountSource: (token) async => Account(userId: 'u', email: 't@x', displayName: 'Tara', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'TEACHER', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('t@x.test', 'pw');
  return svc;
}

PickedFile pdf([int size = 2000]) => PickedFile(name: 'fractions.pdf', bytes: Uint8List(size));

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kResource, [(id: 'a', parentId: null, json: res('a', 'Fractions')), (id: 'b', parentId: null, json: res('b', 'Decimals', by: 'r'))]);
  await s.store.replaceAllRecords('MyClass', [(id: 'c5', parentId: null, json: {'id': 'c5', 'name': 'Class 5A', 'classTeacher': true})]);
  await s.store.replaceAllRecords(kMySubject, [(id: 'm', parentId: null, json: {'id': 'm', 'name': 'Mathematics', 'code': 'MAT'})]);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('checked on the phone before the network is asked', () {
    expect(checkResource(classId: null, subjectId: 'm', title: 't', file: pdf()), ResourceProblem.noClass);
    expect(checkResource(classId: 'c', subjectId: null, title: 't', file: pdf()), ResourceProblem.noSubject);
    expect(checkResource(classId: 'c', subjectId: 'm', title: '  ', file: pdf()), ResourceProblem.noTitle);
    expect(checkResource(classId: 'c', subjectId: 'm', title: 't', file: null), ResourceProblem.noFile);
    expect(checkResource(classId: 'c', subjectId: 'm', title: 't', file: PickedFile(name: 'a.zip', bytes: Uint8List(5))), ResourceProblem.wrongType);
    expect(checkResource(classId: 'c', subjectId: 'm', title: 't', file: pdf(resourceMaxBytes + 1)), ResourceProblem.tooBig);
    expect(checkResource(classId: 'c', subjectId: 'm', title: 't', file: pdf(resourceMaxBytes)), ResourceProblem.none);
    expect(PickedFile(name: 'Plan.DOCX', bytes: Uint8List(1)).contentType, resourceTypes['docx']);
  });

  testWidgets('the list reads from the phone; only her own can be removed, after asking; the removal is sent and the row goes', (tester) async {
    phone(tester);
    final fake = Fake();
    await tester.runAsync(() async {
      final svc = await teacher(fake);
      await load(svc);
      await tester.pumpWidget(host(OruResourcesScreen(services: svc, userId: 'u', files: FakeFiles(null), uploader: FakeUpload())));
      await pumpFor(tester);
      expect(find.text('Fractions'), findsOneWidget);
      expect(find.text('Decimals'), findsOneWidget);
      expect(find.text('Shared by you'), findsOneWidget);
      expect(find.text('Shared by Ravi'), findsOneWidget);
      expect(find.text('Remove'), findsOneWidget, reason: 'only the one she shared');
      await tester.tap(find.text('Remove'));
      await pumpFor(tester);
      expect(fake.removed, isEmpty, reason: 'asks first');
      expect(find.text('Remove Fractions? The parents will no longer see it.'), findsOneWidget);
      await tester.tap(find.text('Remove').last);
      await pumpFor(tester, 10);
      expect(fake.removed, ['a']);
      expect(find.text('Fractions'), findsNothing);
      expect(find.text('Removed.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('sharing: checks on the phone, then ticket, bytes, and record in order; the title and key go to the school', (tester) async {
    phone(tester);
    final fake = Fake();
    final up = FakeUpload();
    await tester.runAsync(() async {
      final svc = await teacher(fake);
      await load(svc);
      await tester.pumpWidget(host(OruResourcesScreen(services: svc, userId: 'u', files: FakeFiles(pdf(3000)), uploader: up)));
      await pumpFor(tester);
      await tester.tap(find.text('Add a resource'));
      await pumpFor(tester);
      await tester.tap(find.text('Share with the parents'));
      await pumpFor(tester, 5);
      expect(find.text('Choose a class.'), findsOneWidget);
      expect(fake.calls.where((c) => c.contains('/resources')), isEmpty, reason: 'nothing asked of the network');
      await tester.tap(find.text('Class 5A'));
      await tester.tap(find.text('Mathematics'));
      await tester.enterText(find.byType(TextField).first, 'Fractions practice');
      await tester.tap(find.text('Choose a file'));
      await pumpFor(tester, 5);
      expect(find.text('fractions.pdf'), findsOneWidget);
      await tester.tap(find.text('Share with the parents'));
      await pumpFor(tester, 10);
      expect(up.sent, ['https://private.example/put/k 3000']);
      expect(fake.added, hasLength(1));
      expect(fake.added.single, containsPair('title', 'Fractions practice'));
      expect(fake.added.single['key'], 'schools/s1/resources/c5/x.pdf');
      expect(fake.added.single['fileName'], 'fractions.pdf');
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  test('no connection, a refused teacher and a failed upload are said plainly, and nothing is added', () async {
    final fake = Fake();
    final svc = await teacher(fake);
    final c = ResourcesController(svc.api, svc.store, userId: 'u');
    final up = FakeUpload();
    c.uploader = up;
    fake.offline = true;
    expect(await c.share(classId: 'c5', subjectId: 'm', title: 'T', file: pdf()), isFalse);
    expect(c.problem, ResourceProblem.offline);
    fake.offline = false;
    fake.refuseAddWith = 403;
    expect(await c.share(classId: 'c5', subjectId: 'm', title: 'T', file: pdf()), isFalse);
    expect(c.problem, ResourceProblem.notTeaching);
    fake.refuseAddWith = null;
    up.fail = true;
    expect(await c.share(classId: 'c5', subjectId: 'm', title: 'T', file: pdf()), isFalse);
    expect(c.problem, ResourceProblem.uploadFailed);
    expect(fake.added, isEmpty);
    c.dispose();
    await svc.dispose();
  });
}
