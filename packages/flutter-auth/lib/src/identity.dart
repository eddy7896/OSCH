import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// Why an identity call failed, as a closed list the screens translate (ADR-0006). Wrong email and wrong password are one
/// code, and so is an unknown email: nobody learns which accounts exist.
enum AuthFailureCode {
  invalidCredentials,
  userDisabled,
  tooManyAttempts,
  invalidCode,
  codeExpired,

  /// The refresh token was refused: the account was disabled or deleted, the password changed, or access was revoked.
  /// Unlike [network], waiting does not help; the person must sign in again.
  sessionRevoked,

  /// Nothing reached Firebase (no connection, a timeout). The session is kept.
  network,
  unknown,
}

class AuthFailure implements Exception {
  const AuthFailure(this.code, [this.detail]);
  final AuthFailureCode code;

  /// Firebase's own short reason, for logs and tests; never shown and never holds a token.
  final String? detail;

  @override
  String toString() => 'AuthFailure($code${detail == null ? '' : ', $detail'})';
}

/// What Firebase gave back at sign-in or refresh.
class AuthTokens {
  const AuthTokens({required this.idToken, required this.refreshToken, required this.expiresAtMs, required this.uid});
  final String idToken;
  final String refreshToken;

  /// When [idToken] stops working, by the device clock. It only decides when to ask for a new one; a wrong clock costs one
  /// extra refresh or one 401 that the transport retries with a fresh token, never a wrong decision about data.
  final int expiresAtMs;
  final String uid;
}

/// The part of Firebase Auth the apps use. [FirebaseRestIdentity] is the real one; tests use a fake.
abstract interface class IdentityPort {
  Future<AuthTokens> signInWithPassword(String email, String password);

  /// Asks Firebase to text a one-time code. [appVerificationToken] is the proof that a real app on a real phone is asking
  /// (the platform's app check or reCAPTCHA result); the Auth emulator accepts any value.
  Future<String> sendPhoneCode(String phoneNumber, String appVerificationToken);
  Future<AuthTokens> confirmPhoneCode(String sessionInfo, String code);
  Future<AuthTokens> refresh(String refreshToken);

  /// "Forgot password" and "resend the set-password link" (ADR-0011): Firebase sends the email.
  Future<void> sendPasswordReset(String email);
}

