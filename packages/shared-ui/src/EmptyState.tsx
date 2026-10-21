import type { ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export interface EmptyStateProps {
  /** What is missing, in plain words ("No messages yet"). Friendly, never blaming. Already translated. */
  title: string;
  /** What will appear here and when. */
  description?: string;
  icon?: IconName;
  /** One `Button`, only if the person can actually create the thing. */
  action?: ReactNode;
  /** The heading level that fits the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** What a screen shows when there is nothing yet. */
export function EmptyState({ title, description, icon = 'inbox', action, headingLevel = 3, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cx('oru-empty', className)}>
      <span className="oru-icontile oru-icontile--xl oru-tone--brand">
        <Icon name={icon} size={32} />
      </span>
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
