import { useId, type InputHTMLAttributes } from 'react';
import { cx } from './cx.js';
import { Icon, type IconName } from './Icon.js';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Above the field, always. Only a search field may leave it out, and then it needs an `aria-label`. */
  label?: string;
  hint?: string;
  /** What to do, not what went wrong ("Marks cannot be more than 50."). */
  error?: string;
  icon?: IconName;
  /** The app's density; 16px text on phones so the screen does not zoom. */
  size?: 'compact' | 'comfortable' | 'touch';
  multiline?: boolean;
}

export function TextField({ label, hint, error, icon, size = 'touch', multiline, className, id: idProp, ...rest }: TextFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const messageId = `${id}-msg`;
  const message = error ?? hint;
  const shared = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': message ? messageId : undefined } as const;
  return (
    <div className={cx('oru-field', `oru-field--${size}`, error && 'oru-field--error', className)}>
      {label && (
        <label className="oru-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="oru-field__box">
        {icon && <Icon name={icon} size={20} />}
        {multiline ? <textarea {...(rest as object)} {...shared} /> : <input {...rest} {...shared} />}
      </div>
      {message && (
        <p id={messageId} className="oru-field__msg">
          {error && <Icon name="alert" size={16} />}
          {message}
        </p>
      )}
    </div>
  );
}
