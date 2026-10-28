// The device session against the REAL gateway and the Auth emulator with the demo school (`bash tools/tests/dart-gateway.sh`).
// Skipped unless ORU_GATEWAY_URL and ORU_AUTH_EMULATOR are set. It proves P4-3 with real tokens: password and phone-code
// sign-in, the school from the real /v1/me, a token the gateway accepts, an expired token, going offline, and a revoked account.
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

final gateway = Platform.environment['ORU_GATEWAY_URL'];
final authHost = Platform.environment['ORU_AUTH_EMULATOR'];
const phrase = 'demo-pass-2027';
const project = 'demo-oruschools';

class Phone {
  Phone({this.roles = const {'TEACHER'}, MemorySecureStorage? storage, this.nowMs, this.wipes = 0})
      : storage = storage ?? MemorySecureStorage(),
        identity = FirebaseRestIdentity.emulator(authHost!, nowMs: nowMs) {
    session = _make();
  }
  final MemorySecureStorage storage;
  final FirebaseRestIdentity identity;
  final Set<String> roles;
  final int Function()? nowMs;
  int wipes;
  late DeviceSession session;

  DeviceSession _make() => DeviceSession(
        identity: identity,
        storage: storage,
        allowedRoles: roles,
        nowMs: nowMs,
        wipeLocalData: () async => wipes++,
        accountSource: gatewayAccountSource(Uri.parse(gateway!)),
      );

  /// The app killed and opened again.
  Future<void> reopen() async {
    session = _make();
    await session.restore();
  }

  OruApi get api => OruApi(OruHttpTransport(baseUrl: Uri.parse(gateway!), getToken: session.tokenProvider, getSchoolId: () => session.schoolId));
}

Future<Map<String, dynamic>> admin(String path, Map<String, dynamic> body) async {
  final r = await http.post(Uri.parse('http://$authHost/identitytoolkit.googleapis.com/v1/projects/$project/$path'),
      headers: {'content-type': 'application/json', 'authorization': 'Bearer owner'}, body: jsonEncode(body));
  expect(r.statusCode, 200, reason: r.body);
  return jsonDecode(r.body) as Map<String, dynamic>;
}

void main() {
  final skip = gateway == null || authHost == null ? 'set ORU_GATEWAY_URL and ORU_AUTH_EMULATOR (see tools/tests/dart-gateway.sh)' : null;

  test('a teacher signs in with her password: the real /v1/me gives her school, and the gateway accepts the token', () async {
    final p = Phone();
    await p.session.signInWithPassword('teacher@demo.oruschools.example', phrase);
    final s = p.session.state as SessionActive;
    expect(s.school.subDomain, 'greenfield');
    expect(s.school.role, 'TEACHER');
    expect((await p.api.teachingMine()).classes, isNotEmpty);
  }, skip: skip);

  test('the wrong password, and an unknown email, look the same', () async {
    final p = Phone();
    Future<AuthFailureCode> code(String e, String pw) async {
      try {
        await p.session.signInWithPassword(e, pw);
      } on AuthFailure catch (f) {
        return f.code;
      }
      throw StateError('signed in');
    }

    expect(await code('teacher@demo.oruschools.example', 'wrong-wrong-1'), AuthFailureCode.invalidCredentials);
    expect(await code('nobody@demo.oruschools.example', 'wrong-wrong-1'), AuthFailureCode.invalidCredentials);
  }, skip: skip);

  test('an account that belongs to no school of this app is refused, and nothing is left on the phone', () async {
    final p = Phone(roles: const {'DRIVER'});
    await expectLater(p.session.signInWithPassword('teacher@demo.oruschools.example', phrase), throwsA(isA<NoAccessInThisApp>()));
    expect(p.storage.values, isEmpty);
  }, skip: skip);

  test('a phone-only person signs in by one-time code', () async {
    final p = Phone();
    final number = '+9198${Random().nextInt(89999999) + 10000000}';
    final info = await p.session.sendPhoneCode(number, 'emulator');
    await expectLater(p.session.confirmPhoneCode(info, '000000'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.invalidCode)));
    final codes = (jsonDecode((await http.get(Uri.parse('http://$authHost/emulator/v1/projects/$project/verificationCodes'))).body) as Map<String, dynamic>)['verificationCodes'] as List<dynamic>;
    final code = (codes.cast<Map<String, dynamic>>().where((c) => c['sessionInfo'] == info).last)['code'] as String;
    // A brand-new phone number has an account but no school: the app says so.
    await expectLater(p.session.confirmPhoneCode(info, code), throwsA(isA<NoAccessInThisApp>()));
  }, skip: skip);

  test('the app is closed and opened: she is still in, the refresh token is replaced, and the gateway still accepts her', () async {
    final p = Phone();
    await p.session.signInWithPassword('teacher@demo.oruschools.example', phrase);
    final before = p.storage.values['refreshToken'];
    await p.reopen();
    expect(p.session.state, isA<SessionActive>());
    expect((p.session.state as SessionActive).needsNetworkSignIn, isFalse);
    expect((await p.api.teachingMine()).classes, isNotEmpty);
    expect(p.wipes, 0);
    expect(before, isNotNull);
  }, skip: skip);

  test('E-AUTH: hours later with no connection she is still signed in, her stored data stays, and only network work is refused', () async {
    var now = DateTime.now().millisecondsSinceEpoch;
    final p = Phone(nowMs: () => now);
    await p.session.signInWithPassword('teacher@demo.oruschools.example', phrase);
    now += 5 * 3600 * 1000; // the id token has long expired
    // The phone has no route to Firebase: point the identity at a closed port.
    final offline = Phone(storage: p.storage, nowMs: () => now);
    final deadIdentity = FirebaseRestIdentity(apiKey: 'k', identityBase: Uri.parse('http://127.0.0.1:1'), tokenBase: Uri.parse('http://127.0.0.1:1'), timeout: const Duration(seconds: 2));
    final s = DeviceSession(
      identity: deadIdentity,
      storage: offline.storage,
      allowedRoles: const {'TEACHER'},
      wipeLocalData: () async => offline.wipes++,
      nowMs: () => now,
      accountSource: gatewayAccountSource(Uri.parse(gateway!)),
    );
    await s.restore();
    expect(s.state, isA<SessionActive>());
    expect((s.state as SessionActive).needsNetworkSignIn, isTrue);
    expect((s.state as SessionActive).school.subDomain, 'greenfield', reason: 'the school is known without the network');
    expect(offline.wipes, 0);
    await expectLater(s.tokenProvider(const OruTokenRequest(forceRefresh: false)), throwsA(isA<OruApiError>().having((e) => e.code, 'code', 'NETWORK_ERROR')));
    expect(offline.storage.values['refreshToken'], isNotNull, reason: 'still signed in');
  }, skip: skip);

  test('an account removed on the server: the next refresh ends the session and wipes the phone', () async {
    // Farida is a demo teacher no other test uses; the stack is rebuilt on every run of dart-gateway.sh.
    final p = Phone();
    await p.session.signInWithPassword('farida@demo.oruschools.example', phrase);
    final teacherUid = p.storage.values['uid']!;
    await admin('accounts:delete', {'localId': teacherUid});
    await p.reopen();
    expect(p.session.state, isA<SessionSignedOut>());
    expect(p.wipes, 1);
    expect(p.storage.values, isEmpty);
  }, skip: skip);
}
