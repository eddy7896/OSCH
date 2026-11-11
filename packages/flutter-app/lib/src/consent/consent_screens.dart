import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'consent_data.dart';

/// The privacy notice's words, shared by the first-run screen and the Privacy screen in More.
class _NoticeText extends StatelessWidget {
  const _NoticeText();

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    Widget point(String t) => Padding(
          padding: const EdgeInsets.only(bottom: OruSpacing.space2),
          child: OruCard(child: Padding(padding: const EdgeInsets.all(OruSpacing.space3), child: Text(t, style: text.bodyLarge))),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Semantics(header: true, child: Text(s.privSummaryTitle, style: text.titleMedium)),
      const SizedBox(height: OruSpacing.space2),
      point(s.privPoint1),
      point(s.privPoint2),
      point(s.privPoint3),
      point(s.privPoint4),
      Text(s.privContact, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
      const SizedBox(height: OruSpacing.space2),
      Text(s.privVersionLine(s.privNoticeVersion), style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
    ]);
  }
}

int _versionOf(OruStrings s) => int.tryParse(s.privNoticeVersion) ?? 1;

/// What the parent sees before any information about a child: the notice, one box, and Continue. Nothing else in the app opens until the school
/// has recorded the answer.
class OruConsentScreen extends StatefulWidget {
  const OruConsentScreen({super.key, required this.controller, required this.services, required this.state});
  final ConsentController controller;
  final OruServices services;
  final SessionActive state;

  @override
  State<OruConsentScreen> createState() => _OruConsentScreenState();
}

class _OruConsentScreenState extends State<OruConsentScreen> {
  bool _agree = false;
  bool _needBox = false;
  bool _declined = false;

  Future<void> _continue(OruStrings s) async {
    if (!_agree) {
      setState(() => _needBox = true);
      return;
    }
    setState(() => _needBox = false);
    await widget.controller.record(given: true, noticeVersion: _versionOf(s), language: Localizations.localeOf(context).languageCode);
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final c = widget.controller;
    return Scaffold(
      body: SafeArea(
        child: ListenableBuilder(
          listenable: c,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            Semantics(header: true, child: Text(s.privTitle, style: text.titleLarge)),
            const SizedBox(height: OruSpacing.space2),
            Text(s.privLead, style: text.bodyLarge),
            const SizedBox(height: OruSpacing.space4),
            const _NoticeText(),
            const SizedBox(height: OruSpacing.space4),
            OruCheckbox(label: s.privAgreeBox, value: _agree, onChanged: c.busy ? null : (v) => setState(() { _agree = v; _needBox = false; _declined = false; })),
            if (_needBox) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: OruBanner(title: s.privNeedAgree, tone: OruTone.warning, icon: OruIconName.alert)),
            if (_declined) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: OruBanner(title: s.privCannotWithout, tone: OruTone.info, icon: OruIconName.alert)),
            if (c.failed) Padding(padding: const EdgeInsets.only(top: OruSpacing.space2), child: OruBanner(title: s.privFailed, tone: OruTone.danger, icon: OruIconName.cloudOff)),
            const SizedBox(height: OruSpacing.space4),
            OruButton(label: s.privContinue, variant: OruButtonVariant.primary, block: true, icon: OruIconName.check, onPressed: c.busy ? null : () => _continue(s)),
            const SizedBox(height: OruSpacing.space2),
            OruButton(label: s.privDisagree, variant: OruButtonVariant.secondary, block: true, onPressed: c.busy ? null : () => setState(() { _declined = true; _agree = false; _needBox = false; })),
            const SizedBox(height: OruSpacing.space6),
            OruAccountPanel(session: widget.services.session, state: widget.state, lock: widget.services.lock, syncStatus: OruSyncPill(services: widget.services)),
          ]),
        ),
      ),
    );
  }
}

/// More, Privacy: the notice again, when the parent agreed, and withdrawing.
class OruPrivacyScreen extends StatelessWidget {
  const OruPrivacyScreen({super.key, required this.controller});
  final ConsentController controller;

  Future<void> _withdraw(BuildContext context, OruStrings s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.privWithdraw),
        content: Text(s.privWithdrawAsk),
        actions: [
          OruButton(label: s.privKeep, variant: OruButtonVariant.secondary, onPressed: () => Navigator.pop(ctx, false)),
          OruButton(label: s.privWithdrawYes, variant: OruButtonVariant.danger, onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    final done = await controller.record(given: false, noticeVersion: _versionOf(s), language: Localizations.localeOf(context).languageCode);
    if (done && context.mounted) Navigator.of(context).pop(); // the app now shows the consent screen
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(s.privMoreRow)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: controller,
          builder: (context, _) {
            final at = ((controller.status?['purposes'] as List?)?.cast<Map<String, dynamic>>().firstOrNull)?['recordedAt'] as String?;
            return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
              if (at != null) ...[Text(s.privGivenOn(dateWords(context, at)), style: text.bodyLarge), const SizedBox(height: OruSpacing.space4)],
              const _NoticeText(),
              if (controller.failed) Padding(padding: const EdgeInsets.only(top: OruSpacing.space3), child: OruBanner(title: s.privFailed, tone: OruTone.danger, icon: OruIconName.cloudOff)),
              const SizedBox(height: OruSpacing.space6),
              OruButton(label: s.privWithdraw, variant: OruButtonVariant.secondary, block: true, onPressed: controller.busy ? null : () => _withdraw(context, s)),
            ]);
          },
        ),
      ),
    );
  }
}
