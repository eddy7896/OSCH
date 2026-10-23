import { likeContains } from './students.service.js';

describe('likeContains', () => {
  it('wraps the text and escapes LIKE wildcards so they match themselves', () => {
    expect(likeContains('mehta')).toBe('%mehta%');
    expect(likeContains('100%')).toBe('%100\\%%');
    expect(likeContains('a_b')).toBe('%a\\_b%');
    expect(likeContains('back\\slash')).toBe('%back\\\\slash%');
  });
});
