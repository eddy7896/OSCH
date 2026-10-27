import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// What a route needs, from the contract's `x-access` (the same classes as the web client).
enum OruAccess {
  /// No token and no school are sent (nothing to leak to an unauthenticated endpoint).
  public,

  /// A token; the active school is sent when there is one.
  user,

  /// A token, never a school.
  platform,

  /// A token and an active school: no request is sent without one.
  tenant,
}

class OruRoute {
  const OruRoute(this.method, this.path, this.access, this.operationId);
  final String method;
  final String path;
  final OruAccess access;
  final String operationId;
}

/// Client-side codes, beside the gateway's own (`kGatewayErrorCodes`).
abstract final class OruClientErrorCode {
  /// The request never got an answer (offline, DNS, refused).
  static const networkError = 'NETWORK_ERROR';

  /// No answer within the time limit.
  static const timeout = 'TIMEOUT';

  /// A school route was called with no active school; nothing was sent.
  static const schoolRequired = 'SCHOOL_REQUIRED';

  /// An error status without the gateway's JSON envelope (for example a proxy page), or a success with a body that is not JSON.
  static const unexpectedResponse = 'UNEXPECTED_RESPONSE';
}

class OruFieldProblem {
  const OruFieldProblem(this.field, this.rule);
  final String field;
  final String rule;
}

/// Every failure of the client is an [OruApiError]. Screens switch on [code] and translate it (the English [message] is a
/// fallback only), never on the message text or on [status].
class OruApiError implements Exception {
  const OruApiError(this.code, this.status, this.message, {this.requestId, this.details = const [], this.retryAfterSeconds});

  final String code;
  final int status;
  final String message;
  final String? requestId;
  final List<OruFieldProblem> details;
  final int? retryAfterSeconds;

  bool get needsSignIn => code == 'AUTH_REQUIRED';

  /// Worth keeping a queued change for and trying again. A 4xx other than rate limiting is final (offline-sync rule 5).
  bool get retryable => const {'NETWORK_ERROR', 'TIMEOUT', 'UPSTREAM_UNAVAILABLE', 'RATE_LIMITED', 'INTERNAL'}.contains(code) || (code == 'UNEXPECTED_RESPONSE' && status >= 502);

  @override
  String toString() =>
      'OruApiError($code, $status${requestId == null ? '' : ', request $requestId'}${details.isEmpty ? '' : ', ${details.map((d) => '${d.field}: ${d.rule}').join('; ')}'}${message.isEmpty ? '' : ', "$message"'})';
}

/// The seam the generated [OruApi] talks through, so the sync engine and the tests can stand in for the network.
abstract interface class OruTransport {
  /// Sends one request and returns the decoded JSON body (null for an empty body). Throws [OruApiError].
  Future<Object?> send(OruRoute route, String path, {Map<String, Object?> query = const {}, Object? body});
}

class OruTokenRequest {
  const OruTokenRequest({required this.forceRefresh});

  /// True on the single retry after a 401: get a fresh token from the identity provider, never a cached one.
  final bool forceRefresh;
}

typedef OruTokenProvider = FutureOr<String?> Function(OruTokenRequest request);

/// The real transport over `package:http`. It, and only it, knows about credentials. A 401 gets exactly one retry with a
/// freshly requested token. Tokens are never logged or put in an error message.
class OruHttpTransport implements OruTransport {
  OruHttpTransport({
    required this.baseUrl,
    this.getToken,
    this.getSchoolId,
    http.Client? client,
    this.timeout = const Duration(seconds: 15),
  }) : _client = client ?? http.Client();

  final Uri baseUrl;
  final OruTokenProvider? getToken;
  final String? Function()? getSchoolId;
  final Duration timeout;
  final http.Client _client;

  @override
  Future<Object?> send(OruRoute route, String path, {Map<String, Object?> query = const {}, Object? body}) async {
    String? schoolId;
    if (route.access == OruAccess.tenant || route.access == OruAccess.user) {
      final s = getSchoolId?.call();
      schoolId = (s == null || s.isEmpty) ? null : s;
      if (route.access == OruAccess.tenant && schoolId == null) {
        throw const OruApiError(OruClientErrorCode.schoolRequired, 0, 'Choose a school first.');
      }
    }

    Future<http.Response> attempt({required bool forceRefresh}) async {
      final token = route.access == OruAccess.public ? null : await getToken?.call(OruTokenRequest(forceRefresh: forceRefresh));
      final headers = <String, String>{
        'accept': 'application/json',
        if (body != null) 'content-type': 'application/json',
        if (token != null && token.isNotEmpty) 'authorization': 'Bearer $token',
        'x-school-id': ?schoolId,
      };
      final request = http.Request(route.method, _uri(path, query))..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      try {
        return await http.Response.fromStream(await _client.send(request).timeout(timeout));
      } on TimeoutException {
        throw const OruApiError(OruClientErrorCode.timeout, 0, 'The server took too long to answer.');
      } on http.ClientException {
        throw const OruApiError(OruClientErrorCode.networkError, 0, 'Could not reach the server.');
      }
    }

    var response = await attempt(forceRefresh: false);
    if (response.statusCode == 401 && route.access != OruAccess.public && getToken != null) {
      response = await attempt(forceRefresh: true);
    }
    return _decode(response);
  }

  Uri _uri(String path, Map<String, Object?> query) {
    final params = <String, String>{
      for (final e in query.entries)
        if (e.value != null) e.key: _queryValue(e.value!),
    };
    final prefix = baseUrl.path.endsWith('/') ? baseUrl.path.substring(0, baseUrl.path.length - 1) : baseUrl.path;
    return baseUrl.replace(path: '$prefix$path', queryParameters: params.isEmpty ? null : params);
  }

  static String _queryValue(Object v) => v is double && v == v.truncateToDouble() ? v.toInt().toString() : '$v';

  static Object? _decode(http.Response r) {
    final text = utf8.decode(r.bodyBytes);
    if (r.statusCode >= 200 && r.statusCode < 300) {
      if (text.isEmpty) return null;
      try {
        return jsonDecode(text);
      } on FormatException {
        throw OruApiError(OruClientErrorCode.unexpectedResponse, r.statusCode, 'The server sent something unexpected.');
      }
    }
    final retryAfter = int.tryParse(r.headers['retry-after'] ?? '');
    try {
      final j = jsonDecode(text);
      final e = (j as Map<String, dynamic>)['error'] as Map<String, dynamic>;
      return throw OruApiError(
        e['code'] as String,
        r.statusCode,
        (e['message'] as String?) ?? '',
        requestId: e['requestId'] as String?,
        details: [for (final d in (e['details'] as List<dynamic>? ?? const [])) OruFieldProblem((d as Map<String, dynamic>)['field'] as String, d['rule'] as String)],
        retryAfterSeconds: retryAfter,
      );
    } on OruApiError {
      rethrow;
    } catch (_) {
      throw OruApiError(OruClientErrorCode.unexpectedResponse, r.statusCode, 'The server sent something unexpected.', retryAfterSeconds: retryAfter);
    }
  }

  void close() => _client.close();
}
