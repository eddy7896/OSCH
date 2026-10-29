import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> st(String id, String name, {num? tenths, bool absent = false}) => {'studentId': id, 'name': name, 'enrollmentId': 'S-$id', 'marksTenths': tenths, 'absent': absent, 'examId': 'e1'};

OutboxEntry save(List<Map<String, dynamic>> entries, {String state = OutboxState.queued, int seq = 1, String? msg}) => OutboxEntry(
      id: 'o$seq', seq: seq, kind: 'marks.save', body: {'examId': 'e1', 'entries': entries}, state: state, attempts: 0, nextAttemptAtMs: null, lastErrorCode: 'VALIDATION_FAILED', lastErrorMessage: msg, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

final roster = [st('a', 'Asha', tenths: 400), st('b', 'Bilal', tenths: 425), st('c', 'Chitra'), st('d', 'Dev', absent: true)];

ExamEntryView view({List<OutboxEntry> box = const [], Map<String, MarkCell>? draft, List<Map<String, dynamic>>? students, int max = 500}) =>
    buildExamEntry(examId: 'e1', maxTenths: max, roster: students ?? roster, outbox: box, draft: draft);

void main() {
  group('the gateway\'s rule for a mark, kept on the phone', () {
    test('whole tenths: up to five digits and one decimal', () {
      expect(parseTenths('42'), 420);
      expect(parseTenths('42.5'), 425);
      expect(parseTenths(' 7 '), 70);
      expect(parseTenths('0'), 0);
      expect(parseTenths('99999.9'), 999999);
      for (final bad in ['', '4.25', '4,5', '-3', 'abc', '1e3', '.5', '5.', '123456', '4 2']) {
        expect(parseTenths(bad), isNull, reason: bad);
      }
    });

    test('formatting is the inverse and drops a zero tenth', () {
      expect(formatTenths(425), '42.5');
      expect(formatTenths(420), '42');
      expect(formatTenths(5), '0.5');
      expect(formatTenths(0), '0');
    });

    test('a box is fine when empty (cleared), a number up to the maximum, or refused: not a mark, or above the maximum (the maximum itself is allowed)', () {
      expect(checkMark('', 500), isNull);
      expect(checkMark('50', 500), isNull);
      expect(checkMark('50.1', 500), MarkProblem.aboveMaximum);
      expect(checkMark('51', 500), MarkProblem.aboveMaximum);
      expect(checkMark('5x', 500), MarkProblem.notAMark);
    });
  });

  group('what is shown', () {
    test('the school\'s marks and absences, with the count marked', () {
      final v = view();
      expect(v.rows.map((r) => r.cell.text), ['40', '42.5', '', '']);
      expect(v.rows.last.cell.absent, isTrue);
      expect(v.marked, 3, reason: 'two marks and one absent; Chitra has none');
      expect(v.dirty, isFalse);
      expect(v.state, ExamState.idle);
      expect(v.canSave, isFalse, reason: 'nothing changed');
    });

    test('a saved change that has not been sent is applied on top, and only the students it lists change', () {
      final v = view(box: [save([{'studentId': 'c', 'marks': '31'}, {'studentId': 'a', 'absent': true}])]);
      expect(v.state, ExamState.saved);
      expect(v.rows.firstWhere((r) => r.studentId == 'c').cell.text, '31');
      expect(v.rows.firstWhere((r) => r.studentId == 'a').cell.absent, isTrue);
      expect(v.rows.firstWhere((r) => r.studentId == 'b').cell.text, '42.5', reason: 'not listed: untouched');
    });

    test('several saved changes apply in the order they were saved', () {
      final v = view(box: [save([{'studentId': 'c', 'marks': '10'}], seq: 1), save([{'studentId': 'c', 'marks': '20'}], seq: 2)]);
      expect(v.rows.firstWhere((r) => r.studentId == 'c').cell.text, '20');
    });

    test('an entry with neither marks nor absent clears the mark', () {
      final v = view(box: [save([{'studentId': 'a'}])]);
      expect(v.rows.firstWhere((r) => r.studentId == 'a').cell.text, '');
    });

    test('a refusal is shown with the gateway\'s message until dismissed; a newer saved change replaces it', () {
      final failed = view(box: [save([], state: OutboxState.failed, msg: 'Some fields are invalid (entries: aboveMaximum)')]);
      expect(failed.state, ExamState.failed);
      expect(failed.refusal, contains('aboveMaximum'));
      expect(failed.failedEntryId, 'o1');
      expect(failed.canSave, isTrue, reason: 'she may fix it and send again');
      expect(view(box: [save([], state: OutboxState.failed, seq: 1), save([], seq: 2)]).state, ExamState.saved);
    });
  });

  group('the draft and what is sent', () {
    test('a wrong mark is kept, shows its problem, and blocks Save; the count says how many', () {
      final v = view(draft: {'a': const MarkCell(text: '51', absent: false), 'b': const MarkCell(text: '4x', absent: false), 'c': const MarkCell(text: '', absent: false)});
      expect(v.rows.firstWhere((r) => r.studentId == 'a').problem, MarkProblem.aboveMaximum);
      expect(v.rows.firstWhere((r) => r.studentId == 'b').problem, MarkProblem.notAMark);
      expect(v.problems, 2);
      expect(v.dirty, isTrue);
      expect(v.canSave, isFalse);
    });

    test('an absent student has no mark to check', () {
      final v = view(draft: {'a': const MarkCell(text: '', absent: true)});
      expect(v.problems, 0);
      expect(v.canSave, isTrue);
    });

    test('only the students whose box differs from what is known are sent, as marks, absent, or cleared', () {
      final v = view(draft: {
        'a': const MarkCell(text: '40.0', absent: false), // same mark typed another way: unchanged
        'b': const MarkCell(text: '45', absent: false), // changed
        'c': const MarkCell(text: '30', absent: false), // new
        'd': const MarkCell(text: '', absent: false), // was absent, now cleared
      });
      expect(entriesToSend(v), [
        {'studentId': 'b', 'marks': '45'},
        {'studentId': 'c', 'marks': '30'},
        {'studentId': 'd'},
      ]);
    });

    test('against what is already waiting, not the school\'s older copy', () {
      final box = [save([{'studentId': 'c', 'marks': '31'}])];
      final same = view(box: box, draft: {'c': const MarkCell(text: '31', absent: false)});
      expect(same.dirty, isFalse);
      expect(entriesToSend(same), isEmpty);
      expect(view(box: box, draft: {'c': const MarkCell(text: '32', absent: false)}).dirty, isTrue);
    });

    test('a class never loaded has no roster, and cannot be saved', () {
      final v = view(students: []);
      expect(v.hasRoster, isFalse);
      expect(v.canSave, isFalse);
    });
  });
}
