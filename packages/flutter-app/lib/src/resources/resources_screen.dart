import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'resources_data.dart';

String _problemText(OruStrings s, ResourceProblem p) => switch (p) {
      ResourceProblem.noClass => s.mobRsErrClass,
      ResourceProblem.noSubject => s.mobRsErrSubject,
      ResourceProblem.noTitle => s.mobRsErrTitle,
      ResourceProblem.noFile => s.mobRsErrFile,
      ResourceProblem.wrongType => s.mobRsErrType,
      ResourceProblem.tooBig => s.mobRsErrSize,
      ResourceProblem.offline => s.mobRsNeedsNet,
      ResourceProblem.notTeaching => s.mobRsNotTeaching,
      ResourceProblem.refused => s.mobRsRefused,
      ResourceProblem.uploadFailed => s.mobRsUploadFailed,
      ResourceProblem.none => '',
    };

/// Worksheets and workbooks for the classes she teaches: what she and her colleagues shared, Add, and Remove for her own. Reading works from the phone's copy; sharing and removing need a connection.
class OruResourcesScreen extends StatefulWidget {
  const OruResourcesScreen({super.key, required this.services, required this.userId, this.files = const PlatformFilePort(), this.uploader = const HttpUploadPort()});
  final OruServices services;
  final String userId;
  final FilePort files;
  final UploadPort uploader;

  @override
  State<OruResourcesScreen> createState() => _OruResourcesScreenState();
}

class _OruResourcesScreenState extends State<OruResourcesScreen> {
  late final ResourcesController _c = ResourcesController(widget.services.api, widget.services.store, userId: widget.userId, onChanged: widget.services.coordinator.syncNow)..uploader = widget.uploader;
  String? _confirming;
  bool _removed = false;

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
      appBar: AppBar(title: Text(s.mobRsTitle)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final items = _c.items;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                OruButton(
                  label: s.mobRsAdd,
                  variant: OruButtonVariant.primary,
                  block: true,
                  icon: OruIconName.plus,
                  onPressed: () async {
                    final shared = await Navigator.of(context).push<bool>(MaterialPageRoute<bool>(builder: (_) => OruResourceFormScreen(controller: _c, files: widget.files)));
                    if (shared == true && mounted) setState(() => _removed = false);
                  },
                ),
                const SizedBox(height: OruSpacing.space3),
                if (_c.problem != ResourceProblem.none) ...[
                  OruBanner(title: _problemText(s, _c.problem), tone: _c.problem == ResourceProblem.offline ? OruTone.warning : OruTone.danger, icon: _c.problem == ResourceProblem.offline ? OruIconName.cloudOff : OruIconName.alert),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (_removed) ...[OruBanner(title: s.mobRsRemoved, tone: OruTone.success, icon: OruIconName.checkCircle), const SizedBox(height: OruSpacing.space3)],
                if (items != null && items.isEmpty) OruEmptyState(title: s.mobRsTitle, description: s.mobRsNone, icon: OruIconName.book),
                for (final r in items ?? const <Map<String, dynamic>>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        OruListRow(
                          title: r['title'] as String,
                          subtitle: [(r['subject'] as Map<String, dynamic>)['name'] as String, (r['class'] as Map<String, dynamic>)['name'] as String, dateWords(context, r['createdAt'] as String)].join(' · '),
                          leading: const OruIcon(OruIconName.book, color: OruColors.primaryText),
                        ),
                        if (((r['note'] as String?) ?? '').isNotEmpty) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4), child: Text(r['note'] as String, style: text.bodyMedium)),
                        Padding(
                          padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4, top: OruSpacing.space1),
                          child: Text(_c.isMine(r) ? s.mobRsMine : s.mobRsBy((r['uploadedBy'] as Map<String, dynamic>)['name'] as String), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
                        ),
                        if (_c.isMine(r))
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: _confirming == r['id']
                                ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                                    OruBanner(title: s.mobRsRemoveQuestion(r['title'] as String), tone: OruTone.warning, icon: OruIconName.alert),
                                    const SizedBox(height: OruSpacing.space2),
                                    Row(children: [
                                      Expanded(
                                        child: OruButton(
                                          label: s.mobRsRemove,
                                          icon: OruIconName.x,
                                          onPressed: _c.busy
                                              ? null
                                              : () async {
                                                  final ok = await _c.remove(r['id'] as String);
                                                  if (!mounted) return;
                                                  setState(() {
                                                    _confirming = null;
                                                    _removed = ok;
                                                  });
                                                },
                                        ),
                                      ),
                                      const SizedBox(width: OruSpacing.space2),
                                      Expanded(child: OruButton(label: s.actionCancel, onPressed: () => setState(() => _confirming = null))),
                                    ]),
                                  ])
                                : OruButton(label: s.mobRsRemove, icon: OruIconName.x, onPressed: () => setState(() {
                                      _confirming = r['id'] as String;
                                      _removed = false;
                                      _c.clearProblem();
                                    })),
                          ),
                      ]),
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

