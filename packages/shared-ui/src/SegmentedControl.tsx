import { useRef, useState, type KeyboardEvent } from 'react';
import { cx } from './cx.js';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Two to four options; beyond that use a select or a list. */
  options: readonly SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** For screen readers: what is being chosen ("View"). */
  label: string;
  size?: 'compact' | 'comfortable' | 'touch';
  className?: string;
}

/** Switches between 2-4 views of the same content. Exposed as a radio group (it chooses a value; it has no tab panels). */
export function SegmentedControl({ options, value, defaultValue, onChange, label, size = 'comfortable', className }: SegmentedControlProps) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (i: number) => {
    const option = options[i];
    if (!option) return;
    setInner(option.value);
    onChange?.(option.value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = Math.max(0, options.findIndex((o) => o.value === current));
    const dir = e.currentTarget.closest('[dir]')?.getAttribute('dir'); // the page's declared direction (html dir), else what the browser computed
    const rtl = dir ? dir === 'rtl' : getComputedStyle(e.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: number | undefined;
    if (e.key === forward || e.key === 'ArrowDown') next = (i + 1) % options.length;
    else if (e.key === backward || e.key === 'ArrowUp') next = (i - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    select(next);
  };

  return (
    <div role="radiogroup" aria-label={label} className={cx('oru-seg', `oru-seg--${size}`, className)} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.value === current;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={cx('oru-seg__opt', on && 'is-on')}
            onClick={() => select(i)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
