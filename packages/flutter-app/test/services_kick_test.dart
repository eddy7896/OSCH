import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'app_test.dart' show FakeIdentity, NoLock, config;

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('a change saved on the phone is sent at once when the phone is online: nothing has to wait for the next pull or timer', () async {
    final sent = <String>[];
    final svc = await OruServices.create(
      config,
      allowedRoles: const {'STAFF'},
      executor: NativeDatabase.memory(),
      storage: MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      identity: FakeIdentity(),
      httpClient: MockClient((r) async {
        sent.add(r.url.path);
        if (r.url.path.endsWith('/sync/tombstones')) return http.Response('{"items":[],"more":false,"next":"2026-01-01T00:00:00.000Z"}', 200, headers: {'content-type': 'application/json'});
        return http.Response('', 204);
      }),
      accountSource: (token) async => Account(userId: 'u', email: 's@x', displayName: 'S', schools: const [SchoolChoice(id: 's1', name: 'G', subDomain: 'g', role: 'STAFF', defaultLanguage: 'en')]),
    );
    await svc.session.signInWithPassword('s@x.test', 'pw');
    await Future<void>.delayed(const Duration(milliseconds: 300));
    sent.clear();
    await svc.store.enqueue(kind: 'notice.read', body: {'noticeId': 'n1'});
    for (var i = 0; i < 50 && (await svc.store.all()).isNotEmpty; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    expect(await svc.store.all(), isEmpty, reason: 'sent without anything asking for it');
    expect(sent.where((p) => p.endsWith('/notifications/n1/read')), hasLength(1));
    for (var i = 0; i < 50 && !sent.any((p) => p.endsWith('/sync/tombstones')); i++) {
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    expect(sent.any((p) => p.endsWith('/sync/tombstones')), isTrue, reason: 'the lists are read again once the last change has gone');
    await svc.dispose();
  });
}
