import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services.dart';
import '../sync_pill.dart';
import 'marks_data.dart';
import 'marks_model.dart';

String _isolate(String text) => '\u2066$text\u2069';

String _dateWords(BuildContext context, String iso) {
  try {
    return DateFormat.yMMMd(Localizations.localeOf(context).toString()).format(DateTime.parse(iso));
  } catch (_) {
    return iso;
  }
}

String _problemText(OruStrings s, MarkProblem p, int maxTenths) => p == MarkProblem.aboveMaximum ? s.mobMarksErrAbove(formatTenths(maxTenths)) : s.mobMarksErrFormat;

/// The exams she may enter marks for, with how far each is marked.
class OruMarksListScreen extends StatefulWidget {
  const OruMarksListScreen({super.key, required this.services});
  final OruServices services;

  @override
  State<OruMarksListScreen> createState() => _OruMarksListScreenState();
}

class _OruMarksListScreenState extends State<OruMarksListScreen> {
  late final ExamListController _c = ExamListController(widget.services.store);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final items = _c.items;
              return ListView(
                padding: const EdgeInsets.all(OruSpacing.space4),
                children: [
                  Semantics(header: true, child: Text(s.mobTabMarks, style: text.titleLarge)),
                  const SizedBox(height: OruSpacing.space3),
                  OruSyncPill(services: widget.services),
                  const SizedBox(height: OruSpacing.space4),
                  if (items == null)
                    const SizedBox.shrink()
                  else if (items.isEmpty)
                    OruEmptyState(title: s.mobTabMarks, description: s.mobMarksNoExams, icon: OruIconName.book)
                  else ...[
                    Text(s.mobMarksExamsTitle, style: text.titleMedium),
                    const SizedBox(height: OruSpacing.space2),
                    for (final i in items)
                      Padding(
                        padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                        child: OruCard(
                          child: OruListRow(
                            title: i.exam['title'] as String,
                            subtitle: '${s.mobMarksExamLine(_isolate((i.exam['class'] as Map<String, dynamic>)['name'] as String), (i.exam['subject'] as Map<String, dynamic>)['name'] as String)} · ${_dateWords(context, i.exam['examDate'] as String)}',
                            leading: OruIcon(i.state == ExamState.saved ? OruIconName.device : (i.state == ExamState.failed ? OruIconName.alert : OruIconName.book), color: i.state == ExamState.failed ? OruColors.dangerFg : OruColors.primaryText),
                            trailing: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
                              Text(s.mobMarksProgress('${i.marked}', '${i.total}'), style: text.bodySmall),
                              Text(s.mobMarksOutOf(i.exam['maxMarks'] as String), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
                            ]),
                            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruMarksScreen(services: widget.services, exam: i.exam))),
                          ),
                        ),
                      ),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Fast entry: one box per student, in tenths, with Absent beside it. Wrong marks show their error at once and block Save; Save is instant.
class OruMarksScreen extends StatefulWidget {
  const OruMarksScreen({super.key, required this.services, required this.exam});
  final OruServices services;
  final Map<String, dynamic> exam;

  @override
  State<OruMarksScreen> createState() => _OruMarksScreenState();
}

class _OruMarksScreenState extends State<OruMarksScreen> {
  late final MarksController _c = MarksController(widget.services.store, examId: widget.exam['id'] as String, maxTenths: (widget.exam['maxTenths'] as num).toInt());
  final _fields = <String, TextEditingController>{};
  final _focus = <String, FocusNode>{};
  final _lastTyped = <String, String>{};

  @override
  void dispose() {
    for (final f in _fields.values) {
      f.dispose();
    }
    for (final n in _focus.values) {
      n.dispose();
    }
    _c.dispose();
    super.dispose();
  }

  bool _syncing = false;

  TextEditingController _field(MarkRow r) {
    var created = false;
    final c = _fields.putIfAbsent(r.studentId, () {
      created = true;
      return TextEditingController(text: r.cell.text);
    });
    // The text is read from the box itself, not from a change callback: it is the one thing every way of typing (the keyboard, paste,
    // a test driver) has in common.
    if (created) {
      c.addListener(() {
        if (_syncing) return;
        _lastTyped[r.studentId] = c.text;
        _c.setText(r.studentId, c.text);
      });
    }
    // The box follows the data when it changes from outside (a draft loaded, Absent switched on), but never overwrites what was just typed
    // while that is still on its way into the draft.
    if (c.text != r.cell.text && c.text != _lastTyped[r.studentId]) {
      _syncing = true;
      c.text = r.cell.text;
      _syncing = false;
    }
    return c;
  }

