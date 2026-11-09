import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../parent/parent_data.dart' show kChild;
import '../services.dart';
import '../sync_pill.dart';
import '../today/today_data.dart' show kClassStudent, kTeachingClass;
import 'messaging_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

String _problemText(OruStrings s, MessageProblem p) => switch (p) {
      MessageProblem.needsNet => s.mobMsNeedsNet,
      MessageProblem.empty => s.mobMsEmptyError,
      MessageProblem.tooLong => s.mobMsTooLong,
      MessageProblem.refused => s.mobRsRefused,
      MessageProblem.none => '',
    };

/// The label under a person's name in the list of people a message can go to.
String _contactLabel(OruStrings s, ContactDto c) => switch (c.label) {
      'CLASS_TEACHER' => s.mobMsClassTeacher,
      'TEACHER' => c.subjects.isEmpty ? s.mobCmTeacher : s.mobMsSubjectTeacher(c.subjects.join(', ')),
      'MOTHER' => s.mobMsMother,
      'FATHER' => s.mobMsFather,
      'GUARDIAN' => s.mobMsGuardian,
      _ => s.mobMsParent,
    };

/// The conversations of a teacher or a parent, newest first, from the phone's copy. "New message" needs the school (it asks who may be written to).
class OruMessagesScreen extends StatefulWidget {
  const OruMessagesScreen({super.key, required this.services, required this.forParent});
  final OruServices services;
  final bool forParent;

  @override
  State<OruMessagesScreen> createState() => _OruMessagesScreenState();
}

class _OruMessagesScreenState extends State<OruMessagesScreen> {
  late final ThreadsController _c = ThreadsController(widget.services.store);

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
      appBar: AppBar(title: Text(s.mobMsTitle)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final threads = _c.threads;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobMsTitle, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                OruButton(
                  label: s.mobMsNew,
                  icon: OruIconName.plus,
                  variant: OruButtonVariant.primary,
                  block: true,
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruNewMessageScreen(services: widget.services, forParent: widget.forParent))),
                ),
                const SizedBox(height: OruSpacing.space3),
                if (threads != null && threads.isEmpty) OruEmptyState(title: s.mobMsTitle, description: s.mobMsEmpty, icon: OruIconName.message),
                for (final t in threads ?? const <ThreadRow>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: _isolate(t.otherName),
                        subtitle: [s.mobMsAbout(_isolate(t.student)), if (t.lastMessageAt != null) dateWords(context, t.lastMessageAt!)].join(' · '),
                        leading: const OruIcon(OruIconName.message, color: OruColors.primaryText),
                        trailing: t.unread ? OruBadge(label: s.mobMsUnread, tone: OruTone.info) : null,
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruConversationScreen(services: widget.services, thread: t))),
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

/// Who to write to: first the student, then the people the school allows for that student (a parent sees the child's teachers; a teacher sees the parents of a student in her class).
class OruNewMessageScreen extends StatefulWidget {
  const OruNewMessageScreen({super.key, required this.services, required this.forParent, this.studentId});
  final OruServices services;
  final bool forParent;

  /// Already chosen (a reply to a class message): skips the first step.
  final String? studentId;

  @override
  State<OruNewMessageScreen> createState() => _OruNewMessageScreenState();
}

class _OruNewMessageScreenState extends State<OruNewMessageScreen> {
  late final NewMessageController _c = NewMessageController(widget.services.api, widget.services.store);
  late final Future<List<({String id, String name, String group})>> _students = _load();
  String? _student;

