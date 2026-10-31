import 'dart:convert';

import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;
import 'marks_screen_test.dart' show host, phone, pumpFor;
import 'resources_test.dart' show res;

Map<String, dynamic> inClass(Map<String, dynamic> r, String classId, String subject) => {...r, 'class': {'id': classId, 'name': classId}, 'subject': {'id': subject, 'name': subject}};

class Gateway {
  bool offline = false;
  final downloads = <String>[];

  Future<http.Response> handle(http.Request r) async {
    if (offline) throw http.ClientException('no network');
    final path = r.url.path;
    http.Response json(Object o, [int code = 200]) => http.Response(jsonEncode(o), code, headers: {'content-type': 'application/json'});
    final m = RegExp(r'/resources/([^/]+)/download$').firstMatch(path);
    if (m != null) {
      downloads.add(m.group(1)!);
      return json({'url': 'https://private.example/get/${m.group(1)}', 'expiresInSeconds': 300});
    }
    if (path.endsWith('/sync/tombstones')) return json({'items': [], 'more': false, 'next': '2026-01-01T00:00:00.000Z'});
    return json({'items': [], 'next': null});
  }
}

class FakeFiles implements ResourceFilesPort {
  final kept = <String>{};
  final opened = <String>[];
  bool failDownload = false;
  bool canOpen = true;

  @override
  Future<String?> cachedPath(String id, String fileName) async => kept.contains(id) ? '/phone/$id/$fileName' : null;
  @override
  Future<String> fetchAndKeep(String id, String fileName, String url) async {
    if (failDownload) throw const DownloadFailed();
    kept.add(id);
    return '/phone/$id/$fileName';
  }

  @override
  Future<bool> open(String path) async {
    opened.add(path);
    return canOpen;
  }

  @override
  Future<void> purgeExcept(Set<String> keepIds) async => kept.removeWhere((id) => !keepIds.contains(id));
}

Future<OruServices> parent(Gateway g) async {
  final svc = await OruServices.create(
    config,
    allowedRoles: const {'PARENT'},
    executor: NativeDatabase.memory(),
    storage: MemorySecureStorage(),
    lockPort: NoLock(),
    online: const Stream<bool>.empty(),
    isOnline: () async => false,
    identity: FakeIdentity(),
    httpClient: MockClient(g.handle),
    accountSource: (token) async => Account(userId: 'p', email: 'p@x', displayName: 'Parvati', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'PARENT', defaultLanguage: 'en')]),
  );
  await svc.session.signInWithPassword('p@x.test', 'pw');
  return svc;
}

Future<void> load(OruServices s) async {
  await s.store.replaceAllRecords(kChild, [
    (id: 'k1', parentId: null, json: {'id': 'k1', 'name': 'Asha Rao', 'class': {'id': 'c5', 'name': 'Class 5A'}}),
    (id: 'k2', parentId: null, json: {'id': 'k2', 'name': 'Dev Rao', 'class': {'id': 'c2', 'name': 'Class 2B'}}),
  ]);
  await s.store.replaceAllRecords(kResource, [
    (id: 'a', parentId: null, json: inClass(res('a', 'Fractions'), 'c5', 'Mathematics')),
    (id: 'b', parentId: null, json: {...inClass(res('b', 'Decimals'), 'c5', 'Mathematics'), 'createdAt': '2026-10-31T08:00:00Z'}),
    (id: 'c', parentId: null, json: inClass(res('c', 'Poems'), 'c5', 'English')),
    (id: 'd', parentId: null, json: inClass(res('d', 'Counting'), 'c2', 'Mathematics')),
  ]);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('one class, by subject A to Z, newest first inside; another class never appears', () {
    final all = [
      inClass(res('a', 'Fractions'), 'c5', 'Mathematics'),
      {...inClass(res('b', 'Decimals'), 'c5', 'Mathematics'), 'createdAt': '2026-10-31T08:00:00Z'},
      inClass(res('c', 'Poems'), 'c5', 'English'),
      inClass(res('d', 'Counting'), 'c2', 'Mathematics'),
    ];
    final g = groupBySubject(all, 'c5');
    expect(g.map((x) => x.subject), ['English', 'Mathematics']);
    expect(g[1].items.map((r) => r['id']), ['b', 'a']);
    expect(groupBySubject(all, null), isEmpty);
    expect(groupBySubject(all, 'c9'), isEmpty);
  });

  testWidgets('the child\'s class only; opening downloads once, then reads from the phone with no connection; switching child switches the list', (tester) async {
    phone(tester);
    final g = Gateway();
    final files = FakeFiles();
    await tester.runAsync(() async {
      final svc = await parent(g);
      await load(svc);
      await tester.pumpWidget(host(OruParentResourcesScreen(services: svc, files: files)));
      await pumpFor(tester);
      expect(find.text('Fractions'), findsOneWidget);
      expect(find.text('Counting'), findsNothing, reason: 'Dev\'s class is another tab of the switcher');
      expect(find.text('English'), findsOneWidget);
      await tester.tap(find.text('Open').first);
      await pumpFor(tester, 10);
      expect(g.downloads, hasLength(1));
      expect(files.opened, hasLength(1));
      // the second time needs no network
      g.offline = true;
      await tester.tap(find.text('Open').first);
      await pumpFor(tester, 10);
      expect(g.downloads, hasLength(1));
      expect(files.opened, hasLength(2));
      expect(find.textContaining('Saved on this phone'), findsOneWidget);
      // a file never opened needs the network, and says so
      await tester.tap(find.text('Open').last);
      await pumpFor(tester, 10);
      expect(find.text('Opening this the first time needs a connection.'), findsOneWidget);
      expect(files.opened, hasLength(2));
      await tester.tap(find.text('Dev'));
      await pumpFor(tester);
      expect(find.text('Counting'), findsOneWidget);
      expect(find.text('Fractions'), findsNothing);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('a resource the school removed leaves the phone; a failed download and a missing viewer are said plainly', (tester) async {
    phone(tester);
    final g = Gateway();
    final files = FakeFiles()..kept.addAll({'a', 'gone'});
    await tester.runAsync(() async {
      final svc = await parent(g);
      await load(svc);
      await tester.pumpWidget(host(OruParentResourcesScreen(services: svc, files: files)));
      await pumpFor(tester);
      expect(files.kept, {'a'}, reason: 'the copy of a resource that is no longer listed is deleted');
      files.failDownload = true;
      await tester.tap(find.text('Open').first);
      await pumpFor(tester, 10);
      expect(find.text('Opening this the first time needs a connection.'), findsOneWidget);
      files.failDownload = false;
      files.canOpen = false;
      await tester.tap(find.text('Open').last);
      await pumpFor(tester, 10);
      expect(find.text('This phone has no app that can open this kind of file.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });
}
