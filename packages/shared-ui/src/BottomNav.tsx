import { Badge } from './Badge.js';
import { cx } from './cx.js';
import { Icon } from './Icon.js';
import type { NavItem } from './NavItem.js';

export interface BottomNavProps {
  /** 3 to 5 items, each with an icon and a word. */
  items: readonly NavItem[];
  active: string;
  onChange?: (key: string) => void;
  /** The name of this navigation for screen readers, already translated ("Main"). */
  label: string;
  className?: string;
}

/** The main navigation of every mobile app. Always icon + label. Sits at the bottom edge and keeps clear of the home indicator. */
export function BottomNav({ items, active, onChange, label, className }: BottomNavProps) {
  return (
    <nav className={cx('oru-bnav', className)} aria-label={label}>
      {items.map((item) => {
        const on = item.key === active;
        return (
          <button key={item.key} type="button" className={cx('oru-bnav__item', on && 'is-on')} aria-current={on ? 'page' : undefined} onClick={() => onChange?.(item.key)}>
            <span className="oru-bnav__icon">
              <Icon name={item.icon} size={24} />
              {item.badge ? <Badge count={item.badge} label={item.badgeLabel ?? String(item.badge)} /> : null}
            </span>
            <span className="oru-bnav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