  @override
  void initState() {
    super.initState();
    _student = widget.studentId;
    if (_student != null) _c.choose(_student!);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<List<({String id, String name, String group})>> _load() async {
    final store = widget.services.store;
    if (widget.forParent) {
      return [for (final c in await store.records(kChild)) (id: c['id'] as String, name: c['name'] as String, group: ((c['class'] as Map<String, dynamic>?)?['name'] as String?) ?? '')];
    }
    final out = <({String id, String name, String group})>[];
    for (final cls in await store.records(kTeachingClass)) {
      for (final st in await store.records(kClassStudent, parentId: cls['id'] as String)) {
        out.add((id: st['id'] as String, name: st['name'] as String, group: cls['name'] as String));
      }
    }
    out.sort((a, b) => a.group == b.group ? a.name.compareTo(b.name) : a.group.compareTo(b.group));
    return out;
  }

  Future<void> _start(ContactDto c) async {
    final id = await _c.start(_student!, c.userId);
    if (id == null || !mounted) return;
    final t = (await widget.services.store.record(kThread, id))!;
    if (!mounted) return;
    final row = buildThreads(threads: [t], outbox: const []).first;
    await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => OruConversationScreen(services: widget.services, thread: row)));
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobMsNew)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            if (_c.problem != MessageProblem.none) ...[
              OruBanner(title: _problemText(s, _c.problem), tone: _c.problem == MessageProblem.needsNet ? OruTone.warning : OruTone.danger, icon: _c.problem == MessageProblem.needsNet ? OruIconName.cloudOff : OruIconName.alert),
              const SizedBox(height: OruSpacing.space3),
            ],
            if (_student == null) ...[
              Semantics(header: true, child: Text(s.mobMsPickStudent, style: text.titleMedium)),
              const SizedBox(height: OruSpacing.space2),
              FutureBuilder(
                future: _students,
                builder: (context, snap) => Column(children: [
                  for (final st in snap.data ?? const <({String id, String name, String group})>[])
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: OruListRow(
                          title: _isolate(st.name),
                          subtitle: st.group.isEmpty ? null : _isolate(st.group),
                          leading: const OruIcon(OruIconName.users, color: OruColors.primaryText),
                          onPressed: () {
                            setState(() => _student = st.id);
                            _c.choose(st.id);
                          },
                        ),
                      ),
                    ),
                ]),
              ),
            ] else ...[
              Semantics(header: true, child: Text(s.mobMsPickPerson, style: text.titleMedium)),
              const SizedBox(height: OruSpacing.space2),
              if (_c.contacts != null && _c.contacts!.isEmpty) OruEmptyState(title: s.mobMsPickPerson, description: s.mobMsNoContacts, icon: OruIconName.users),
              for (final c in _c.contacts ?? const <ContactDto>[])
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: OruCard(
                    child: OruListRow(
                      title: _isolate(c.name),
                      subtitle: _contactLabel(s, c),
                      leading: const OruIcon(OruIconName.message, color: OruColors.primaryText),
                      onPressed: _c.busy ? null : () => _start(c),
                    ),
                  ),
                ),
            ],
          ]),
        ),
      ),
    );
  }
}

/// One conversation: the words, a box to write in, and Hide (your own, soon after) or Report (theirs). Writing is saved on the phone and sent once.
class OruConversationScreen extends StatefulWidget {
  const OruConversationScreen({super.key, required this.services, required this.thread});
  final OruServices services;
  final ThreadRow thread;

  @override
  State<OruConversationScreen> createState() => _OruConversationScreenState();
}

class _OruConversationScreenState extends State<OruConversationScreen> {
  late final ConversationController _c = ConversationController(widget.services.api, widget.services.store, threadId: widget.thread.id);
  final _box = TextEditingController();
  final _note = TextEditingController();
  String? _hiding;
  String? _reporting;

