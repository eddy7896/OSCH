import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

class _Answers implements OruTransport {
  _Answers(this.answer);
  final Object? Function() answer;
  @override
  Future<Object?> send(OruRoute route, String path, {Map<String, Object?> query = const {}, Object? body}) async => answer();
}

void main() {
  test('a role that may not read academics (a bursar, an HR manager) has nothing removed to hear about, and its cursor does not move', () async {
    final src = OruApiTombstones(OruApi(_Answers(() => throw const OruApiError('FORBIDDEN', 403, 'no'))));
    final page = await src.since('2026-01-01T00:00:00.000Z');
    expect(page.removed, isEmpty);
    expect(page.more, isFalse);
    expect(page.next, '2026-01-01T00:00:00.000Z');
  });

  test('other failures are still failures: no connection is offline, anything else keeps the gateway\'s code', () async {
    await expectLater(OruApiTombstones(OruApi(_Answers(() => throw const OruApiError('NETWORK_ERROR', 0, 'x')))).since('s'), throwsA(isA<PullFailure>().having((e) => e.offline, 'offline', isTrue)));
    await expectLater(OruApiTombstones(OruApi(_Answers(() => throw const OruApiError('INTERNAL', 500, 'x')))).since('s'), throwsA(isA<PullFailure>().having((e) => e.code, 'code', 'INTERNAL')));
  });

  test('a normal page is mapped', () async {
    final src = OruApiTombstones(OruApi(_Answers(() => {
          'items': [
            {'id': 'i', 'entityType': 'Mark', 'entityId': 'm1', 'deletedAt': '2026-01-02T00:00:00.000Z', 'classId': null, 'staffId': null},
          ],
          'more': true,
          'next': '2026-01-02T00:00:00.000Z',
        })));
    final page = await src.since('s');
    expect(page.removed.single.entityId, 'm1');
    expect(page.more, isTrue);
  });
}
