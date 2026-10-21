import { render } from '@testing-library/react';
import { ICON_NAMES, Icon } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Icon', () => {
  it('draws every icon of the design set (38), each with real shapes', () => {
    expect(ICON_NAMES).toHaveLength(38);
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      const svg = container.querySelector('svg')!;
      expect(svg.querySelectorAll('path, circle, rect').length, name).toBeGreaterThan(0);
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      unmount();
    }
  });

  it('draws in currentColor with round caps at the design stroke, so it always matches its label', () => {
    const svg = render(<Icon name="check" />).container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke-linecap')).toBe('round');
    expect(svg.getAttribute('stroke-linejoin')).toBe('round');
    expect(svg.getAttribute('stroke-width')).toBe('1.9');
  });

  it('is decorative by default (hidden from screen readers) and an image only when given a label', () => {
    const decorative = render(<Icon name="bell" />).container.querySelector('svg')!;
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.getAttribute('role')).toBeNull();
    const labelled = render(<Icon name="bell" label="Notifications" />).container.querySelector('svg')!;
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Notifications');
    expect(labelled.getAttribute('aria-hidden')).toBeNull();
  });

  it('size defaults to 20 and takes the design sizes', () => {
    expect(render(<Icon name="check" />).container.querySelector('svg')!.getAttribute('width')).toBe('20');
    for (const size of [16, 24, 28, 32] as const) expect(render(<Icon name="check" size={size} />).container.querySelector('svg')!.getAttribute('height')).toBe(String(size));
  });

  it('only the icons that point somewhere are mirrored in right-to-left', () => {
    const mirrored = ICON_NAMES.filter((n) => render(<Icon name={n} />).container.querySelector('svg')!.classList.contains('oru-icon--directional'));
    expect(mirrored.sort()).toEqual(['arrow-left', 'chevron-right', 'send']);
  });

  it('passes axe, decorative and labelled', async () => {
    const { container } = render(
      <div>
        <Icon name="home" />
        <Icon name="bell" label="Notifications" />
      </div>,
    );
    await expectAccessible(container);
  });
});
