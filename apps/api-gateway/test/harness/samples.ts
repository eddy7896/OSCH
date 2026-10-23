import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { verifiedNewcomer, type World } from './fixtures.js';

/**
 * E-AUD-1, runtime half: for every `@Audit` route a sample REQUEST that succeeds. The audit harness sends it and then
 * checks that an audit row with the declared action, by the right actor, exists for the affected school. A new audited
 * route with no sample fails the build, so nobody can add a write that silently skips the audit trail.
 * Keys are `METHOD /path` exactly as registered (without the /v1 prefix); `prepare` returns a value for every `:param`.
 */
export interface Sample {
  /** Creates whatever the request needs (through the real operations) and returns values for the path parameters. */
  prepare?: (w: World) => Promise<Record<string, string>>;
  token: (w: World, ctx: Record<string, string>) => string;
  actor: (w: World, ctx: Record<string, string>) => string;
  /** `X-School-Id` for school routes (platform routes send none). */
  school?: (w: World) => string;
  body?: (w: World, ctx: Record<string, string>) => Record<string, unknown>;
  /** The school whose audit log must receive the row. */
  auditSchool: (w: World, ctx: Record<string, string>, responseBody: Record<string, any>) => string;
}

const freshSchool = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.provisionSchool({ id, name: 'Sample school', subDomain: `s${randomUUID().slice(0, 12)}`, defaultLanguage: 'en', actorId: w.superAdmin.uid });
  return { id };
};

/** A real user row that is not yet a member of anything. */
const freshUser = async (w: World): Promise<string> => {
  const uid = `sample-${randomUUID()}`;
  await w.db.upsertUser({ id: uid, email: `${uid}@example.com` });
  return uid;
};
const memberOfA = async (w: World): Promise<Record<string, string>> => {
  const userId = await freshUser(w);
  await w.db.createSchoolMember({ schoolId: w.schools.A, userId, schoolRole: 'TEACHER' as never });
  return { userId };
};

/** An open invitation to a real, verified newcomer; the secret and the newcomer's token travel in ctx. */
const openInvitation = async (w: World): Promise<Record<string, string>> => {
  const person = await verifiedNewcomer('invitee');
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '').slice(0, 11); // 43 url-safe characters, like a real one
  await w.db.createInvitation({ schoolId: w.schools.A, email: person.email, schoolRole: 'ACCOUNTANT' as never, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 86_400_000).toISOString(), actorId: w.roles.A.SYSTEM_ADMIN.uid });
  const pending = (await w.db.listInvitations({ schoolId: w.schools.A })).data.invitations.find((i) => i.email === person.email)!;
  return { id: pending.id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5'), token, jwt: person.token, uid: person.uid };
};

const platform = { token: (w: World) => w.superAdmin.token, actor: (w: World) => w.superAdmin.uid };
const systemAdminOfA = { token: (w: World) => w.roles.A.SYSTEM_ADMIN.token, actor: (w: World) => w.roles.A.SYSTEM_ADMIN.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };

const academicAdminOfA = { token: (w: World) => w.roles.A.ACADEMIC_ADMIN.token, actor: (w: World) => w.roles.A.ACADEMIC_ADMIN.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
const actorA = (w: World) => w.roles.A.ACADEMIC_ADMIN.uid;
const dash = (id: string) => id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
/** A class level, a class under it, a subject and a planned academic year of school A, made through the real operations. */
const levelOfA = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.createGradeLevel({ schoolId: w.schools.A, id, name: `L-${id.slice(0, 8)}`, position: 500, actorId: actorA(w) });
  return { id };
};
const classOfA = async (w: World): Promise<Record<string, string>> => {
  const { id: levelId } = await levelOfA(w);
  const id = randomUUID();
  await w.db.createClassroom({ schoolId: w.schools.A, id, gradeLevelId: levelId, section: 'Z', name: 'Sample Z', capacity: 30, actorId: actorA(w) });
  return { id, levelId };
};
const subjectOfA = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.createSubject({ schoolId: w.schools.A, id, name: `Subject ${id.slice(0, 6)}`, code: id.slice(0, 8).toUpperCase(), actorId: actorA(w) });
  return { id };
};
const yearOfA = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.createAcademicYear({ schoolId: w.schools.A, id, name: `Y-${id.slice(0, 6)}`, startDate: '2040-04-01', endDate: '2041-03-31', actorId: actorA(w) });
  return { id };
};

