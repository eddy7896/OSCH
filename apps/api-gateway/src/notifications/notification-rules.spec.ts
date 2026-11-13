import { categoryOf, fill, KINDS, render, pushWords } from './notification-rules.js';

describe('notification words', () => {
  it('fills placeholders, shows dates as day-month-year, and leaves nothing in braces', () => {
    expect(fill('{name} is away from {startDate} to {endDate}.', { name: 'Asha', startDate: '2026-10-26', endDate: '2026-10-28' })).toBe('Asha is away from 26-10-2026 to 28-10-2026.');
    expect(fill('Note: {note}.', {})).toBe('Note:.');
    expect(fill('{x}', { x: 5 })).toBe('5');
  });
  it('renders in the reader\'s language and falls back to English for a missing key; an unknown kind shows itself', () => {
    const en = { notifLeaveApprovedTitle: 'Leave approved', notifLeaveApprovedBody: '{type}: {startDate}.' };
    const hi = { notifLeaveApprovedTitle: 'छुट्टी स्वीकृत' };
    expect(render('leave.approved', { type: 'Casual', startDate: '2026-10-26' }, hi, en)).toEqual({ title: 'छुट्टी स्वीकृत', body: 'Casual: 26-10-2026.' });
    expect(render('nope.kind', {}, {}, {})).toEqual({ title: 'nope.kind', body: '' });
  });
  it('in right-to-left text a date is isolated so its digits keep their order; in left-to-right text nothing is added', () => {
    expect(fill('{startDate}', { startDate: '2026-10-26' }, true)).toBe('\u206626\u201110\u20112026\u2069');
    expect(fill('{startDate}', { startDate: '2026-10-26' })).toBe('26-10-2026');
    expect(fill('{name}', { name: 'Asha' }, true)).toBe('Asha');
  });
  it('every kind has a category and its words', () => {
    for (const [kind, info] of Object.entries(KINDS)) { expect(categoryOf(kind)).toBe(info.category); expect(info.title).toMatch(/^notif/); expect(info.body).toMatch(/^notif/); }
    expect(categoryOf('x.y')).toBeNull();
  });
});

describe('push words (E-PRIV-5): nothing about a child can be in them', () => {
  const english = { pushTitle: 'New notification', pushBody: 'Open the app to read it.', notifStudentleaveApprovedBody: '{studentName}: {startDate} to {endDate}.' };
  const hostile = { studentName: 'Asha Rao', name: 'Asha Rao', reason: 'chickenpox', note: 'marks 12 of 50', title: 'Asha failed' };

  it('are the same for every kind, whatever its params hold', () => {
    const plain = pushWords({}, english);
    expect(plain).toEqual({ title: 'New notification', body: 'Open the app to read it.' });
    for (const kind of Object.keys(KINDS)) {
      const w = pushWords({}, english); // the kind and params are not even inputs
      expect(w).toEqual(plain);
      expect(JSON.stringify(w)).not.toMatch(/Asha|chickenpox|marks|failed/);
      // while the inbox words of the same kind do use the params (inside the app, behind sign-in and consent)
      void render(kind, hostile, english, english);
    }
  });

  it('use the reader\'s language when it has the words, and English when it does not', () => {
    expect(pushWords({ pushTitle: 'नई सूचना' }, english)).toEqual({ title: 'नई सूचना', body: 'Open the app to read it.' });
  });
});