  @override
  void dispose() {
    _c.dispose();
    _box.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (await _c.send(_box.text) && mounted) setState(_box.clear);
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(_isolate(widget.thread.otherName))),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: _c,
          builder: (context, _) {
            final rows = _c.rows;
            final formError = _c.problem == MessageProblem.empty || _c.problem == MessageProblem.tooLong;
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              Semantics(header: true, child: Text(s.mobMsAbout(_isolate(widget.thread.student)), style: text.titleMedium)),
              const SizedBox(height: OruSpacing.space3),
              if (_c.problem != MessageProblem.none && !formError) ...[
                OruBanner(title: _problemText(s, _c.problem), tone: _c.problem == MessageProblem.needsNet ? OruTone.warning : OruTone.danger, icon: _c.problem == MessageProblem.needsNet ? OruIconName.cloudOff : OruIconName.alert),
                const SizedBox(height: OruSpacing.space3),
              ],
              if (_c.reported) ...[
                OruBanner(title: s.mobMsReported, tone: OruTone.success, icon: OruIconName.checkCircle),
                const SizedBox(height: OruSpacing.space3),
              ],
              if (rows != null && rows.isEmpty) OruEmptyState(title: s.mobMsTitle, description: s.mobMsEmpty, icon: OruIconName.message),
              for (final r in rows ?? const <MessageRow>[])
                Padding(
                  padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                  child: Align(
                    alignment: r.mine ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.85),
                      child: OruCard(
                        child: Padding(
                          padding: const EdgeInsets.all(OruSpacing.space3),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(r.hidden ? s.mobMsHidden : (r.body ?? ''), style: text.bodyMedium?.copyWith(color: r.hidden ? OruColors.textMuted : null)),
                            if (r.createdAt.isNotEmpty) Text(dateWords(context, r.createdAt), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
                            if (r.pending && r.refusal == null) ...[const SizedBox(height: OruSpacing.space2), OruBanner(title: s.mobMsSaved, tone: OruTone.info, icon: OruIconName.cloudOff)],
                            if (r.pending && r.refusal != null) ...[
                              const SizedBox(height: OruSpacing.space2),
                              OruBanner(title: s.mobMsRefused, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.entryId!))),
                            ],
                            if (!r.pending && !r.hidden && _hiding == r.id) ...[
                              const SizedBox(height: OruSpacing.space2),
                              OruBanner(title: s.mobMsHideQuestion, tone: OruTone.warning, icon: OruIconName.alert),
                              const SizedBox(height: OruSpacing.space2),
                              Row(children: [
                                Expanded(
                                  child: OruButton(
                                    label: s.mobMsHide,
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
                            ] else if (!r.pending && !r.hidden && _reporting == r.id) ...[
                              const SizedBox(height: OruSpacing.space2),
                              OruBanner(title: s.mobMsReportQuestion, tone: OruTone.warning, icon: OruIconName.alert),
                              const SizedBox(height: OruSpacing.space2),
                              OruTextField(label: s.mobMsReportNote, controller: _note, multiline: true),
                              const SizedBox(height: OruSpacing.space2),
                              Row(children: [
                                Expanded(
                                  child: OruButton(
                                    label: s.mobMsReport,
                                    icon: OruIconName.alert,
                                    onPressed: _c.busy
                                        ? null
                                        : () async {
                                            final ok = await _c.report(r.id, _note.text);
                                            if (ok && mounted) {
                                              setState(() {
                                                _reporting = null;
                                                _note.clear();
                                              });
                                            }
                                          },
                                  ),
                                ),
                                const SizedBox(width: OruSpacing.space2),
                                Expanded(child: OruButton(label: s.actionCancel, onPressed: () => setState(() => _reporting = null))),
                              ]),
                            ] else if (!r.pending && !r.hidden && (r.canHide || !r.mine))
                              Padding(
                                padding: const EdgeInsets.only(top: OruSpacing.space2),
                                child: r.canHide
                                    ? OruButton(label: s.mobMsHide, icon: OruIconName.x, onPressed: () => setState(() => _hiding = r.id))
                                    : OruButton(label: s.mobMsReport, icon: OruIconName.alert, onPressed: () => setState(() => _reporting = r.id)),
                              ),
                          ]),
                        ),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: OruSpacing.space3),
              OruTextField(label: s.mobMsWrite, controller: _box, multiline: true, onChanged: (_) => setState(() {}), error: formError ? _problemText(s, _c.problem) : null),
              Padding(padding: const EdgeInsets.symmetric(vertical: OruSpacing.space1), child: Text(s.mobMsCounter('${_box.text.trim().length}'), style: text.bodySmall?.copyWith(color: OruColors.textMuted))),
              OruButton(label: s.mobMsSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: _send),
            ]);
          },
        ),
      ),
    );
  }
}

