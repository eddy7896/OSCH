// P3-2: teacher subjects, class teachers and parent links against the real emulator.
// Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, DatabaseError, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Teachers, class teachers and parent links (P3-2)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ta-${tag}`, adminB = `tb-${tag}`, parentA = `tp-${tag}`, teacherA = `tt-${tag}`, outsider = `to-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  let staffA = '', staffB = '', staffLeft = '', subjectA = '', subjectB = '', classA = '', yearA = '', studentA = '', studentB = '';

  const makeStaff = async (school: string, actor: string, status?: 'LEFT') => {
    const seq = (await db.staffSeqInfo({ schoolId: school })).data.school!.staffSeq;
    const id = randomUUID();
    await db.createStaff({ schoolId: school, id, expectedSeq: seq, employeeId: `E${seq + 1}`, firstName: 'T', lastName: id.slice(0, 4), actorId: actor });
    if (status) await db.updateStaff({ schoolId: school, id, status: status as never, actorId: actor, details: {} });
    return id;
  };
  const makeStudent = async (school: string, actor: string) => {
    const s = (await db.schoolSeq({ schoolId: school })).data.school!;
    const id = randomUUID();
    await db.createStudent({ schoolId: school, id, expectedSeq: s.studentSeq, enrollmentId: `S${s.studentSeq + 1}`, firstName: 'K', lastName: id.slice(0, 4), actorId: actor });
    return id;
  };

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, parentA, teacherA, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `ta-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `tb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: A, userId: parentA, schoolRole: 'PARENT' as never });
    await db.createSchoolMember({ schoolId: A, userId: teacherA, schoolRole: 'TEACHER' as never });
    staffA = await makeStaff(A, adminA); staffB = await makeStaff(B, adminB); staffLeft = await makeStaff(A, adminA, 'LEFT');
    subjectA = randomUUID(); subjectB = randomUUID();
    await db.createSubject({ schoolId: A, id: subjectA, name: 'Maths', code: 'M', actorId: adminA });
    await db.createSubject({ schoolId: B, id: subjectB, name: 'Maths', code: 'M', actorId: adminB });
    yearA = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminA });
    const level = (await db.listGradeLevels({ schoolId: A })).data.gradeLevels[0]!;
    classA = randomUUID();
    await db.createClassroom({ schoolId: A, id: classA, gradeLevelId: level.id, section: 'T', name: `${level.name} T`, capacity: 30, actorId: adminA });
    studentA = await makeStudent(A, adminA); studentB = await makeStudent(B, adminB);
  });

  describe('teacher subjects', () => {
    it('links an active member of staff to a subject once, audited; a repeat is refused', async () => {
      const id = randomUUID();
      await db.addTeacherSubject({ schoolId: A, id, staffId: staffA, subjectId: subjectA, actorId: adminA, details: {} });
      await expect(db.addTeacherSubject({ schoolId: A, id: randomUUID(), staffId: staffA, subjectId: subjectA, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
      expect((await db.listTeacherSubjects({ schoolId: A })).data.teacherSubjects.filter((t) => t.staff.id.replaceAll('-', '') === staffA.replaceAll('-', ''))).toHaveLength(1);
      expect((await audit(A, 'academic.teachersubject.add')).length).toBe(1);
      await db.removeTeacherSubject({ schoolId: A, id, actorId: adminA, details: {} });
      expect((await db.listTeacherSubjects({ schoolId: A })).data.teacherSubjects).toHaveLength(0);
      expect((await audit(A, 'academic.teachersubject.remove')).length).toBe(1);
    });
    it('refuses staff who have left, staff or subjects of another school, and an actor who is not a member; nothing is written', async () => {
      for (const v of [{ staffId: staffLeft, subjectId: subjectA, actorId: adminA }, { staffId: staffB, subjectId: subjectA, actorId: adminA }, { staffId: staffA, subjectId: subjectB, actorId: adminA }, { staffId: staffA, subjectId: subjectA, actorId: outsider }])
        await expect(db.addTeacherSubject({ schoolId: A, id: randomUUID(), ...v, details: {} })).rejects.toBeInstanceOf(DatabaseError);
      expect((await db.listTeacherSubjects({ schoolId: A })).data.teacherSubjects).toHaveLength(0);
      expect((await audit(A, 'academic.teachersubject.add')).length).toBe(1);
    });
  });

  describe('class teachers', () => {
    it('one class teacher per class per year by key; change and remove are audited; other schools\' staff, classes and years are refused', async () => {
      const id = randomUUID();
      await db.assignClassTeacher({ schoolId: A, id, classroomId: classA, academicYearId: yearA, staffId: staffA, actorId: adminA, details: {} });
      await expect(db.assignClassTeacher({ schoolId: A, id: randomUUID(), classroomId: classA, academicYearId: yearA, staffId: staffA, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
      await expect(db.assignClassTeacher({ schoolId: A, id: randomUUID(), classroomId: classA, academicYearId: yearA, staffId: staffB, actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
      const other = await makeStaff(A, adminA);
      await db.changeClassTeacher({ schoolId: A, id, staffId: other, actorId: adminA, details: {} });
      const rows = (await db.listClassTeachers({ schoolId: A, academicYearId: yearA })).data.classTeachers;
      expect(rows).toHaveLength(1);
      expect(rows[0]!.staff.id.replaceAll('-', '')).toBe(other.replaceAll('-', ''));
      expect((await db.listClassTeachers({ schoolId: B, academicYearId: yearA })).data.classTeachers).toEqual([]); // another school sees none
      await expect(db.removeClassTeacher({ schoolId: B, id, actorId: adminB, details: {} })).rejects.toBeInstanceOf(DatabaseError);
      await db.removeClassTeacher({ schoolId: A, id, actorId: adminA, details: {} });
      expect((await db.listClassTeachers({ schoolId: A, academicYearId: yearA })).data.classTeachers).toEqual([]);
      expect((await audit(A, 'academic.classteacher.set')).length).toBe(2);
      expect((await audit(A, 'academic.classteacher.remove')).length).toBe(1);
    });
  });

  describe('parent links and own scope lookups', () => {
    it('links an ACTIVE parent of this school to a student; a teacher, a stranger, another school\'s student and a repeat are refused', async () => {
      const id = randomUUID();
      await db.linkParentAccount({ schoolId: A, id, studentId: studentA, userId: parentA, relationship: 'MOTHER', actorId: adminA, details: {} });
      for (const v of [{ studentId: studentA, userId: teacherA }, { studentId: studentA, userId: outsider }, { studentId: studentB, userId: parentA }, { studentId: studentA, userId: parentA }])
        await expect(db.linkParentAccount({ schoolId: A, id: randomUUID(), relationship: 'MOTHER', actorId: adminA, details: {}, ...v })).rejects.toBeInstanceOf(DatabaseError);
      expect((await db.parentLinksOfUser({ schoolId: A, userId: parentA })).data.parentLinks.map((l) => l.relationship)).toEqual(['MOTHER']);
      expect((await db.parentLinksOfUser({ schoolId: B, userId: parentA })).data.parentLinks).toEqual([]); // links are per school
      expect((await db.parentLinksOfStudent({ schoolId: A, studentId: studentA })).data.parentLinks).toHaveLength(1);
      await db.unlinkParentAccount({ schoolId: A, id, actorId: adminA, details: {} });
      expect((await db.parentLinksOfUser({ schoolId: A, userId: parentA })).data.parentLinks).toEqual([]);
      expect((await audit(A, 'student.parent.link')).length).toBe(1);
      expect((await audit(A, 'student.parent.unlink')).length).toBe(1);
    });
    it('a suspended parent cannot be linked', async () => {
      const p2 = `tq-${tag}`;
      await db.upsertUser({ id: p2, email: `${p2}@example.com` });
      await db.createSchoolMember({ schoolId: A, userId: p2, schoolRole: 'PARENT' as never });
      await db.updateMembership({ schoolId: A, userId: p2, schoolRole: 'PARENT' as never, status: 'SUSPENDED' as never, actorId: adminA });
      await expect(db.linkParentAccount({ schoolId: A, id: randomUUID(), studentId: studentA, userId: p2, relationship: 'FATHER', actorId: adminA, details: {} })).rejects.toBeInstanceOf(DatabaseError);
    });
    it('the staff record of an account is found only in its own school', async () => {
      const staff = await makeStaff(A, adminA);
      await db.createSchoolMember({ schoolId: A, userId: outsider, schoolRole: 'TEACHER' as never });
      await db.linkStaffAccount({ schoolId: A, id: staff, userId: outsider, actorId: adminA, details: {} });
      expect((await db.staffOfUser({ schoolId: A, userId: outsider })).data.staffProfiles).toHaveLength(1);
      expect((await db.staffOfUser({ schoolId: B, userId: outsider })).data.staffProfiles).toEqual([]);
    });
  });
});
