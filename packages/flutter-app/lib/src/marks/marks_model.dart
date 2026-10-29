import 'package:flutter_sync/flutter_sync.dart';

/// The gateway's rule for a mark, kept the same here so the phone refuses what the school would refuse: whole tenths, at most one decimal,
/// up to five digits (`^\d{1,5}(\.\d)?$`). Null means "not a mark".
int? parseTenths(String text) {
  final m = RegExp(r'^(\d{1,5})(?:\.(\d))?$').firstMatch(text.trim());
  if (m == null) return null;
  return int.parse(m.group(1)!) * 10 + int.parse(m.group(2) ?? '0');
}

/// 725 -> `72.5`, 720 -> `72`.
String formatTenths(int tenths) => tenths % 10 == 0 ? '${tenths ~/ 10}' : '${tenths ~/ 10}.${tenths % 10}';

enum MarkProblem { notAMark, aboveMaximum }

/// What one box says. Empty text is fine: it means "no mark" (cleared).
MarkProblem? checkMark(String text, int maxTenths) {
  if (text.trim().isEmpty) return null;
  final t = parseTenths(text);
  if (t == null) return MarkProblem.notAMark;
  return t > maxTenths ? MarkProblem.aboveMaximum : null;
}

/// What a student's box holds: the typed text and whether they were absent.
class MarkCell {
  const MarkCell({required this.text, required this.absent});
  final String text;
  final bool absent;

  /// The same mark, however it was typed (`40` and `40.0` are the same).
  bool sameAs(MarkCell o) => absent == o.absent && (absent || _norm(text) == _norm(o.text));

  static String _norm(String t) => parseTenths(t)?.toString() ?? t.trim();
}

class MarkRow {
  const MarkRow({required this.studentId, required this.name, required this.enrollmentId, required this.cell, required this.problem});
  final String studentId;
  final String name;
  final String enrollmentId;
  final MarkCell cell;
  final MarkProblem? problem;
}

enum ExamState {
  /// Nothing waiting; what the school has is shown.
  idle,

  /// Saved on this phone, not sent yet (or being sent).
  saved,

  /// The school refused what was sent.
  failed,
}

class ExamEntryView {
  const ExamEntryView({required this.examId, required this.maxTenths, required this.rows, required this.known, required this.dirty, required this.state, required this.refusal, required this.failedEntryId, required this.hasRoster});
  final String examId;
  final int maxTenths;
  final List<MarkRow> rows;

  /// What the school has for each student, with anything saved and not yet sent applied: the base a change is measured against.
  final Map<String, MarkCell> known;

  /// The teacher changed something since the last save.
  final bool dirty;
  final ExamState state;

  /// The gateway's message for a refusal, with its field problems (`... (entries: aboveMaximum)`).
  final String? refusal;
  final String? failedEntryId;
  final bool hasRoster;

  int get problems => rows.where((r) => r.problem != null).length;
  int get marked => rows.where((r) => r.cell.absent || r.cell.text.trim().isNotEmpty).length;
  bool get canSave => hasRoster && rows.isNotEmpty && problems == 0 && (dirty || state == ExamState.failed);
}

MarkCell _fromServer(Map<String, dynamic> r) {
  final absent = r['absent'] == true;
  final tenths = r['marksTenths'];
  return MarkCell(absent: absent, text: absent || tenths == null ? '' : formatTenths((tenths as num).toInt()));
}

/// Applies a saved (not yet sent) change on top of a base: only the students listed change (the gateway's rule).
Map<String, MarkCell> _apply(Map<String, MarkCell> base, List<dynamic> entries) {
  final out = {...base};
  for (final e in entries) {
    final m = e as Map<String, dynamic>;
    final id = m['studentId'] as String;
    out[id] = m['absent'] == true ? const MarkCell(text: '', absent: true) : MarkCell(text: (m['marks'] as String?) ?? '', absent: false);
  }
  return out;
}

bool _isFor(OutboxEntry o, String examId) => o.kind == 'marks.save' && o.body['examId'] == examId;

/// The exam screen, worked out from the phone only: the roster with the school's marks, what is waiting in the outbox applied on top, then
/// the draft the teacher is typing. Pure.
ExamEntryView buildExamEntry({
  required String examId,
  required int maxTenths,
  required List<Map<String, dynamic>> roster,
  required List<OutboxEntry> outbox,
  required Map<String, MarkCell>? draft,
}) {
  final mine = [for (final o in outbox) if (_isFor(o, examId)) o]..sort((a, b) => a.seq.compareTo(b.seq));
  final waiting = [for (final o in mine) if (o.state == OutboxState.queued || o.state == OutboxState.sending) o];
  final failed = [for (final o in mine) if (o.state == OutboxState.failed) o];

  var base = {for (final r in roster) r['studentId'] as String: _fromServer(r)};
  for (final o in waiting) {
    base = _apply(base, o.body['entries'] as List<dynamic>? ?? const []);
  }

  final rows = <MarkRow>[
    for (final r in roster)
      () {
        final id = r['studentId'] as String;
        final cell = draft?[id] ?? base[id]!;
        return MarkRow(studentId: id, name: r['name'] as String, enrollmentId: (r['enrollmentId'] as String?) ?? '', cell: cell, problem: cell.absent ? null : checkMark(cell.text, maxTenths));
      }(),
  ]..sort((a, b) => a.name.compareTo(b.name));

  final dirty = draft != null && roster.any((r) => !(draft[r['studentId']] ?? base[r['studentId']]!).sameAs(base[r['studentId']]!));
  final ExamState state = waiting.isNotEmpty ? ExamState.saved : (failed.isNotEmpty ? ExamState.failed : ExamState.idle);
  return ExamEntryView(
    examId: examId,
    maxTenths: maxTenths,
    rows: rows,
    known: base,
    dirty: dirty,
    state: state,
    refusal: failed.isEmpty ? null : (failed.last.lastErrorMessage ?? failed.last.lastErrorCode),
    failedEntryId: failed.isEmpty ? null : failed.last.id,
    hasRoster: roster.isNotEmpty,
  );
}

/// The entries to send: only students whose box differs from what is already known, as the gateway wants them (`marks`, `absent`, or neither to clear).
List<Map<String, dynamic>> entriesToSend(ExamEntryView v) => [
      for (final r in v.rows)
        if (!r.cell.sameAs(v.known[r.studentId] ?? const MarkCell(text: '', absent: false)))
          r.cell.absent
              ? {'studentId': r.studentId, 'absent': true}
              : r.cell.text.trim().isEmpty
                  ? {'studentId': r.studentId}
                  : {'studentId': r.studentId, 'marks': formatTenths(parseTenths(r.cell.text)!)},
    ];

/// What each exam row in the list says: how many students have a mark (the school's, with what is waiting applied).
({int marked, int total, ExamState state}) examProgress({required List<Map<String, dynamic>> roster, required List<OutboxEntry> outbox, required String examId}) {
  final v = buildExamEntry(examId: examId, maxTenths: 1 << 30, roster: roster, outbox: outbox, draft: null);
  return (marked: v.marked, total: v.rows.length, state: v.state);
}
