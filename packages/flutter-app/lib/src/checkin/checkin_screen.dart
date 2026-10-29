import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services.dart';
import '../sync_pill.dart';
import 'checkin_data.dart';

String _timeOf(BuildContext context, String iso) {
  try {
    return DateFormat.jm(Localizations.localeOf(context).toString()).format(DateTime.parse(iso).toLocal());
  } catch (_) {
    return iso;
  }
}

/// The Staff app's Attendance tab: today's check-in and check-out. The button works with no connection: the check is saved on the phone
/// and the school's clock stamps it when it arrives. Outside the school's ring, or with no position, a reason is asked first.
class OruCheckInScreen extends StatefulWidget {
  const OruCheckInScreen({super.key, required this.services, this.location = const GeolocatorLocation(), this.now});
  final OruServices services;
  final LocationPort location;
  final DateTime Function()? now;

  @override
  State<OruCheckInScreen> createState() => _OruCheckInScreenState();
}

class _OruCheckInScreenState extends State<OruCheckInScreen> {
  late final CheckInController _c = CheckInController(widget.services.store, location: widget.location, now: widget.now);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _press(CheckKind kind) async {
    final plan = await _c.prepare(kind);
    if (!mounted) return;
    if (!plan.verdict.reasonRequired) {
      await _c.save(plan);
      return;
    }
    final reason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ReasonSheet(plan: plan),
    );
    if (reason != null) await _c.save(plan, reason: reason);
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
              final v = _c.view;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobTabAttendance, style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (v != null && v.refusal != null) ...[
                  OruBanner(title: s.mobCiRefused, message: v.refusal, tone: OruTone.danger, icon: OruIconName.alert, action: OruButton(label: s.actionDismiss, onPressed: _c.dismissRefusal)),
                  const SizedBox(height: OruSpacing.space3),
                ],
                if (v != null)
                  OruCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(
                        v.checkIn != null ? s.mobCiIn('\u2066${_timeOf(context, v.checkIn!)}\u2069') : (v.savedIn ? s.mobCiSavedIn : s.mobCiNotIn),
                        style: text.titleMedium,
                      ),
                      if (v.checkOut != null || v.savedOut) ...[
                        const SizedBox(height: OruSpacing.space2),
                        Text(v.checkOut != null ? s.mobCiOut('\u2066${_timeOf(context, v.checkOut!)}\u2069') : s.mobCiSavedOut, style: text.titleMedium),
                      ],
                      if (v.waitingHr) ...[
                        const SizedBox(height: OruSpacing.space2),
                        Text(s.mobCiWaitingHr, style: text.bodyMedium?.copyWith(color: OruColors.warningFg)),
                      ],
                    ]),
                  ),
                const SizedBox(height: OruSpacing.space4),
                if (_c.locating) Text(s.mobCiLocating, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
                if (v != null && v.canCheckIn)
                  OruButton(label: s.mobCiCheckIn, variant: OruButtonVariant.primary, block: true, icon: OruIconName.mapPin, onPressed: _c.locating ? null : () => _press(CheckKind.checkIn)),
                if (v != null && v.canCheckOut)
                  OruButton(label: s.mobCiCheckOut, variant: v.canCheckIn ? OruButtonVariant.secondary : OruButtonVariant.primary, block: true, icon: OruIconName.mapPin, onPressed: _c.locating ? null : () => _press(CheckKind.checkOut)),
              ]);
            },
          ),
        ),
      ),
    );
  }
}

/// A card for the Teacher's Today screen: whether she has checked in, and the way to the screen where she does. Reads only the phone.
class OruCheckInSummary extends StatefulWidget {
  const OruCheckInSummary({super.key, required this.services, required this.onOpen, this.now});
  final OruServices services;
  final VoidCallback onOpen;
  final DateTime Function()? now;

  @override
  State<OruCheckInSummary> createState() => _OruCheckInSummaryState();
}

class _OruCheckInSummaryState extends State<OruCheckInSummary> {
  late final CheckInController _c = CheckInController(widget.services.store, location: const NoLocation(), now: widget.now);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return ListenableBuilder(
      listenable: _c,
      builder: (context, _) {
        final v = _c.view;
        final line = v == null
            ? ''
            : v.checkOut != null
                ? s.mobCiOut('\u2066${_timeOf(context, v.checkOut!)}\u2069')
                : v.savedOut
                    ? s.mobCiSavedOut
                    : v.checkIn != null
                        ? s.mobCiIn('\u2066${_timeOf(context, v.checkIn!)}\u2069')
                        : (v.savedIn ? s.mobCiSavedIn : s.mobCiNotIn);
        return OruCard(
          title: s.mobCiCardTitle,
          icon: OruIconName.mapPin,
          action: OruLinkAction(label: s.mobCiOpen, onPressed: widget.onOpen),
          child: Padding(padding: const EdgeInsets.all(OruSpacing.space4), child: Text(line)),
        );
      },
    );
  }
}

class _ReasonSheet extends StatefulWidget {
  const _ReasonSheet({required this.plan});
  final CheckPlan plan;

  @override
  State<_ReasonSheet> createState() => _ReasonSheetState();
}

class _ReasonSheetState extends State<_ReasonSheet> {
  final _reason = TextEditingController();
  bool _tried = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final v = widget.plan.verdict;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(OruSpacing.space4),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.mobCiReasonTitle, style: text.titleLarge),
            const SizedBox(height: OruSpacing.space2),
            Text(v.distanceM == null ? s.mobCiReasonNoPosition : s.mobCiReasonOutside('\u2066${v.distanceM}\u2069'), style: text.bodyMedium),
            if (v.needsConfirm) ...[
              const SizedBox(height: OruSpacing.space1),
              Text(s.mobCiReasonFar, style: text.bodyMedium?.copyWith(color: OruColors.warningFg)),
            ],
            const SizedBox(height: OruSpacing.space3),
            OruTextField(label: s.mobCiReasonLabel, controller: _reason, multiline: true, error: _tried && _reason.text.trim().isEmpty ? s.mobCiReasonEmpty : null, onChanged: (_) => setState(() {})),
            const SizedBox(height: OruSpacing.space3),
            OruButton(
              label: s.mobCiReasonSend,
              variant: OruButtonVariant.primary,
              block: true,
              icon: OruIconName.send,
              onPressed: () {
                if (_reason.text.trim().isEmpty) {
                  setState(() => _tried = true);
                  return;
                }
                Navigator.of(context).pop(_reason.text.trim());
              },
            ),
          ]),
        ),
      ),
    );
  }
}
