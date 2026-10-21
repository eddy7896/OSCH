import type { ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export type BannerTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BannerProps {
  /** Default `info`. */
  tone?: BannerTone;
  /** What happened, as a fact ("1 bus is delayed"). Already translated. */
  title: string;
  /** One sentence of detail: why, or what next. */
  children?: ReactNode;
  icon?: IconName;
  /** One `Button` at most. */
  action?: ReactNode;
  className?: string;
}

const TONE_ICON: Record<BannerTone, IconName> = { success: 'check-circle', warning: 'alert', danger: 'alert', info: 'bell', neutral: 'bell' };

/** A message inside the page about something that needs attention now. One per screen at most. A danger banner is announced at once (`alert`); the others politely (`status`). */
export function Banner({ tone = 'info', title, children, icon, action, className }: BannerProps) {
  return (
    <div className={cx('oru-banner', `oru-tone--${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon ?? TONE_ICON[tone]} size={24} />
      <div className="oru-banner__text">
        <strong>{title}</strong>
        {children && <span>{children}</span>}
      </div>
      {action}
    </div>
  );
}
