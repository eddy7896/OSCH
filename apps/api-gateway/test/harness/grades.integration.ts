// P3-5 against the REAL stack: terms, grade bands, exams, marks and report cards (E-EXAM-1), through the gateway.
import { type INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { agent } from '../support/serve.js';
import { bootRealApp } from './app.js';
import { requireEmulatorsOrSkip } from './emulators.js';
import { buildWorld, type Person, type World } from './fixtures.js';

const ready = requireEmulatorsOrSkip();
let app: INestApplication | undefined;
let w: World | undefined;
if (ready) {
  app = await bootRealApp([], {});
  w = await buildWorld();
}

describe.skipIf(!ready)('terms, grade bands, exams, marks and report cards against the real emulators (P3-5)', { timeout: 180_000 }, () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const teacher = () => w!.roles.A.TEACHER;
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, who: Person = acad(), school = A()) =>
    agent(app!)[method](`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const audit = async (action: string) => (await w!.db.listAuditLog({ schoolId: A().replaceAll('-', ''), limit: 500, offset: 0 })).data.auditLogs.filter((a) => a.action === action);
  const uniq = () => randomUUID().slice(0, 6);

  let cA = '', cB = '', math = '', sci = '', s1 = '', s2 = '', s3 = '', term = '';
  const makeClass = async (levelName: string) => {
    const level = ((await call('get', '/academics/levels').expect(200)).body.items as Array<{ id: string; name: string }>).find((l) => l.name === levelName);
    return (await call('post', '/academics/classes').send({ gradeLevelId: level!.id, section: `T${uniq()}`.slice(0, 6), capacity: 40 }).expect(201)).body as { id: string };
  };
  const makeStudent = async (classroomId: string, first: string) => (await call('post', '/students').send({ firstName: first, lastName: `K${uniq()}`, classroomId }).expect(201)).body as { id: string };
  const makeSubject = async () => (await call('post', '/academics/subjects').send({ name: `Sub ${uniq()}`, code: uniq().toUpperCase() }).expect(201)).body as { id: string };
  const makeExam = (b: object, who: Person = acad()) => call('post', '/grades/exams', who).send({ termId: term, classId: cA, subjectId: math, title: `Unit ${uniq()}`, examDate: '2090-05-05', maxMarks: '100', ...b });
  const enter = (examId: string, entries: object[], who: Person = teacher(), extra: object = {}) => call('put', `/grades/exams/${examId}/marks`, who).send({ entries, ...extra });

  beforeAll(async () => {
    const y = (await call('post', '/academics/years').send({ name: `GR-${uniq()}`, startDate: '2090-04-01', endDate: '2091-03-31' }).expect(201)).body;
    await call('post', `/academics/years/${y.id}/activate`).send({}).expect(200);
    cA = (await makeClass('1')).id; cB = (await makeClass('1')).id;
    [math, sci] = [(await makeSubject()).id, (await makeSubject()).id];
    [s1, s2] = [(await makeStudent(cA, 'Asha')).id, (await makeStudent(cA, 'Bilal')).id];
    s3 = (await makeStudent(cB, 'Dev')).id;
    const staff = ((await call('post', '/staff', hr()).send({ firstName: 'Tara', lastName: 'Teach' }).expect(201)).body as { id: string }).id;
    await call('put', `/staff/${staff}/account`, hr()).send({ userId: teacher().uid }).expect(200);
    await call('put', `/academics/classes/${cA}/teacher`).send({ staffId: staff }).expect(200);
    await call('post', `/academics/teachers/${staff}/subjects`).send({ subjectId: math }).expect(201);
    term = (await call('post', '/grades/terms').send({ name: 'Term 1' }).expect(201)).body.id;
  }, 120_000);

  it('terms: made in the active year, unique by name, renamed, listed, and deleted only while empty', async () => {
    const list = (await call('get', '/grades/terms').expect(200)).body.items as Array<{ id: string; name: string }>;
    expect(list.map((t) => t.name)).toEqual(['Term 1']);
    await call('post', '/grades/terms').send({ name: 'Term 1' }).expect(409);
    await call('post', '/grades/terms').send({ name: '' }).expect(400);
    await call('post', '/grades/terms').send({ name: 'x', year: 1 }).expect(400);
    const spare = (await call('post', '/grades/terms').send({ name: 'Spare' }).expect(201)).body;
    expect((await call('patch', `/grades/terms/${spare.id}`).send({ name: 'Term 2' }).expect(200)).body.name).toBe('Term 2');
    await call('patch', `/grades/terms/${spare.id}`).send({ name: 'Term 1' }).expect(409);
    await call('delete', `/grades/terms/${spare.id}`).expect(204);
    await call('delete', `/grades/terms/${spare.id}`).expect(404);
    await call('post', '/grades/terms', teacher()).send({ name: 'Nope' }).expect(403);
    expect((await call('get', '/grades/terms', teacher()).expect(200)).body.items).toHaveLength(1);
    expect((await audit('grades.term.create')).length).toBeGreaterThanOrEqual(2);
  });

  it('grade bands: none at first with a starting set offered; only a set from 0 to 100 with no gap or overlap is accepted', async () => {
    const first = (await call('get', '/grades/bands').expect(200)).body;
    expect(first.bands).toEqual([]);
    expect(first.template[0]).toEqual({ label: 'A1', minPercent: 90, maxPercent: 100 });
    const put = (bands: unknown) => call('put', '/grades/bands').send({ bands });
    const rule = async (bands: unknown) => (await put(bands).expect(400)).body.error.details;
    expect(await rule([{ label: 'A', minPercent: 0, maxPercent: 50 }, { label: 'B', minPercent: 50, maxPercent: 100 }])).toEqual([{ field: 'bands', rule: 'overlap' }]);
    expect(await rule([{ label: 'A', minPercent: 0, maxPercent: 40 }, { label: 'B', minPercent: 60, maxPercent: 100 }])).toEqual([{ field: 'bands', rule: 'gap' }]);
    expect(await rule([{ label: 'A', minPercent: 10, maxPercent: 100 }])).toEqual([{ field: 'bands', rule: 'startsAboveZero' }]);
    expect(await rule([{ label: 'A', minPercent: 0, maxPercent: 90 }])).toEqual([{ field: 'bands', rule: 'endsBelowHundred' }]);
    expect(await rule([{ label: 'A', minPercent: 0, maxPercent: 40 }, { label: 'a', minPercent: 41, maxPercent: 100 }])).toEqual([{ field: 'bands', rule: 'labelTaken' }]);
    expect(await rule([{ label: 'A', minPercent: 60, maxPercent: 50 }])).toEqual([{ field: 'bands', rule: 'badRange' }]);
    await put([{ label: 'A', minPercent: 0, maxPercent: 101 }]).expect(400);
    await put([{ label: 'A', minPercent: 0, maxPercent: 100, colour: 'red' }]).expect(400);
    await put('nope').expect(400);
    expect((await call('get', '/grades/bands').expect(200)).body.bands).toEqual([]); // nothing half-applied
    await put(first.template).expect(200);
    expect((await call('get', '/grades/bands').expect(200)).body.bands).toHaveLength(8);
    await call('put', '/grades/bands', teacher()).send({ bands: [] }).expect(403);
    expect((await audit('grades.bands.set')).length).toBe(1);
  });

  it('exams: set up by the Academic admin, a maximum with at most one decimal, unique per term, class and subject; teachers read their own classes', async () => {
    const e = (await makeExam({ title: 'Unit 1' }).expect(201)).body;
    expect(e).toMatchObject({ title: 'Unit 1', maxMarks: '100', maxTenths: 1000, term: { id: term }, class: { id: cA }, subject: { id: math } });
    await makeExam({ title: 'Unit 1' }).expect(409);
    for (const bad of [{ maxMarks: '0' }, { maxMarks: 'abc' }, { maxMarks: '100.55' }, { maxMarks: '-5' }, { examDate: '2090-02-30' }, { title: '' }, { termId: randomUUID() }, { classId: randomUUID() }, { subjectId: randomUUID() }, { extra: 1 }])
      await makeExam({ title: `Bad ${uniq()}`, ...bad }).expect(400);
    await makeExam({}, teacher()).expect(403);
    await makeExam({ classId: cB, subjectId: sci, title: 'Other class' }).expect(201);
    const all = (await call('get', '/grades/exams').expect(200)).body.items as Array<{ title: string }>;
    expect(all.length).toBeGreaterThanOrEqual(2);
    const mine = (await call('get', '/grades/exams', teacher()).expect(200)).body.items as Array<{ class: { id: string } }>;
    expect(mine.every((x) => x.class.id === cA)).toBe(true);
    expect((await call('get', `/grades/exams?classId=${cB}`).expect(200)).body.items).toHaveLength(1);
    expect((await call('patch', `/grades/exams/${e.id}`).send({ maxMarks: '50.5', title: 'Unit one' }).expect(200)).body).toMatchObject({ title: 'Unit one', maxMarks: '50.5' });
    await call('patch', `/grades/exams/${e.id}`).send({}).expect(400);
    await call('patch', `/grades/exams/${e.id}`, teacher()).send({ title: 'x' }).expect(403);
    await call('patch', `/grades/exams/${e.id}`).send({ maxMarks: '100' }).expect(200);
    expect((await audit('grades.exam.create')).length).toBeGreaterThanOrEqual(2);
    await call('delete', `/grades/terms/${term}`).expect(409); // the term has exams
  });

  it('E-EXAM-1: marks with one decimal, a mark above the maximum refused, absent counted as zero, percentage and grade by integer arithmetic', async () => {
    const e = (await makeExam({ title: 'Marks test', maxMarks: '50' }).expect(201)).body;
    const before = (await audit('grades.marks.save')).length;
    const sid = randomUUID();
    const saved = (await enter(e.id, [{ studentId: s1, marks: '44.9' }, { studentId: s2, absent: true }], teacher(), { submissionId: sid }).expect(200)).body;
    expect(saved.rows).toEqual([
      expect.objectContaining({ studentId: s1, marks: '44.9', marksTenths: 449, absent: false, percent: '89.8', grade: 'A2' }), // 89.8, not 90: never rounded up into A1
      expect.objectContaining({ studentId: s2, marks: '0', marksTenths: 0, absent: true, percent: '0.0', grade: 'E' }),
    ]);
    expect((await audit('grades.marks.save')).length).toBe(before + 1);
    await enter(e.id, [{ studentId: s1, marks: '44.9' }, { studentId: s2, absent: true }], teacher(), { submissionId: sid }).expect(200); // a replay
    expect((await audit('grades.marks.save')).length).toBe(before + 1);
    // refusals
    for (const [entry, rule] of [[{ studentId: s1, marks: '50.1' }, 'aboveMaximum'], [{ studentId: s3, marks: '10' }, 'studentNotInClass'], [{ studentId: s1, marks: '10', absent: true }, 'absentHasNoMarks']] as const) {
      const r = await enter(e.id, [entry]).expect(400);
      expect(r.body.error.details).toEqual([{ field: 'entries', rule }]);
    }
    for (const bad of [{ studentId: s1, marks: '4.55' }, { studentId: s1, marks: '-1' }, { studentId: s1, marks: 'ten' }, { studentId: s1, marks: 10 }, { studentId: 'nope', marks: '1' }]) await enter(e.id, [bad]).expect(400);
    expect((await enter(e.id, [{ studentId: s1, marks: '1' }, { studentId: s1, marks: '2' }]).expect(400)).body.error.details).toEqual([{ field: 'entries', rule: 'duplicateStudent' }]);
    expect((await call('get', `/grades/exams/${e.id}/marks`, teacher()).expect(200)).body.rows[0].marks).toBe('44.9'); // none of the refused ones changed anything
    // a change records the old and the new value; clearing removes the mark; unlisted students are untouched
    const edit = (await enter(e.id, [{ studentId: s1, marks: '45' }, { studentId: s2 }]).expect(200)).body;
    expect(edit.rows.find((r: { studentId: string }) => r.studentId === s1)).toMatchObject({ marks: '45', percent: '90.0', grade: 'A1' });
    expect(edit.rows.find((r: { studentId: string }) => r.studentId === s2)).toMatchObject({ marks: null, grade: null });
    const rows = (await audit('grades.marks.save')).filter((a) => (a.details as { examId?: string }).examId === e.id);
    expect(rows.some((a) => JSON.stringify(a.details).includes('"from":"44.9"') && JSON.stringify(a.details).includes('"to":"45"'))).toBe(true);
    // the maximum cannot drop below a mark that was given; an exam with marks cannot be deleted
    await call('patch', `/grades/exams/${e.id}`).send({ maxMarks: '40' }).expect(409);
    await call('delete', `/grades/exams/${e.id}`).expect(409);
    await enter(e.id, [{ studentId: s1 }]).expect(200);
    await call('delete', `/grades/exams/${e.id}`).expect(204);
  });

  it('a teacher enters marks only for a subject they teach, in a class of theirs; the Academic admin for any', async () => {
    const sciExam = (await makeExam({ title: 'Science', subjectId: sci }).expect(201)).body;
    const otherClass = (await makeExam({ title: 'Other', classId: cB, subjectId: math }).expect(201)).body;
    await enter(sciExam.id, [{ studentId: s1, marks: '5' }]).expect(404); // they do not teach science
    await call('get', `/grades/exams/${sciExam.id}/marks`, teacher()).expect(404);
    await enter(otherClass.id, [{ studentId: s3, marks: '5' }]).expect(404); // not their class
    await enter(sciExam.id, [{ studentId: s1, marks: '5' }], acad()).expect(200);
    await enter(otherClass.id, [{ studentId: s3, marks: '5' }], acad()).expect(200);
  });

  it('a report card adds up: each subject is the sum of its exams, the total the sum of the subjects; absent is zero; unmarked is pending', async () => {
    const t2 = (await call('post', '/grades/terms').send({ name: 'Term 2' }).expect(201)).body.id as string;
    const mk = async (b: object) => (await call('post', '/grades/exams').send({ termId: t2, classId: cA, subjectId: math, title: `E${uniq()}`, examDate: '2090-09-01', maxMarks: '50', ...b }).expect(201)).body.id as string;
    const [m1, m2, sc1, sc2] = [await mk({}), await mk({}), await mk({ subjectId: sci, maxMarks: '100' }), await mk({ subjectId: sci, maxMarks: '100' })];
    await enter(m1, [{ studentId: s1, marks: '45' }, { studentId: s2, marks: '20.5' }], acad()).expect(200);
    await enter(m2, [{ studentId: s1, absent: true }, { studentId: s2, marks: '25' }], acad()).expect(200);
    await enter(sc1, [{ studentId: s1, marks: '72.5' }, { studentId: s2, marks: '60' }], acad()).expect(200);
    void sc2; // left unmarked: pending
    const card = (await call('get', `/grades/report-cards/students/${s1}?termId=${t2}`).expect(200)).body;
    const m = card.subjects.find((s: { subject: { id: string } }) => s.subject.id === math);
    const sc = card.subjects.find((s: { subject: { id: string } }) => s.subject.id === sci);
    expect(m).toMatchObject({ marks: '45', maxMarks: '100', percent: '45.0', grade: 'C2', pending: 0 });
    expect(m.exams.map((e: { marks: string | null; absent: boolean }) => [e.marks, e.absent]).sort()).toEqual([['0', true], ['45', false]]);
    expect(sc).toMatchObject({ marks: '72.5', maxMarks: '100', percent: '72.5', grade: 'B1', pending: 1 });
    expect(card).toMatchObject({ totalMarks: '117.5', totalMaxMarks: '200', percent: '58.7', grade: 'C1', pending: 1, student: { id: s1 }, class: { id: cA }, term: { id: t2 } });
    const lines = card.subjects.flatMap((s: { exams: Array<{ marks: string | null }> }) => s.exams).reduce((n: number, e: { marks: string | null }) => n + (e.marks ? Math.round(Number(e.marks) * 10) : 0), 0);
    expect(lines).toBe(1175); // tenths: the card's total equals the sum of the marks printed on it
    await call('get', `/grades/report-cards/students/${s1}`).expect(400);
    await call('get', `/grades/report-cards/students/${s1}?termId=${randomUUID()}`).expect(404);
    await call('get', `/grades/report-cards/students/${randomUUID()}?termId=${t2}`).expect(404);
    // the PDF, in the school's language and in Hindi and Urdu
    for (const lang of [undefined, 'hi', 'ur']) {
      const pdf = await call('get', `/grades/report-cards/students/${s1}/pdf?termId=${t2}${lang ? `&lang=${lang}` : ''}`).buffer(true).parse((res, cb) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); }).expect(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
      expect(pdf.headers['content-disposition']).toContain('report-card-');
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
      expect((pdf.body as Buffer).length).toBeGreaterThan(2000);
    }
    await call('get', `/grades/report-cards/students/${s1}/pdf?termId=${t2}&lang=xx`).expect(400);
  });

  it('who sees a report card: the school, the class teacher of the class, and a parent only for a linked child', async () => {
    const parent = w!.roles.A.PARENT;
    const t = (await call('get', '/grades/terms').expect(200)).body.items[0].id as string;
    await call('get', `/grades/report-cards/students/${s1}?termId=${t}`, teacher()).expect(200);
    await call('get', `/grades/report-cards/students/${s3}?termId=${t}`, teacher()).expect(404); // another class
    await call('get', `/grades/report-cards/students/${s1}?termId=${t}`, parent).expect(404);
    await call('post', `/students/${s1}/parent-accounts`).send({ userId: parent.uid, relationship: 'MOTHER' }).expect(201);
    await call('get', `/grades/report-cards/students/${s1}?termId=${t}`, parent).expect(200);
    await call('get', `/grades/report-cards/students/${s2}?termId=${t}`, parent).expect(404);
    await call('get', `/grades/report-cards/students/${s1}/pdf?termId=${t}`, parent).expect(200);
    await call('get', `/grades/exams/${randomUUID()}/marks`, parent).expect(404);
    expect((await call('get', '/grades/exams', parent).expect(200)).body.items.every((x: { class: { id: string } }) => x.class.id === cA)).toBe(true);
  });

  it('who may do what, and another school sees none of it', async () => {
    const r = w!.roles.A;
    for (const who of [r.BURSAR, r.ACCOUNTANT, r.HR_MANAGER, r.MANAGEMENT]) await call('get', '/grades/exams', who).expect(403);
    for (const who of [r.PRINCIPAL, r.ACADEMIC_ADMIN]) await call('get', '/grades/exams', who).expect(200);
    await call('post', '/grades/terms', r.PRINCIPAL).send({ name: 'No' }).expect(403);
    const b = w!.roles.B.ACADEMIC_ADMIN;
    expect((await call('get', '/grades/terms', b, B()).expect(200)).body.items).toEqual([]);
    expect((await call('get', '/grades/bands', b, B()).expect(200)).body.bands).toEqual([]);
    expect((await call('get', '/grades/exams', b, B()).expect(200)).body.items).toEqual([]);
    const exam = (await call('get', '/grades/exams').expect(200)).body.items[0].id as string;
    await call('get', `/grades/exams/${exam}/marks`, b, B()).expect(404);
    await call('patch', `/grades/exams/${exam}`, b, B()).send({ title: 'hijack' }).expect(404);
    await call('post', '/grades/exams', b, B()).send({ termId: term, classId: cA, subjectId: math, title: 'x', examDate: '2090-01-01', maxMarks: '10' }).expect(400);
    await call('get', `/grades/report-cards/students/${s1}?termId=${term}`, b, B()).expect(404);
  });
});
