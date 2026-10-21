import { fireEvent, render, screen, within } from '@testing-library/react';
import { BottomNav, Logo, SideNav } from '../src/index.js';
import type { NavItem } from '../src/index.js';
import { expectAccessible } from './axe.js';

const tabs: NavItem[] = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'classes', label: 'Classes', icon: 'book' },
  { key: 'messages', label: 'Messages', icon: 'message', badge: 3, badgeLabel: '3 new messages' },
  { key: 'more', label: 'More', icon: 'more' },
];

describe('BottomNav', () => {
  it('is a named navigation of icon + word buttons; the active tab is aria-current', () => {
    const { container } = render(<BottomNav label="Main" items={tabs} active="classes" />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((b) => b.querySelector('.oru-bnav__label')!.textContent)).toEqual(['Today', 'Classes', 'Messages', 'More']);
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual([null, 'page', null, null]);
    expect(container.querySelectorAll('.oru-bnav__item svg').length).toBe(4);
  });
  it('calls onChange with the key of the tapped tab', () => {
    const onChange = vi.fn();
    render(<BottomNav label="Main" items={tabs} active="today" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Classes/ }));
    expect(onChange).toHaveBeenCalledWith('classes');
  });
  it('the count badge carries its translated meaning and only appears when there is a count', () => {
    render(<BottomNav label="Main" items={tabs} active="today" />);
    expect(screen.getByRole('status', { name: '3 new messages' })).toBeTruthy();
    expect(screen.getAllByRole('status').length).toBe(1);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<BottomNav label="Main" items={tabs} active="today" />);
    await expectAccessible(container);
  });
});

describe('SideNav', () => {
  const sections = [
    { title: 'Overview', items: [{ key: 'home', label: 'Home', icon: 'home' as const }] },
    { title: 'People', items: [{ key: 'students', label: 'Students', icon: 'users' as const }, { key: 'msgs', label: 'Messages', icon: 'message' as const, badge: 120, badgeLabel: 'Many new messages' }] },
  ];
  it('is a named navigation with section titles, the active item marked, and the school under the logo', () => {
    render(<SideNav label="Modules" sections={sections} active="students" school="Greenfield School" />);
    const nav = screen.getByRole('navigation', { name: 'Modules' });
    expect(within(nav).getByText('Overview')).toBeTruthy();
    expect(within(nav).getByText('People')).toBeTruthy();
    expect(within(nav).getByText('Greenfield School')).toBeTruthy();
    expect(within(nav).getByRole('img', { name: 'OruSchools' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Students' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });
  it('shows the product name instead of the logo when given; caps big counts at 99+', () => {
    render(<SideNav label="Modules" sections={sections} active="home" product="Platform admin" />);
    expect(screen.getByText('Platform admin')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'OruSchools' })).toBeNull();
    expect(screen.getByRole('status', { name: 'Many new messages' }).textContent).toBe('99+');
  });
  it('calls onChange with the key', () => {
    const onChange = vi.fn();
    render(<SideNav label="Modules" sections={sections} active="home" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Students' }));
    expect(onChange).toHaveBeenCalledWith('students');
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<SideNav label="Modules" sections={sections} active="home" school="Greenfield School" />);
    await expectAccessible(container);
  });
});

describe('Logo', () => {
  it('has the brand name as its accessible name; the app name is added when given', () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByRole('img', { name: 'OruSchools' })).toBeTruthy();
    rerender(<Logo app="Teacher" />);
    expect(screen.getByRole('img', { name: 'OruSchools Teacher' })).toBeTruthy();
    expect(screen.getByText('Teacher')).toBeTruthy();
  });
  it('the mark variant is only the mark', () => {
    const { container } = render(<Logo variant="mark" size={24} />);
    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('24');
  });
  it('tones use design tokens, never raw colours', () => {
    const { container, rerender } = render(<Logo />);
    expect(container.querySelector('path')!.getAttribute('stroke')).toBe('var(--primary-text)');
    rerender(<Logo tone="white" />);
    expect(container.querySelector('path')!.getAttribute('stroke')).toBe('var(--on-primary)');
    rerender(<Logo tone="ink" />);
    expect(container.querySelector('path')!.getAttribute('stroke')).toBe('var(--text)');
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<Logo app="Parent" />);
    await expectAccessible(container);
  });
});
