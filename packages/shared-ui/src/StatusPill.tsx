import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';
import type { Tone } from './Badge.js';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'medical' | 'halfday' | 'excused';

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'absent', 'late', 'leave', 'medical', 'halfday', 'excused'];

/** Fixed colour and icon per status; never re-mapped per school (only the word may be renamed). */
const LOOK: Record<AttendanceStatus, { icon: IconName; tone: Tone }> = {
  present: { icon: 'check', tone: 'success' },
  absent: { icon: 'x', tone: 'danger' },
  late: { icon: 'clock', tone: 'warning' },
  leave: { icon: 'leave', tone: 'info' },
  medical: { icon: 'medical', tone: 'purple' },
  halfday: { icon: 'halfday', tone: 'teal' },
  excused: { icon: 'more', tone: 'neutral' },
};

interface Common {
  status: AttendanceStatus;
  /** The word for this status in the person's language (or the school's own name for it). The word is always shown: colour alone is never enough. */
  label: string;
  className?: string;
}
export type StatusPillProps = (Common & { interactive?: false; onClick?: never }) | (Common & { interactive: true; onClick: () => void });

/** A student's attendance status as icon + word. Interactive when tapping it changes the status. */
export function StatusPill(props: StatusPillProps) {
  const { status, label, className } = props;
  const look = LOOK[status];
  const cls = cx('oru-pill', `oru-tone--${look.tone}`, props.interactive && 'oru-pill--btn', className);
  if (props.interactive) {
    return (
      <button type="button" className={cls} onClick={props.onClick} data-status={status}>
        <Icon name={look.icon} size={20} strokeWidth={2.4} />
        <span>{label}</span>
        <Icon name="chevron-down" size={20} className="oru-pill__chev" />
      </button>
    );
  }
  return (
    <span className={cls} data-status={status}>
      <Icon name={look.icon} size={20} strokeWidth={2.4} />
      <span>{label}</span>
    </span>
  );
}
