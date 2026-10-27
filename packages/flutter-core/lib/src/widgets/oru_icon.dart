import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// The 38 icon names of the design system (`packages/shared-ui` `ICON_NAMES`), each mapped to one Lucide glyph
/// (`lucide_icons_flutter`, not the stale `lucide_icons`; design_system_spec section 6).
enum OruIconName {
  check(LucideIcons.check),
  x(LucideIcons.x),
  clock(LucideIcons.clock),
  leave(LucideIcons.calendarOff),
  medical(LucideIcons.stethoscope),
  halfday(LucideIcons.sunMedium),
  more(LucideIcons.ellipsis),
  chevronRight(LucideIcons.chevronRight, directional: true),
  chevronDown(LucideIcons.chevronDown),
  arrowLeft(LucideIcons.arrowLeft, directional: true),
  search(LucideIcons.search),
  bell(LucideIcons.bell),
  home(LucideIcons.house),
  users(LucideIcons.users),
  userPlus(LucideIcons.userPlus),
  userMinus(LucideIcons.userMinus),
  calendar(LucideIcons.calendar),
  message(LucideIcons.messageSquare),
  payments(LucideIcons.banknote),
  grid(LucideIcons.layoutGrid),
  cloud(LucideIcons.cloud),
  cloudOff(LucideIcons.cloudOff),
  upload(LucideIcons.upload),
  refresh(LucideIcons.refreshCw),
  alert(LucideIcons.triangleAlert),
  checkCircle(LucideIcons.circleCheck),
  bus(LucideIcons.bus),
  mapPin(LucideIcons.mapPin),
  phone(LucideIcons.phone),
  book(LucideIcons.bookOpen),
  chart(LucideIcons.chartColumn),
  trendUp(LucideIcons.trendingUp),
  trendDown(LucideIcons.trendingDown),
  send(LucideIcons.send, directional: true),
  device(LucideIcons.smartphone),
  inbox(LucideIcons.inbox),
  tasks(LucideIcons.listChecks),
  plus(LucideIcons.plus);

  const OruIconName(this.data, {this.directional = false});
  final IconData data;

  /// Points somewhere, so it is mirrored in right-to-left layouts.
  final bool directional;
}

/// One icon of the set, drawn in the surrounding text colour. Sizes: 16 in pills and captions, 20 in buttons and rows,
/// 24 in the bottom bar and banners, 28 to 32 in the Driver app. An icon beside a word is decorative; give [label] only
/// when it stands alone and means something.
class OruIcon extends StatelessWidget {
  const OruIcon(this.name, {super.key, this.size = 20, this.label, this.color});

  final OruIconName name;
  final double size;
  final String? label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    Widget icon = Icon(name.data, size: size, color: color ?? IconTheme.of(context).color, semanticLabel: label);
    if (name.directional && rtl) icon = Transform.flip(flipX: true, child: icon);
    return ExcludeSemantics(excluding: label == null, child: icon);
  }
}
