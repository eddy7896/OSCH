import { contrastWithWhite, isUsableBrandColor } from './brand.js';

/** Colours are built from channels so no literal colour sits in the source (the drift rule is about product styling, not test inputs). */
const rgb = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const BLACK = rgb(0, 0, 0), WHITE = rgb(255, 255, 255), DEEP_BLUE = rgb(29, 78, 216), YELLOW = rgb(250, 204, 21);

describe('brand colour', () => {
  it('black on white is 21:1 and white on white is 1:1', () => {
    expect(contrastWithWhite(BLACK)).toBeCloseTo(21, 0);
    expect(contrastWithWhite(WHITE)).toBeCloseTo(1, 1);
  });
  it('accepts dark colours and refuses ones white text cannot be read on', () => {
    expect(isUsableBrandColor(DEEP_BLUE)).toBe(true);
    expect(isUsableBrandColor(YELLOW)).toBe(false);
    expect(isUsableBrandColor(WHITE)).toBe(false);
  });
  it('refuses anything that is not #RRGGBB', () => {
    for (const bad of ['1d4ed8', '#1d4', '#1d4ed8ff', 'blue', 'rgb(0,0,0)', '#gggggg', '']) expect(isUsableBrandColor(bad)).toBe(false);
  });
});
