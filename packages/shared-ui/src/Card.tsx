import { useId, type ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  /** Usually a `LinkAction` ("View all"). */
  action?: ReactNode;
  /** `brand` is the identity strip. */
  tone?: 'brand';
  /** The heading level that fits the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4;
  children?: ReactNode;
  className?: string;
}

/** The basic container for one group of related information. One idea per card; do not nest cards. */
export function Card({ title, subtitle, icon, action, tone, headingLevel = 3, children, className }: CardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <section className={cx('oru-card', tone && `oru-card--${tone}`, className)} aria-labelledby={title ? headingId : undefined}>
      {(title || action) && (
        <header className="oru-card__head">
          {icon && (
            <span className="oru-icontile oru-tone--brand">
              <Icon name={icon} size={20} />
            </span>
          )}
          <div className="oru-card__titles">
            {title && <Heading id={headingId}>{title}</Heading>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="oru-card__action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
