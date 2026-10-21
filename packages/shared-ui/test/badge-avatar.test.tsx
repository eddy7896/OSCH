import { render, screen } from '@testing-library/react';
import { Avatar, Badge, initialsOf, type Tone } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Badge', () => {
  it('words with a tone; neutral by default; the dot is decorative', () => {
    const { container, rerender } = render(<Badge>Pending</Badge>);
    expect(container.firstElementChild!.className).toBe('oru-badge oru-tone--neutral');
    for (const tone of ['success', 'warning', 'danger', 'info', 'purple', 'teal', 'neutral', 'brand'] as Tone[]) {
      rerender(<Badge tone={tone} dot>Active route</Badge>);
      expect(container.firstElementChild!.className).toContain(`oru-tone--${tone}`);
      expect(container.querySelector('.oru-badge__dot')!.getAttribute('aria-hidden')).toBe('true');
      expect(container.textContent).toBe('Active route');
    }
  });

  it('a count shows the number, 99+ above 99, and is announced with the caller\'s translated label (no built-in English)', () => {
    const { rerender } = render(<Badge count={3} label="3 new messages" />);
    expect(screen.getByRole('status', { name: '3 new messages' }).textContent).toBe('3');
    rerender(<Badge count={99} label="99 new" />);
    expect(screen.getByRole('status').textContent).toBe('99');
    rerender(<Badge count={100} label="over 99 new" />);
    expect(screen.getByRole('status').textContent).toBe('99+');
    rerender(<Badge count={-4} label="none" />);
    expect(screen.getByRole('status').textContent).toBe('0');
    rerender(<Badge count={7.9} label="7" />);
    expect(screen.getByRole('status').textContent).toBe('7');
  });

  it('passes axe', async () => {
    const { container } = render(
      <div>
        <Badge tone="success" dot>Synced</Badge>
        <Badge count={12} label="12 new notices" />
      </div>,
    );
    await expectAccessible(container);
  });
});

describe('initialsOf', () => {
  it.each([
    ['Ayesha Khan', 'AK'],
    ['ayesha khan', 'AK'],
    ['Ayesha', 'A'],
    ['  Ayesha   Bano   Khan ', 'AK'],
    ['आशा कुमार', 'आकु'], // "कु" is ONE user-perceived character (consonant + vowel sign), so the initial is the whole syllable
    ['عائشہ خان', 'عخ'],
    ['अनिल', 'अ'],
    ['Élise Brontë', 'ÉB'],
    ['', '?'],
    ['   ', '?'],
  ])('"%s" -> "%s"', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it('takes whole user-perceived characters, not code units (a decomposed accent or an emoji is not split)', () => {
    expect(initialsOf('Élise Z')).toBe('ÉZ'.toLocaleUpperCase());
    expect(initialsOf('👩🏽‍🏫 Teacher')).toBe('👩🏽‍🏫T');
  });
});

describe('Avatar', () => {
  it('shows initials as an image with the name as its label; never a generic silhouette', () => {
    render(<Avatar name="Ayesha Khan" />);
    const img = screen.getByRole('img', { name: 'Ayesha Khan' });
    expect(img.textContent).toBe('AK');
  });

  it('shows the photo when there is one, with the name as alt text', () => {
    render(<Avatar name="Ayesha Khan" src="/ayesha.jpg" />);
    expect(screen.getByRole('img', { name: 'Ayesha Khan' }).getAttribute('src')).toBe('/ayesha.jpg');
  });

  it('size sets a square in logical units with proportional text', () => {
    const { container } = render(<Avatar name="A B" size={56} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.inlineSize).toBe('56px');
    expect(el.style.blockSize).toBe('56px');
    expect(el.style.fontSize).toBe('21px');
  });

  it('passes axe', async () => {
    const { container } = render(
      <div>
        <Avatar name="Ayesha Khan" />
        <Avatar name="आशा कुमार" size={56} />
        <Avatar name="Ravi" src="/r.jpg" size={32} />
      </div>,
    );
    await expectAccessible(container);
  });
});
