import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';
import type { Tone } from './Badge.js';

export interface StatCardProps {
  /** What the number is ("Attendance today"). Already translated. */
  label: string;
  /** Pre-formatted by the caller: "96.3%", "₹1,82,40,000". Shown in tabular numbers. */
  value: string;
  sub?: string;
  icon?: IconName;
  /** Colour of the icon tile. Default `brand`. */
  tone?: Tone;
  /** Percent change. Up is green, down is red, zero is neutral and has no arrow. If down is good (outstanding fees), still show it and say so in `trendLabel`. */
  trend?: number;
  /** "vs. last week". Already translated. */
  trendLabel?: string;
  /** BCP 47 language of the person, so digits and the minus sign follow their language. Default: the browser's. */
  locale?: string;
  className?: string;
}

/** One number someone needs to know. At most five in a dashboard's top row. */
export function StatCard({ label, value, sub, icon, tone = 'brand', trend, trendLabel, locale, className }: StatCardProps) {
  const direction = trend == null || trend === 0 ? 'flat' : trend > 0 ? 'up' : 'down';
  const trendText = trend == null ? null : new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }).format(trend / 100);
  return (
    <div className={cx('oru-stat', className)}>
      {icon && (
        <span className={cx('oru-icontile', 'oru-icontile--lg', `oru-tone--${tone}`)}>
          <Icon name={icon} size={24} />
        </span>
      )}
      <div className="oru-stat__body">
        <span className="oru-stat__label">{label}</span>
        <span className="oru-stat__value">{value}</span>
        {sub && <span className="oru-stat__sub">{sub}</span>}
      </div>
      {trendText && (
        <span className={cx('oru-stat__trend', `is-${direction}`)}>
          {direction !== 'flat' && <Icon name={direction === 'up' ? 'trend-up' : 'trend-down'} size={16} strokeWidth={2.4} />}
          <strong>{trendText}</strong>
          {trendLabel && <span>{trendLabel}</span>}
        </span>
      )}
    </div>
  );
}