/// The form: class, subject, title, a note, and the file. Sharing sends the file and needs a connection; nothing is queued.
class OruResourceFormScreen extends StatefulWidget {
  const OruResourceFormScreen({super.key, required this.controller, required this.files});
  final ResourcesController controller;
  final FilePort files;

  @override
  State<OruResourceFormScreen> createState() => _OruResourceFormScreenState();
}

class _OruResourceFormScreenState extends State<OruResourceFormScreen> {
  String? _classId;
  String? _subjectId;
  PickedFile? _file;
  final _title = TextEditingController();
  final _note = TextEditingController();
  ResourceProblem _local = ResourceProblem.none;

  @override
  void dispose() {
    _title.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _choose() async {
    final f = await widget.files.pick();
    if (f != null && mounted) setState(() => _file = f);
  }

  Future<void> _send() async {
    final c = widget.controller;
    final check = checkResource(classId: _classId, subjectId: _subjectId, title: _title.text, file: _file);
    if (check != ResourceProblem.none) {
      setState(() => _local = check);
      return;
    }
    setState(() => _local = ResourceProblem.none);
    final ok = await c.share(classId: _classId!, subjectId: _subjectId!, title: _title.text, note: _note.text, file: _file!);
    if (ok && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final c = widget.controller;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobRsFormTitle)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: c,
          builder: (context, _) {
            final problem = _local != ResourceProblem.none ? _local : c.problem;
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              OruBanner(title: s.mobRsNeedsNetHint, tone: OruTone.info, icon: OruIconName.cloud),
              const SizedBox(height: OruSpacing.space4),
              Text(s.mobRsClass, style: text.titleMedium),
              const SizedBox(height: OruSpacing.space2),
              for (final k in c.classes)
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: OruCard(child: OruCheckbox(label: k['name'] as String, value: _classId == k['id'], onChanged: (_) => setState(() => _classId = k['id'] as String))),
                ),
              if (problem == ResourceProblem.noClass) Text(s.mobRsErrClass, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
              const SizedBox(height: OruSpacing.space3),
              Text(s.mobRsSubject, style: text.titleMedium),
              const SizedBox(height: OruSpacing.space2),
              for (final k in c.subjects)
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: OruCard(child: OruCheckbox(label: k['name'] as String, value: _subjectId == k['id'], onChanged: (_) => setState(() => _subjectId = k['id'] as String))),
                ),
              if (problem == ResourceProblem.noSubject) Text(s.mobRsErrSubject, style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
              const SizedBox(height: OruSpacing.space3),
              OruTextField(label: s.mobRsTitleField, controller: _title, error: problem == ResourceProblem.noTitle ? s.mobRsErrTitle : null),
              const SizedBox(height: OruSpacing.space3),
              OruTextField(label: s.mobRsNote, controller: _note, multiline: true),
              const SizedBox(height: OruSpacing.space3),
              OruCard(
                child: OruListRow(
                  title: _file?.name ?? s.mobRsChoose,
                  subtitle: _file == null ? s.mobRsFileHint : null,
                  leading: const OruIcon(OruIconName.upload, color: OruColors.primaryText),
                  onPressed: c.busy ? null : _choose,
                ),
              ),
              if (problem == ResourceProblem.noFile || problem == ResourceProblem.wrongType || problem == ResourceProblem.tooBig) Text(_problemText(s, problem), style: text.bodySmall?.copyWith(color: OruColors.dangerFg)),
              const SizedBox(height: OruSpacing.space4),
              if (problem == ResourceProblem.offline || problem == ResourceProblem.notTeaching || problem == ResourceProblem.refused || problem == ResourceProblem.uploadFailed) ...[
                OruBanner(title: _problemText(s, problem), tone: problem == ResourceProblem.offline ? OruTone.warning : OruTone.danger, icon: problem == ResourceProblem.offline ? OruIconName.cloudOff : OruIconName.alert),
                const SizedBox(height: OruSpacing.space3),
              ],
              OruButton(label: c.busy ? s.mobRsSending : s.mobRsSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: c.busy ? null : _send),
            ]);
          },
        ),
      ),
    );
  }
}
