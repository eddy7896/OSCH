import type { ReactNode } from 'react';
import { cx } from './cx.js';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'neutral' | 'brand';

export interface TextBadgeProps {
  tone?: Tone;
  /** A small coloured dot before the words. */
  dot?: boolean;
  /** One or two words ("Pending", "Active route"). */
  children: ReactNode;
  className?: string;
}

export interface CountBadgeProps {
  /** The unread count. Shows `99+` above 99. Only on navigation items and the bell, never on content. */
  count: number;
  /** What the count means, already translated, for screen readers ("3 new messages"). */
  label: string;
  className?: string;
}

export type BadgeProps = TextBadgeProps | CountBadgeProps;

export function Badge(props: BadgeProps) {
  if ('count' in props) {
    return (
      <span className={cx('oru-count', props.className)} role="status" aria-label={props.label}>
        <span aria-hidden="true">{props.count > 99 ? '99+' : String(Math.max(0, Math.trunc(props.count)))}</span>
      </span>
    );
  }
  return (
    <span className={cx('oru-badge', `oru-tone--${props.tone ?? 'neutral'}`, props.className)}>
      {props.dot && <span className="oru-badge__dot" aria-hidden="true" />}
      {props.children}
    </span>
  );
}
