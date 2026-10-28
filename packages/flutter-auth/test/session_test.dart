import 'dart:async';

import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

void main() {
  group('signing in', () {
    test('one school fits: the person is in, and the refresh token (not the id token) is what is kept', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      final s = t.session.state as SessionActive;
      expect(s.school.id, 's1');
      expect(t.session.schoolId, 's1');
      expect(t.storage.values['refreshToken'], startsWith('r-'));
      expect(t.storage.values.values.any((v) => v.startsWith('id-')), isFalse, reason: 'the short-lived token is never written down');
    });

    test('wrong password: one code that does not say whether the account exists, and nothing is stored', () async {
      final t = Rig();
      await expectLater(t.session.signInWithPassword('ann@x.test', 'nope'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.invalidCredentials)));
      await expectLater(t.session.signInWithPassword('nobody@x.test', 'pw'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.invalidCredentials)));
      expect(t.storage.values, isEmpty);
      expect(t.session.state, isA<SessionSignedOut>());
    });

    test('a phone-code sign-in works the same way', () async {
      final t = Rig();
      final info = await t.session.sendPhoneCode('+919800000000', 'app-check');
      await expectLater(t.session.confirmPhoneCode(info, '000000'), throwsA(isA<AuthFailure>()));
      await t.session.confirmPhoneCode(info, '123456');
      expect(t.session.state, isA<SessionActive>());
    });

    test('several schools: the person chooses; one school is remembered next time', () async {
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s1', 'TEACHER'), school('s2', 'TEACHER'), school('s3', 'HR')]);
      await t.session.signInWithPassword('ann@x.test', 'pw');
      final c = t.session.state as SessionChoosingSchool;
      expect(c.options.map((o) => o.id), ['s1', 's2'], reason: 'the HR membership is for the staff app, not this one');
      await t.session.chooseSchool('s2');
      expect(t.session.schoolId, 's2');
      await expectLater(t.session.chooseSchool('s3'), throwsArgumentError);
      await t.session.signOut();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      expect(t.session.state, isA<SessionChoosingSchool>(), reason: 'signing out forgets the choice with everything else');
    });

    test('no school in this app: refused, signed out, nothing stored', () async {
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s1', 'HR')]);
      await expectLater(t.session.signInWithPassword('ann@x.test', 'pw'), throwsA(isA<NoAccessInThisApp>()));
      expect(t.storage.values, isEmpty);
      expect(t.session.state, isA<SessionSignedOut>());
    });

    test('only active memberships of active schools are offered', () {
      Map<String, dynamic> m(String id, String status, String schoolStatus) =>
          {'role': 'TEACHER', 'status': status, 'school': {'id': id, 'name': id, 'subDomain': id, 'status': schoolStatus, 'defaultLanguage': 'en'}};
      final me = MeResponseDto.fromJson({
        'user': {'id': 'u', 'email': 'a@x', 'displayName': null, 'globalRole': 'USER'},
        'activeSchool': null,
        'language': {'chosen': null, 'effective': 'en'},
        'platform': null,
        'memberships': [m('a', 'ACTIVE', 'ACTIVE'), m('b', 'SUSPENDED', 'ACTIVE'), m('c', 'ACTIVE', 'SUSPENDED')],
      });
      expect(Account.fromMe(me).schools.map((s) => s.id), ['a']);
    });

    test('the gateway failing after Firebase accepted: nothing is stored and the error reaches the screen', () async {
      final t = Rig();
      t.accountError = const OruApiError('NETWORK_ERROR', 0, 'down');
      await expectLater(t.session.signInWithPassword('ann@x.test', 'pw'), throwsA(isA<OruApiError>()));
      expect(t.storage.values, isEmpty);
    });
  });

  group('whose data it is', () {
    test('a different person on the same phone: the last person\'s data is wiped before anything of theirs is stored', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      expect(t.wipes, 0);
      t.session = t.make();
      await t.session.signInWithPassword('bob@x.test', 'pw');
      expect(t.wipes, 1);
    });

    test('the same person signing in again keeps their data', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.session = t.make();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      expect(t.wipes, 0);
    });

    test('switching school wipes the other school\'s data; choosing the same one does not', () async {
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s1', 'TEACHER'), school('s2', 'TEACHER')]);
      await t.session.signInWithPassword('ann@x.test', 'pw');
      await t.session.chooseSchool('s1');
      expect(t.wipes, 0, reason: 'the first choice has nothing to wipe');
      await t.session.chooseSchool('s1');
      expect(t.wipes, 0);
      await t.session.chooseSchool('s2');
      expect(t.wipes, 1);
    });
  });

  group('tokens for the transport', () {
    test('a valid token is reused; one near its end is refreshed first; a 401 forces a refresh', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), 'id-1');
      expect(t.identity.refreshCalls, 0);
      t.clock.now += 3600 * 1000 - 30 * 1000; // 30 s left, inside the margin
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), 'id-2');
      expect(t.identity.refreshCalls, 1);
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: true)), 'id-3');
      expect(t.storage.values['refreshToken'], 'r-3', reason: 'the newest refresh token replaces the old one');
    });

    test('many requests asking at once cause ONE refresh', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.clock.now += 3600 * 1000;
      t.identity.refreshGate = Completer<void>();
      final all = Future.wait([for (var i = 0; i < 5; i++) t.session.tokenProvider(const OruTokenRequest(forceRefresh: false))]);
      await Future<void>.delayed(Duration.zero);
      t.identity.refreshGate!.complete();
      final tokens = await all;
      expect(tokens.toSet().length, 1);
      expect(t.identity.refreshCalls, 1);
    });

    test('signed out: no token at all, and public calls still work', () async {
      final t = Rig();
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), isNull);
    });
  });

  group('closing and reopening the app', () {
    test('the session comes back from storage and shows the stored school at once, then refreshes', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.session = t.make();
      await t.session.restore();
      expect(t.session.state, isA<SessionActive>());
      expect((t.session.state as SessionActive).needsNetworkSignIn, isFalse, reason: 'the refresh succeeded');
      expect(t.identity.refreshCalls, 1);
      expect(t.wipes, 0);
    });

    test('E-AUTH offline: an expired token with no connection keeps the person in and the data readable; network work is refused with NETWORK_ERROR', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.clock.now += 5 * 3600 * 1000; // hours later, token long expired
      t.identity.refreshFails = const AuthFailure(AuthFailureCode.network);
      t.session = t.make();
      await t.session.restore();
      final s = t.session.state as SessionActive;
      expect(s.needsNetworkSignIn, isTrue);
      expect(s.school.id, 's1');
      expect(t.wipes, 0, reason: 'offline never wipes');
      await expectLater(t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), throwsA(isA<OruApiError>().having((e) => e.code, 'code', 'NETWORK_ERROR')));
      expect(t.storage.values['refreshToken'], isNotNull);
      // The connection returns: the next request refreshes and the flag clears.
      t.identity.refreshFails = null;
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), startsWith('id-'));
      expect((t.session.state as SessionActive).needsNetworkSignIn, isFalse);
    });

    test('revoked while away (account disabled or deleted): the next refresh ends the session and wipes the phone', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.identity.refreshFails = const AuthFailure(AuthFailureCode.sessionRevoked);
      t.session = t.make();
      await t.session.restore();
      expect(t.session.state, isA<SessionSignedOut>());
      expect(t.wipes, 1);
      expect(t.storage.values, isEmpty);
    });

    test('a revoked refresh during a request surfaces as AUTH_REQUIRED, once', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.identity.refreshFails = const AuthFailure(AuthFailureCode.sessionRevoked);
      await expectLater(t.session.tokenProvider(const OruTokenRequest(forceRefresh: true)), throwsA(isA<OruApiError>().having((e) => e.needsSignIn, 'needsSignIn', isTrue)));
      expect(t.session.state, isA<SessionSignedOut>());
      expect(t.wipes, 1);
    });

    test('the membership ended while away: the person is moved to another school (data wiped) or signed out', () async {
      final t = Rig();
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s1', 'TEACHER'), school('s2', 'TEACHER')]);
      await t.session.signInWithPassword('ann@x.test', 'pw');
      await t.session.chooseSchool('s1');
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: [school('s2', 'TEACHER')]);
      t.session = t.make();
      await t.session.restore();
      expect(t.session.state, isA<SessionChoosingSchool>());
      expect(t.wipes, 1);
    });

    test('the membership ended and no other school fits: signed out and wiped', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.accountFor = (uid) => Account(userId: uid, email: 'a@x', displayName: null, schools: []);
      t.session = t.make();
      await t.session.restore();
      expect(t.session.state, isA<SessionSignedOut>());
      expect(t.wipes, 1);
      expect(t.storage.values, isEmpty);
    });

    test('half-written storage is not a session: it is cleared', () async {
      final t = Rig();
      t.storage.values['refreshToken'] = 'r-9';
      await t.session.restore();
      expect(t.session.state, isA<SessionSignedOut>());
      expect(t.storage.values, isEmpty);
    });
  });

  group('signing out', () {
    test('deletes the stored session and the local data, and the phone no longer has a token', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      await t.session.signOut();
      expect(t.storage.values, isEmpty);
      expect(t.wipes, 1);
      expect(await t.session.tokenProvider(const OruTokenRequest(forceRefresh: false)), isNull);
    });

    test('with changes still owed it asks first; "force" signs out anyway', () async {
      final t = Rig();
      await t.session.signInWithPassword('ann@x.test', 'pw');
      t.owed = 3;
      await expectLater(t.session.signOut(), throwsA(isA<SignOutBlocked>().having((e) => e.owed, 'owed', 3)));
      expect(t.session.state, isA<SessionActive>());
      expect(t.wipes, 0);
      await t.session.signOut(force: true);
      expect(t.wipes, 1);
    });
  });
}
