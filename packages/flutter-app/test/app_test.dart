import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class FakeIdentity implements IdentityPort {
  @override
  Future<AuthTokens> signInWithPassword(String email, String password) async {
    if (password != 'pw') throw const AuthFailure(AuthFailureCode.invalidCredentials);
    return AuthTokens(idToken: 'id', refreshToken: 'r', expiresAtMs: DateTime.now().millisecondsSinceEpoch + 3600000, uid: 'u1');
  }

  @override
  Future<String> sendPhoneCode(String phoneNumber, String appVerificationToken) async => 's';
  @override
  Future<AuthTokens> confirmPhoneCode(String sessionInfo, String code) => throw UnimplementedError();
  @override
  Future<AuthTokens> refresh(String refreshToken) async => AuthTokens(idToken: 'id2', refreshToken: 'r2', expiresAtMs: DateTime.now().millisecondsSinceEpoch + 3600000, uid: 'u1');
  @override
  Future<void> sendPasswordReset(String email) async {}
}

class NoLock implements DeviceLockPort {
  @override
  Future<bool> isAvailable() async => false;
  @override
  Future<bool> authenticate() async => false;
}

const config = OruAppConfig(gatewayUrl: 'http://127.0.0.1:1', firebaseApiKey: 'k');

/// A gateway that has nothing to report: no removals, empty lists.
final quietGateway = MockClient((r) async => http.Response(r.url.path.endsWith('/sync/tombstones') ? '{"items":[],"more":false,"next":"2026-01-01T00:00:00.000Z"}' : '{}', 200, headers: {'content-type': 'application/json'}));

Future<OruServices> services({MemorySecureStorage? storage}) => OruServices.create(
      config,
      httpClient: quietGateway,
      allowedRoles: const {'TEACHER'},
      executor: NativeDatabase.memory(),
      storage: storage ?? MemorySecureStorage(),
      lockPort: NoLock(),
      online: const Stream<bool>.empty(),
      isOnline: () async => true,
      identity: FakeIdentity(),
      accountSource: (token) async => Account(
        userId: 'u1',
        email: 'ann@x.test',
        displayName: 'Ann Teacher',
        schools: [const SchoolChoice(id: 's1', name: 'Greenfield', subDomain: 'greenfield', role: 'TEACHER', defaultLanguage: 'en')],
      ),
    );

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('config: what is missing is named, and the emulator needs no API key', () {
    expect(const OruAppConfig(gatewayUrl: '', firebaseApiKey: '').problems, hasLength(2));
    expect(const OruAppConfig(gatewayUrl: 'http://x', firebaseApiKey: '', authEmulator: '127.0.0.1:9099').problems, isEmpty);
  });

  testWidgets('sign in on the real services (local database, queue, engine): the home shows the person, the school and the sync state', (tester) async {
    tester.view.physicalSize = const Size(360 * 2, 780 * 2);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(OruStaffApp(services: svc, title: (s) => s.appTeacher));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
      expect(find.text('OruSchools Teacher'), findsWidgets);
      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'ann@x.test');
      await tester.enterText(fields.at(1), 'pw');
      await tester.tap(find.text('Sign in'));
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }
      expect(find.text('Signed in as Ann Teacher'), findsOneWidget);
      expect(find.text('Teacher at Greenfield'), findsOneWidget);
      expect(find.text('Your work will appear here'), findsOneWidget);
      expect(find.text('Synced'), findsOneWidget, reason: 'nothing owed, nothing failed');
      expect(svc.engine.activity, isNot(EngineActivity.signedOut));

      // A change saved while the gateway is unreachable is shown as owed, and survives.
      await svc.store.enqueue(kind: 'staff.checkIn', body: {});
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await Future<void>.delayed(const Duration(milliseconds: 20));
      }
      expect((await svc.store.counts()).pending + (await svc.store.counts()).failed, 1);
      await svc.dispose();
    });
  });

  testWidgets('signing out wipes the local database', (tester) async {
    await tester.runAsync(() async {
      final svc = await services();
      await svc.session.signInWithPassword('ann@x.test', 'pw');
      await svc.store.enqueue(kind: 'k', body: {});
      await svc.store.upsertRecords('X', [(id: 'a', parentId: null, json: {'id': 'a'})]);
      await Future<void>.delayed(const Duration(milliseconds: 300)); // the pull that signing in starts finishes first
      await svc.session.signOut(force: true);
      expect((await svc.store.all()), isEmpty);
      expect(await svc.store.records('X'), isEmpty);
      await svc.dispose();
    });
  });
}