/// Class messages. A parent reads what was sent for their children's classes (opening one tells the school) and can reply privately; a teacher sees her own with who was reached,
/// and "Send to the whole class".
class OruBroadcastsScreen extends StatefulWidget {
  const OruBroadcastsScreen({super.key, required this.services, required this.forParent});
  final OruServices services;
  final bool forParent;

  @override
  State<OruBroadcastsScreen> createState() => _OruBroadcastsScreenState();
}

class _OruBroadcastsScreenState extends State<OruBroadcastsScreen> {
  late final BroadcastsController _c = BroadcastsController(widget.services.store);
  String? _open;

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
      appBar: AppBar(title: Text(s.mobBcTitle)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final rows = _c.rows;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobBcTitle, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space3),
                if (!widget.forParent) ...[
                  OruButton(
                    label: s.mobBcSendToClass,
                    icon: OruIconName.send,
                    variant: OruButtonVariant.primary,
                    block: true,
                    onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruBroadcastComposeScreen(services: widget.services, controller: _c))),
                  ),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (rows != null && rows.isEmpty) OruEmptyState(title: s.mobBcTitle, description: widget.forParent ? s.mobBcEmptyParent : s.mobBcEmpty, icon: OruIconName.message),
                for (final r in rows ?? const <BroadcastRow>[])
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        OruListRow(
                          title: r.title,
                          subtitle: [_isolate(r.className), if (r.sentAt.isNotEmpty) dateWords(context, r.sentAt)].where((x) => x.isNotEmpty).join(' · '),
                          leading: const OruIcon(OruIconName.message, color: OruColors.primaryText),
                          trailing: r.unread ? OruBadge(label: s.mobMsUnread, tone: OruTone.info) : null,
                          onPressed: r.pending
                              ? null
                              : () {
                                  setState(() => _open = _open == r.id ? null : r.id);
                                  if (widget.forParent) _c.opened(r);
                                },
                        ),
                        if (r.pending || _open == r.id)
                          Padding(
                            padding: const EdgeInsets.all(OruSpacing.space3),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(r.body, style: text.bodyMedium),
                              if (r.students.isNotEmpty) ...[
                                const SizedBox(height: OruSpacing.space2),
                                Text(s.mobBcFor(r.students.map((x) => _isolate(x.name)).join(', ')), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
                              ],
                              if (r.pending && r.refusal == null) ...[const SizedBox(height: OruSpacing.space2), OruBanner(title: s.mobMsSaved, tone: OruTone.info, icon: OruIconName.cloudOff)],
                              if (r.pending && r.refusal != null) ...[
                                const SizedBox(height: OruSpacing.space2),
                                OruBanner(title: s.mobMsRefused, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: () => _c.dismiss(r.entryId!))),
                              ],
                              if (!widget.forParent && !r.pending) ..._stats(s, text, r),
                              if (widget.forParent && r.students.isNotEmpty) ...[
                                const SizedBox(height: OruSpacing.space3),
                                OruButton(
                                  label: s.mobBcReply,
                                  icon: OruIconName.message,
                                  onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruNewMessageScreen(services: widget.services, forParent: true, studentId: r.students.first.id))),
                                ),
                              ],
                            ]),
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

  List<Widget> _stats(OruStrings s, TextTheme text, BroadcastRow r) {
    final st = r.stats;
    if (st == null) return [const SizedBox(height: OruSpacing.space2), OruBanner(title: s.mobBcNoStats, tone: OruTone.info, icon: OruIconName.cloudOff)];
    final missing = (st['unreachable'] as List<dynamic>).cast<Map<String, dynamic>>();
    return [
      const SizedBox(height: OruSpacing.space3),
      Text(s.mobBcReached('${st['reachedStudents']}', '${st['targetStudents']}'), style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
      Text(s.mobBcRead('${st['readBy']}', '${st['parents']}'), style: text.bodyMedium),
      const SizedBox(height: OruSpacing.space2),
      if (missing.isEmpty)
        Text(s.mobBcAllReached, style: text.bodyMedium)
      else ...[
        Text(s.mobBcNotReached, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
        for (final m in missing) Text(_isolate(m['name'] as String), style: text.bodyMedium),
      ],
    ];
  }
}

/// The form for a message to every parent of one class. Only the classes she is class teacher of are offered. Saved on the phone and sent once; the counts arrive with the next sync.
class OruBroadcastComposeScreen extends StatefulWidget {
  const OruBroadcastComposeScreen({super.key, required this.services, required this.controller});
  final OruServices services;
  final BroadcastsController controller;

  @override
  State<OruBroadcastComposeScreen> createState() => _OruBroadcastComposeScreenState();
}

class _OruBroadcastComposeScreenState extends State<OruBroadcastComposeScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  late final Future<List<Map<String, dynamic>>> _classes = widget.services.store.records(kTeachingClass);
  String? _class;
  MessageProblem _titleProblem = MessageProblem.none;
  MessageProblem _bodyProblem = MessageProblem.none;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final t = checkText(_title.text, broadcastTitleMax);
    final b = checkText(_body.text, broadcastBodyMax);
    setState(() {
      _titleProblem = t;
      _bodyProblem = b;
    });
    if (t != MessageProblem.none || b != MessageProblem.none || _class == null) return;
    await widget.controller.send(classId: _class!, title: _title.text, body: _body.text);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobBcSendToClass)),
      body: SafeArea(
        child: FutureBuilder(
          future: _classes,
          builder: (context, snap) {
            final classes = [...?snap.data]..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
            if (snap.hasData && classes.length == 1) _class ??= classes.first['id'] as String;
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              if (snap.hasData && classes.isEmpty) OruBanner(title: s.mobBcNoClass, tone: OruTone.warning, icon: OruIconName.alert),
              if (classes.length > 1) ...[
                Semantics(header: true, child: Text(s.mobBcClass, style: text.titleMedium)),
                const SizedBox(height: OruSpacing.space2),
                for (final c in classes)
                  Padding(
                    padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                    child: OruCard(
                      child: OruListRow(
                        title: _isolate(c['name'] as String),
                        leading: OruIcon(_class == c['id'] ? OruIconName.checkCircle : OruIconName.users, color: OruColors.primaryText),
                        onPressed: () => setState(() => _class = c['id'] as String),
                      ),
                    ),
                  ),
                const SizedBox(height: OruSpacing.space2),
              ] else if (classes.length == 1) ...[
                Text(_isolate(classes.first['name'] as String), style: text.titleMedium),
                const SizedBox(height: OruSpacing.space3),
              ],
              OruTextField(label: s.mobBcTitleField, controller: _title, error: _titleProblem == MessageProblem.none ? null : s.mobBcTitleError),
              const SizedBox(height: OruSpacing.space3),
              OruTextField(label: s.mobBcBodyField, controller: _body, multiline: true, onChanged: (_) => setState(() {}), error: _bodyProblem == MessageProblem.none ? null : s.mobBcBodyError),
              Padding(padding: const EdgeInsets.symmetric(vertical: OruSpacing.space1), child: Text(s.mobBcCounter('${_body.text.trim().length}'), style: text.bodySmall?.copyWith(color: OruColors.textMuted))),
              Padding(padding: const EdgeInsets.only(bottom: OruSpacing.space3), child: Text(s.mobBcOneWay, style: text.bodySmall)),
              OruButton(label: s.mobBcSend, variant: OruButtonVariant.primary, block: true, icon: OruIconName.send, onPressed: classes.isEmpty || _class == null ? null : _send),
            ]);
          },
        ),
      ),
    );
  }
}
