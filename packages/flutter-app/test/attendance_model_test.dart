import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> student(String id, String name, {String status = 'PRESENT'}) => {'id': id, 'name': name, 'enrollmentId': 'S-$id', 'status': status, 'note': null};

OutboxEntry sub(String classId, String date, List<Map<String, dynamic>> marks, {String state = OutboxState.queued, int seq = 1, String? code}) => OutboxEntry(
      id: 'o$seq', seq: seq, kind: 'attendance.submit', body: {'classId': classId, 'date': date, 'marks': marks}, state: state, attempts: 0, nextAttemptAtMs: null, lastErrorCode: code, lastErrorMessage: null, parentId: null, deviceId: 'd', baseVersion: null, createdAtMs: 0,
    );

final roster = [student('a', 'Asha'), student('b', 'Bilal'), student('c', 'Chitra')];

ClassDayView view({Map<String, dynamic>? day, List<OutboxEntry> box = const [], Map<String, String>? draft, List<Map<String, dynamic>>? students}) =>
    buildClassDay(classId: 'c5', date: '2026-10-26', roster: students ?? roster, day: day, outbox: box, draft: draft);

void main() {
  group('what is shown', () {
    test('nothing taken yet: everyone present, state todo, nothing dirty', () {
      final v = view();
      expect(v.state, ClassDayState.todo);
      expect(v.students.map((s) => s.status).toSet(), {'PRESENT'});
      expect(v.exceptions, 0);
      expect(v.dirty, isFalse);
      expect(v.students.map((s) => s.name), ['Asha', 'Bilal', 'Chitra'], reason: 'in name order');
    });

    test('what the school has: taken, with its statuses', () {
      final v = view(day: {'submitted': true, 'locked': false}, students: [student('a', 'Asha'), student('b', 'Bilal', status: 'ABSENT'), student('c', 'Chitra', status: 'LATE')]);
      expect(v.state, ClassDayState.taken);
      expect(v.exceptions, 2);
    });

    test('a locked day is locked, and a locked day that is not taken stays locked', () {
      expect(view(day: {'submitted': true, 'locked': true}).state, ClassDayState.locked);
    });

    test('what is waiting in the outbox wins over the school\'s copy: the teacher sees what she saved', () {
      final v = view(
        day: {'submitted': true, 'locked': false},
        students: [student('a', 'Asha', status: 'ABSENT'), student('b', 'Bilal'), student('c', 'Chitra')],
        box: [sub('c5', '2026-10-26', [{'studentId': 'b', 'status': 'LATE'}])],
      );
      expect(v.state, ClassDayState.saved);
      expect(v.students.firstWhere((s) => s.id == 'a').status, 'PRESENT', reason: 'the saved list is the whole truth: Asha is present in it');
      expect(v.students.firstWhere((s) => s.id == 'b').status, 'LATE');
    });

    test('the newest saved change wins when several are waiting; another class or date is ignored', () {
      final v = view(box: [
        sub('c5', '2026-10-26', [{'studentId': 'a', 'status': 'ABSENT'}], seq: 1),
        sub('c5', '2026-10-26', [{'studentId': 'b', 'status': 'ABSENT'}], seq: 2),
        sub('c6', '2026-10-26', [{'studentId': 'c', 'status': 'ABSENT'}], seq: 3),
        sub('c5', '2026-10-25', [{'studentId': 'c', 'status': 'ABSENT'}], seq: 4),
      ]);
      expect(v.students.where((s) => s.status == 'ABSENT').map((s) => s.id), ['b']);
    });

    test('a refusal is shown as failed with the gateway\'s code until dismissed; a newer waiting change replaces the failure', () {
      final failed = view(box: [sub('c5', '2026-10-26', [], state: OutboxState.failed, code: 'CONFLICT')]);
      expect(failed.state, ClassDayState.failed);
      expect(failed.refusal, 'CONFLICT');
      expect(failed.failedEntryId, 'o1');
      final retried = view(box: [sub('c5', '2026-10-26', [], state: OutboxState.failed, code: 'CONFLICT', seq: 1), sub('c5', '2026-10-26', [], seq: 2)]);
      expect(retried.state, ClassDayState.saved);
    });

    test('a class that was never loaded has no roster, so the screen can say "connect once"', () {
      expect(view(students: []).hasRoster, isFalse);
      expect(view(students: [], day: {'submitted': false, 'locked': false}).hasRoster, isTrue);
    });
  });

  group('the draft', () {
    test('overrides what is shown and counts as a change only when it differs', () {
      expect(view(draft: {'a': 'ABSENT'}).students.firstWhere((s) => s.id == 'a').status, 'ABSENT');
      expect(view(draft: {'a': 'ABSENT'}).dirty, isTrue);
      expect(view(draft: {'a': 'PRESENT', 'b': 'PRESENT', 'c': 'PRESENT'}).dirty, isFalse, reason: 'back to what it was');
      expect(view(draft: {}).students.map((s) => s.status).toSet(), {'PRESENT'}, reason: 'mark all present');
    });

    test('is compared with what is waiting, not with the school\'s older copy', () {
      final box = [sub('c5', '2026-10-26', [{'studentId': 'a', 'status': 'ABSENT'}])];
      expect(view(box: box, draft: {'a': 'ABSENT'}).dirty, isFalse);
      expect(view(box: box, draft: {'a': 'PRESENT'}).dirty, isTrue);
    });
  });

  group('what is sent', () {
    test('only the exceptions: everyone else is present by the gateway\'s rule', () {
      expect(marksToSend({'a': 'PRESENT', 'b': 'ABSENT', 'c': 'HALF_DAY'}), [{'studentId': 'b', 'status': 'ABSENT'}, {'studentId': 'c', 'status': 'HALF_DAY'}]);
      expect(marksToSend({'a': 'PRESENT'}), isEmpty, reason: 'a day with everyone present is an empty list, still saved');
    });
  });
}
