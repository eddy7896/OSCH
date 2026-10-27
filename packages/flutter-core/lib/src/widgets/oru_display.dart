import 'package:flutter/material.dart';

import '../localization.dart';
import '../tokens.g.dart';
import 'oru_button.dart';
import 'oru_icon.dart';
import 'oru_tone.dart';

TextTheme _tt(BuildContext c) => Theme.of(c).textTheme;

/// A short status in a soft colour, with an optional dot. One or two words.
class OruBadge extends StatelessWidget {
  const OruBadge({super.key, required this.label, this.tone = OruTone.neutral, this.dot = false});

  final String label;
  final OruTone tone;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 24),
      padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space2),
      decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.full)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (dot) ...[
          Container(width: 8, height: 8, decoration: BoxDecoration(color: tone.foreground, shape: BoxShape.circle)),
          const SizedBox(width: OruSpacing.space1),
        ],
        Flexible(child: Text(label, style: _tt(context).bodySmall?.copyWith(color: tone.foreground, fontWeight: FontWeight.w600))),
      ]),
    );
  }
}

/// The unread count on a navigation item or the bell. `99+` above 99. Never on content.
class OruCountBadge extends StatelessWidget {
  const OruCountBadge({super.key, required this.count, required this.label});

  final int count;

  /// What the count means, already translated ("3 new messages"), for screen readers.
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = count > 99 ? '99+' : '${count < 0 ? 0 : count}';
    return Semantics(
      label: label,
      container: true,
      child: ExcludeSemantics(
        child: Container(
          constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 6),
          alignment: Alignment.center,
          decoration: BoxDecoration(color: OruColors.dangerSolid, borderRadius: BorderRadius.circular(OruRadius.full)),
          child: Text(text,
              style: _tt(context).bodySmall?.copyWith(color: OruColors.onPrimary, fontWeight: FontWeight.w700, height: 1, fontFeatures: const [FontFeature.tabularFigures()])),
        ),
      ),
    );
  }
}

/// First letter of the first and last word, whatever the script (whole user-perceived characters).
String oruInitialsOf(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  if (words.isEmpty) return '?';
  String first(String w) => w.characters.first.toUpperCase();
  return words.length == 1 ? first(words.first) : first(words.first) + first(words.last);
}

/// A person's photo, or their initials (never a generic silhouette).
class OruAvatar extends StatelessWidget {
  const OruAvatar({super.key, required this.name, this.image, this.size = 40});

  /// Always given: it is the label and the fallback.
  final String name;
  final ImageProvider? image;

  /// 32 in lists, 40 default, 56 in profile headers.
  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: name,
      image: true,
      child: ExcludeSemantics(
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: OruColors.primarySoft, shape: BoxShape.circle, image: image == null ? null : DecorationImage(image: image!, fit: BoxFit.cover)),
          child: image == null
              ? Text(oruInitialsOf(name), style: _tt(context).labelLarge?.copyWith(color: OruColors.primaryText, fontSize: (size * 0.38).roundToDouble().clamp(13, 40)))
              : null,
        ),
      ),
    );
  }
}

/// The seven fixed attendance statuses. A school may reword one, never add, remove or recolour (ADR-0013).
enum OruAttendanceStatus {
  present(OruIconName.check, OruTone.success),
  absent(OruIconName.x, OruTone.danger),
  late(OruIconName.clock, OruTone.warning),
  leave(OruIconName.leave, OruTone.info),
  medical(OruIconName.medical, OruTone.purple),
  halfday(OruIconName.halfday, OruTone.teal),
  excused(OruIconName.more, OruTone.neutral);

  const OruAttendanceStatus(this.icon, this.tone);
  final OruIconName icon;
  final OruTone tone;
}

/// A student's attendance status as icon and word. Interactive when tapping it changes the status.
class OruStatusPill extends StatelessWidget {
  const OruStatusPill({super.key, required this.status, required this.label, this.onPressed});

  final OruAttendanceStatus status;

  /// The word for this status in the person's language (or the school's own name for it). Always shown.
  final String label;

  /// Non-null makes the pill a button with a chevron (48 px tall).
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final tone = status.tone;
    final body = Row(mainAxisSize: MainAxisSize.min, children: [
      OruIcon(status.icon, size: 20, color: tone.foreground),
      const SizedBox(width: OruSpacing.space2),
      Flexible(child: Text(label, style: _tt(context).labelLarge?.copyWith(color: tone.foreground))),
      if (onPressed != null) ...[const SizedBox(width: OruSpacing.space2), OruIcon(OruIconName.chevronDown, size: 20, color: tone.foreground)],
    ]);
    final box = Container(
      constraints: BoxConstraints(minHeight: onPressed != null ? OruSize.controlTouch : 36, minWidth: onPressed != null ? 140 : 0),
      padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space3),
      alignment: AlignmentDirectional.centerStart,
      decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.sm)),
      child: body,
    );
    if (onPressed == null) return box;
    return Semantics(button: true, label: label, child: InkWell(borderRadius: BorderRadius.circular(OruRadius.sm), onTap: onPressed, child: box));
  }
}

