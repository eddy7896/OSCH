import { fireEvent, render, screen } from '@testing-library/react';
import { Banner, EmptyState, ATTENDANCE_STATUSES, StatusPill, SyncStatus, Button } from '../src/index.js';
import type { SyncState } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Banner', () => {
  it('shows the title as the fact and the children as the detail', () => {
    render(<Banner tone="warning" title="1 bus is delayed">Route 4 is stuck at the bridge.</Banner>);
    expect(screen.getByRole('status').textContent).toContain('1 bus is delayed');
    expect(screen.getByText('Route 4 is stuck at the bridge.')).toBeTruthy();
  });
  it('danger is announced at once (alert); every other tone politely (status)', () => {
    const { rerender } = render(<Banner tone="danger" title="Payment failed" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    for (const tone of ['success', 'warning', 'info', 'neutral'] as const) {
      rerender(<Banner tone={tone} title="x" />);
      expect(screen.getByRole('status').className).toContain(`oru-tone--${tone}`);
    }
  });
  it('defaults to info, always draws an icon beside the words, and renders the action', () => {
    const onAction = vi.fn();
    const { container } = render(<Banner title="Update" action={<Button onClick={onAction}>View</Button>} />);
    expect(screen.getByRole('status').className).toContain('oru-tone--info');
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<Banner tone="danger" title="Sync failed">Try again.</Banner>);
    await expectAccessible(container);
  });
});

describe('EmptyState', () => {
  it('is a heading plus description, with a default icon, and no action unless given', () => {
    const { container } = render(<EmptyState title="No messages yet" description="Messages from the school appear here." />);
    expect(screen.getByRole('heading', { level: 3, name: 'No messages yet' })).toBeTruthy();
    expect(screen.getByText('Messages from the school appear here.')).toBeTruthy();
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('the heading level follows the page outline', () => {
    render(<EmptyState title="Nothing" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });
  it('renders the single action', () => {
    render(<EmptyState title="No students yet" action={<Button variant="primary">Add student</Button>} />);
    expect(screen.getByRole('button', { name: 'Add student' })).toBeTruthy();
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<main><EmptyState title="No messages yet" description="x" /></main>);
    await expectAccessible(container);
  });
});

describe('StatusPill', () => {
  const expected = { present: 'success', absent: 'danger', late: 'warning', leave: 'info', medical: 'purple', halfday: 'teal', excused: 'neutral' } as const;
  it('uses the fixed colour per status and always shows the given word with an icon', () => {
    expect(ATTENDANCE_STATUSES).toEqual(Object.keys(expected));
    for (const status of ATTENDANCE_STATUSES) {
      const { container, unmount } = render(<StatusPill status={status} label={`word-${status}`} />);
      expect(container.firstElementChild!.className).toContain(`oru-tone--${expected[status]}`);
      expect(container.firstElementChild!.textContent).toBe(`word-${status}`);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });
  it('a school can rename the word without changing the colour', () => {
    const { container } = render(<StatusPill status="late" label="Tardy" />);
    expect(container.textContent).toBe('Tardy');
    expect(container.firstElementChild!.className).toContain('oru-tone--warning');
  });
  it('static is not a button; interactive is a button that calls onClick and shows a chevron', () => {
    const { rerender, container } = render(<StatusPill status="present" label="Present" />);
    expect(screen.queryByRole('button')).toBeNull();
    const onClick = vi.fn();
    rerender(<StatusPill status="present" label="Present" interactive onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Present' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('svg').length).toBe(2);
  });
  it('has no accessibility violations (static and interactive)', async () => {
    const { container } = render(<div><StatusPill status="absent" label="Absent" /><StatusPill status="late" label="Late" interactive onClick={() => {}} /></div>);
    await expectAccessible(container);
  });
});

describe('SyncStatus', () => {
  const states: SyncState[] = ['synced', 'saved', 'pending', 'syncing', 'offline', 'failed'];
  it('shows the given words for every state as a pill, with an icon', () => {
    for (const state of states) {
      const { container, unmount } = render(<SyncStatus state={state} title={`t-${state}`} detail="2 mins ago" />);
      expect(container.textContent).toBe(`t-${state}2 mins ago`);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });
  it('only the syncing icon spins; failed is announced at once', () => {
    const { container, rerender } = render(<SyncStatus state="syncing" title="Syncing" />);
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('oru-spin');
    rerender(<SyncStatus state="failed" title="Failed" />);
    expect(container.querySelector('svg')!.getAttribute('class')).not.toContain('oru-spin');
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('the banner offers the action, refresh icon for failed, and calls it', () => {
    const onAction = vi.fn();
    render(<SyncStatus state="failed" variant="banner" title="Sync failed" detail="3 changes" actionLabel="Retry" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
  it('no action button without both actionLabel and onAction; the pill never has one', () => {
    const { rerender } = render(<SyncStatus state="pending" variant="banner" title="Pending" actionLabel="Upload now" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<SyncStatus state="pending" title="Pending" actionLabel="Upload now" onAction={() => {}} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<div><SyncStatus state="synced" title="Synced" /><SyncStatus state="pending" variant="banner" title="Pending" actionLabel="Upload now" onAction={() => {}} /></div>);
    await expectAccessible(container);
  });
});
