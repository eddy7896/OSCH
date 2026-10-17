import { DatabaseError } from '@oruschools/database';
import { Logger } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const tenant = { schoolId: SCHOOL, userId: 'admin-1', schoolRole: 'SYSTEM_ADMIN' } as const;

function setup(over: { createError?: unknown; dbError?: { on: 'upsert' | 'add'; err: unknown }; deleteError?: unknown } = {}) {
  const calls = { create: [] as any[], delete: [] as string[], upsert: [] as any[], add: [] as any[], invalidated: [] as string[] };
  const auth = {
    createUser: async (p: any) => { if (over.createError) throw over.createError; calls.create.push(p); return { uid: 'new-uid' }; },
    deleteUser: async (uid: string) => { calls.delete.push(uid); if (over.deleteError) throw over.deleteError; },
  };
  const db = {
    upsertUser: async (v: any) => { if (over.dbError?.on === 'upsert') throw over.dbError.err; calls.upsert.push(v); return {}; },
    addMembership: async (v: any) => { if (over.dbError?.on === 'add') throw over.dbError.err; calls.add.push(v); return {}; },
  };
  const cache = { invalidate: (s: string, u: string) => calls.invalidated.push(`${s}:${u}`) };
  return { svc: new AccountsService(db as never, auth as never, cache as never), calls };
}
const emailDto = { displayName: 'Asha Kumar', schoolRole: 'TEACHER', email: 'asha@example.com' };
const phoneDto = { displayName: 'Ravi Driver', schoolRole: 'DRIVER', phoneNumber: '+919876543210' };

describe('AccountsService.create', () => {
  it('email account: a random password nobody sees, no email-verified claim, the membership with the verified actor, and "send the set-password email" as the next step', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(tenant, emailDto);
    expect(calls.create[0]).toMatchObject({ email: 'asha@example.com', displayName: 'Asha Kumar', emailVerified: false });
    expect(calls.create[0].password).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls.upsert[0]).toMatchObject({ id: 'new-uid', email: 'asha@example.com', displayName: 'Asha Kumar' });
    expect(calls.add[0]).toMatchObject({ schoolId: SCHOOL, userId: 'new-uid', schoolRole: 'TEACHER', actorId: 'admin-1', details: { via: 'account', signIn: 'EMAIL' } });
    expect(calls.invalidated).toEqual([`${SCHOOL}:new-uid`]);
    expect(out).toEqual({ userId: 'new-uid', displayName: 'Asha Kumar', email: 'asha@example.com', phoneNumber: null, role: 'TEACHER', status: 'ACTIVE', signIn: 'EMAIL', nextStep: 'SEND_SET_PASSWORD_EMAIL' });
  });

  it('the generated password is different every time and appears nowhere in what is returned, stored or audited', async () => {
    const a = setup();
    const b = setup();
    const outA = await a.svc.create(tenant, emailDto);
    await b.svc.create(tenant, emailDto);
    const pw = a.calls.create[0].password as string;
    expect(pw).not.toBe(b.calls.create[0].password);
    for (const sink of [outA, a.calls.upsert, a.calls.add]) expect(JSON.stringify(sink)).not.toContain(pw);
  });

  it('phone-only account: no password at all, a placeholder email in the database, nothing to send', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(tenant, phoneDto);
    expect(calls.create[0]).toEqual({ displayName: 'Ravi Driver', phoneNumber: '+919876543210' });
    expect('password' in calls.create[0]).toBe(false);
    expect(calls.upsert[0]).toMatchObject({ email: 'new-uid@no-email.invalid', phoneNumber: '+919876543210' });
    expect(out).toMatchObject({ signIn: 'PHONE', nextStep: 'NONE', email: null, phoneNumber: '+919876543210' });
  });

  it('both: password link for the email and OTP for the phone', async () => {
    const { svc } = setup();
    expect(await svc.create(tenant, { ...emailDto, phoneNumber: '+919876543210' })).toMatchObject({ signIn: 'BOTH', nextStep: 'SEND_SET_PASSWORD_EMAIL' });
  });

  it('the audit details carry no contact details, only what happened', async () => {
    const { svc, calls } = setup();
    await svc.create(tenant, { ...emailDto, phoneNumber: '+919876543210' });
    expect(JSON.stringify(calls.add[0].details)).not.toMatch(/asha@example|9876543210/);
  });

  it('neither email nor phone is a 400 before anything is created', async () => {
    const { svc, calls } = setup();
    await expect(svc.create(tenant, { displayName: 'X', schoolRole: 'STAFF' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(calls.create).toHaveLength(0);
  });

  it.each(['auth/email-already-exists', 'auth/phone-number-already-exists'])('%s -> 409 ACCOUNT_EXISTS, and nothing else is written', async (code) => {
    const { svc, calls } = setup({ createError: Object.assign(new Error('secret detail'), { code }) });
    await expect(svc.create(tenant, emailDto)).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' });
    expect(calls.upsert.length + calls.add.length + calls.delete.length).toBe(0);
  });

  it('any other Firebase failure propagates untouched', async () => {
    const boom = Object.assign(new Error('quota'), { code: 'auth/quota-exceeded' });
    await expect(setup({ createError: boom }).svc.create(tenant, emailDto)).rejects.toBe(boom);
  });

  it.each(['upsert', 'add'] as const)('a failure at the %s step deletes the Firebase account again, so a failed attempt leaves nothing behind', async (on) => {
    const err = new DatabaseError('CONFLICT');
    const { svc, calls } = setup({ dbError: { on, err } });
    await expect(svc.create(tenant, emailDto)).rejects.toBe(err);
    expect(calls.delete).toEqual(['new-uid']);
    expect(calls.invalidated).toHaveLength(0);
  });

  it('if the cleanup itself fails the original error still wins, and the failure is logged without detail', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const err = new DatabaseError('UNAVAILABLE');
    const { svc } = setup({ dbError: { on: 'add', err }, deleteError: new Error('secret-detail') });
    await expect(svc.create(tenant, emailDto)).rejects.toBe(err);
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).not.toContain('secret-detail');
    error.mockRestore();
  });
});
