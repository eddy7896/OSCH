import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export type Density = 'compact' | 'comfortable' | 'touch' | 'driver';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Default `secondary`. At most ONE `primary` per screen. `danger` only to confirm something destructive. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** The app's density: compact/comfortable in the Web ERP, touch on phones (default), driver in the Driver app. */
  size?: Density;
  icon?: IconName;
  iconRight?: IconName;
  /** Full width (the sticky bottom action on phones). */
  block?: boolean;
  /** The label: starts with a verb and says what happens ("Submit attendance"). */
  children: ReactNode;
}

/** A button runs one action. Never a link, never icon-only except back, close and search (give those an `aria-label`). */
export function Button({ variant = 'secondary', size = 'touch', icon, iconRight, block, className, type = 'button', children, ...rest }: ButtonProps) {
  const iconSize = size === 'driver' ? 28 : 20;
  return (
    <button {...rest} type={type} className={cx('oru-btn', `oru-btn--${variant}`, `oru-btn--${size}`, block && 'oru-btn--block', className)}>
      {icon && <Icon name={icon} size={iconSize} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
