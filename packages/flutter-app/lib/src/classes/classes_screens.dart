import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart';
import 'classes_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

/// "My classes": every class she teaches, with how many students it has. Read only.
class OruClassesScreen extends StatelessWidget {
  const OruClassesScreen({super.key, required this.services});
  final OruServices services;

  Future<List<({Map<String, dynamic> cls, int? count})>> _load() async {
    final out = <({Map<String, dynamic> cls, int? count})>[];
    for (final c in await services.store.records(kMyClass)) {
      out.add((cls: c, count: c['classTeacher'] == true ? (await services.store.records(kClassStudent, parentId: c['id'] as String)).length : null));
    }
    out.sort((a, b) => (a.cls['name'] as String).compareTo(b.cls['name'] as String));
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.mobMoreClasses)),
      body: SafeArea(
        child: StreamBuilder<List<Map<String, dynamic>>>(
          stream: services.store.watchRecords(kMyClass),
          builder: (context, _) => FutureBuilder(
            future: _load(),
            builder: (context, snap) {
              final items = snap.data;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: services),
                const SizedBox(height: OruSpacing.space4),
                if (items == null)
                  const SizedBox.shrink()
                else if (items.isEmpty)
                  OruEmptyState(title: s.mobMoreClasses, description: s.mobClsEmpty, icon: OruIconName.users)
                else
                  for (final i in items)
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: OruListRow(
                          title: i.cls['name'] as String,
                          subtitle: i.count == null ? null : s.mobClsStudents(i.count!),
                          leading: const OruIcon(OruIconName.users, color: OruColors.primaryText),
                          onPressed: i.count == null ? null : () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruClassScreen(services: services, cls: i.cls))),
                        ),
                      ),
                    ),
              ]);
            },
          ),
        ),
      ),
    );
  }
}

/// The students of one class. Tapping one opens the report card.
class OruClassScreen extends StatelessWidget {
  const OruClassScreen({super.key, required this.services, required this.cls});
  final OruServices services;
  final Map<String, dynamic> cls;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_isolate(cls['name'] as String))),
      body: SafeArea(
        child: StreamBuilder<List<Map<String, dynamic>>>(
          stream: services.store.watchRecords(kClassStudent, parentId: cls['id'] as String),
          builder: (context, snap) {
            final items = [...?snap.data]..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              Text(s.mobClsStudents(items.length), style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: OruSpacing.space2),
              for (final st in items)
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: OruCard(
                    child: OruListRow(
                      title: st['name'] as String,
                      subtitle: _isolate(st['enrollmentId'] as String),
                      leading: OruAvatar(name: st['name'] as String),
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruReportCardScreen(services: services, student: st))),
                    ),
                  ),
                ),
            ]);
          },
        ),
      ),
    );
  }
}

/// A student's report card for a term. Read only; loads when connected and keeps what it has seen.
class OruReportCardScreen extends StatefulWidget {
  const OruReportCardScreen({super.key, required this.services, required this.student});
  final OruServices services;
  final Map<String, dynamic> student;

  @override
  State<OruReportCardScreen> createState() => _OruReportCardScreenState();
}

class _OruReportCardScreenState extends State<OruReportCardScreen> {
  late final ReportCardController _c = ReportCardController(widget.services.api, widget.services.store, studentId: widget.student['id'] as String);

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
      appBar: AppBar(title: Text(s.mobClsReport)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            final card = _c.card;
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              Text(widget.student['name'] as String, style: text.titleLarge),
              const SizedBox(height: OruSpacing.space3),
              if (_c.terms.length > 1)
                OruSegmentedControl(
                  label: s.mobClsTerm,
                  value: _c.termId ?? '',
                  options: [for (final t in _c.terms.take(4)) OruSegment(value: t['id'] as String, label: t['name'] as String)],
                  onChanged: _c.choose,
                )
              else if (_c.terms.length == 1)
                Text(_c.terms.first['name'] as String, style: text.titleMedium),
              const SizedBox(height: OruSpacing.space3),
              if (card == null)
                OruBanner(title: s.mobClsReport, message: s.mobClsNoCard, icon: OruIconName.cloudOff)
              else ...[
                if (_c.offline) OruBanner(title: s.mobClsReport, message: s.mobClsNoCard, icon: OruIconName.cloudOff),
                for (final l in (card['subjects'] as List<dynamic>).cast<Map<String, dynamic>>())
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: (l['subject'] as Map<String, dynamic>)['name'] as String,
                        subtitle: s.mobClsMarksLine(_isolate(l['marks'] as String), _isolate(l['maxMarks'] as String)),
                        trailing: l['grade'] == null ? null : Text(s.mobClsGrade(l['grade'] as String), style: text.bodyMedium),
                      ),
                    ),
                  ),
                const SizedBox(height: OruSpacing.space2),
                Text(s.mobClsTotal(_isolate(card['totalMarks'] as String), _isolate(card['percent'] as String)), style: text.titleMedium),
                if (card['grade'] != null) Text(s.mobClsGrade(card['grade'] as String), style: text.bodyMedium),
                if (((card['pending'] as num?) ?? 0) > 0) Text(s.mobClsPending((card['pending'] as num).toInt()), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
              ],
            ]);
          },
        ),
      ),
    );
  }
}
