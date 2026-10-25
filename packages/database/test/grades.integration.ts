// P3-5: terms, exams and marks in the database itself. Run: npm run test:database
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '../src/index.js';

const host = process.env.DATA_CONNECT_EMULATOR_HOST;

describe.skipIf(!host)('Exams and marks (P3-5)', () => {
  let db: Database;
  const A = randomUUID();
  const B = randomUUID();
  const tag = A.slice(0, 8);
  const adminA = `ga-${tag}`, adminB = `gb-${tag}`, outsider = `go-${tag}`;
  const audit = async (s: string, action: string) => (await db.listAuditLog({ schoolId: s, limit: 300, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  let yearA = '', yearB = '', c1 = '', c2 = '', cB = '', sub = '', subB = '', st1 = '', stOther = '', stB = '', termA = '', termB = '', exam = '';

  const student = async (school: string, actor: string, classroomId: string, year: string) => {
    const s = (await db.schoolSeq({ schoolId: school })).data.school!;
    const id = randomUUID();
    await db.createStudent({ schoolId: school, id, expectedSeq: s.studentSeq, enrollmentId: `S${s.studentSeq + 1}`, firstName: 'K', lastName: id.slice(0, 4), actorId: actor });
    await db.placeStudent({ schoolId: school, studentId: id, academicYearId: year, classroomId, actorId: actor });
    return id;
  };
  const makeExam = (o: { school?: string; term?: string; klass?: string; subject?: string; title?: string; max?: number; actor?: string } = {}) => {
    const id = randomUUID();
    return db.createExam({ schoolId: o.school ?? A, id, termId: o.term ?? termA, classroomId: o.klass ?? c1, subjectId: o.subject ?? sub, title: o.title ?? `E-${id.slice(0, 4)}`, examDate: '2090-05-05', maxTenths: o.max ?? 1000, actorId: o.actor ?? adminA, details: {} }).then(() => id);
  };
  const save = (o: { school?: string; exam?: string; student?: string; klass?: string; year?: string; tenths?: number; absent?: boolean; actor?: string; id?: string }) =>
    db.saveMark({ schoolId: o.school ?? A, id: o.id ?? randomUUID(), examId: o.exam ?? exam, studentId: o.student ?? st1, classroomId: o.klass ?? c1, academicYearId: o.year ?? yearA, tenths: o.tenths ?? 725, absent: o.absent ?? false, actorId: o.actor ?? adminA });

  beforeAll(async () => {
    db = createDatabase({ projectId: 'demo-oruschools' });
    for (const id of [adminA, adminB, outsider]) await db.upsertUser({ id, email: `${id}@example.com` });
    await db.provisionSchool({ id: A, name: 'School A', subDomain: `ga-${tag}`, defaultLanguage: 'en', actorId: adminA });
    await db.provisionSchool({ id: B, name: 'School B', subDomain: `gb-${tag}`, defaultLanguage: 'en', actorId: adminB });
    await db.createSchoolMember({ schoolId: A, userId: adminA, schoolRole: 'ACADEMIC_ADMIN' as never });
    await db.createSchoolMember({ schoolId: B, userId: adminB, schoolRole: 'ACADEMIC_ADMIN' as never });
    yearA = randomUUID(); yearB = randomUUID();
    await db.createAcademicYear({ schoolId: A, id: yearA, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminA });
    await db.createAcademicYear({ schoolId: B, id: yearB, name: 'Y', startDate: '2090-04-01', endDate: '2091-03-31', actorId: adminB });
    const klass = async (school: string, actor: string) => {
      const level = (await db.listGradeLevels({ schoolId: school })).data.gradeLevels[0]!;
      const id = randomUUID();
      await db.createClassroom({ schoolId: school, id, gradeLevelId: level.id, section: id.slice(0, 4), name: `${level.name} ${id.slice(0, 4)}`, capacity: 30, actorId: actor });
      return id;
    };
    [c1, c2, cB] = [await klass(A, adminA), await klass(A, adminA), await klass(B, adminB)];
    [sub, subB] = [randomUUID(), randomUUID()];
    await db.createSubject({ schoolId: A, id: sub, name: 'Maths', code: 'M', actorId: adminA });
    await db.createSubject({ schoolId: B, id: subB, name: 'Maths', code: 'M', actorId: adminB });
    st1 = await student(A, adminA, c1, yearA); stOther = await student(A, adminA, c2, yearA); stB = await student(B, adminB, cB, yearB);
    [termA, termB] = [randomUUID(), randomUUID()];
    await db.createAssessmentTerm({ schoolId: A, id: termA, academicYearId: yearA, name: 'T1', actorId: adminA, details: {} });
    await db.createAssessmentTerm({ schoolId: B, id: termB, academicYearId: yearB, name: 'T1', actorId: adminB, details: {} });
  }, 120_000);

  it('terms are unique by name per year, audited, and another school\'s year is refused', async () => {
    await expect(db.createAssessmentTerm({ schoolId: A, id: randomUUID(), academicYearId: yearA, name: 'T1', actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await expect(db.createAssessmentTerm({ schoolId: A, id: randomUUID(), academicYearId: yearB, name: 'X', actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.createAssessmentTerm({ schoolId: A, id: randomUUID(), academicYearId: yearA, name: 'X', actorId: outsider, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await audit(A, 'grades.term.create')).length).toBe(1);
    expect((await db.listAssessmentTerms({ schoolId: A })).data.assessmentTerms).toHaveLength(1);
  });

  it('an exam needs a term, class and subject of the same school and is unique per term, class, subject and title', async () => {
    exam = await makeExam({ title: 'Unit 1' });
    await expect(makeExam({ title: 'Unit 1' })).rejects.toMatchObject({ kind: 'CONFLICT' });
    await makeExam({ title: 'Unit 1', klass: c2 }); // another class: fine
    await expect(makeExam({ term: termB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(makeExam({ klass: cB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(makeExam({ subject: subB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    expect((await audit(A, 'grades.exam.create')).length).toBe(2);
  });

  it('a mark above the exam\'s maximum is refused by the database; the same mark saved twice is one row; absent is zero', async () => {
    await expect(save({ tenths: 1001 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const id = randomUUID();
    await save({ id, tenths: 1000 }); // exactly the maximum is fine
    await save({ id, tenths: 725 });
    let row = (await db.getExam({ schoolId: A, id: exam })).data.exams[0]!;
    expect(row.marks).toHaveLength(1);
    expect(row.marks[0]).toMatchObject({ tenths: 725, absent: false });
    await save({ id, tenths: 0, absent: true });
    row = (await db.getExam({ schoolId: A, id: exam })).data.exams[0]!;
    expect(row.marks[0]).toMatchObject({ tenths: 0, absent: true });
    expect((await db.countMarksOfExam({ schoolId: A, examId: exam })).data.marks[0]!._count).toBe(1);
    await save({ id, tenths: 725 });
  });

  it('refuses a student not in the exam\'s class, a student or exam of another school, and an outsider as actor', async () => {
    await expect(save({ student: stOther })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(save({ student: stB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(save({ school: B, student: stB, klass: cB, year: yearB, actor: adminB })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // A's exam through B
    const existing = (await db.getExam({ schoolId: A, id: exam })).data.exams[0]!.marks[0]!.id; // same row: an upsert, so only the checks can refuse
    await expect(save({ id: existing, actor: outsider })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(save({ id: existing, klass: c2 })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' }); // the exam is not for that class
    expect((await db.getExam({ schoolId: A, id: exam })).data.exams[0]!.marks).toHaveLength(1);
  });

  it('finishing marks entry is the one audited step and records the submission; the maximum cannot go below a given mark; an exam with marks or a term with exams cannot be deleted', async () => {
    await db.finishMarkEntry({ schoolId: A, id: exam, submissionId: 'sub-1', actorId: adminA, details: { changes: [] } });
    expect((await audit(A, 'grades.marks.save')).length).toBe(1);
    expect((await db.getExam({ schoolId: A, id: exam })).data.exams[0]!.lastSubmissionId).toBe('sub-1');
    await expect(db.updateExam({ schoolId: A, id: exam, title: 'Unit 1', examDate: '2090-05-05', maxTenths: 700, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await db.updateExam({ schoolId: A, id: exam, title: 'Unit 1', examDate: '2090-05-06', maxTenths: 725, actorId: adminA, details: {} });
    await expect(db.deleteExam({ schoolId: A, id: exam, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteAssessmentTerm({ schoolId: A, id: termA, actorId: adminA, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    await expect(db.deleteExam({ schoolId: B, id: exam, actorId: adminB, details: {} })).rejects.toMatchObject({ kind: 'FORBIDDEN_REFERENCE' });
    const mark = (await db.getExam({ schoolId: A, id: exam })).data.exams[0]!.marks[0]!;
    await db.removeMark({ schoolId: A, id: mark.id, examId: exam, actorId: adminA });
    await db.deleteExam({ schoolId: A, id: exam, actorId: adminA, details: {} });
    expect((await audit(A, 'grades.exam.delete')).length).toBe(1);
  });

  it('grade bands are kept on the school, one set each, audited', async () => {
    await db.setGradeBands({ schoolId: A, bands: '[{"label":"P","minPercent":0,"maxPercent":100}]', actorId: adminA, details: {} });
    expect((await db.schoolGradeBands({ schoolId: A })).data.school!.gradeBands).toContain('"P"');
    expect((await db.schoolGradeBands({ schoolId: B })).data.school!.gradeBands).toBe('');
    expect((await audit(A, 'grades.bands.set')).length).toBe(1);
  });
});