/// Firebase Auth through its public REST interface (Identity Toolkit and Secure Token), so sign-in needs no native plugin and
/// runs the same against the Auth emulator. Tokens are never logged or put in an error.
class FirebaseRestIdentity implements IdentityPort {
  FirebaseRestIdentity({required this.apiKey, Uri? identityBase, Uri? tokenBase, http.Client? client, this.timeout = const Duration(seconds: 15), int Function()? nowMs})
      : identityBase = identityBase ?? Uri.parse('https://identitytoolkit.googleapis.com'),
        tokenBase = tokenBase ?? Uri.parse('https://securetoken.googleapis.com'),
        _client = client ?? http.Client(),
        _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch);

  /// For the Auth emulator at [host] (for example `127.0.0.1:9099`).
  factory FirebaseRestIdentity.emulator(String host, {http.Client? client, int Function()? nowMs}) => FirebaseRestIdentity(
        apiKey: 'fake-api-key',
        identityBase: Uri.parse('http://$host/identitytoolkit.googleapis.com'),
        tokenBase: Uri.parse('http://$host/securetoken.googleapis.com'),
        client: client,
        nowMs: nowMs,
      );

  final String apiKey;
  final Uri identityBase;
  final Uri tokenBase;
  final Duration timeout;
  final http.Client _client;
  final int Function() _nowMs;

  @override
  Future<AuthTokens> signInWithPassword(String email, String password) async {
    final j = await _post(identityBase, '/v1/accounts:signInWithPassword', {'email': email, 'password': password, 'returnSecureToken': true}, refreshing: false);
    return _fromSignIn(j);
  }

  @override
  Future<String> sendPhoneCode(String phoneNumber, String appVerificationToken) async {
    final j = await _post(identityBase, '/v1/accounts:sendVerificationCode', {'phoneNumber': phoneNumber, 'recaptchaToken': appVerificationToken}, refreshing: false);
    return j['sessionInfo'] as String;
  }

  @override
  Future<AuthTokens> confirmPhoneCode(String sessionInfo, String code) async =>
      _fromSignIn(await _post(identityBase, '/v1/accounts:signInWithPhoneNumber', {'sessionInfo': sessionInfo, 'code': code}, refreshing: false));

  @override
  Future<AuthTokens> refresh(String refreshToken) async {
    final j = await _post(tokenBase, '/v1/token', 'grant_type=refresh_token&refresh_token=${Uri.encodeQueryComponent(refreshToken)}', refreshing: true);
    return AuthTokens(
      idToken: j['id_token'] as String,
      refreshToken: j['refresh_token'] as String,
      expiresAtMs: _nowMs() + (int.tryParse('${j['expires_in']}') ?? 3600) * 1000,
      uid: j['user_id'] as String,
    );
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    await _post(identityBase, '/v1/accounts:sendOobCode', {'requestType': 'PASSWORD_RESET', 'email': email}, refreshing: false);
  }

  AuthTokens _fromSignIn(Map<String, dynamic> j) => AuthTokens(
        idToken: j['idToken'] as String,
        refreshToken: j['refreshToken'] as String,
        expiresAtMs: _nowMs() + (int.tryParse('${j['expiresIn']}') ?? 3600) * 1000,
        uid: j['localId'] as String,
      );

  Future<Map<String, dynamic>> _post(Uri base, String path, Object body, {required bool refreshing}) async {
    final uri = base.replace(path: '${base.path}$path', queryParameters: {'key': apiKey});
    final http.Response r;
    try {
      r = await _client
          .post(uri, headers: {'content-type': body is String ? 'application/x-www-form-urlencoded' : 'application/json'}, body: body is String ? body : jsonEncode(body))
          .timeout(timeout);
    } on TimeoutException {
      throw const AuthFailure(AuthFailureCode.network, 'timeout');
    } on http.ClientException {
      throw const AuthFailure(AuthFailureCode.network, 'unreachable');
    }
    Map<String, dynamic>? j;
    try {
      j = jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      j = null;
    }
    if (r.statusCode >= 200 && r.statusCode < 300 && j != null) return j;
    if (r.statusCode >= 500 || j == null) throw AuthFailure(AuthFailureCode.network, 'status ${r.statusCode}');
    final message = ((j['error'] as Map<String, dynamic>?)?['message'] as String?) ?? '';
    throw AuthFailure(_classify(message, refreshing: refreshing), message.split(' ').first);
  }

  static AuthFailureCode _classify(String message, {required bool refreshing}) {
    final m = message.split(' ').first;
    if (refreshing) {
      // Any answer at all to a refresh means the server heard us and said no.
      return switch (m) {
        'TOKEN_EXPIRED' || 'USER_NOT_FOUND' || 'INVALID_REFRESH_TOKEN' || 'USER_DISABLED' || 'INVALID_GRANT_TYPE' || 'MISSING_REFRESH_TOKEN' => AuthFailureCode.sessionRevoked,
        'TOO_MANY_ATTEMPTS_TRY_LATER' => AuthFailureCode.tooManyAttempts,
        _ => AuthFailureCode.unknown,
      };
    }
    return switch (m) {
      'INVALID_LOGIN_CREDENTIALS' || 'INVALID_PASSWORD' || 'EMAIL_NOT_FOUND' || 'INVALID_EMAIL' || 'MISSING_PASSWORD' => AuthFailureCode.invalidCredentials,
      'USER_DISABLED' => AuthFailureCode.userDisabled,
      'TOO_MANY_ATTEMPTS_TRY_LATER' || 'QUOTA_EXCEEDED' => AuthFailureCode.tooManyAttempts,
      'INVALID_CODE' || 'INVALID_SESSION_INFO' || 'MISSING_CODE' => AuthFailureCode.invalidCode,
      'SESSION_EXPIRED' || 'CODE_EXPIRED' => AuthFailureCode.codeExpired,
      _ => AuthFailureCode.unknown,
    };
  }

  void close() => _client.close();
}
