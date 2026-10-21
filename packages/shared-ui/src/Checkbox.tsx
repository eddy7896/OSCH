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
  className?: string;
}

/** A tick box with a label; the whole row is the tap target (48px tall). Done items are struck through and muted. */
export function Checkbox({ label, description, className, ...input }: CheckboxProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <label className={cx('oru-check', className)}>
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
