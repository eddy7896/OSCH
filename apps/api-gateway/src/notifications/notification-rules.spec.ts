import { categoryOf, fill, KINDS, render } from './notification-rules.js';

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
  it('every kind has a category and its words', () => {
    for (const [kind, info] of Object.entries(KINDS)) { expect(categoryOf(kind)).toBe(info.category); expect(info.title).toMatch(/^notif/); expect(info.body).toMatch(/^notif/); }
    expect(categoryOf('x.y')).toBeNull();
  });
});
