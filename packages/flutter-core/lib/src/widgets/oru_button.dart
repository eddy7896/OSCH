import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.g.dart';
import 'oru_icon.dart';

enum OruButtonVariant { primary, secondary, ghost, danger }

/// A button runs one action. At most ONE `primary` per screen; `danger` only to confirm something destructive. The label
/// starts with a verb and says what happens. Never icon-only (back, close and search get their own widgets with a label).
class OruButton extends StatelessWidget {
  const OruButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = OruButtonVariant.secondary,
    this.density = OruDensity.touch,
    this.icon,
    this.iconRight,
    this.block = false,
  });

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;
  final OruButtonVariant variant;
  final OruDensity density;
  final OruIconName? icon;
  final OruIconName? iconRight;

  /// Full width (the sticky bottom action on phones).
  final bool block;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, side) = switch (variant) {
      OruButtonVariant.primary => (OruColors.primary, OruColors.onPrimary, OruColors.primary),
      OruButtonVariant.secondary => (OruColors.primarySoft, OruColors.primaryText, OruColors.primarySoft),
      OruButtonVariant.ghost => (Colors.transparent, OruColors.primaryText, Colors.transparent),
      OruButtonVariant.danger => (OruColors.dangerSolid, OruColors.onPrimary, OruColors.dangerSolid),
    };
    final iconSize = density == OruDensity.driver ? 28.0 : OruSize.iconMd;
    final style = ButtonStyle(
      minimumSize: WidgetStatePropertyAll(Size(block ? double.infinity : 0, density.controlHeight)),
      padding: const WidgetStatePropertyAll(EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space4)),
      shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(OruRadius.md))),
      backgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.disabled) ? OruColors.surfaceMuted : bg),
      foregroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.disabled) ? OruColors.textMuted : fg),
      side: WidgetStateProperty.resolveWith((s) => BorderSide(color: s.contains(WidgetState.disabled) ? OruColors.border : side)),
      elevation: const WidgetStatePropertyAll(0),
      textStyle: WidgetStatePropertyAll(Theme.of(context).textTheme.labelLarge),
    );
    return TextButton(
      onPressed: onPressed,
      style: style,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[OruIcon(icon!, size: iconSize), const SizedBox(width: OruSpacing.space2)],
          Flexible(child: Text(label, textAlign: TextAlign.center)),
          if (iconRight != null) ...[const SizedBox(width: OruSpacing.space2), OruIcon(iconRight!, size: iconSize)],
        ],
      ),
    );
  }
}

/// A quiet in-text action ("View all"). Not a button: it navigates or reveals.
class OruLinkAction extends StatelessWidget {
  const OruLinkAction({super.key, required this.label, required this.onPressed});

  final String label;

  /// Null disables it (while something is in progress).
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(minimumSize: const Size(0, OruSize.controlTouch), foregroundColor: OruColors.primaryText),
      child: Text(label, style: Theme.of(context).textTheme.labelLarge),
    );
  }
}
