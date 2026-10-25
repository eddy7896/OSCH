import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { markId } from '../../src/attendance/attendance-rules.js';
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
  body?: (w: World, ctx: Record<string, string>) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** Self-service routes are open to every role (ADR-0007), so the refused-call test sends an account with no staff record and expects this status instead of 403. */
  refusedStatus?: number;
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
/** A period of school A, made through the real operation (its own start time, so samples never collide). */
let periodMinute = Math.floor(Math.random() * 600);
const periodOfA = async (w: World): Promise<Record<string, string>> => {
  const id = randomUUID();
  const minute = 600 + (periodMinute++ % 600); // 10:00 to 19:59, one minute long, each sample its own minute (the school keeps start times unique)
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  await w.db.createPeriod({ schoolId: w.schools.A, id, label: `P-${id.slice(0, 8)}`, startTime: t(minute), endTime: t(minute + 1), isBreak: false, actorId: actorA(w), details: {} });
  return { id };
};
/** The starting schedule needs an empty school: take away whatever periods the other samples left. */
const emptyScheduleOfA = async (w: World): Promise<Record<string, string>> => {
  for (const p of (await w.db.listPeriods({ schoolId: w.schools.A })).data.periods) await w.db.deletePeriod({ schoolId: w.schools.A, id: p.id, actorId: actorA(w), details: { sample: true } });
  return {};
};
/** Teachers (P3-2): a staff member and a subject of school A, optionally already linked; a class (and an active year) for the class-teacher routes. */
const teacherAndSubjectOfA = async (w: World): Promise<Record<string, string>> => ({ staffId: (await staffOfA(w))['id']!, subjectId: dash((await subjectOfA(w))['id']!) });
const taughtSubjectOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await teacherAndSubjectOfA(w);
  await w.db.addTeacherSubject({ schoolId: w.schools.A, id: randomUUID(), staffId: ctx['staffId']!, subjectId: ctx['subjectId']!, actorId: actorA(w) });
  return ctx;
};
const classTeacherSetupOfA = async (w: World): Promise<Record<string, string>> => {
  const klass = await classOfA(w);
  const staff = await staffOfA(w);
  const year = await yearOfA(w);
  return { id: dash(klass['id']!), staffId: staff['id']!, year: dash(year['id']!) };
};
const activeYearOfA = async (w: World): Promise<string> => {
  const current = (await w.db.getSchoolProfile({ schoolId: w.schools.A })).data.school?.activeAcademicYear;
  if (current) return dash(current.id);
  const { id } = await yearOfA(w);
  await w.db.activateAcademicYear({ schoolId: w.schools.A, id: id!, actorId: actorA(w) });
  return dash(id!);
};
const classWithTeacherOfA = async (w: World): Promise<Record<string, string>> => {
  const klass = await classOfA(w);
  const staff = await staffOfA(w);
  await w.db.assignClassTeacher({ schoolId: w.schools.A, id: randomUUID(), classroomId: klass['id']!, academicYearId: await activeYearOfA(w), staffId: staff['id']!, actorId: actorA(w) });
  return { id: dash(klass['id']!), staffId: staff['id']! };
};
/** Timetable (P3-3): a fresh class, a teacher who teaches a fresh subject, a fresh period, and the active year; optionally a lesson already placed. */
const lessonSetupOfA = async (w: World): Promise<Record<string, string>> => {
  const taught = await taughtSubjectOfA(w);
  const klass = await classOfA(w);
  const period = await periodOfA(w);
  return { id: dash(klass['id']!), staffId: taught['staffId']!, subjectId: taught['subjectId']!, periodId: dash(period['id']!), year: await activeYearOfA(w) };
};
const lessonOfA = async (w: World): Promise<Record<string, string>> => {
  const s = await lessonSetupOfA(w);
  const id = randomUUID();
  await w.db.createTimetableEntry({ schoolId: w.schools.A, id, academicYearId: s['year']!, classroomId: s['id']!, subjectId: s['subjectId']!, staffId: s['staffId']!, day: 'MON', periodId: s['periodId']!, actorId: actorA(w), details: {} });
  return { id: dash(id) };
};
/** Attendance (P3-4): a class with one enrolled student in the active year, and a past Monday (a working day in every sample's schedule). */
const lastMonday = (): string => { const d = new Date(Date.now() + 330 * 60_000); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const classWithStudentOfA = async (w: World): Promise<Record<string, string>> => {
  const klass = await classOfA(w);
  const year = await activeYearOfA(w);
  const student = await studentOfA(w);
  await w.db.placeStudent({ schoolId: w.schools.A, studentId: student['id']!, academicYearId: year, classroomId: klass['id']!, actorId: actorA(w) });
  return { id: dash(klass['id']!), studentId: student['id']!, date: lastMonday(), year };
};
const attendanceDayOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await classWithStudentOfA(w);
  await w.db.createAttendanceDay({ schoolId: w.schools.A, id: randomUUID(), classroomId: ctx['id']!, date: ctx['date']!, actorId: actorA(w) });
  return ctx;
};
/** The STAFF account linked to a staff record of school A (once; later calls find it), so it can check in and out. */
const linkedStaffOfA = async (w: World): Promise<Record<string, string>> => {
  const have = (await w.db.staffOfUser({ schoolId: w.schools.A, userId: w.roles.A.STAFF.uid })).data.staffProfiles[0];
  if (have) return { id: dash(have.id) };
  const staff = await staffOfA(w);
  await w.db.linkStaffAccount({ schoolId: w.schools.A, id: staff['id']!, userId: w.roles.A.STAFF.uid, actorId: w.roles.A.HR_MANAGER.uid, details: {} });
  return staff;
};
const checkedInStaffOfA = async (w: World): Promise<Record<string, string>> => {
  const staff = await linkedStaffOfA(w);
  const date = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const row = (await w.db.getStaffAttendance({ schoolId: w.schools.A, staffId: staff['id']!, date })).data.staffAttendances[0];
  if (!row) await w.db.checkInStaff({ schoolId: w.schools.A, id: randomUUID(), staffId: staff['id']!, date, actorId: w.roles.A.STAFF.uid, details: {} });
  return staff;
};
/** Terms and exams (P3-5), made through the real operations: a term of the active year, an exam of a fresh class and subject, optionally with a student in the class. */
const termOfA = async (w: World): Promise<Record<string, string>> => {
  const year = await activeYearOfA(w);
  const id = randomUUID();
  await w.db.createAssessmentTerm({ schoolId: w.schools.A, id, academicYearId: year, name: `T-${id.slice(0, 6)}`, actorId: actorA(w), details: {} });
  return { id: dash(id), year };
};
const examSetupOfA = async (w: World): Promise<Record<string, string>> => {
  const term = await termOfA(w);
  const klass = await classOfA(w);
  const subject = await subjectOfA(w);
  return { termId: term['id']!, year: term['year']!, classId: dash(klass['id']!), subjectId: dash(subject['id']!) };
};
const examOfA = async (w: World): Promise<Record<string, string>> => {
  const s = await examSetupOfA(w);
  const id = randomUUID();
  await w.db.createExam({ schoolId: w.schools.A, id, termId: s['termId']!, classroomId: s['classId']!, subjectId: s['subjectId']!, title: 'Unit test', examDate: '2090-05-05', maxTenths: 500, actorId: actorA(w), details: {} });
  return { ...s, id: dash(id) };
};
const examWithStudentOfA = async (w: World): Promise<Record<string, string>> => {
  const e = await examOfA(w);
  const student = await studentOfA(w);
  await w.db.placeStudent({ schoolId: w.schools.A, studentId: student['id']!, academicYearId: e['year']!, classroomId: e['classId']!, actorId: actorA(w) });
  return { ...e, studentId: student['id']! };
};
/** Leave (P3-6): a paid type with a big allowance, and a Monday inside the active year that no earlier sample used (the STAFF account asks again and again, and one person's requests may not overlap). */
let leaveWeek = 0;
const leaveTypeOfA = async (w: World, paid = true): Promise<Record<string, string>> => {
  const id = randomUUID();
  await w.db.createLeaveType({ schoolId: w.schools.A, id, name: `Type ${id.slice(0, 6)}`, paid, quotaHalfDays: paid ? 200 : 0, actorId: w.roles.A.HR_MANAGER.uid, details: {} });
  return { id: dash(id) };
};
const mondayInActiveYear = async (w: World): Promise<{ year: string; date: string }> => {
  const year = await activeYearOfA(w);
  const row = (await w.db.listAcademicYears({ schoolId: w.schools.A })).data.academicYears.find((y) => dash(y.id) === year)!;
  const d = new Date(`${row.startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7) + 7 * ++leaveWeek); // a Monday, one week further on each call
  return { year, date: d.toISOString().slice(0, 10) };
};
const leaveSetupOfA = async (w: World): Promise<Record<string, string>> => {
  const staff = await linkedStaffOfA(w);
  const type = await leaveTypeOfA(w);
  const { year, date } = await mondayInActiveYear(w);
  return { staffId: staff['id']!, typeId: type['id']!, year, date };
};
const pendingLeaveOfA = async (w: World): Promise<Record<string, string>> => {
  const s = await leaveSetupOfA(w);
  const id = randomUUID();
  await w.db.createLeaveRequest({ schoolId: w.schools.A, id, staffId: s['staffId']!, leaveTypeId: s['typeId']!, startDate: s['date']!, endDate: s['date']!, halfDays: 2, actorId: w.roles.A.STAFF.uid, details: {} });
  return { ...s, id: dash(id) };
};
const staffA = { token: (w: World) => w.roles.A.STAFF.token, actor: (w: World) => w.roles.A.STAFF.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
/** Substitution (P3-7): a teacher on approved leave (a fresh account, so no earlier sample's leave overlaps), their Monday lesson, and a qualified free colleague. */
const coverSetupOfA = async (w: World): Promise<Record<string, string>> => {
  const { userId } = await memberOfA(w);
  const absent = await staffOfA(w);
  await w.db.linkStaffAccount({ schoolId: w.schools.A, id: absent['id']!, userId, actorId: w.roles.A.HR_MANAGER.uid, details: {} });
  const sub = await subjectOfA(w);
  const klass = await classOfA(w);
  const period = await periodOfA(w);
  const substitute = await staffOfA(w);
  for (const staffId of [absent['id']!, substitute['id']!]) await w.db.addTeacherSubject({ schoolId: w.schools.A, id: randomUUID(), staffId, subjectId: sub['id']!, actorId: actorA(w), details: {} });
  const { year, date } = await mondayInActiveYear(w);
  const entryId = randomUUID();
  await w.db.createTimetableEntry({ schoolId: w.schools.A, id: entryId, academicYearId: year, classroomId: klass['id']!, subjectId: sub['id']!, staffId: absent['id']!, day: 'MON', periodId: period['id']!, actorId: actorA(w), details: {} });
  const type = await leaveTypeOfA(w, false);
  const leaveId = randomUUID();
  await w.db.createLeaveRequest({ schoolId: w.schools.A, id: leaveId, staffId: absent['id']!, leaveTypeId: type['id']!, startDate: date, endDate: date, halfDays: 2, actorId: userId, details: {} });
  await w.db.approveUnpaidLeaveRequest({ schoolId: w.schools.A, id: leaveId, actorId: w.roles.A.PRINCIPAL.uid, details: {} });
  return { entryId: dash(entryId), date, substituteId: substitute['id']!, absentId: absent['id']!, leaveId: dash(leaveId), subjectId: dash(sub['id']!), periodId: dash(period['id']!) };
};
const coveredLessonOfA = async (w: World): Promise<Record<string, string>> => {
  const c = await coverSetupOfA(w);
  const id = markId(`substitution-${c['date']}`, c['entryId']!);
  await w.db.setSubstitute({ schoolId: w.schools.A, id, timetableEntryId: c['entryId']!, date: c['date']!, day: 'MON', periodId: c['periodId']!, subjectId: c['subjectId']!, absentStaffId: c['absentId']!, leaveRequestId: c['leaveId']!, substituteId: c['substituteId']!, actorId: actorA(w), details: {} });
  return { id: dash(id) };
};
const linkedParentOfA = async (w: World): Promise<Record<string, string>> => {
  const student = await studentOfA(w);
  await w.db.linkParentAccount({ schoolId: w.schools.A, id: randomUUID(), studentId: student['id']!, userId: w.roles.A.PARENT.uid, relationship: 'MOTHER', actorId: actorA(w) });
  const link = (await w.db.parentLinksOfStudent({ schoolId: w.schools.A, studentId: student['id']! })).data.parentLinks[0]!;
  return { id: student['id']!, linkId: dash(link.id) };
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

const officerOfA = { token: (w: World) => w.roles.A.ADMISSIONS_OFFICER.token, actor: (w: World) => w.roles.A.ADMISSIONS_OFFICER.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
/** A class level, year and class of school A, plus an application for them (optionally already ACCEPTED), through the real operations. */
const applicationOfA = (accepted: boolean) => async (w: World): Promise<Record<string, string>> => {
  const actor = w.roles.A.ADMISSIONS_OFFICER.uid;
  const year = randomUUID();
  await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `AY-${year.slice(0, 6)}`, startDate: '2060-04-01', endDate: '2061-03-31', actorId: actor });
  const level = (await w.db.listGradeLevels({ schoolId: w.schools.A })).data.gradeLevels.find((l) => l.name === '2')!.id;
  const room = randomUUID();
  await w.db.createClassroom({ schoolId: w.schools.A, id: room, gradeLevelId: level, section: `S${year.slice(0, 3)}`, name: `2 S${year.slice(0, 3)}`, capacity: 30, actorId: actor });
  const seq = (await w.db.applicationSeqInfo({ schoolId: w.schools.A })).data.school!.applicationSeq;
  const id = randomUUID();
  await w.db.createApplication({ schoolId: w.schools.A, id, expectedSeq: seq, applicationNo: `A${String(seq + 1).padStart(4, '0')}`, firstName: 'Sample', lastName: 'Applicant', gradeLevelId: level, academicYearId: year, guardianName: 'Sample Guardian', guardianRelationship: 'MOTHER', guardianEmail: 'guardian@example.com', actorId: actor });
  if (accepted) await w.db.decideApplication({ schoolId: w.schools.A, id, fromStatus: 'SUBMITTED' as never, toStatus: 'ACCEPTED' as never, actorId: actor });
  return { id: dash(id), level: dash(level), year: dash(year), room: dash(room) };
};

const bursarOfA = { token: (w: World) => w.roles.A.BURSAR.token, actor: (w: World) => w.roles.A.BURSAR.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
/** A fee structure of school A for a fresh year and a class level, through the real operations. */
const structureOfA = async (w: World): Promise<Record<string, string>> => {
  const actor = w.roles.A.BURSAR.uid;
  const year = randomUUID();
  await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `FY-${year.slice(0, 6)}`, startDate: '2061-04-01', endDate: '2062-03-31', actorId: actor });
  const level = (await w.db.listGradeLevels({ schoolId: w.schools.A })).data.gradeLevels.find((l) => l.name === '4')!.id;
  const id = randomUUID();
  await w.db.createFeeStructure({ schoolId: w.schools.A, id, academicYearId: year, gradeLevelId: level, name: 'Sample fees', actorId: actor });
  return { id: dash(id), year: dash(year), level: dash(level) };
};
const feeItemOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await structureOfA(w);
  const itemId = randomUUID();
  await w.db.createFeeItem({ schoolId: w.schools.A, id: itemId, structureId: ctx['id']!, name: 'Tuition', actorId: w.roles.A.BURSAR.uid });
  return { ...ctx, structureId: ctx['id']!, id: dash(itemId) };
};
const instalmentOfA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await feeItemOfA(w);
  const id = randomUUID();
  await w.db.addFeeInstalment({ schoolId: w.schools.A, id, itemId: ctx['id']!, sequence: 1, amountMinor: '1000000', dueDate: '2061-05-01', actorId: w.roles.A.BURSAR.uid });
  return { ...ctx, id: dash(id) };
};
const concessionOfA = async (w: World): Promise<Record<string, string>> => {
  const stu = await studentOfA(w);
  const year = (await structureOfA(w))['year']!;
  const id = randomUUID();
  await w.db.createConcession({ schoolId: w.schools.A, id, studentId: stu['id']!, academicYearId: year, name: 'Sample', kind: 'PERCENT' as never, basisPoints: 500, actorId: w.roles.A.BURSAR.uid });
  return { id: dash(id) };
};

/** A manual invoice of school A (optionally already part-paid), through the real operations. */
const invoiceOfA = (paid: boolean) => async (w: World): Promise<Record<string, string>> => {
  const actor = w.roles.A.BURSAR.uid;
  const stu = (await studentOfA(w))['id']!;
  const id = randomUUID();
  await w.db.createInvoice({ schoolId: w.schools.A, id, studentId: stu, title: 'Sample invoice', amountMinor: '100000', dueDate: '2060-01-01', actorId: actor });
  if (!paid) return { id: dash(id) };
  const payment = randomUUID();
  const year = randomUUID();
  await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `RY-${year.slice(0, 6)}`, startDate: '2059-04-01', endDate: '2060-03-31', actorId: actor });
  await w.db.recordPayment({ schoolId: w.schools.A, id: payment, receiptId: randomUUID(), invoiceId: id, studentId: stu, amountMinor: '40000', method: 'CASH' as never, paidOn: '2060-01-02', expectedPaidMinor: '0', newPaidMinor: '40000', newStatus: 'PENDING' as never, balanceAfterMinor: '60000', receiptYearId: year, expectedReceiptSeq: 0, receiptNumber: `R-RY-${year.slice(0, 6)}-00001`, actorId: actor });
  return { id: dash(payment), invoice: dash(id) };
};
/** One fee structure with one instalment and one placed student, so an invoice run makes exactly one invoice. */
const readyToBillA = async (w: World): Promise<Record<string, string>> => {
  const ctx = await instalmentOfA(w); // year, level 4, structure, fee, one instalment due 2061-05-01
  const actor = w.roles.A.BURSAR.uid;
  const room = randomUUID();
  await w.db.createClassroom({ schoolId: w.schools.A, id: room, gradeLevelId: ctx['level']!, section: `B${room.slice(0, 4)}`, name: `4 B${room.slice(0, 4)}`, capacity: 30, actorId: actor });
  const stu = (await studentOfA(w))['id']!;
  await w.db.placeStudent({ schoolId: w.schools.A, studentId: stu, academicYearId: ctx['year']!, classroomId: room, actorId: actor });
  return { year: ctx['year']!, student: stu };
};

const principalOfA = { token: (w: World) => w.roles.A.PRINCIPAL.token, actor: (w: World) => w.roles.A.PRINCIPAL.uid, school: (w: World) => w.schools.A, auditSchool: (w: World) => w.schools.A };
/** Each sample run gets its own month (one run per school and month), counting up from January 2001. */
let runCounter = 0;
const nextRunPeriod = () => { const n = runCounter++; return { year: 2001 + Math.floor(n / 12), month: (n % 12) + 1 }; };
/** A DRAFT payroll run with one payslip (Basic pay 30,000.00) for a person who has a day of approved UNPAID leave in the run's month (P3-8). */
const unpaidLeaveRunOfA = async (w: World): Promise<Record<string, string>> => {
  const hr = w.roles.A.HR_MANAGER.uid;
  const { userId } = await memberOfA(w);
  const staff = (await staffOfA(w))['id']!;
  await w.db.linkStaffAccount({ schoolId: w.schools.A, id: staff, userId, actorId: hr, details: {} });
  const period = nextRunPeriod();
  const runId = randomUUID(), slip = randomUUID();
  await w.db.createPayrollRun({ schoolId: w.schools.A, id: runId, ...period, actorId: hr });
  await w.db.createPayslip({ schoolId: w.schools.A, id: slip, runId, staffId: staff, actorId: hr });
  await w.db.addPayslipLine({ schoolId: w.schools.A, id: randomUUID(), runId, payslipId: slip, kind: 'EARNING' as never, name: 'Basic pay', amountMinor: '3000000', manual: false, actorId: hr });
  const type = await leaveTypeOfA(w, false);
  const day = new Date(Date.UTC(period.year, period.month - 1, 1));
  day.setUTCDate(day.getUTCDate() + ((8 - day.getUTCDay()) % 7)); // the month's first Monday
  const date = day.toISOString().slice(0, 10);
  const leaveId = randomUUID();
  await w.db.createLeaveRequest({ schoolId: w.schools.A, id: leaveId, staffId: staff, leaveTypeId: type['id']!, startDate: date, endDate: date, halfDays: 2, actorId: userId, details: {} });
  await w.db.approveUnpaidLeaveRequest({ schoolId: w.schools.A, id: leaveId, actorId: w.roles.A.PRINCIPAL.uid, details: {} });
  return { id: dash(slip), run: dash(runId), staffId: dash(staff) };
};
/** A payroll run of school A with one payslip and one line, optionally approved, through the real operations. */
const payrollRunOfA = (opts: { approve?: boolean } = {}) => async (w: World): Promise<Record<string, string>> => {
  const hr = w.roles.A.HR_MANAGER.uid;
  const staff = (await staffOfA(w))['id']!;
  const runId = randomUUID(), slip = randomUUID(), line = randomUUID();
  await w.db.createPayrollRun({ schoolId: w.schools.A, id: runId, ...nextRunPeriod(), actorId: hr });
  await w.db.createPayslip({ schoolId: w.schools.A, id: slip, runId, staffId: staff, actorId: hr });
  await w.db.addPayslipLine({ schoolId: w.schools.A, id: line, runId, payslipId: slip, kind: 'EARNING' as never, name: 'Basic pay', amountMinor: '3000000', manual: false, actorId: hr });
  if (opts.approve) await w.db.approvePayrollRun({ schoolId: w.schools.A, id: runId, actorId: w.roles.A.PRINCIPAL.uid });
  return { id: dash(runId), payslip: dash(slip), line: dash(line) };
};
const salaryLineOfA = async (w: World): Promise<Record<string, string>> => {
  const staff = (await staffOfA(w))['id']!;
  const id = randomUUID();
  await w.db.addSalaryLine({ schoolId: w.schools.A, id, staffId: staff, kind: 'EARNING' as never, name: 'Basic pay', amountMinor: '3000000', actorId: w.roles.A.HR_MANAGER.uid });
  return { id: dash(id), staffId: staff };
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
  'PATCH /academics/schedule/working-days': { ...academicAdminOfA, body: () => ({ days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] }) },
  'POST /academics/schedule/template': { ...academicAdminOfA, prepare: emptyScheduleOfA, body: () => ({ template: 'SHORT_DAY' }) },
  'POST /academics/periods': { ...academicAdminOfA, body: () => { const m = 1200 + Math.floor(Math.random() * 200); const t = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; return { label: `Sample ${randomUUID().slice(0, 6)}`, startTime: t(m), endTime: t(m + 1) }; } },
  'PATCH /academics/periods/:id': { ...academicAdminOfA, prepare: periodOfA, body: () => ({ label: `Renamed ${randomUUID().slice(0, 6)}` }) },
  'DELETE /academics/periods/:id': { ...academicAdminOfA, prepare: periodOfA },
  'POST /academics/teachers/:staffId/subjects': { ...academicAdminOfA, prepare: teacherAndSubjectOfA, body: (_w, ctx) => ({ subjectId: ctx['subjectId'] }) },
  'DELETE /academics/teachers/:staffId/subjects/:subjectId': { ...academicAdminOfA, prepare: taughtSubjectOfA },
  'PUT /academics/classes/:id/teacher': { ...academicAdminOfA, prepare: classTeacherSetupOfA, body: (_w, ctx) => ({ staffId: ctx['staffId'], academicYearId: ctx['year'] }) },
  'DELETE /academics/classes/:id/teacher': { ...academicAdminOfA, prepare: classWithTeacherOfA },
  'PUT /academics/timetable/classes/:id/slots': { ...academicAdminOfA, prepare: lessonSetupOfA, body: (_w, ctx) => ({ day: 'MON', periodId: ctx['periodId'], subjectId: ctx['subjectId'], staffId: ctx['staffId'], academicYearId: ctx['year'] }) },
  'DELETE /academics/timetable/entries/:id': { ...academicAdminOfA, prepare: lessonOfA },
  'PUT /attendance/statuses/:status': { ...academicAdminOfA, prepare: async () => ({ status: 'LATE' }), body: () => ({ label: `Tardy ${randomUUID().slice(0, 4)}` }) },
  'PUT /attendance/classes/:id/days/:date': { ...academicAdminOfA, prepare: classWithStudentOfA, body: (_w, ctx) => ({ marks: [{ studentId: ctx['studentId'], status: 'ABSENT' }], submissionId: randomUUID() }) },
  'POST /attendance/classes/:id/days/:date/lock': { ...academicAdminOfA, prepare: attendanceDayOfA },
  'PUT /attendance/classes/:id/days/:date/correction': { ...academicAdminOfA, prepare: attendanceDayOfA, body: (_w, ctx) => ({ marks: [{ studentId: ctx['studentId'], status: 'MEDICAL', note: 'doctor' }] }) },
  'POST /attendance/staff/check-in': { refusedStatus: 409, token: (w) => w.roles.A.STAFF.token, actor: (w) => w.roles.A.STAFF.uid, school: (w) => w.schools.A, auditSchool: (w) => w.schools.A, prepare: linkedStaffOfA },
  'POST /attendance/staff/check-out': { refusedStatus: 409, token: (w) => w.roles.A.STAFF.token, actor: (w) => w.roles.A.STAFF.uid, school: (w) => w.schools.A, auditSchool: (w) => w.schools.A, prepare: checkedInStaffOfA },
  'PUT /attendance/staff/:staffId/days/:date': { ...hrOfA, prepare: async (w) => ({ staffId: (await staffOfA(w))['id']!, date: lastMonday() }), body: (_w, ctx) => ({ checkIn: `${ctx['date']}T09:00:00Z`, checkOut: `${ctx['date']}T17:00:00Z` }) },
  'POST /grades/terms': { ...academicAdminOfA, prepare: async (w) => ({ year: await activeYearOfA(w) }), body: (_w, ctx) => ({ name: `Term ${randomUUID().slice(0, 6)}`, academicYearId: ctx['year'] }) },
  'PATCH /grades/terms/:id': { ...academicAdminOfA, prepare: termOfA, body: () => ({ name: `Renamed ${randomUUID().slice(0, 6)}` }) },
  'DELETE /grades/terms/:id': { ...academicAdminOfA, prepare: termOfA },
  'PUT /grades/bands': { ...academicAdminOfA, body: () => ({ bands: [{ label: 'Pass', minPercent: 33, maxPercent: 100 }, { label: 'Fail', minPercent: 0, maxPercent: 32 }] }) },
  'POST /grades/exams': { ...academicAdminOfA, prepare: examSetupOfA, body: (_w, ctx) => ({ termId: ctx['termId'], classId: ctx['classId'], subjectId: ctx['subjectId'], title: 'Half yearly', examDate: '2090-09-01', maxMarks: '80' }) },
  'PATCH /grades/exams/:id': { ...academicAdminOfA, prepare: examOfA, body: () => ({ title: 'Renamed exam', maxMarks: '60' }) },
  'DELETE /grades/exams/:id': { ...academicAdminOfA, prepare: examOfA },
  'PUT /grades/exams/:id/marks': { ...academicAdminOfA, prepare: examWithStudentOfA, body: (_w, ctx) => ({ entries: [{ studentId: ctx['studentId'], marks: '42.5' }], submissionId: randomUUID() }) },
  'POST /leave/types': { ...hrOfA, body: () => ({ name: `Casual ${randomUUID().slice(0, 6)}`, paid: true, quotaDays: '10' }) },
  'PATCH /leave/types/:id': { ...hrOfA, prepare: leaveTypeOfA, body: () => ({ quotaDays: '8' }) },
  'DELETE /leave/types/:id': { ...hrOfA, prepare: leaveTypeOfA },
  'PUT /leave/balances/:staffId/:typeId': { ...hrOfA, prepare: leaveSetupOfA, body: (_w, ctx) => ({ allowedDays: '12', academicYearId: ctx['year'] }) },
  'POST /leave/requests': { ...staffA, refusedStatus: 409, prepare: leaveSetupOfA, body: (_w, ctx) => ({ leaveTypeId: ctx['typeId'], startDate: ctx['date'], endDate: ctx['date'], reason: 'Family event' }) },
  'POST /leave/requests/:id/cancel': { ...staffA, refusedStatus: 404, prepare: pendingLeaveOfA },
  'POST /leave/requests/:id/approve': { ...principalOfA, prepare: pendingLeaveOfA },
  'POST /leave/requests/:id/reject': { ...principalOfA, prepare: pendingLeaveOfA, body: () => ({ note: 'Exams that week' }) },
  'PUT /substitutions': { ...academicAdminOfA, prepare: coverSetupOfA, body: (_w, ctx) => ({ entryId: ctx['entryId'], date: ctx['date'], substituteStaffId: ctx['substituteId'] }) },
  'DELETE /substitutions/:id': { ...academicAdminOfA, prepare: coveredLessonOfA },
  'POST /students/:id/parent-accounts': { ...academicAdminOfA, prepare: studentOfA, body: (w) => ({ userId: w.roles.A.PARENT.uid, relationship: 'MOTHER' }) },
  'DELETE /students/:id/parent-accounts/:linkId': { ...academicAdminOfA, prepare: linkedParentOfA },
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
  'POST /admissions': {
    ...officerOfA,
    prepare: async (w) => ({ level: dash((await w.db.listGradeLevels({ schoolId: w.schools.A })).data.gradeLevels.find((l) => l.name === '3')!.id), year: dash((await applicationOfA(false)(w))['year']!) }),
    body: (_w, ctx) => ({ firstName: 'Audit', lastName: 'Applicant', gradeLevelId: ctx['level'], academicYearId: ctx['year'], guardianName: 'Audit Guardian', guardianRelationship: 'FATHER' }),
  },
  'PATCH /admissions/:id': { ...officerOfA, prepare: applicationOfA(false), body: () => ({ notes: 'Sibling in class 5' }) },
  'POST /admissions/:id/decision': { ...officerOfA, prepare: applicationOfA(false), body: () => ({ status: 'UNDER_REVIEW' }) },
  'POST /admissions/:id/admit': { ...officerOfA, prepare: applicationOfA(true), body: (_w, ctx) => ({ classroomId: ctx['room'] }) },
  'POST /fees/structures': {
    ...bursarOfA,
    prepare: async (w) => {
      const year = randomUUID();
      await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `FY-${year.slice(0, 6)}`, startDate: '2063-04-01', endDate: '2064-03-31', actorId: w.roles.A.BURSAR.uid });
      return { year: dash(year), level: dash((await w.db.listGradeLevels({ schoolId: w.schools.A })).data.gradeLevels.find((l) => l.name === '5')!.id) };
    },
    body: (_w, ctx) => ({ gradeLevelId: ctx['level'], academicYearId: ctx['year'] }),
  },
  'PATCH /fees/structures/:id': { ...bursarOfA, prepare: structureOfA, body: () => ({ name: 'Renamed fees' }) },
  'DELETE /fees/structures/:id': { ...bursarOfA, prepare: structureOfA },
  'POST /fees/structures/:id/items': { ...bursarOfA, prepare: structureOfA, body: () => ({ name: 'Tuition', instalments: [{ label: 'April', amountMinor: '1250000', dueDate: '2061-04-10' }, { label: 'July', amountMinor: '1250000', dueDate: '2061-07-10' }] }) },
  'PATCH /fees/items/:id': { ...bursarOfA, prepare: feeItemOfA, body: () => ({ name: 'Tuition fee' }) },
  'DELETE /fees/items/:id': { ...bursarOfA, prepare: feeItemOfA },
  'POST /fees/items/:id/instalments': { ...bursarOfA, prepare: feeItemOfA, body: () => ({ label: 'October', amountMinor: '500000', dueDate: '2061-10-10' }) },
  'PATCH /fees/instalments/:id': { ...bursarOfA, prepare: instalmentOfA, body: () => ({ amountMinor: '1100000' }) },
  'DELETE /fees/instalments/:id': { ...bursarOfA, prepare: instalmentOfA },
  'POST /fees/concessions': {
    ...bursarOfA,
    prepare: async (w) => ({ studentId: (await studentOfA(w))['id']!, year: (await structureOfA(w))['year']! }),
    body: (_w, ctx) => ({ studentId: ctx['studentId'], academicYearId: ctx['year'], name: 'Sibling', kind: 'PERCENT', basisPoints: 1000 }),
  },
  'DELETE /fees/concessions/:id': { ...bursarOfA, prepare: concessionOfA },
  'POST /imports/students': { ...academicAdminOfA, body: () => ({ csv: `first name,last name\nImp${randomUUID().slice(0, 6)},Student\n` }) },
  'POST /imports/staff': { ...hrOfA, body: () => ({ csv: `first name,last name,department\nImp${randomUUID().slice(0, 6)},Staff,Science\n` }) },
  'POST /imports/guardians': {
    ...academicAdminOfA,
    prepare: studentOfA,
    body: async (w, ctx) => ({ csv: `student id,name,relationship,phone\n${(await w.db.getStudent({ schoolId: w.schools.A, id: ctx['id']! })).data.students[0]!.enrollmentId},Imp Guardian,MOTHER,9876543210\n` }),
  },
  'POST /fees/invoices': { ...bursarOfA, prepare: studentOfA, body: (_w, ctx) => ({ studentId: ctx['id'], title: 'Trip fee', amountMinor: '50000', dueDate: '2060-02-01' }) },
  'POST /fees/invoices/generate': { ...bursarOfA, prepare: readyToBillA, body: (_w, ctx) => ({ dueOnOrBefore: '2061-12-31', academicYearId: ctx['year'], studentId: ctx['student'] }) },
  'POST /fees/invoices/:id/payments': {
    ...bursarOfA,
    prepare: async (w) => {
      // a manual invoice has no academic year of its own: the receipt is numbered in the year the payment date falls in
      const year = randomUUID();
      const d = new Date();
      const iso = (days: number) => new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10);
      await w.db.createAcademicYear({ schoolId: w.schools.A, id: year, name: `PY-${year.slice(0, 6)}`, startDate: iso(-30), endDate: iso(300), actorId: w.roles.A.BURSAR.uid });
      return invoiceOfA(false)(w);
    },
    body: () => ({ amountMinor: '10000', method: 'CASH' }),
  },
  'POST /fees/payments/:id/reverse': { ...bursarOfA, prepare: invoiceOfA(true), body: () => ({ reason: 'Entered in error' }) },
  'POST /payroll/staff/:staffId/salary-lines': { ...hrOfA, prepare: async (w) => ({ staffId: (await staffOfA(w))['id']! }), body: () => ({ kind: 'EARNING', name: 'Basic pay', amountMinor: '3500000' }) },
  'PATCH /payroll/salary-lines/:id': { ...hrOfA, prepare: salaryLineOfA, body: () => ({ amountMinor: '3600000' }) },
  'DELETE /payroll/salary-lines/:id': { ...bursarOfA, prepare: salaryLineOfA },
  'POST /payroll/runs': {
    ...hrOfA,
    prepare: async (w) => ({ staffId: (await salaryLineOfA(w))['staffId']! }), // somebody with a salary, so the draft has a payslip
    body: () => nextRunPeriod(),
  },
  'DELETE /payroll/runs/:id': { ...bursarOfA, prepare: payrollRunOfA() },
  'POST /payroll/runs/:id/approve': { ...principalOfA, prepare: payrollRunOfA(), body: () => ({}) },
  'POST /payroll/runs/:id/pay': { ...bursarOfA, prepare: payrollRunOfA({ approve: true }), body: () => ({ reference: 'NEFT-1' }) },
  'POST /payroll/payslips/:id/lines': { ...hrOfA, prepare: async (w) => { const r = await payrollRunOfA()(w); return { id: r['payslip']! }; }, body: () => ({ kind: 'DEDUCTION', name: 'Advance recovery', amountMinor: '100000' }) },
  'POST /payroll/payslips/:id/leave-deduction': { ...hrOfA, prepare: unpaidLeaveRunOfA, body: () => ({}) },
  'DELETE /payroll/payslip-lines/:id': { ...hrOfA, prepare: async (w) => { const r = await payrollRunOfA()(w); return { id: r['line']! }; } },
};
