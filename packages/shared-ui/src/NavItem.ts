import type { IconName } from './Icon.js';

export interface NavItem {
  key: string;
  /** Already translated. */
  label: string;
  icon: IconName;
  /** Unread count on this item. Needs `badgeLabel`. */
  badge?: number;
  /** What the count means, already translated ("3 new messages"). Required when `badge` is set. */
  badgeLabel?: string;
}