  FocusNode _node(String studentId) => _focus.putIfAbsent(studentId, FocusNode.new);

  Future<void> _save() async {
    await _c.save();
    widget.services.coordinator.syncNow();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final max = formatTenths((widget.exam['maxTenths'] as num).toInt());
    return Scaffold(
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            final v = _c.view;
            return Column(children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(OruSpacing.space4),
                  children: [
                    Align(alignment: AlignmentDirectional.centerStart, child: OruLinkAction(label: s.actionBack, onPressed: () => Navigator.of(context).pop())),
                    Semantics(header: true, child: Text(widget.exam['title'] as String, style: text.titleLarge)),
                    Text('${s.mobMarksExamLine(_isolate((widget.exam['class'] as Map<String, dynamic>)['name'] as String), (widget.exam['subject'] as Map<String, dynamic>)['name'] as String)} · ${s.mobMarksOutOf(max)}', style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                    const SizedBox(height: OruSpacing.space3),
                    OruSyncPill(services: widget.services),
                    const SizedBox(height: OruSpacing.space3),
                    if (v != null) ..._banners(s, v),
                    if (v == null) const SizedBox.shrink() else if (!v.hasRoster) OruEmptyState(title: s.mobTabMarks, description: s.mobMarksNotLoaded, icon: OruIconName.cloudOff) else ...[
                      if (v.problems > 0) Padding(padding: const EdgeInsets.only(bottom: OruSpacing.space2), child: Text(s.mobMarksErrors(v.problems), style: text.titleSmall?.copyWith(color: OruColors.dangerFg))),
                      OruCard(
                        child: Column(children: [
                          for (final r in v.rows)
                            Padding(
                              padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space4, vertical: OruSpacing.space2),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(r.name, style: text.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
                                if (r.enrollmentId.isNotEmpty) Text(r.enrollmentId, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                                const SizedBox(height: OruSpacing.space2),
                                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  SizedBox(
                                    width: 132,
                                    child: OruTextField(
                                      semanticLabel: s.mobMarksFieldLabel(r.name),
                                      controller: _field(r),
                                      focusNode: _node(r.studentId),
                                      enabled: !r.cell.absent,
                                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                      textDirection: TextDirection.ltr,
                                      error: r.problem == null ? null : _problemText(s, r.problem!, v.maxTenths),
                                    ),
                                  ),
                                  const SizedBox(width: OruSpacing.space3),
                                  Expanded(
                                    child: OruCheckbox(label: s.mobMarksAbsent, value: r.cell.absent, onChanged: (a) {
                                      _syncing = true;
                                      _fields[r.studentId]?.text = '';
                                      _lastTyped.remove(r.studentId);
                                      _syncing = false;
                                      _c.setAbsent(r.studentId, a);
                                    }),
                                  ),
                                ]),
                              ]),
                            ),
                        ]),
                      ),
                    ],
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(OruSpacing.space4),
                child: OruButton(label: s.mobMarksSave, variant: OruButtonVariant.primary, block: true, icon: OruIconName.check, onPressed: v != null && v.canSave ? _save : null),
              ),
            ]);
          },
        ),
      ),
    );
  }

  List<Widget> _banners(OruStrings s, ExamEntryView v) {
    const gap = SizedBox(height: OruSpacing.space3);
    return switch (v.state) {
      ExamState.saved => [OruBanner(title: s.mobAttSavedNotSent, tone: OruTone.info, icon: OruIconName.device), gap],
      ExamState.failed => [
          OruBanner(
            title: s.mobMarksRefused,
            message: (v.refusal ?? '').contains('aboveMaximum') ? s.mobMarksRefusedAbove : ((v.refusal ?? '').contains('examChanged') ? s.mobMarksRefusedChanged : null),
            tone: OruTone.danger,
            action: OruButton(label: s.actionDismiss, onPressed: _c.dismissRefusal),
          ),
          gap,
        ],
      _ => const [],
    };
  }
}
