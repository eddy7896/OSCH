import 'package:flutter_sync/flutter_sync.dart';

/// The seven fixed statuses, in the order the school shows them. A school may rename them; the codes never change.
const attendanceStatusCodes = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'MEDICAL', 'HALF_DAY', 'EXCUSED'];

/// Where a class's attendance stands today, for the list and the banner.
enum ClassDayState {
  /// Nothing taken, nothing saved.
  todo,

  /// Saved on this phone, not sent yet (or being sent).
  saved,

  /// The school has it.
  taken,

  /// The school has it and the day is locked: only the Academic admin can change it.
  locked,

  /// The school refused what this phone sent for today. The teacher reads why and dismisses it.
  failed,
}

class StudentRow {
  const StudentRow({required this.id, required this.name, required this.enrollmentId, required this.status});
  final String id;
  final String name;
  final String enrollmentId;
  final String status;
}

/// Everything the attendance screen needs, worked out from the phone: the roster, what the school has, what is waiting in the outbox, and
/// what the teacher has changed but not saved yet (the draft). Pure: no network, no clock.
class ClassDayView {
  const ClassDayView({required this.classId, required this.date, required this.state, required this.students, required this.dirty, required this.refusal, required this.failedEntryId, required this.hasRoster});
  final String classId;
  final String date;
  final ClassDayState state;

  /// The effective status of each student now: the draft, else what is waiting to be sent, else what the school has.
  final List<StudentRow> students;

  /// The teacher changed something since the last save (or since the school's copy).
  final bool dirty;

  /// The gateway's code for a refusal (`CONFLICT` for a locked day), when [state] is [ClassDayState.failed].
  final String? refusal;
  final String? failedEntryId;

  /// False until the class list has ever been loaded onto the phone.
  final bool hasRoster;

  int get exceptions => students.where((s) => s.status != 'PRESENT').length;
}

bool _isFor(OutboxEntry o, String classId, String date) => o.kind == 'attendance.submit' && o.body['classId'] == classId && o.body['date'] == date;

/// The marks to send: the exceptions only (the gateway treats the list as the whole truth for the day: everyone else is present).
List<Map<String, dynamic>> marksToSend(Map<String, String> statuses, {Map<String, String> notes = const {}}) => [
      for (final e in statuses.entries)
        if (e.value != 'PRESENT') {'studentId': e.key, 'status': e.value, if (notes[e.key] != null && notes[e.key]!.isNotEmpty) 'note': notes[e.key]},
    ];

ClassDayView buildClassDay({
  required String classId,
  required String date,
  required List<Map<String, dynamic>> roster,
  required Map<String, dynamic>? day,
  required List<OutboxEntry> outbox,
  required Map<String, String>? draft,
}) {
  final mine = [for (final o in outbox) if (_isFor(o, classId, date)) o]..sort((a, b) => a.seq.compareTo(b.seq));
  final waiting = [for (final o in mine) if (o.state == OutboxState.queued || o.state == OutboxState.sending) o];
  final failed = [for (final o in mine) if (o.state == OutboxState.failed) o];
  final latestWaiting = waiting.isEmpty ? null : waiting.last;

  Map<String, String> fromMarks(List<dynamic> marks) => {for (final m in marks) (m as Map<String, dynamic>)['studentId'] as String: m['status'] as String};
  final pending = latestWaiting == null ? null : fromMarks(latestWaiting.body['marks'] as List<dynamic>? ?? const []);

  final students = <StudentRow>[
    for (final r in roster)
      StudentRow(
        id: r['id'] as String,
        name: r['name'] as String,
        enrollmentId: (r['enrollmentId'] as String?) ?? '',
        status: draft != null ? draft[r['id']] ?? 'PRESENT' : (pending != null ? pending[r['id']] ?? 'PRESENT' : (r['status'] as String? ?? 'PRESENT')),
      ),
  ]..sort((a, b) => a.name.compareTo(b.name));

  final locked = day?['locked'] == true;
  final taken = day?['submitted'] == true;
  final ClassDayState state;
  if (failed.isNotEmpty && waiting.isEmpty) {
    state = ClassDayState.failed;
  } else if (waiting.isNotEmpty) {
    state = ClassDayState.saved;
  } else if (locked) {
    state = ClassDayState.locked;
  } else if (taken) {
    state = ClassDayState.taken;
  } else {
    state = ClassDayState.todo;
  }

  // "Dirty" is the draft differing from what would otherwise be shown.
  var dirty = false;
  if (draft != null) {
    final base = {for (final r in roster) r['id'] as String: pending != null ? pending[r['id']] ?? 'PRESENT' : (r['status'] as String? ?? 'PRESENT')};
    dirty = [for (final r in roster) (draft[r['id']] ?? 'PRESENT') != base[r['id']]].any((x) => x);
  }

  return ClassDayView(
    classId: classId,
    date: date,
    state: state,
    students: students,
    dirty: dirty,
    refusal: failed.isEmpty ? null : failed.last.lastErrorCode,
    failedEntryId: failed.isEmpty ? null : failed.last.id,
    hasRoster: roster.isNotEmpty || day != null,
  );
}
