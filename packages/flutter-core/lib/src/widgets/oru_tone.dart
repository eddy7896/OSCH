import 'package:flutter/painting.dart';

import '../tokens.g.dart';

/// A soft fill with matching ink, shared by badges, pills and banners. Colour never carries meaning alone: a word always does.
enum OruTone {
  success(OruColors.successBg, OruColors.successFg),
  warning(OruColors.warningBg, OruColors.warningFg),
  danger(OruColors.dangerBg, OruColors.dangerFg),
  info(OruColors.infoBg, OruColors.infoFg),
  purple(OruColors.purpleBg, OruColors.purpleFg),
  teal(OruColors.tealBg, OruColors.tealFg),
  neutral(OruColors.surfaceMuted, OruColors.textMuted),
  brand(OruColors.primarySoft, OruColors.primaryText);

  const OruTone(this.background, this.foreground);
  final Color background;
  final Color foreground;
}
