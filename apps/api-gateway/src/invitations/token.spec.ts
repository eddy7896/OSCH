import { hashInvitationToken, INVITATION_TOKEN, newInvitationToken } from './token.js';

describe('invitation token', () => {
  it('is 256 random bits as 43 url-safe characters, different every time', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newInvitationToken()));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(INVITATION_TOKEN);
  });

  it('hashes to a stable 64-char hex digest that does not contain the token', () => {
    const t = newInvitationToken();
    const h = hashInvitationToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashInvitationToken(t));
    expect(h).not.toContain(t);
    expect(hashInvitationToken(t + 'x')).not.toBe(h);
  });

  it.each(['', 'short', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}=`, `${'a'.repeat(42)} `, `${'a'.repeat(42)}/`])('the shape check rejects "%s"', (bad) => {
    expect(INVITATION_TOKEN.test(bad)).toBe(false);
  });
});
