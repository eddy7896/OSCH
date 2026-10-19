import { cx } from './cx.js';

export interface AvatarProps {
  /** Always: it is the label and the fallback. */
  name: string;
  src?: string;
  /** 32 in lists, 40 default, 56 in profile headers. */
  size?: 32 | 40 | 56 | number;
  className?: string;
}

/** First letter of the first and last word, whatever the script (letters are taken as whole user-perceived characters). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = (w: string) => {
    const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(w)[Symbol.iterator]().next().value?.segment : Array.from(w)[0];
    return (seg ?? '?').toLocaleUpperCase();
  };
  return words.length === 1 ? first(words[0]!) : first(words[0]!) + first(words[words.length - 1]!);
}

/** A person's photo, or their initials (never a generic silhouette). */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  return (
    <span className={cx('oru-avatar', className)} style={{ inlineSize: size, blockSize: size, fontSize: Math.round(size * 0.38) }}>
      {src ? <img src={src} alt={name} /> : <span role="img" aria-label={name}>{initialsOf(name)}</span>}
    </span>
  );
}
