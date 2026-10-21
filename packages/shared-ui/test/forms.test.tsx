import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Checkbox, SegmentedControl, TextField } from '../src/index.js';
import { expectAccessible } from './axe.js';

describe('Checkbox', () => {
  it('the label is the accessible name and the whole row toggles it', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Collect forms" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Collect forms' }) as HTMLInputElement;
    fireEvent.click(screen.getByText('Collect forms')); // the text, not the box
    expect(box.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('works uncontrolled (defaultChecked) and controlled (checked)', () => {
    const { rerender } = render(<Checkbox label="Done" defaultChecked />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    rerender(<Checkbox label="Done" checked={false} onChange={() => undefined} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('the description is read with the label', () => {
    render(<Checkbox label="Send reminder" description="Parents get a message at 8 AM" />);
    const box = screen.getByRole('checkbox', { name: 'Send reminder' });
    expect(box.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(box.getAttribute('aria-describedby')!)!.textContent).toBe('Parents get a message at 8 AM');
    expect(box.getAttribute('aria-labelledby')).not.toBe(box.getAttribute('aria-describedby')); // the name is the label alone
  });

  it('no description means no dangling aria-describedby; disabled cannot be toggled', () => {
    render(<Checkbox label="Locked" disabled />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.getAttribute('aria-describedby')).toBeNull();
    expect(box.disabled).toBe(true); // browsers then neither focus nor toggle it (jsdom would still toggle a synthetic click, so we assert the attribute)
  });

  it('passes axe, including right-to-left', async () => {
    const { container } = render(
      <div>
        <Checkbox label="Collect forms" description="From every student" />
        <div dir="rtl" lang="ur">
          <Checkbox label="فارم جمع کریں" />
        </div>
      </div>,
    );
    await expectAccessible(container);
  });
});

describe('TextField', () => {
  it('the label is tied to the input (click the label focuses the field)', () => {
    render(<TextField label="Marks" />);
    expect(screen.getByLabelText('Marks')).toBeTruthy();
    expect(screen.getByText('Marks').getAttribute('for')).toBe(screen.getByLabelText('Marks').id);
  });

  it('two fields never share an id', () => {
    render(
      <>
        <TextField label="First" />
        <TextField label="Second" />
      </>,
    );
    expect(screen.getByLabelText('First').id).not.toBe(screen.getByLabelText('Second').id);
  });

  it('an error says what to do, marks the field invalid, is announced with the field, and wins over the hint', () => {
    render(<TextField label="Marks" hint="Out of 50" error="Marks cannot be more than 50." />);
    const input = screen.getByLabelText('Marks');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const msg = document.getElementById(input.getAttribute('aria-describedby')!)!;
    expect(msg.textContent).toBe('Marks cannot be more than 50.');
    expect(screen.queryByText('Out of 50')).toBeNull();
  });

  it('a hint alone is linked but not invalid', () => {
    render(<TextField label="Marks" hint="Out of 50" />);
    const input = screen.getByLabelText('Marks');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(document.getElementById(input.getAttribute('aria-describedby')!)!.textContent).toBe('Out of 50');
  });

  it('multiline is a textarea; native props pass through (numeric keyboard, placeholder, value, onChange)', () => {
    const { container, rerender } = render(<TextField label="Message" multiline placeholder="Write here" />);
    expect(container.querySelector('textarea')).toBeTruthy();
    expect(container.querySelector('input')).toBeNull();
    const onChange = vi.fn();
    rerender(<TextField label="Phone" inputMode="numeric" placeholder="98765 43210" value="12" onChange={onChange} />);
    const input = screen.getByLabelText('Phone') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.placeholder).toBe('98765 43210');
    fireEvent.change(input, { target: { value: '123' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('density sets the size class (touch by default) and a search field works with an aria-label instead of a visible label', () => {
    const { container, rerender } = render(<TextField label="A" />);
    expect(container.firstElementChild!.className).toContain('oru-field--touch');
    rerender(<TextField aria-label="Search students" icon="search" size="compact" />);
    expect(container.firstElementChild!.className).toContain('oru-field--compact');
    expect(screen.getByRole('textbox', { name: 'Search students' })).toBeTruthy();
    expect(container.querySelector('.oru-field__box svg')).toBeTruthy();
  });

  it('axe is wired: a field with NO label at all is reported (proves the check can fail)', async () => {
    const { container } = render(<TextField />);
    await expect(expectAccessible(container)).rejects.toThrow();
  });

  it('passes axe with label, hint, error and icon, in both directions', async () => {
    const { container } = render(
      <div>
        <TextField label="Marks" hint="Out of 50" />
        <TextField label="Marks" error="Marks cannot be more than 50." defaultValue="60" />
        <TextField aria-label="Search" icon="search" />
        <div dir="rtl" lang="ur">
          <TextField label="نام" hint="پورا نام لکھیں" />
        </div>
      </div>,
    );
    await expectAccessible(container);
  });
});

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [v, setV] = useState('today');
  return (
    <SegmentedControl
      label="View"
      options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
      value={v}
      onChange={(x) => {
        setV(x);
        onChange?.(x);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }];

  it('is a labelled radio group with exactly one selected option (the first by default)', () => {
    render(<SegmentedControl label="View" options={options} />);
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('only the selected option is in the tab order (roving tabindex)', () => {
    render(<SegmentedControl label="View" options={options} defaultValue="b" />);
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('click selects and reports the value; uncontrolled keeps its own state', () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="View" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'C' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('true');
  });

  it('controlled: shows the value it is given and only changes when the parent does', () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="View" options={options} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.getByRole('radio', { name: 'A' }).getAttribute('aria-checked')).toBe('true');
  });

  it('arrow keys move through the options and wrap, Home and End jump (left-to-right)', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    fireEvent.keyDown(group, { key: 'ArrowRight' }); // wraps
    fireEvent.keyDown(group, { key: 'ArrowLeft' }); // wraps back
    fireEvent.keyDown(group, { key: 'Home' });
    fireEvent.keyDown(group, { key: 'End' });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['week', 'month', 'today', 'month', 'today', 'month']);
  });

  it('in a right-to-left page the arrows follow the reading direction (Left goes forward)', () => {
    const onChange = vi.fn();
    render(
      <div dir="rtl">
        <SegmentedControl label="View" options={options} onChange={onChange} />
      </div>,
    );
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['b', 'a']);
  });

  it('keyboard moves focus with the selection, and other keys do nothing', () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Week' }));
    const before = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked')).join();
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'a' });
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-checked')).join()).toBe(before);
  });

  it('density classes, and axe in both directions', async () => {
    const { container } = render(
      <div>
        <SegmentedControl label="View" options={options} size="compact" />
        <SegmentedControl label="View" options={options} size="touch" />
        <div dir="rtl" lang="ur">
          <SegmentedControl label="منظر" options={[{ value: 'a', label: 'آج' }, { value: 'b', label: 'ہفتہ' }]} />
        </div>
      </div>,
    );
    expect(container.querySelector('.oru-seg--compact')).toBeTruthy();
    expect(container.querySelector('.oru-seg--touch')).toBeTruthy();
    await expectAccessible(container);
  });
});
