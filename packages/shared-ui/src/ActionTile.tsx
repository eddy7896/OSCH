import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export interface ActionTileProps {
  /** One or two words, already translated ("Boarding"). */
  title: string;
  /** One short line. */
  description?: string;
  icon?: IconName;
  /** Default `primary`. */
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
  /** For the one or two most important tiles (not `neutral`). */
  solid?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/** A big, glanceable action for the Driver app and the Quick Actions row. At least 112px tall. Not for navigation lists: use `ListRow`. */
export function ActionTile({ title, description, icon, tone = 'primary', solid, onClick, disabled, className }: ActionTileProps) {
  return (
    <button type="button" className={cx('oru-tile', `oru-tile--${tone}`, solid && tone !== 'neutral' && 'oru-tile--solid', className)} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={32} />}
      <span className="oru-tile__title">{title}</span>
      {description && <span className="oru-tile__desc">{description}</span>}
    </button>
  );
}
