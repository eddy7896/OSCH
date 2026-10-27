import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.g.dart';
import 'oru_icon.dart';

TextTheme _tt(BuildContext c) => Theme.of(c).textTheme;

/// A text field with its label above it, always. 16 px text on phones. The error says what to do, not what went wrong
/// ("Marks cannot be more than 50."). Only a search field may leave the label out, and then it needs [semanticLabel].
class OruTextField extends StatelessWidget {
  const OruTextField({
    super.key,
    this.label,
    this.semanticLabel,
    this.hint,
    this.error,
    this.icon,
    this.controller,
    this.onChanged,
    this.keyboardType,
    this.obscureText = false,
    this.multiline = false,
    this.enabled = true,
    this.density = OruDensity.touch,
  }) : assert(label != null || semanticLabel != null, 'a field without a visible label needs a semanticLabel');

  final String? label;
  final String? semanticLabel;
  final String? hint;
  final String? error;
  final OruIconName? icon;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboardType;
  final bool obscureText;
  final bool multiline;
  final bool enabled;
  final OruDensity density;

  @override
  Widget build(BuildContext context) {
    final message = error ?? hint;
    final border = error != null ? OruColors.dangerSolid : OruColors.borderStrong;
    OutlineInputBorder outline(Color c, [double w = 1]) =>
        OutlineInputBorder(borderRadius: BorderRadius.circular(OruRadius.md), borderSide: BorderSide(color: c, width: w));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (label != null) ...[
        Text(label!, style: _tt(context).labelLarge),
        const SizedBox(height: OruSpacing.space2),
      ],
      Semantics(
        label: label == null ? semanticLabel : null,
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          keyboardType: multiline ? TextInputType.multiline : keyboardType,
          obscureText: obscureText,
          enabled: enabled,
          minLines: multiline ? 3 : 1,
          maxLines: multiline ? 6 : 1,
          style: _tt(context).bodyLarge,
          decoration: InputDecoration(
            constraints: multiline ? null : BoxConstraints(minHeight: density.controlHeight),
            prefixIcon: icon == null ? null : Padding(padding: const EdgeInsetsDirectional.only(start: OruSpacing.space3, end: OruSpacing.space2), child: OruIcon(icon!, color: OruColors.textMuted)),
            prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
            filled: true,
            fillColor: enabled ? OruColors.surface : OruColors.surfaceMuted,
            border: outline(border),
            enabledBorder: outline(border),
            focusedBorder: outline(error != null ? OruColors.dangerSolid : OruColors.focus, 2),
            disabledBorder: outline(OruColors.border),
          ),
        ),
      ),
      if (message != null) ...[
        const SizedBox(height: OruSpacing.space2),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (error != null) ...[const OruIcon(OruIconName.alert, size: 16, color: OruColors.dangerFg), const SizedBox(width: OruSpacing.space1)],
          Expanded(child: Text(message, style: _tt(context).bodySmall?.copyWith(color: error != null ? OruColors.dangerFg : OruColors.textMuted))),
        ]),
      ],
    ]);
  }
}

/// A tick box with a label. The whole row is the tap target (48 px tall).
class OruCheckbox extends StatelessWidget {
  const OruCheckbox({super.key, required this.label, required this.value, required this.onChanged, this.description, this.strikeWhenChecked = false});

  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  /// For to-do lists: a ticked item is muted and struck through. Off by default, because a struck-through "Remember me"
  /// reads as the opposite of what was chosen.
  final bool strikeWhenChecked;

  @override
  Widget build(BuildContext context) {
    final struck = strikeWhenChecked && value;
    return Semantics(
      checked: value,
      enabled: onChanged != null,
      label: label,
      hint: description,
      child: ExcludeSemantics(
        child: InkWell(
          borderRadius: BorderRadius.circular(OruRadius.md),
          onTap: onChanged == null ? null : () => onChanged!(!value),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: OruSize.controlTouch),
            child: Row(children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: value ? OruColors.primary : OruColors.surface,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: value ? OruColors.primary : OruColors.borderStrong, width: 2),
                ),
                child: value ? const Center(child: OruIcon(OruIconName.check, size: 16, color: OruColors.onPrimary)) : null,
              ),
              const SizedBox(width: OruSpacing.space3),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(label,
                      style: _tt(context).bodyLarge?.copyWith(
                          color: struck ? OruColors.textMuted : OruColors.text, decoration: struck ? TextDecoration.lineThrough : null)),
                  if (description != null) Text(description!, style: _tt(context).bodySmall?.copyWith(color: OruColors.textMuted)),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

class OruSegment {
  const OruSegment({required this.value, required this.label});
  final String value;
  final String label;
}

/// Switches between 2 to 4 views of the same content. Exposed as a radio group: it chooses a value.
class OruSegmentedControl extends StatelessWidget {
  const OruSegmentedControl({super.key, required this.options, required this.value, required this.onChanged, required this.label, this.density = OruDensity.touch})
      : assert(options.length >= 2 && options.length <= 4, 'two to four options; beyond that use a list');

  final List<OruSegment> options;
  final String value;
  final ValueChanged<String> onChanged;

  /// For screen readers: what is being chosen ("View").
  final String label;
  final OruDensity density;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      container: true,
      child: Container(
        padding: const EdgeInsets.all(OruSpacing.space1),
        decoration: BoxDecoration(color: OruColors.surfaceMuted, borderRadius: BorderRadius.circular(OruRadius.md)),
        child: Row(children: [
          for (final o in options)
            Expanded(
              child: Semantics(
                inMutuallyExclusiveGroup: true,
                checked: o.value == value,
                label: o.label,
                child: ExcludeSemantics(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(OruRadius.sm),
                    onTap: () => onChanged(o.value),
                    child: Container(
                      constraints: BoxConstraints(minHeight: density.controlHeight - 2 * OruSpacing.space1),
                      alignment: Alignment.center,
                      padding: const EdgeInsetsDirectional.symmetric(horizontal: OruSpacing.space3),
                      decoration: BoxDecoration(color: o.value == value ? OruColors.primary : null, borderRadius: BorderRadius.circular(OruRadius.sm)),
                      child: Text(o.label,
                          textAlign: TextAlign.center,
                          style: _tt(context).labelLarge?.copyWith(color: o.value == value ? OruColors.onPrimary : OruColors.textMuted)),
                    ),
                  ),
                ),
              ),
            ),
        ]),
      ),
    );
  }
}