/** A student of school A (admitted through the real operation, as the gateway does). */
const studentOfA = async (w: World): Promise<Record<string, string>> => {
  const { school } = (await w.db.schoolSeq({ schoolId: w.schools.A })).data;
  const id = randomUUID();
  await w.db.createStudent({ schoolId: w.schools.A, id, expectedSeq: school!.studentSeq, enrollmentId: `${school!.enrollmentPrefix}${String(school!.studentSeq + 1).padStart(4, '0')}`, firstName: 'Sample', lastName: 'Student', actorId: actorA(w) });
  return { id: dash(id) };
};
const placedStudentOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await studentOfA(w);
  const year = randomUUID();
  await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `PY-${year.slice(0, 6)}`, startDate: '2050-04-01', endDate: '2051-03-31', actorId: actorA(w) });
  const room = (await w.db.listClassrooms({ schoolId: w.schools.A })).data.classrooms[0]!;
  await w.db.placeStudent({ schoolId: w.schools.A, studentId: ctx['id']!, academicYearId: year, classroomId: room.id, actorId: actorA(w) });
  return { ...ctx, year: dash(year), room: dash(room.id) };
};
const guardianOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await studentOfA(w);
  const gid = randomUUID();
  await w.db.addGuardian({ schoolId: w.schools.A, id: gid, studentId: ctx['id']!, name: 'Sample Guardian', relationship: 'MOTHER', phone: '+919876543210', isPrimary: false, actorId: actorA(w) });
  return { ...ctx, guardianId: gid };
};
const roomOfA = async (w: World): Promise<string> => dash((await w.db.listClassrooms({ schoolId: w.schools.A })).data.classrooms[0]!.id);

/** An in-memory private store the sample (and the integration tests) share: the gateway code under test is real, only the bucket is fake. */
export const sampleStore = (() => {
  const objects = new Map<string, { sizeBytes: number; contentType: string }>();
  return {
    objects,
    store: {
      presignPut: async (i: { key: string }) => `https://private.example/put/${i.key}`,
      presignGet: async (i: { key: string }) => `https://private.example/get/${i.key}`,
      head: async (key: string) => objects.get(key) ?? null,
      remove: async (key: string) => void objects.delete(key),
    },
  };
})();
const uploadedKey = (w: World, studentId: string, area: 'photo' | 'documents', ext = 'png', type = 'image/png'): string => {
  const key = `schools/${w.schools.A}/students/${studentId}/${area}/${randomUUID()}.${ext}`;
  sampleStore.objects.set(key, { sizeBytes: 1234, contentType: type });
  return key;
};
const studentWithDocument = async (w: World): Promise<Record<string, string>> => {
  const ctx = await studentOfA(w);
  const key = uploadedKey(w, ctx['id']!, 'documents', 'pdf', 'application/pdf');
  const docId = randomUUID();
  await w.db.addStudentDocument({ schoolId: w.schools.A, id: docId, studentId: ctx['id']!, kind: 'ID_PROOF' as never, fileKey: key, fileName: 'id.pdf', contentType: 'application/pdf', sizeBytes: 1234, actorId: actorA(w) });
  return { ...ctx, documentId: dash(docId) };
};

