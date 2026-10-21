import { useId, type ChangeEventHandler } from 'react';
import { cx } from './cx.js';
import { Icon } from './Icon.js';

export interface CheckboxProps {
  label: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  name?: string;
  value?: string;
  /** For to-do lists: a ticked item is muted and struck through. Off by default, because a struck-through "Remember me" reads as the opposite of what was chosen. */
  strikeWhenChecked?: boolean;
  className?: string;
}

/** A tick box with a label; the whole row is the tap target (48px tall). */
export function Checkbox({ label, description, strikeWhenChecked, className, ...input }: CheckboxProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <label className={cx('oru-check', strikeWhenChecked && 'oru-check--task', className)}>
      {/* Named by the label text alone; the description is read after it (not part of the name). */}
      <input type="checkbox" {...input} aria-labelledby={labelId} aria-describedby={description ? descId : undefined} />
      <span className="oru-check__box" aria-hidden="true">
        <Icon name="check" size={16} strokeWidth={3} />
      </span>
      <span className="oru-check__text">
        <span className="oru-check__label" id={labelId}>
          {label}
        </span>
        {description && (
          <span className="oru-check__desc" id={descId}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
