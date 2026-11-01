import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import 'comments_data.dart';

String _problemText(OruStrings s, CommentProblem p) => switch (p) {
      CommentProblem.needsNet => s.mobCmNeedsNet,
      CommentProblem.windowClosed => s.mobCmWindowClosed,
      CommentProblem.alreadyHidden => s.mobCmAlreadyHidden,
      CommentProblem.tooLong => s.mobCmTooLong,
      CommentProblem.empty => s.mobCmEmptyError,
      CommentProblem.refused => s.mobRsRefused,
      CommentProblem.none => '',
    };

/// The thread under one worksheet. Parents of the class, the teacher who shared it and the Academic admin read and write. Posting is saved on the phone and sent once; editing, deleting
/// and hiding need a connection. [canHide] is for the teacher and the Academic admin; [forParent] adds the note about what other families see.
class OruCommentsScreen extends StatefulWidget {
  const OruCommentsScreen({super.key, required this.services, required this.resourceId, required this.resourceTitle, this.canHide = false, this.forParent = false, this.now});
  final OruServices services;
  final String resourceId;
  final String resourceTitle;
  final bool canHide;
  final bool forParent;
  final DateTime Function()? now;

  @override
  State<OruCommentsScreen> createState() => _OruCommentsScreenState();
}

class _OruCommentsScreenState extends State<OruCommentsScreen> {
  late final CommentsController _c = CommentsController(widget.services.api, widget.services.store, resourceId: widget.resourceId, now: widget.now);
  final _box = TextEditingController();
  final _edit = TextEditingController();
  String? _replyTo;
  String? _editing;
  String? _hiding;

  @override
  void dispose() {
    _c.dispose();
    _box.dispose();
    _edit.dispose();
    super.dispose();
  }

  String _label(OruStrings s, CommentRow r) => r.kind == 'PARENT' ? s.mobCmParentOf(r.name) : r.name;

