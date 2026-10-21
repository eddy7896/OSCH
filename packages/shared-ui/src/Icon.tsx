import { ICON_SHAPES, type IconName } from './icons.generated.js';
import { cx } from './cx.js';

export type { IconName } from './icons.generated.js';
export { ICON_NAMES } from './icons.generated.js';

export interface IconProps {
  name: IconName;
  /** 16 in pills and captions, 20 in buttons, rows and navigation, 24 in the bottom bar, 28-32 for the Driver app. */
  size?: 16 | 20 | 24 | 28 | 32 | number;
  /** Only when the icon stands alone and means something. Beside a word, leave it out (the icon is then decorative). */
  label?: string;
  strokeWidth?: number;
  className?: string;
}

/** Icons that point somewhere are mirrored in right-to-left layouts (see styles.css). */
const DIRECTIONAL = new Set<IconName>(['chevron-right', 'arrow-left', 'send']);

/** One icon of the OruSchools outline set: 24px grid, round caps and joins, drawn in `currentColor`. */
export function Icon({ name, size = 20, label, strokeWidth = 1.9, className }: IconProps) {
  return (
    <svg
      className={cx('oru-icon', DIRECTIONAL.has(name) && 'oru-icon--directional', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {ICON_SHAPES[name].map((shape, i) => {
        if ('d' in shape) return <path key={i} d={shape.d} />;
        if ('c' in shape) return <circle key={i} cx={shape.c[0]} cy={shape.c[1]} r={shape.c[2]} />;
        return <rect key={i} x={shape.r[0]} y={shape.r[1]} width={shape.r[2]} height={shape.r[3]} rx={shape.r[4]} />;
      })}
    </svg>
  );
}
