import { fireEvent, render, screen, within } from '@testing-library/react';
import { ActionTile, Avatar, Badge, Card, LinkAction, ListRow, StatCard } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Card', () => {
  it('is a labelled region named by its title, with subtitle, icon and action in the header', () => {
    const onAll = vi.fn();
    render(
      <Card title="Today" subtitle="Class 5B" icon="calendar" action={<LinkAction onClick={onAll}>View all</LinkAction>}>
        <p>body</p>
      </Card>,
    );
    const region = screen.getByRole('region', { name: 'Today' });
    expect(within(region).getByRole('heading', { level: 3, name: 'Today' })).toBeTruthy();
    expect(within(region).getByText('Class 5B')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(onAll).toHaveBeenCalledTimes(1);
  });
  it('without a title there is no header and no region name; the brand tone is a class; heading level is configurable', () => {
    const { container, rerender } = render(<Card tone="brand">only body</Card>);
    expect(container.querySelector('header')).toBeNull();
    expect(container.firstElementChild!.className).toContain('oru-card--brand');
    rerender(<Card title="T" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });
  it('two cards get different heading ids', () => {
    render(<><Card title="A" /><Card title="B" /></>);
    const ids = screen.getAllByRole('heading').map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<main><Card title="Today" action={<LinkAction>View all</LinkAction>}>x</Card></main>);
    await expectAccessible(container);
  });
});

describe('StatCard', () => {
  it('shows label, the pre-formatted value and sub; the value is not reformatted', () => {
    render(<StatCard label="Attendance today" value="₹1,82,40,000" sub="of 412 students" icon="users" />);
    expect(screen.getByText('Attendance today')).toBeTruthy();
    expect(screen.getByText('₹1,82,40,000')).toBeTruthy();
    expect(screen.getByText('of 412 students')).toBeTruthy();
  });
  it('trend up is signed and green, down is red, zero is neutral with no arrow, none shows nothing', () => {
    const { container, rerender } = render(<StatCard label="L" value="1" trend={4.25} trendLabel="vs. last week" locale="en" />);
    let t = container.querySelector('.oru-stat__trend')!;
    expect(t.className).toContain('is-up');
    expect(t.textContent).toBe('+4.3%vs. last week');
    expect(t.querySelector('svg')).toBeTruthy();
    rerender(<StatCard label="L" value="1" trend={-2} locale="en" />);
    t = container.querySelector('.oru-stat__trend')!;
    expect(t.className).toContain('is-down');
    expect(t.textContent).toMatch(/^[-−]2%$/);
    rerender(<StatCard label="L" value="1" trend={0} locale="en" />);
    t = container.querySelector('.oru-stat__trend')!;
    expect(t.className).toContain('is-flat');
    expect(t.querySelector('svg')).toBeNull();
    expect(t.textContent).toBe('0%');
    rerender(<StatCard label="L" value="1" />);
    expect(container.querySelector('.oru-stat__trend')).toBeNull();
  });
  it('the percentage follows the language of the person (Arabic digits)', () => {
    const { container } = render(<StatCard label="L" value="1" trend={12} locale="ar-EG" />);
    expect(container.querySelector('.oru-stat__trend strong')!.textContent).toMatch(/[٠-٩]/);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<StatCard label="Fees collected" value="₹10" icon="payments" trend={3} trendLabel="vs. last month" />);
    await expectAccessible(container);
  });
});

describe('ListRow', () => {
  it('static is a div; with onClick the whole row is one button and a chevron appears', () => {
    const onClick = vi.fn();
    const { container, rerender } = render(<ListRow title="Asha Kumar" subtitle="Class 5B" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    rerender(<ListRow title="Asha Kumar" subtitle="Class 5B" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Asha Kumar/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelector('svg')).toBeTruthy();
  });
  it('trailing replaces the chevron; leading and trailing are shown; size is a class (touch default)', () => {
    const { container } = render(<ListRow title="T" leading="12" trailing={<Badge tone="success">Paid</Badge>} onClick={() => {}} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(container.firstElementChild!.className).toContain('oru-row--touch');
  });
  it('compact size, and asItem wraps the row in a list item', () => {
    const { container } = render(<ul><ListRow asItem size="compact" title="a" /><ListRow asItem title="b" onClick={() => {}} /></ul>);
    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.querySelector('.oru-row--compact')).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<ul><ListRow asItem leading={<Avatar name="Asha Kumar" />} title="Asha Kumar" subtitle="Class 5B" onClick={() => {}} /><ListRow asItem title="Ravi" trailing="9:00" /></ul>);
    await expectAccessible(container);
  });
});

describe('ActionTile', () => {
  it('is a button with title and description, primary by default, and calls onClick', () => {
    const onClick = vi.fn();
    render(<ActionTile title="Boarding" description="Mark students on" icon="bus" onClick={onClick} />);
    const b = screen.getByRole('button', { name: /Boarding/ });
    expect(b.className).toContain('oru-tile--primary');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('solid applies to coloured tones but never to neutral; disabled blocks clicks', () => {
    const onClick = vi.fn();
    const { rerender } = render(<ActionTile title="A" tone="success" solid />);
    expect(screen.getByRole('button').className).toContain('oru-tile--solid');
    rerender(<ActionTile title="A" tone="neutral" solid />);
    expect(screen.getByRole('button').className).not.toContain('oru-tile--solid');
    rerender(<ActionTile title="A" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
  it('has no accessibility violations', async () => {
    const { container } = render(<div><ActionTile title="Boarding" icon="bus" tone="success" solid /><ActionTile title="Contact" description="School office" icon="phone" tone="danger" /></div>);
    await expectAccessible(container);
  });
});