  Future<void> _send() async {
    final ok = await _c.post(_box.text, replyToId: _replyTo);
    if (ok && mounted) {
      setState(() {
        _box.clear();
        _replyTo = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(widget.resourceTitle)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            final thread = _c.thread;
            final byId = {for (final r in thread ?? const <CommentRow>[]) r.id: r};
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              Semantics(header: true, child: Text(s.mobCmTitle, style: text.titleLarge)),
              const SizedBox(height: OruSpacing.space3),
              if (_c.problem != CommentProblem.none && _c.problem != CommentProblem.tooLong && _c.problem != CommentProblem.empty) ...[
                OruBanner(title: _problemText(s, _c.problem), tone: _c.problem == CommentProblem.needsNet ? OruTone.warning : OruTone.danger, icon: _c.problem == CommentProblem.needsNet ? OruIconName.cloudOff : OruIconName.alert),
                const SizedBox(height: OruSpacing.space3),
              ],
              if (thread != null && thread.isEmpty) OruEmptyState(title: s.mobCmTitle, description: s.mobCmEmpty, icon: OruIconName.message),
              for (final r in thread ?? const <CommentRow>[])
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: OruCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if (r.pending)
                        Padding(
                          padding: const EdgeInsets.all(OruSpacing.space3),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(r.body ?? '', style: text.bodyMedium),
                            const SizedBox(height: OruSpacing.space2),
                            if (r.refusal == null) OruBanner(title: s.mobCmSaved, tone: OruTone.info, icon: OruIconName.cloudOff) else OruBanner(title: s.mobCmRefused, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.entryId!))),
                          ]),
                        )
                      else ...[
                        OruListRow(
                          title: _label(s, r),
                          subtitle: [
                            if (r.kind == 'TEACHER') s.mobCmTeacher,
                            if (r.kind == 'ADMIN') s.mobCmAdmin,
                            dateWords(context, r.createdAt),
                            if (r.edited) s.mobCmEdited,
                          ].join(' · '),
                          leading: OruIcon(r.kind == 'PARENT' ? OruIconName.users : OruIconName.message, color: OruColors.primaryText),
                        ),
                        if (r.replyToId != null && byId[r.replyToId] != null)
                          Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space4, end: OruSpacing.space4), child: Text(s.mobCmInReplyTo(_label(s, byId[r.replyToId]!)), style: text.bodySmall?.copyWith(color: OruColors.textMuted))),
                        if (_editing == r.id)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                              OruTextField(label: s.mobCmWrite, controller: _edit, multiline: true, error: _c.problem == CommentProblem.tooLong || _c.problem == CommentProblem.empty ? _problemText(s, _c.problem) : null),
                              const SizedBox(height: OruSpacing.space2),
                              Row(children: [
                                Expanded(
                                  child: OruButton(
                                    label: s.mobCmSave,
                                    variant: OruButtonVariant.primary,
                                    onPressed: _c.busy
                                        ? null
                                        : () async {
                                            final ok = await _c.edit(r.id, _edit.text);
                                            if (ok && mounted) setState(() => _editing = null);
                                          },
                                  ),
                                ),
                                const SizedBox(width: OruSpacing.space2),
                                Expanded(child: OruButton(label: s.actionCancel, onPressed: () => setState(() => _editing = null))),
                              ]),
                            ]),
                          )
                        else if (r.hidden && !widget.canHide)
                          Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: Text(s.mobCmHidden, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)))
                        else ...[
                          Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: Text(r.body ?? '', style: text.bodyMedium)),
                          if (r.hidden) Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space3, end: OruSpacing.space3, bottom: OruSpacing.space2), child: Text(s.mobCmHiddenStaff, style: text.bodySmall?.copyWith(color: OruColors.dangerFg))),
                        ],
                        if (_hiding == r.id)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                              OruBanner(title: s.mobCmHideQuestion, tone: OruTone.warning, icon: OruIconName.alert),
                              const SizedBox(height: OruSpacing.space2),
                              Row(children: [
                                Expanded(
                                  child: OruButton(
                                    label: s.mobCmHide,
                                    icon: OruIconName.x,
                                    onPressed: _c.busy
                                        ? null
                                        : () async {
                                            await _c.hide(r.id);
                                            if (mounted) setState(() => _hiding = null);
                                          },
                                  ),
                                ),
                                const SizedBox(width: OruSpacing.space2),
                                Expanded(child: OruButton(label: s.actionCancel, onPressed: () => setState(() => _hiding = null))),
                              ]),
                            ]),
                          )
                        else if (_editing != r.id)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: Wrap(spacing: OruSpacing.space2, runSpacing: OruSpacing.space2, children: [
                              if (r.replyToId == null && !r.hidden) OruButton(label: s.mobCmReply, onPressed: () => setState(() => _replyTo = r.id)),
                              if (r.canChange)
                                OruButton(
                                  label: s.mobCmEdit,
                                  onPressed: () => setState(() {
                                    _editing = r.id;
                                    _edit.text = r.body ?? '';
                                    _c.problem = CommentProblem.none;
                                  }),
                                ),
                              if (r.canChange) OruButton(label: s.mobCmDelete, icon: OruIconName.x, onPressed: _c.busy ? null : () => _c.remove(r.id)),
                              if (widget.canHide && !r.mine && !r.hidden) OruButton(label: s.mobCmHide, icon: OruIconName.x, onPressed: () => setState(() => _hiding = r.id)),
                            ]),
                          ),
                      ],
                    ]),
                  ),
                ),
              const SizedBox(height: OruSpacing.space3),
              if (_replyTo != null && byId[_replyTo] != null) ...[
                OruBanner(title: s.mobCmReplyingTo(_label(s, byId[_replyTo]!)), tone: OruTone.info, icon: OruIconName.message, action: OruButton(label: s.actionCancel, onPressed: () => setState(() => _replyTo = null))),
                const SizedBox(height: OruSpacing.space2),
              ],
              OruTextField(label: s.mobCmWrite, controller: _box, multiline: true, onChanged: (_) => setState(() {}), error: _editing == null && (_c.problem == CommentProblem.tooLong || _c.problem == CommentProblem.empty) ? _problemText(s, _c.problem) : null),
              Padding(padding: const EdgeInsets.symmetric(vertical: OruSpacing.space1), child: Text(s.mobCmCounter('${_box.text.trim().length}'), style: text.bodySmall?.copyWith(color: OruColors.textMuted))),
              if (widget.forParent) Padding(padding: const EdgeInsets.only(bottom: OruSpacing.space2), child: Text(s.mobCmPrivacy, style: text.bodySmall)),
              OruButton(label: s.mobCmSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: _send),
            ]);
          },
        ),
      ),
    );
  }
}
