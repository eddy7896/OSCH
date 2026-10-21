import type { ReactNode } from 'react';
import { cx } from './cx.js';
import { Icon } from './Icon.js';

export interface LinkActionProps {
  /** Words that say where it goes ("View all"). Already translated. */
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** The small "View all >" action at the top-end of a card. The chevron mirrors in right-to-left layouts. */
export function LinkAction({ children, onClick, className }: LinkActionProps) {
  return (
    <button type="button" className={cx('oru-link', className)} onClick={onClick}>
      {children}
      <Icon name="chevron-right" size={16} />
    </button>
  );
}