const hrOfA = { token: (w: World) => w.roles.A.HR_MANAGER.token, actor: (w: World) => w.roles.A.HR_MANAGER.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
const staffOfA = async (w: World): Promise<Record<string, string>> => {
  const seq = (await w.db.staffSeqInfo({ schoolId: w.schools.A })).data.school!.staffSeq;
  const id = randomUUID();
  await w.db.createStaff({ schoolId: w.schools.A, id, expectedSeq: seq, employeeId: `E${String(seq + 1).padStart(4, '0')}`, firstName: 'Sample', lastName: 'Staff', actorId: w.roles.A.HR_MANAGER.uid });
  return { id: dash(id) };
};
const staffKey = (w: World, staffId: string, area: 'photo' | 'documents', ext = 'png', type = 'image/png'): string => {
  const key = `schools/${w.schools.A}/staff/${staffId}/${area}/${randomUUID()}.${ext}`;
  sampleStore.objects.set(key, { sizeBytes: 1234, contentType: type });
  return key;
};
const staffWithDocument = async (w: World): Promise<Record<string, string>> => {
  const ctx = await staffOfA(w);
  const docId = randomUUID();
  await w.db.addStaffDocument({ schoolId: w.schools.A, id: docId, staffId: ctx['id']!, kind: 'ID_PROOF' as never, fileKey: staffKey(w, ctx['id']!, 'documents', 'pdf', 'application/pdf'), fileName: 'id.pdf', contentType: 'application/pdf', sizeBytes: 1234, actorId: w.roles.A.HR_MANAGER.uid });
  return { ...ctx, documentId: dash(docId) };
};

export const SAMPLES: Record<string, Sample> = {
  'POST /platform/schools': { ...platform, body: () => ({ name: 'Audit sample school', subDomain: `a${randomUUID().slice(0, 12)}`, defaultLanguage: 'en' }), auditSchool: (_w, _c, res) => res['id'] },
  'PATCH /platform/schools/:id': { ...platform, prepare: freshSchool, body: () => ({ name: 'Renamed by the audit sample' }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /platform/schools/:id/suspend': { ...platform, prepare: freshSchool, body: () => ({ reason: 'audit sample' }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /platform/schools/:id/activate': {
    ...platform,
    prepare: async (w) => {
      const ctx = await freshSchool(w);
      await w.db.setSubscriptionStatus({ schoolId: ctx['id']!, status: 'SUSPENDED' as never, actorId: w.superAdmin.uid });
      return ctx;
    },
    body: () => ({}),
    auditSchool: (_w, ctx) => ctx['id']!,
  },
  'POST /platform/schools/:id/admins': { ...platform, prepare: freshSchool, body: () => ({ displayName: 'Audit Admin', email: `school-admin-${randomUUID().slice(0, 10)}@example.com` }), auditSchool: (_w, ctx) => ctx['id']! },
  'POST /memberships': { ...systemAdminOfA, prepare: async (w) => ({ userId: await freshUser(w) }), body: (_w, ctx) => ({ userId: ctx['userId'], schoolRole: 'STAFF' }) },
  'POST /memberships/accounts': { ...systemAdminOfA, body: () => ({ displayName: 'Audit Sample', schoolRole: 'STAFF', email: `account-${randomUUID().slice(0, 10)}@example.com` }) },
  'PATCH /memberships/:userId': { ...systemAdminOfA, prepare: memberOfA, body: () => ({ status: 'SUSPENDED' }) },
  'DELETE /memberships/:userId': { ...systemAdminOfA, prepare: memberOfA },
  'POST /invitations': { ...systemAdminOfA, prepare: async () => ({ email: `invitee-${randomUUID().slice(0, 8)}@example.com` }), body: (_w, ctx) => ({ email: ctx['email'], schoolRole: 'TEACHER' }) },
  'POST /invitations/:id/revoke': { ...systemAdminOfA, prepare: openInvitation, body: () => ({}) },
  'POST /invitations/accept': {
    prepare: openInvitation,
    token: (_w, ctx) => ctx['jwt']!,
    actor: (_w, ctx) => ctx['uid']!,
    body: (_w, ctx) => ({ token: ctx['token'] }),
    auditSchool: (w) => w.schools.A,
  },
  'PATCH /school/profile': { ...systemAdminOfA, body: () => ({ address: '1 Sample Road' }) },
  'PUT /school/logo': { ...systemAdminOfA, body: (w) => ({ key: `schools/${w.schools.A}/logo/${randomUUID()}.png` }) },
  'POST /academics/levels': { ...academicAdminOfA, body: () => ({ name: `Level ${randomUUID().slice(0, 8)}`, position: 600 }) },
  'PATCH /academics/levels/:id': { ...academicAdminOfA, prepare: levelOfA, body: () => ({ position: 501 }) },
  'DELETE /academics/levels/:id': { ...academicAdminOfA, prepare: levelOfA },
  'POST /academics/classes': { ...academicAdminOfA, prepare: async (w) => ({ levelId: dash((await levelOfA(w))['id']!) }), body: (_w, ctx) => ({ gradeLevelId: ctx['levelId'], section: 'Y', capacity: 35 }) },
  'PATCH /academics/classes/:id': { ...academicAdminOfA, prepare: classOfA, body: () => ({ capacity: 31 }) },
  'DELETE /academics/classes/:id': { ...academicAdminOfA, prepare: classOfA },
  'POST /academics/subjects': { ...academicAdminOfA, body: () => ({ name: 'Sample subject', code: randomUUID().slice(0, 8).toUpperCase() }) },
  'PATCH /academics/subjects/:id': { ...academicAdminOfA, prepare: subjectOfA, body: () => ({ name: 'Renamed subject' }) },
  'DELETE /academics/subjects/:id': { ...academicAdminOfA, prepare: subjectOfA },
  'POST /academics/years': { ...academicAdminOfA, body: () => ({ name: `Year ${randomUUID().slice(0, 6)}`, startDate: '2042-04-01', endDate: '2043-03-31' }) },
  'PATCH /academics/years/:id': { ...academicAdminOfA, prepare: yearOfA, body: () => ({ name: 'Renamed year' }) },
  'POST /academics/years/:id/activate': { ...academicAdminOfA, prepare: yearOfA, body: () => ({}) },
  'DELETE /academics/years/:id': { ...academicAdminOfA, prepare: yearOfA },
  'POST /students': { ...academicAdminOfA, body: () => ({ firstName: 'Audit', lastName: 'Sample' }) },
  'PATCH /students/:id': { ...academicAdminOfA, prepare: studentOfA, body: () => ({ address: '2 Sample Lane' }) },
  'POST /students/:id/placement': {
    ...academicAdminOfA,
    prepare: async (w) => {
      const ctx = await studentOfA(w);
      const year = randomUUID();
      await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `QY-${year.slice(0, 6)}`, startDate: '2052-04-01', endDate: '2053-03-31', actorId: actorA(w) });
      return { ...ctx, year: dash(year), room: await roomOfA(w) };
    },
    body: (_w, ctx) => ({ classroomId: ctx['room'], academicYearId: ctx['year'] }),
  },
  'PATCH /students/:id/placement': { ...academicAdminOfA, prepare: placedStudentOfA, body: (_w, ctx) => ({ classroomId: ctx['room'], academicYearId: ctx['year'] }) },
  'POST /students/:id/guardians': { ...academicAdminOfA, prepare: studentOfA, body: () => ({ name: 'Audit Guardian', relationship: 'FATHER', phone: '+919876543211' }) },
  'PATCH /students/:id/guardians/:guardianId': { ...academicAdminOfA, prepare: guardianOfA, body: () => ({ name: 'Renamed Guardian' }) },
  'DELETE /students/:id/guardians/:guardianId': { ...academicAdminOfA, prepare: guardianOfA },
  'PUT /students/:id/photo': { ...academicAdminOfA, prepare: studentOfA, body: (w, ctx) => ({ key: uploadedKey(w, ctx['id']!, 'photo') }) },
  'POST /students/:id/documents': { ...academicAdminOfA, prepare: studentOfA, body: (w, ctx) => ({ key: uploadedKey(w, ctx['id']!, 'documents', 'pdf', 'application/pdf'), kind: 'BIRTH_CERTIFICATE', fileName: 'birth certificate.pdf' }) },
  'DELETE /students/:id/documents/:documentId': { ...academicAdminOfA, prepare: studentWithDocument },
  'POST /staff': { ...hrOfA, body: () => ({ firstName: 'Audit', lastName: 'Staff', department: 'Science' }) },
  'PATCH /staff/:id': { ...hrOfA, prepare: staffOfA, body: () => ({ designation: 'Teacher' }) },
  'PUT /staff/:id/account': { ...hrOfA, prepare: staffOfA, body: (w) => ({ userId: w.roles.A.TEACHER.uid }) },
  'PUT /staff/:id/photo': { ...hrOfA, prepare: staffOfA, body: (w, ctx) => ({ key: staffKey(w, ctx['id']!, 'photo') }) },
  'POST /staff/:id/documents': { ...hrOfA, prepare: staffOfA, body: (w, ctx) => ({ key: staffKey(w, ctx['id']!, 'documents', 'pdf', 'application/pdf'), kind: 'APPOINTMENT_LETTER', fileName: 'letter.pdf' }) },
  'DELETE /staff/:id/documents/:documentId': { ...hrOfA, prepare: staffWithDocument },
};
