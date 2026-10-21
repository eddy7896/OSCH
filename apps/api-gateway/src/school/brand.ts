/** A school's brand colour must be a plain #RRGGBB and dark enough for white text on it (WCAG AA, 4.5:1), because primary buttons carry white text. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Contrast ratio of white text on the given background colour (1 to 21). */
export const contrastWithWhite = (hex: string): number => 1.05 / (luminance(hex) + 0.05);

export const MIN_CONTRAST = 4.5;
export const isUsableBrandColor = (hex: string): boolean => HEX_COLOR.test(hex) && contrastWithWhite(hex) >= MIN_CONTRAST;
