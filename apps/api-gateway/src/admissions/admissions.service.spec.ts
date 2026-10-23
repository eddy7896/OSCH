import { TRANSITIONS } from './admissions.service.js';

describe('admission review steps', () => {
  it('only move forward; decided and admitted applications are final', () => {
    expect(TRANSITIONS['SUBMITTED']).toEqual(['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']);
    expect(TRANSITIONS['UNDER_REVIEW']).not.toContain('UNDER_REVIEW');
    expect(TRANSITIONS['ACCEPTED']).toEqual(['WITHDRAWN']);
    for (const done of ['REJECTED', 'WITHDRAWN', 'ADMITTED']) expect(TRANSITIONS[done]).toEqual([]);
  });
  it('ADMITTED is never a target: it is reached only through admit', () => {
    for (const targets of Object.values(TRANSITIONS)) expect(targets).not.toContain('ADMITTED');
  });
});
