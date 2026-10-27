import 'dart:async';
import 'dart:convert';

import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

final base = Uri.parse('https://api.example.test');
const tenant = OruRoute('GET', '/v1/x/{id}', OruAccess.tenant, 'X_get');
const user = OruRoute('GET', '/v1/me', OruAccess.user, 'Me_get');
const public = OruRoute('GET', '/health', OruAccess.public, 'Health_check');

http.Response json(Object body, [int status = 200, Map<String, String> headers = const {}]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json', ...headers});

Map<String, dynamic> envelope(String code, {String message = 'm', String? requestId, List<Map<String, String>>? details}) =>
    {'error': {'code': code, 'message': message, 'requestId': ?requestId, 'details': ?details}};

OruHttpTransport transport(MockClient c, {OruTokenProvider? token, String? school = 'school-1', Duration timeout = const Duration(seconds: 5)}) =>
    OruHttpTransport(baseUrl: base, client: c, getToken: token ?? (r) => 'tok', getSchoolId: () => school, timeout: timeout);

void main() {
  group('credentials', () {
    test('a school route sends the token and the school; a public route sends neither', () async {
      final seen = <http.BaseRequest>[];
      final c = MockClient((r) async {
        seen.add(r);
        return json({'ok': true});
      });
      final t = transport(c);
      await t.send(tenant, '/v1/x/7');
      await t.send(public, '/health');
      expect(seen[0].headers['authorization'], 'Bearer tok');
      expect(seen[0].headers['x-school-id'], 'school-1');
      expect(seen[1].headers.containsKey('authorization'), isFalse);
      expect(seen[1].headers.containsKey('x-school-id'), isFalse);
    });

    test('a user route sends the school only when there is one', () async {
      final seen = <http.BaseRequest>[];
      final c = MockClient((r) async {
        seen.add(r);
        return json({});
      });
      await transport(c, school: null).send(user, '/v1/me');
      await transport(c).send(user, '/v1/me');
      expect(seen[0].headers.containsKey('x-school-id'), isFalse);
      expect(seen[1].headers['x-school-id'], 'school-1');
    });

    test('a school route with no active school sends nothing at all', () async {
      var calls = 0;
      final c = MockClient((r) async {
        calls++;
        return json({});
      });
      await expectLater(
          transport(c, school: null).send(tenant, '/v1/x/7'), throwsA(isA<OruApiError>().having((e) => e.code, 'code', OruClientErrorCode.schoolRequired)));
      expect(calls, 0);
    });

    test('a 401 is retried exactly once with a freshly requested token', () async {
      final tokens = <bool>[];
      var calls = 0;
      final c = MockClient((r) async {
        calls++;
        return calls == 1 ? json(envelope('AUTH_REQUIRED'), 401) : json({'ok': 1});
      });
      final t = transport(c, token: (r) {
        tokens.add(r.forceRefresh);
        return r.forceRefresh ? 'fresh' : 'stale';
      });
      expect(await t.send(tenant, '/v1/x/7'), {'ok': 1});
      expect(tokens, [false, true]);
      expect(calls, 2);
    });

    test('a second 401 is the answer: no loop', () async {
      var calls = 0;
      final c = MockClient((r) async {
        calls++;
        return json(envelope('AUTH_REQUIRED'), 401);
      });
      await expectLater(transport(c).send(tenant, '/v1/x/7'), throwsA(isA<OruApiError>().having((e) => e.needsSignIn, 'needsSignIn', isTrue)));
      expect(calls, 2);
    });

    test('a public route is never retried on 401', () async {
      var calls = 0;
      final c = MockClient((r) async {
        calls++;
        return json(envelope('AUTH_REQUIRED'), 401);
      });
      await expectLater(transport(c).send(public, '/health'), throwsA(isA<OruApiError>()));
      expect(calls, 1);
    });
  });

  group('requests', () {
    test('query values: null is left out, booleans and whole numbers read plainly', () async {
      late Uri seen;
      final c = MockClient((r) async {
        seen = r.url;
        return json({});
      });
      await transport(c).send(tenant, '/v1/x/7', query: {'since': '2026-10-27T00:00:00Z', 'limit': 5.0, 'unread': true, 'skip': null});
      expect(seen.path, '/v1/x/7');
      expect(seen.queryParameters, {'since': '2026-10-27T00:00:00Z', 'limit': '5', 'unread': 'true'});
    });

    test('a body is sent as JSON; the base path of a gateway behind a proxy is kept', () async {
      late http.Request seen;
      final c = MockClient((r) async {
        seen = r;
        return json({});
      });
      final t = OruHttpTransport(baseUrl: Uri.parse('https://h.example.test/api/'), client: c, getToken: (r) => 't', getSchoolId: () => 's');
      await t.send(const OruRoute('PUT', '/v1/x/{id}', OruAccess.tenant, 'X_put'), '/v1/x/7', body: {'a': 1});
      expect(seen.url.path, '/api/v1/x/7');
      expect(seen.headers['content-type'], startsWith('application/json'));
      expect(jsonDecode(seen.body), {'a': 1});
    });

    test('an empty success body is null', () async {
      final c = MockClient((r) async => http.Response('', 204));
      expect(await transport(c).send(tenant, '/v1/x/7'), isNull);
    });
  });

  group('errors', () {
    test('the gateway envelope becomes an OruApiError with its code, request id and field problems', () async {
      final c = MockClient((r) async => json(envelope('INVALID_REQUEST', message: 'bad', requestId: 'req-1', details: [
            {'field': 'marks', 'rule': 'tooHigh'}
          ]), 400));
      try {
        await transport(c).send(tenant, '/v1/x/7');
        fail('should throw');
      } on OruApiError catch (e) {
        expect(e.code, 'INVALID_REQUEST');
        expect(e.status, 400);
        expect(e.requestId, 'req-1');
        expect(e.details.single.field, 'marks');
        expect(e.details.single.rule, 'tooHigh');
        expect(e.retryable, isFalse, reason: 'a 4xx is final (offline-sync rule 5)');
      }
    });

    test('every code the contract can send is one the client knows how to classify', () {
      for (final code in kGatewayErrorCodes) {
        final e = OruApiError(code, 500, '');
        expect(e.retryable, const {'UPSTREAM_UNAVAILABLE', 'RATE_LIMITED', 'INTERNAL'}.contains(code), reason: code);
      }
    });

    test('a rate limit carries the wait', () async {
      final c = MockClient((r) async => json(envelope('RATE_LIMITED'), 429, {'retry-after': '12'}));
      try {
        await transport(c).send(tenant, '/v1/x/7');
        fail('should throw');
      } on OruApiError catch (e) {
        expect(e.retryAfterSeconds, 12);
        expect(e.retryable, isTrue);
      }
    });

    test('a proxy page or a broken body is UNEXPECTED_RESPONSE, retryable only for a 5xx gateway fault', () async {
      for (final (status, retry) in [(502, true), (404, false)]) {
        final c = MockClient((r) async => http.Response('<html>bad gateway</html>', status));
        try {
          await transport(c).send(tenant, '/v1/x/7');
          fail('should throw');
        } on OruApiError catch (e) {
          expect(e.code, OruClientErrorCode.unexpectedResponse);
          expect(e.retryable, retry);
        }
      }
      final ok = MockClient((r) async => http.Response('not json', 200));
      await expectLater(transport(ok).send(tenant, '/v1/x/7'), throwsA(isA<OruApiError>().having((e) => e.code, 'code', OruClientErrorCode.unexpectedResponse)));
    });

    test('no network and no answer in time are NETWORK_ERROR and TIMEOUT, both worth keeping a change for', () async {
      final offline = MockClient((r) async => throw http.ClientException('no route'));
      final slow = MockClient((r) => Completer<http.Response>().future);
      for (final (client, code) in [(offline, 'NETWORK_ERROR'), (slow, 'TIMEOUT')]) {
        try {
          await transport(client, timeout: const Duration(milliseconds: 20)).send(tenant, '/v1/x/7');
          fail('should throw');
        } on OruApiError catch (e) {
          expect(e.code, code);
          expect(e.retryable, isTrue);
        }
      }
    });

    test('a token is never in an error message', () async {
      final c = MockClient((r) async => http.Response('nope', 500));
      try {
        await transport(c, token: (r) => 'SECRET-TOKEN').send(tenant, '/v1/x/7');
      } on OruApiError catch (e) {
        expect('$e ${e.message}', isNot(contains('SECRET-TOKEN')));
      }
    });
  });
}