/// The six states of work on a device (design system SyncStatus). Saving locally is success: this never blocks the screen.
enum OruSyncState {
  synced(OruIconName.checkCircle, OruTone.success),
  saved(OruIconName.device, OruTone.warning),
  pending(OruIconName.upload, OruTone.warning),
  syncing(OruIconName.refresh, OruTone.info),
  offline(OruIconName.cloudOff, OruTone.neutral),
  failed(OruIconName.alert, OruTone.danger);

  const OruSyncState(this.icon, this.tone);
  final OruIconName icon;
  final OruTone tone;
}

/// Whether work is safe on the server. The title is the fixed wording for the state from the language catalogue unless
/// [title] is given. A pill goes in headers and home screens; a banner at the top of a workflow screen, only when
/// something is pending, offline or failed.
class OruSyncStatus extends StatelessWidget {
  const OruSyncStatus({super.key, required this.state, this.pendingCount = 0, this.title, this.detail, this.banner = false, this.actionLabel, this.onAction})
      : assert((actionLabel == null) == (onAction == null), 'give both actionLabel and onAction, or neither');

  final OruSyncState state;

  /// Used for the fixed `pending` wording ("5 changes pending").
  final int pendingCount;
  final String? title;
  final String? detail;
  final bool banner;
  final String? actionLabel;
  final VoidCallback? onAction;

  String _title(OruStrings s) =>
      title ??
      switch (state) {
        OruSyncState.synced => s.syncSynced,
        OruSyncState.saved => s.syncSavedOnDevice,
        OruSyncState.pending => s.syncChangesPending(pendingCount),
        OruSyncState.syncing => s.syncSyncing,
        OruSyncState.offline => s.syncOffline,
        OruSyncState.failed => s.syncFailed,
      };

  @override
  Widget build(BuildContext context) {
    final t = _title(OruStrings.of(context));
    final tone = state.tone;
    final icon = _SyncIcon(state: state, size: banner ? 24 : 16);
    if (!banner) {
      return Semantics(
        liveRegion: true,
        child: Container(
          constraints: const BoxConstraints(minHeight: 32),
          padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space3),
          decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.full)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            icon,
            const SizedBox(width: OruSpacing.space2),
            Flexible(child: Text(t, style: _tt(context).bodySmall?.copyWith(color: tone.foreground, fontWeight: FontWeight.w600))),
            if (detail != null) ...[
              const SizedBox(width: OruSpacing.space2),
              Flexible(child: Text(detail!, style: _tt(context).bodySmall?.copyWith(color: tone.foreground))),
            ],
          ]),
        ),
      );
    }
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space4, vertical: OruSpacing.space3),
        decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.lg)),
        child: Row(children: [
          icon,
          const SizedBox(width: OruSpacing.space3),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t, style: _tt(context).titleSmall?.copyWith(color: tone.foreground)),
              if (detail != null) Text(detail!, style: _tt(context).bodySmall?.copyWith(color: tone.foreground)),
            ]),
          ),
          if (actionLabel != null) ...[
            const SizedBox(width: OruSpacing.space3),
            OruButton(label: actionLabel!, onPressed: onAction, icon: state == OruSyncState.failed ? OruIconName.refresh : OruIconName.upload),
          ],
        ]),
      ),
    );
  }
}

class _SyncIcon extends StatefulWidget {
  const _SyncIcon({required this.state, required this.size});
  final OruSyncState state;
  final double size;

  @override
  State<_SyncIcon> createState() => _SyncIconState();
}

class _SyncIconState extends State<_SyncIcon> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));

  @override
  void initState() {
    super.initState();
    _sync();
  }

  @override
  void didUpdateWidget(_SyncIcon old) {
    super.didUpdateWidget(old);
    _sync();
  }

  // A spinning icon is motion: it stays still when the person asked for reduced motion.
  void _sync() {
    final reduce = WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    if (widget.state == OruSyncState.syncing && !reduce) {
      if (!_c.isAnimating) _c.repeat();
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final icon = OruIcon(widget.state.icon, size: widget.size, color: widget.state.tone.foreground);
    return widget.state == OruSyncState.syncing ? RotationTransition(turns: _c, child: icon) : icon;
  }
}

/// A message inside the page about something that needs attention now. One per screen at most.
class OruBanner extends StatelessWidget {
  const OruBanner({super.key, required this.title, this.message, this.tone = OruTone.info, this.icon, this.action});

  /// What happened, as a fact ("1 bus is delayed"). Already translated.
  final String title;
  final String? message;
  final OruTone tone;
  final OruIconName? icon;

  /// One [OruButton] at most.
  final Widget? action;

