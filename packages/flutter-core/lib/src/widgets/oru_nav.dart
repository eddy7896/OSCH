import 'package:flutter/material.dart';

import '../tokens.g.dart';
import 'oru_display.dart';
import 'oru_icon.dart';

TextTheme _tt(BuildContext c) => Theme.of(c).textTheme;

class OruNavItem {
  const OruNavItem({required this.key, required this.label, required this.icon, this.badge = 0, this.badgeLabel});

  final String key;

  /// Already translated.
  final String label;
  final OruIconName icon;

  /// Unread count on this item; needs [badgeLabel] ("3 new messages") when above zero.
  final int badge;
  final String? badgeLabel;
}

/// The main navigation of every mobile app. Always icon and word. Sits at the bottom edge and keeps clear of the home indicator.
class OruBottomNav extends StatelessWidget {
  const OruBottomNav({super.key, required this.items, required this.active, required this.onChanged, required this.label})
      : assert(items.length >= 3 && items.length <= 5, 'three to five items');

  final List<OruNavItem> items;
  final String active;
  final ValueChanged<String> onChanged;

  /// The name of this navigation for screen readers, already translated ("Main").
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      container: true,
      explicitChildNodes: true,
      child: Container(
        decoration: const BoxDecoration(color: OruColors.surface, border: Border(top: BorderSide(color: OruColors.border))),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(OruSpacing.space1),
            child: Row(children: [
              for (final item in items)
                Expanded(
                  child: Semantics(
                    button: true,
                    selected: item.key == active,
                    label: item.label,
                    child: ExcludeSemantics(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(OruRadius.md),
                        onTap: () => onChanged(item.key),
                        child: Container(
                          constraints: const BoxConstraints(minHeight: 56),
                          decoration: BoxDecoration(color: item.key == active ? OruColors.primarySoft : null, borderRadius: BorderRadius.circular(OruRadius.md)),
                          child: Column(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
                            Stack(clipBehavior: Clip.none, children: [
                              OruIcon(item.icon, size: 24, color: item.key == active ? OruColors.primaryText : OruColors.textMuted),
                              if (item.badge > 0)
                                PositionedDirectional(top: -6, start: 14, child: OruCountBadge(count: item.badge, label: item.badgeLabel ?? '${item.badge}')),
                            ]),
                            const SizedBox(height: 2),
                            Text(item.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: _tt(context).bodySmall?.copyWith(fontWeight: FontWeight.w600, color: item.key == active ? OruColors.primaryText : OruColors.textMuted)),
                          ]),
                        ),
                      ),
                    ),
                  ),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// A row in a list: students, classes, messages, tasks. At least 64 px tall on phones.
class OruListRow extends StatelessWidget {
  const OruListRow({super.key, required this.title, this.subtitle, this.leading, this.trailing, this.onPressed});

  final String title;

  /// One line of context. Never three lines.
  final String? subtitle;

  /// A roll number, a time, an [OruAvatar].
  final Widget? leading;

  /// An [OruStatusPill], a time, an [OruBadge].
  final Widget? trailing;

  /// Makes the whole row one button, with a chevron when there is no [trailing].
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final row = ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 64),
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space4, vertical: OruSpacing.space2),
        child: Row(children: [
          if (leading != null) ...[leading!, const SizedBox(width: OruSpacing.space3)],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: _tt(context).bodyLarge?.copyWith(fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis),
              if (subtitle != null) Text(subtitle!, style: _tt(context).bodyMedium?.copyWith(color: OruColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
          if (trailing != null) ...[const SizedBox(width: OruSpacing.space3), trailing!],
          if (onPressed != null && trailing == null) ...[const SizedBox(width: OruSpacing.space2), const OruIcon(OruIconName.chevronRight, color: OruColors.textMuted)],
        ]),
      ),
    );
    if (onPressed == null) return row;
    return Semantics(button: true, child: InkWell(onTap: onPressed, child: row));
  }
}

enum OruTileTone { primary, success, danger, neutral }

/// A big, glanceable action for the Driver app and the Quick Actions row. At least 112 px tall. Not for navigation lists:
/// use [OruListRow].
class OruActionTile extends StatelessWidget {
  const OruActionTile({super.key, required this.title, this.description, this.icon, this.tone = OruTileTone.primary, this.solid = false, this.onPressed});

  /// One or two words, already translated.
  final String title;
  final String? description;
  final OruIconName? icon;
  final OruTileTone tone;

  /// For the one or two most important tiles (not `neutral`).
  final bool solid;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final isSolid = solid && tone != OruTileTone.neutral;
    final (bg, fg) = switch (tone) {
      OruTileTone.primary => isSolid ? (OruColors.primary, OruColors.onPrimary) : (OruColors.primarySoft, OruColors.primaryText),
      OruTileTone.success => isSolid ? (OruColors.successSolid, OruColors.onPrimary) : (OruColors.successBg, OruColors.successFg),
      OruTileTone.danger => isSolid ? (OruColors.dangerSolid, OruColors.onPrimary) : (OruColors.dangerBg, OruColors.dangerFg),
      OruTileTone.neutral => (OruColors.surface, OruColors.text),
    };
    return Semantics(
      button: true,
      enabled: onPressed != null,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(OruRadius.lg),
          side: tone == OruTileTone.neutral ? const BorderSide(color: OruColors.border) : BorderSide.none,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(OruRadius.lg),
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 112),
            child: Padding(
              padding: const EdgeInsets.all(OruSpacing.space4),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (icon != null) ...[OruIcon(icon!, size: 32, color: fg), const SizedBox(height: OruSpacing.space2)],
                Text(title, style: OruText.actionXl.copyWith(color: fg)),
                if (description != null) Text(description!, style: _tt(context).bodyMedium?.copyWith(color: fg)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
