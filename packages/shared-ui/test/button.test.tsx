import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Button', () => {
  it('is a real button, type "button" by default so it never submits a form by accident', () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('type="submit" is honoured', () => {
    const onSubmit = vi.fn((e: { preventDefault(): void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" variant="primary">Submit attendance</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('variant and density become classes; secondary and touch are the defaults', () => {
    const { rerender } = render(<Button>Go</Button>);
    expect(screen.getByRole('button').className).toBe('oru-btn oru-btn--secondary oru-btn--touch');
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const)
      for (const size of ['compact', 'comfortable', 'touch', 'driver'] as const) {
        rerender(<Button variant={variant} size={size}>Go</Button>);
        expect(screen.getByRole('button').className).toContain(`oru-btn--${variant}`);
        expect(screen.getByRole('button').className).toContain(`oru-btn--${size}`);
      }
  });

  it('block adds the full-width class; a custom className is kept', () => {
    render(<Button block className="extra">Pay</Button>);
    expect(screen.getByRole('button').className).toContain('oru-btn--block');
    expect(screen.getByRole('button').className).toContain('extra');
  });

  it('icons are decorative, beside the word, and bigger in the Driver app', () => {
    const { container, rerender } = render(<Button icon="plus" iconRight="chevron-right">Add</Button>);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    svgs.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
    expect(svgs[0]!.getAttribute('width')).toBe('20');
    expect(screen.getByRole('button').textContent).toBe('Add');
    rerender(<Button size="driver" icon="plus">Add</Button>);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('28');
  });

  it('disabled does not fire onClick', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Retry</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('passes native attributes through (aria-label for an icon-only back button)', () => {
    render(<Button icon="arrow-left" aria-label="Back" data-testid="b">{''}</Button>);
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('passes axe in left-to-right and right-to-left', async () => {
    const { container } = render(
      <div>
        <Button variant="primary" icon="check">Submit attendance</Button>
        <Button variant="ghost">View all</Button>
        <Button disabled>Retry</Button>
        <div dir="rtl" lang="ur">
          <Button variant="primary">جمع کریں</Button>
        </div>
      </div>,
    );
    await expectAccessible(container);
  });
});
