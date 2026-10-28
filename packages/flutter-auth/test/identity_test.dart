import 'dart:convert';

import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

FirebaseRestIdentity identityAnswering(http.Response Function(http.Request r) f, {int Function()? nowMs}) =>
    FirebaseRestIdentity(apiKey: 'KEY', client: MockClient((r) async => f(r)), nowMs: nowMs ?? () => 1000);

http.Response firebaseError(String message, {int status = 400}) => http.Response(jsonEncode({'error': {'code': status, 'message': message}}), status);

void main() {
  test('password sign-in posts to Identity Toolkit with the key and returns tokens that expire when Firebase says', () async {
    late http.Request seen;
    final id = identityAnswering((r) {
      seen = r;
      return http.Response(jsonEncode({'idToken': 'I', 'refreshToken': 'R', 'expiresIn': '3600', 'localId': 'U'}), 200);
    });
    final t = await id.signInWithPassword('a@x', 'pw');
    expect(seen.url.toString(), 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=KEY');
    expect(jsonDecode(seen.body), {'email': 'a@x', 'password': 'pw', 'returnSecureToken': true});
    expect((t.idToken, t.refreshToken, t.uid, t.expiresAtMs), ('I', 'R', 'U', 1000 + 3600 * 1000));
  });

  test('refresh posts the form Secure Token expects and reads its snake_case answer', () async {
    late http.Request seen;
    final id = identityAnswering((r) {
      seen = r;
      return http.Response(jsonEncode({'id_token': 'I2', 'refresh_token': 'R2', 'expires_in': '1800', 'user_id': 'U'}), 200);
    });
    final t = await id.refresh('R+1/=');
    expect(seen.url.host, 'securetoken.googleapis.com');
    expect(seen.headers['content-type'], contains('application/x-www-form-urlencoded'));
    expect(seen.body, 'grant_type=refresh_token&refresh_token=R%2B1%2F%3D');
    expect((t.idToken, t.refreshToken, t.expiresAtMs), ('I2', 'R2', 1000 + 1800 * 1000));
  });

  test('sign-in failures: wrong password, unknown email and a malformed one are the SAME code', () async {
    for (final m in ['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_EMAIL']) {
      final id = identityAnswering((r) => firebaseError(m));
      await expectLater(id.signInWithPassword('a', 'b'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.invalidCredentials)), reason: m);
    }
    await expectLater(identityAnswering((r) => firebaseError('USER_DISABLED')).signInWithPassword('a', 'b'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.userDisabled)));
    await expectLater(identityAnswering((r) => firebaseError('TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account has been temporarily disabled.')).signInWithPassword('a', 'b'),
        throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.tooManyAttempts)));
  });

  test('phone code failures', () async {
    await expectLater(identityAnswering((r) => firebaseError('INVALID_CODE')).confirmPhoneCode('s', '1'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.invalidCode)));
    await expectLater(identityAnswering((r) => firebaseError('SESSION_EXPIRED')).confirmPhoneCode('s', '1'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.codeExpired)));
  });

  test('a refresh that Firebase answers with a refusal means revoked; one it cannot answer means only "no connection"', () async {
    for (final m in ['TOKEN_EXPIRED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN', 'USER_DISABLED']) {
      await expectLater(identityAnswering((r) => firebaseError(m)).refresh('R'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.sessionRevoked)), reason: m);
    }
    await expectLater(identityAnswering((r) => http.Response('upstream', 503)).refresh('R'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.network)));
    await expectLater(identityAnswering((r) => http.Response('<html>', 200)).refresh('R'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.network)));
    final dead = FirebaseRestIdentity(apiKey: 'K', client: MockClient((r) async => throw http.ClientException('no route')));
    await expectLater(dead.refresh('R'), throwsA(isA<AuthFailure>().having((e) => e.code, 'code', AuthFailureCode.network)));
  });

  test('an error never carries a token or a password', () async {
    final id = identityAnswering((r) => firebaseError('INVALID_REFRESH_TOKEN'));
    try {
      await id.refresh('SECRET-REFRESH-TOKEN');
      fail('should have thrown');
    } on AuthFailure catch (e) {
      expect(e.toString(), isNot(contains('SECRET')));
    }
  });

  test('the emulator constructor points at the emulator\'s paths', () async {
    late Uri seen;
    final id = FirebaseRestIdentity.emulator('127.0.0.1:9099', client: MockClient((r) async {
      seen = r.url;
      return http.Response(jsonEncode({'idToken': 'I', 'refreshToken': 'R', 'expiresIn': '3600', 'localId': 'U'}), 200);
    }));
    await id.signInWithPassword('a', 'b');
    expect(seen.toString(), startsWith('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'));
  });
}