  OruIconName get _icon =>
      icon ?? (tone == OruTone.success ? OruIconName.checkCircle : (tone == OruTone.warning || tone == OruTone.danger) ? OruIconName.alert : OruIconName.bell);

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(OruSpacing.space4),
        decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.lg)),
        child: Row(children: [
          OruIcon(_icon, size: 24, color: tone.foreground),
          const SizedBox(width: OruSpacing.space3),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: _tt(context).titleSmall?.copyWith(color: tone.foreground)),
              if (message != null) Text(message!, style: _tt(context).bodyMedium),
            ]),
          ),
          if (action != null) ...[const SizedBox(width: OruSpacing.space3), action!],
        ]),
      ),
    );
  }
}

/// What a screen shows when there is nothing yet. Friendly, never blaming.
class OruEmptyState extends StatelessWidget {
  const OruEmptyState({super.key, required this.title, this.description, this.icon = OruIconName.inbox, this.action});

  final String title;
  final String? description;
  final OruIconName icon;

  /// One [OruButton], only if the person can actually create the thing.
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(OruSpacing.space6),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(color: OruTone.brand.background, borderRadius: BorderRadius.circular(OruRadius.lg)),
          child: Center(child: OruIcon(icon, size: 32, color: OruTone.brand.foreground)),
        ),
        const SizedBox(height: OruSpacing.space4),
        Semantics(header: true, child: Text(title, style: _tt(context).titleMedium, textAlign: TextAlign.center)),
        if (description != null) ...[
          const SizedBox(height: OruSpacing.space2),
          Text(description!, style: _tt(context).bodyMedium?.copyWith(color: OruColors.textMuted), textAlign: TextAlign.center),
        ],
        if (action != null) ...[const SizedBox(height: OruSpacing.space4), action!],
      ]),
    );
  }
}

/// The basic container for one group of related information. One idea per card; do not nest cards.
class OruCard extends StatelessWidget {
  const OruCard({super.key, this.title, this.subtitle, this.icon, this.action, this.brand = false, this.child});

  final String? title;
  final String? subtitle;
  final OruIconName? icon;

  /// Usually an [OruLinkAction] ("View all").
  final Widget? action;

  /// The identity strip.
  final bool brand;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(OruSpacing.space4),
      decoration: BoxDecoration(
        color: brand ? OruColors.surfaceBrand : OruColors.surface,
        borderRadius: BorderRadius.circular(OruRadius.lg),
        border: brand ? null : Border.all(color: OruColors.border),
        boxShadow: brand ? null : OruShadows.card,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (title != null || action != null)
          Padding(
            padding: EdgeInsets.only(bottom: child == null ? 0 : OruSpacing.space3),
            child: Row(children: [
              if (icon != null) ...[
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: OruTone.brand.background, borderRadius: BorderRadius.circular(OruRadius.sm)),
                  child: Center(child: OruIcon(icon!, size: 20, color: OruTone.brand.foreground)),
                ),
                const SizedBox(width: OruSpacing.space3),
              ],
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (title != null) Semantics(header: true, child: Text(title!, style: _tt(context).titleMedium)),
                  if (subtitle != null) Text(subtitle!, style: _tt(context).bodyMedium?.copyWith(color: OruColors.textMuted)),
                ]),
              ),
              ?action,
            ]),
          ),
        ?child,
      ]),
    );
  }
}

/// One number someone needs to know. At most five in a dashboard's top row.
class OruStatCard extends StatelessWidget {
  const OruStatCard({super.key, required this.label, required this.value, this.sub, this.icon, this.tone = OruTone.brand, this.trend, this.trendUp, this.trendLabel});

  final String label;

  /// Pre-formatted by the caller ("96.3%"); shown in tabular figures.
  final String value;
  final String? sub;
  final OruIconName? icon;
  final OruTone tone;

  /// The change, already formatted for the person's language ("+2.5%"). [trendUp] says which way: true is green with an
  /// up arrow, false is red with a down arrow, null is neutral with no arrow. [trendLabel] is "vs. last week".
  final String? trend;
  final bool? trendUp;
  final String? trendLabel;

  @override
  Widget build(BuildContext context) {
    final up = trendUp;
    final trendInk = up == null ? OruColors.textMuted : (up ? OruColors.successFg : OruColors.dangerFg);
    return OruCard(
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (icon != null) ...[
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: tone.background, borderRadius: BorderRadius.circular(OruRadius.md)),
            child: Center(child: OruIcon(icon!, size: 24, color: tone.foreground)),
          ),
          const SizedBox(width: OruSpacing.space3),
        ],
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: _tt(context).bodyMedium?.copyWith(color: OruColors.textMuted)),
            Text(value, style: OruText.stat.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
            if (sub != null) Text(sub!, style: _tt(context).bodySmall?.copyWith(color: OruColors.textMuted)),
            if (trend != null)
              Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: OruSpacing.space1, children: [
                if (up != null) OruIcon(up ? OruIconName.trendUp : OruIconName.trendDown, size: 16, color: trendInk),
                Text(trend!, style: _tt(context).bodySmall?.copyWith(color: trendInk, fontWeight: FontWeight.w700)),
                if (trendLabel != null) Text(trendLabel!, style: _tt(context).bodySmall?.copyWith(color: OruColors.textMuted)),
              ]),
          ]),
        ),
      ]),
    );
  }
}
