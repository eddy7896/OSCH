import { Logger } from '@nestjs/common';
import { SchoolAdminsService } from './school-admins.service.js';

const SCHOOL = '11111111-1111-4111-8111-111111111111';
const actor = { uid: 'owner-1', email: 'owner@example.com' } as never;

type Over = { school?: boolean; members?: { schoolRole: string; status: string }[]; createError?: unknown; provisionError?: unknown; deleteError?: unknown };
function setup(over: Over = {}) {
  const calls = { create: [] as any[], delete: [] as string[], upsert: [] as any[], provision: [] as any[], invalidated: [] as string[], synced: 0 };
  const auth = {
    createUser: async (p: any) => { if (over.createError) throw over.createError; calls.create.push(p); return { uid: 'admin-uid' }; },
    deleteUser: async (uid: string) => { calls.delete.push(uid); if (over.deleteError) throw over.deleteError; },
  };
  const db = {
    getSchool: async () => ({ data: { school: over.school === false ? null : { id: SCHOOL } } }),
    listMemberships: async () => ({ data: { schoolMembers: over.members ?? [] } }),
    upsertUser: async (v: any) => { calls.upsert.push(v); return {}; },
    provisionSchoolAdmin: async (v: any) => { if (over.provisionError) throw over.provisionError; calls.provision.push(v); return {}; },
  };
  const users = { sync: async () => { calls.synced++; } };
  const cache = { invalidate: (s: string, u: string) => calls.invalidated.push(`${s}:${u}`) };
  return { svc: new SchoolAdminsService(db as never, auth as never, users as never, cache as never), calls };
}
const dto = { displayName: 'Asha Principal', email: 'asha@example.com' };

describe('SchoolAdminsService.create', () => {
  it('creates the account and the System Admin membership, always as SYSTEM_ADMIN, with the platform owner as actor', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(actor, SCHOOL, dto);
    expect(calls.synced).toBe(1);
    expect(calls.create[0]).toMatchObject({ email: 'asha@example.com', displayName: 'Asha Principal', emailVerified: false });
    expect(calls.create[0].password).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls.provision[0]).toMatchObject({ schoolId: SCHOOL, userId: 'admin-uid', actorId: 'owner-1', details: { schoolRole: 'SYSTEM_ADMIN', signIn: 'EMAIL' } });
    expect(calls.invalidated).toEqual([`${SCHOOL}:admin-uid`]);
    expect(out).toEqual({ userId: 'admin-uid', displayName: 'Asha Principal', email: 'asha@example.com', phoneNumber: null, role: 'SYSTEM_ADMIN', status: 'ACTIVE', signIn: 'EMAIL', nextStep: 'SEND_SET_PASSWORD_EMAIL' });
  });

  it('the password is never returned, stored or audited', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(actor, SCHOOL, dto);
    const pw = calls.create[0].password as string;
    for (const sink of [out, calls.upsert, calls.provision]) expect(JSON.stringify(sink)).not.toContain(pw);
  });

  it('the audit details carry no contact details', async () => {
    const { svc, calls } = setup();
    await svc.create(actor, SCHOOL, { ...dto, phoneNumber: '+919876543210' });
    expect(JSON.stringify(calls.provision[0].details)).not.toMatch(/asha@example|9876543210/);
  });

  it('phone only: no password, nothing to send', async () => {
    const { svc, calls } = setup();
    const out = await svc.create(actor, SCHOOL, { displayName: 'Ravi', phoneNumber: '+919876543210' });
    expect('password' in calls.create[0]).toBe(false);
    expect(out).toMatchObject({ signIn: 'PHONE', nextStep: 'NONE' });
  });

  it('neither email nor phone: 400, and nothing is looked up or created', async () => {
    const { svc, calls } = setup();
    await expect(svc.create(actor, SCHOOL, { displayName: 'X' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(calls.create).toHaveLength(0);
  });

  it('an unknown school: 404, no account created', async () => {
    const { svc, calls } = setup({ school: false });
    await expect(svc.create(actor, SCHOOL, dto)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls.create).toHaveLength(0);
  });

  it('a school that already has an active System Admin: 409, no account created', async () => {
    const { svc, calls } = setup({ members: [{ schoolRole: 'SYSTEM_ADMIN', status: 'ACTIVE' }] });
    await expect(svc.create(actor, SCHOOL, dto)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(calls.create).toHaveLength(0);
  });

  it('a suspended System Admin or other roles do not block it', async () => {
    const { svc } = setup({ members: [{ schoolRole: 'SYSTEM_ADMIN', status: 'SUSPENDED' }, { schoolRole: 'TEACHER', status: 'ACTIVE' }] });
    await expect(svc.create(actor, SCHOOL, dto)).resolves.toMatchObject({ role: 'SYSTEM_ADMIN' });
  });

  it.each(['auth/email-already-exists', 'auth/phone-number-already-exists'])('%s: 409 ACCOUNT_EXISTS and nothing written', async (code) => {
    const { svc, calls } = setup({ createError: Object.assign(new Error('secret'), { code }) });
    await expect(svc.create(actor, SCHOOL, dto)).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' });
    expect(calls.upsert.length + calls.provision.length + calls.delete.length).toBe(0);
  });

  it('if the database refuses (for example a race), the new account is deleted again and the error is passed on', async () => {
    const boom = new Error('this school already has an administrator');
    const { svc, calls } = setup({ provisionError: boom });
    await expect(svc.create(actor, SCHOOL, dto)).rejects.toBe(boom);
    expect(calls.delete).toEqual(['admin-uid']);
    expect(calls.invalidated).toEqual([]);
  });

  it('a failed clean-up is logged without the error text and does not hide the original error', async () => {
    const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const boom = new Error('db');
    const { svc } = setup({ provisionError: boom, deleteError: new Error('contains secret') });
    await expect(svc.create(actor, SCHOOL, dto)).rejects.toBe(boom);
    expect(JSON.stringify(spy.mock.calls)).not.toContain('contains secret');
    spy.mockRestore();
  });
});
