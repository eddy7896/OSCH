import { Badge } from './Badge.js';
import { cx } from './cx.js';
import { Icon } from './Icon.js';
import { Logo } from './Logo.js';
import type { NavItem } from './NavItem.js';

export interface SideNavSection {
  /** Already translated. Order follows the ERP: Overview, Academics, People, HR, Finance, Communication, Transport, Operations, Reports, Administration. */
  title?: string;
  items: readonly NavItem[];
}

export interface SideNavProps {
  /** Built from the person's permissions: modules they cannot open are left out, never shown disabled. */
  sections: readonly SideNavSection[];
  active: string;
  onChange?: (key: string) => void;
  /** The name of this navigation for screen readers, already translated ("Modules"). */
  label: string;
  /** The school's name under the logo. */
  school?: string;
  /** Replaces the OruSchools logo with a product name. */
  product?: string;
  className?: string;
}

/** The persistent module navigation of the Web ERP. */
export function SideNav({ sections, active, onChange, label, school, product, className }: SideNavProps) {
  return (
    <nav className={cx('oru-snav', className)} aria-label={label}>
      <div className="oru-snav__brand">
        {product ? <strong>{product}</strong> : <Logo size={26} />}
        {school && <span>{school}</span>}
      </div>
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="oru-snav__sec">
          {section.title && <span className="oru-snav__title">{section.title}</span>}
          {section.items.map((item) => {
            const on = item.key === active;
            return (
              <button key={item.key} type="button" className={cx('oru-snav__item', on && 'is-on')} aria-current={on ? 'page' : undefined} onClick={() => onChange?.(item.key)}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
                {item.badge ? <Badge count={item.badge} label={item.badgeLabel ?? String(item.badge)} /> : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
