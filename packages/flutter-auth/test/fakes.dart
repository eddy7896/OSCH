import 'dart:async';

import 'package:flutter_auth/flutter_auth.dart';

class Clock {
  int now = 1000000;
  int call() => now;
}

/// Firebase, scripted. Tokens are `id-<n>` and refresh tokens `r-<n>` so a test can see which one is in use.
class FakeIdentity implements IdentityPort {
  FakeIdentity(this.clock);
  final Clock clock;
  int n = 0;
  final accounts = <String, String>{'ann@x.test': 'pw', 'bob@x.test': 'pw'};
  AuthFailure? refreshFails;
  int refreshCalls = 0;
  Completer<void>? refreshGate;

  AuthTokens _issue(String uid) {
    n++;
    return AuthTokens(idToken: 'id-$n', refreshToken: 'r-$n', expiresAtMs: clock.now + 3600 * 1000, uid: uid);
  }

  @override
  Future<AuthTokens> signInWithPassword(String email, String password) async {
    if (accounts[email] != password) throw const AuthFailure(AuthFailureCode.invalidCredentials);
    return _issue('uid-${email.split('@').first}');
  }

  @override
  Future<String> sendPhoneCode(String phoneNumber, String appVerificationToken) async => 'session-$phoneNumber';

  @override
  Future<AuthTokens> confirmPhoneCode(String sessionInfo, String code) async {
    if (code != '123456') throw const AuthFailure(AuthFailureCode.invalidCode);
    return _issue('uid-phone');
  }

  @override
  Future<AuthTokens> refresh(String refreshToken) async {
    refreshCalls++;
    await refreshGate?.future;
    final f = refreshFails;
    if (f != null) throw f;
    return _issue('uid-ann');
  }

  @override
  Future<void> sendPasswordReset(String email) async {}
}

SchoolChoice school(String id, String role, {String name = 'School'}) => SchoolChoice(id: id, name: '$name $id', subDomain: 'sub$id', role: role, defaultLanguage: 'en');

class Rig {
  Rig() : clock = Clock() {
    identity = FakeIdentity(clock);
    session = make();
  }
  final Clock clock;
  late final FakeIdentity identity;
  final storage = MemorySecureStorage();
  int wipes = 0;
  int owed = 0;
  Account? Function(String uid) accountFor = (uid) => Account(userId: uid, email: '$uid@x.test', displayName: 'Ann', schools: [school('s1', 'TEACHER')]);
  Object? accountError;
  final tokensSeenByGateway = <String>[];
  late DeviceSession session;

  DeviceSession make({Set<String> roles = const {'TEACHER'}}) => DeviceSession(
        identity: identity,
        storage: storage,
        allowedRoles: roles,
        nowMs: clock.call,
        wipeLocalData: () async => wipes++,
        owedChanges: () async => owed,
        accountSource: (token) async {
          tokensSeenByGateway.add(token);
          if (accountError != null) throw accountError!;
          final uid = token == 'id-0' ? 'uid-ann' : 'uid-${_who[token] ?? 'ann'}';
          return accountFor(uid)!;
        },
      );

  final _who = <String, String>{};
}

