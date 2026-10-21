import { Button } from './Button.js';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';
import type { Tone } from './Badge.js';

export type SyncState = 'synced' | 'saved' | 'pending' | 'syncing' | 'offline' | 'failed';

const LOOK: Record<SyncState, { icon: IconName; tone: Tone }> = {
  synced: { icon: 'check-circle', tone: 'success' },
  saved: { icon: 'device', tone: 'warning' },
  pending: { icon: 'upload', tone: 'warning' },
  syncing: { icon: 'refresh', tone: 'info' },
  offline: { icon: 'cloud-off', tone: 'neutral' },
  failed: { icon: 'alert', tone: 'danger' },
};

export interface SyncStatusProps {
  state: SyncState;
  /** The fixed wording for this state, already translated ("Synced", "Saved on device", "You're offline", "Sync failed"). */
  title: string;
  /** "2 mins ago", "5 changes pending". */
  detail?: string;
  /** `pill` in headers and home screens; `banner` at the top of a workflow screen (only when something is pending, offline or failed). */
  variant?: 'pill' | 'banner';
  /** Banner only: the action ("Upload now", "Retry"). Both props, or neither. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Whether work is safe on the server. Saving locally is success: this never blocks the screen. */
export function SyncStatus({ state, title, detail, variant = 'pill', actionLabel, onAction, className }: SyncStatusProps) {
  const look = LOOK[state];
  const role = state === 'failed' ? 'alert' : 'status';
  const spin = state === 'syncing' ? 'oru-spin' : undefined;
  if (variant === 'pill') {
    return (
      <span className={cx('oru-sync', `oru-tone--${look.tone}`, className)} role={role}>
        <Icon name={look.icon} size={16} strokeWidth={2.2} className={spin} />
        <span className="oru-sync__title">{title}</span>
        {detail && <span className="oru-sync__detail">{detail}</span>}
      </span>
    );
  }
  return (
    <div className={cx('oru-syncbar', `oru-tone--${look.tone}`, className)} role={role}>
      <Icon name={look.icon} size={24} className={spin} />
      <div className="oru-syncbar__text">
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="comfortable" icon={state === 'failed' ? 'refresh' : 'upload'} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
