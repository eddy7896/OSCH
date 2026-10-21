import type { ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon } from './Icon.js';

export interface ListRowProps {
  /** The person or thing. */
  title: ReactNode;
  /** One line of context. Never three lines. */
  subtitle?: ReactNode;
  /** Roll number, time, an `Avatar`. */
  leading?: ReactNode;
  /** A `StatusPill`, time, `Badge`. */
  trailing?: ReactNode;
  /** Makes the whole row one button (and adds a chevron when there is no `trailing`). */
  onClick?: () => void;
  /** `touch` on phones (64px tall at least), `compact` in the Web ERP. */
  size?: 'compact' | 'touch';
  /** Wrap the row in an `<li>`, for rows inside a `<ul>`. */
  asItem?: boolean;
  className?: string;
}

/** A row in a list: students, classes, messages, tasks. */
export function ListRow({ title, subtitle, leading, trailing, onClick, size = 'touch', asItem, className }: ListRowProps) {
  const cls = cx('oru-row', `oru-row--${size}`, onClick && 'oru-row--link', className);
  const content = (
    <>
      {leading != null && <span className="oru-row__lead">{leading}</span>}
      <span className="oru-row__main">
        <span className="oru-row__title">{title}</span>
        {subtitle != null && <span className="oru-row__sub">{subtitle}</span>}
      </span>
      {trailing != null && <span className="oru-row__trail">{trailing}</span>}
      {onClick && trailing == null && <Icon name="chevron-right" size={20} className="oru-row__chev" />}
    </>
  );
  const row = onClick ? (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
  return asItem ? <li className="oru-row-item">{row}</li> : row;
}
