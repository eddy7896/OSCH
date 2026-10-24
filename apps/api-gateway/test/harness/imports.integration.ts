// P2-5 against the REAL stack: CSV dry run (never writes), the real import (audited, once per file), by row and column.
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

type Problem = { row: number; column?: string; rule: string; ref?: number };
describe.skipIf(!ready)('CSV import against the real emulators (P2-5)', () => {
  afterAll(async () => app?.close());
  const A = () => w!.schools.A;
  const B = () => w!.schools.B;
  const acad = () => w!.roles.A.ACADEMIC_ADMIN;
  const hr = () => w!.roles.A.HR_MANAGER;
  const post = (path: string, csv: string, who: Person = acad(), school = A()) => agent(app!).post(`/v1/imports/${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school).send({ csv });
  const get = (path: string, who: Person = acad(), school = A()) => agent(app!).get(`/v1${path}`).set('Authorization', `Bearer ${who.token}`).set('X-School-Id', school);
  const auditRows = async (school: string) => (await w!.db.listAuditLog({ schoolId: school.replaceAll('-', ''), limit: 1000, offset: 0 })).data.auditLogs;
  const uniq = () => randomUUID().slice(0, 8);
  const problemsOf = (body: { problems: Problem[] }) => body.problems.map((p) => `${p.row}|${p.column ?? ''}|${p.rule}`).sort();

  it('a dry run of a good file reports it importable and writes NOTHING (no student, no batch, no audit row)', async () => {
    const t = uniq();
    const before = { audit: (await auditRows(A())).length, students: (await get('/students?pageSize=1').expect(200)).body.total };
    const csv = `First Name,Last Name,DOB,Gender\nAnu${t},Rao,31/03/2015,F\nBilal${t},Khan,2014-07-02,male\n`;
    const res = (await post('students/dry-run', csv).expect(200)).body;
    expect(res).toMatchObject({ kind: 'students', totalRows: 2, validRows: 2, errorRows: 0, problems: [], canImport: true, alreadyImported: false });
    expect(res.columns).toEqual({ recognized: ['First Name', 'Last Name', 'DOB', 'Gender'], ignored: [], missingRequired: [] });
    await post('students/dry-run', csv).expect(200); // as often as you like
    expect({ audit: (await auditRows(A())).length, students: (await get('/students?pageSize=1').expect(200)).body.total }).toEqual(before);
  });

  it('reports every problem by row and column, spreadsheet-style (header is row 1), and understands the file', async () => {
    const csv = [
      'first name,Last Name,dob,Gender,phone?,Class,Guardian name,Guardian phone,Favourite colour',
      'Ok,Row,01/01/2015,F,,,,,blue', // 2: fine (unknown column ignored)
      ',NoFirst,01/01/2015,F,,,,,', // 3: first name missing
      'Fut,Ure,01/01/2999,F,,,,,', // 4: birth date in the future
      'Bad,Date,31/02/2015,F,,,,,', // 5: impossible date
      'Bad,Gender,01/01/2015,robot,,,,,', // 6: gender
      'Bad,Class,01/01/2015,F,,Class 99,,,', // 7: unknown class (no active year either)
      'Bad,Guardian,01/01/2015,F,,,Meera,,', // 8: guardian without phone or email
      'Bad,Phone,01/01/2015,F,,,Meera,12345,', // 9: guardian phone not a phone
      'Ok,Row,01/01/2015,F,,,,,', // 10: repeats row 2
    ].join('\n');
    const res = (await post('students/dry-run', csv).expect(200)).body;
    expect(res.columns.ignored).toEqual(['phone?', 'Favourite colour']);
    expect(res).toMatchObject({ totalRows: 9, validRows: 1, errorRows: 8, canImport: false });
    expect(problemsOf(res)).toEqual(
      [
        '3|first name|required',
        '4|dob|notInTheFuture',
        '5|dob|realDate',
        '6|Gender|isIn',
        '7|Class|unknownClass',
        '8|Guardian phone|phoneOrEmail',
        '9|Guardian phone|matches',
        '10||duplicateInFile',
      ].concat(res.problems.some((p: Problem) => p.rule === 'noActiveAcademicYear') ? ['1|Class|noActiveAcademicYear'] : []).sort(),
    );
    expect(res.problems.find((p: Problem) => p.rule === 'duplicateInFile')).toMatchObject({ row: 10, ref: 2 });
    // and the real import refuses it outright
    const before = (await get('/students?pageSize=1').expect(200)).body.total;
    const refused = await post('students', csv).expect(400);
    expect(refused.body.error.code).toBe('INVALID_REQUEST');
    expect((await get('/students?pageSize=1').expect(200)).body.total).toBe(before);
  });

  it('refuses a file with no recognisable required column, an empty file, an unterminated quote and too many rows', async () => {
    expect(problemsOf((await post('students/dry-run', 'foo,bar\n1,2\n').expect(200)).body)).toEqual(['1|firstName|missingColumn', '1|lastName|missingColumn']);
    expect(problemsOf((await post('students/dry-run', 'first,last\n').expect(200)).body)).toEqual(['1||noRows']);
    expect((await post('students/dry-run', 'first,last\n"oops,Rao\n').expect(200)).body.problems).toContainEqual(expect.objectContaining({ row: 2, rule: 'unterminatedQuote' }));
    const many = `first,last\n${Array.from({ length: 501 }, (_, i) => `A${i},B${i}`).join('\n')}`;
    expect((await post('students/dry-run', many).expect(200)).body.problems.some((p: Problem) => p.rule === 'tooManyRows')).toBe(true);
    await agent(app!).post('/v1/imports/students/dry-run').set('Authorization', `Bearer ${acad().token}`).set('X-School-Id', A()).send({ csv: '', extra: 1 }).expect(400);
  });

  it('a 400 KB file is accepted on the import routes, while the normal 100 KB body limit stays elsewhere', async () => {
    const big = `first,last\n${Array.from({ length: 400 }, (_, i) => `Name${i}${'x'.repeat(800)}`.slice(0, 900) + ',Z').join('\n')}`;
    expect(big.length).toBeGreaterThan(300_000);
    const res = await post('students/dry-run', big);
    expect(res.status).toBe(200); // cells over 1000 characters would be flagged, these are not
    await agent(app!).patch('/v1/school/profile').set('Authorization', `Bearer ${w!.roles.A.SYSTEM_ADMIN.token}`).set('X-School-Id', A()).send({ address: 'a'.repeat(200_000) }).expect(413);
  });

  it('students: the real import creates them with numbers, class and guardian, audited with the batch id; the same file cannot be imported twice', async () => {
    const t = uniq();
    const year = (await agent(app!).post('/v1/academics/years').set('Authorization', `Bearer ${acad().token}`).set('X-School-Id', A()).send({ name: `IY-${t}`, startDate: '2080-04-01', endDate: '2081-03-31' }).expect(201)).body;
    await agent(app!).post(`/v1/academics/years/${year.id}/activate`).set('Authorization', `Bearer ${acad().token}`).set('X-School-Id', A()).expect(200);
    const level = (await get('/academics/levels').expect(200)).body.items.find((l: { name: string }) => l.name === '6');
    const room = (await agent(app!).post('/v1/academics/classes').set('Authorization', `Bearer ${acad().token}`).set('X-School-Id', A()).send({ gradeLevelId: level.id, section: `I${t}`.slice(0, 6), capacity: 40 }).expect(201)).body;
    const csv = `first name,last name,dob,class,guardian name,guardian relationship,guardian mobile\n` +
      `Ravi${t},Imp,2012-01-05,${room.name.toLowerCase()},Sita Imp,mother,98765 43210\n` +
      `Sara${t},Imp,2012-02-06,${room.name},Omar Imp,father,+971501234567\n` +
      `Tara${t},Imp,,,,,\n`;
    const dry = (await post('students/dry-run', csv).expect(200)).body;
    expect(dry).toMatchObject({ validRows: 3, canImport: true });
    const res = (await post('students', csv).expect(201)).body;
    expect(res).toMatchObject({ status: 'COMPLETED', createdCount: 3, failedCount: 0 });
    expect(res.created.map((c: { row: number }) => c.row)).toEqual([2, 3, 4]);
    expect(res.created.every((c: { number: string }) => /^S\d{4}$/.test(c.number))).toBe(true);
    const ravi = (await get(`/students/${res.created[0].id}`).expect(200)).body;
    expect(ravi).toMatchObject({ firstName: `Ravi${t}`, dateOfBirth: '2012-01-05' });
    expect(ravi.placement).toMatchObject({ classroom: { id: room.id }, academicYear: { id: year.id } });
    expect(ravi.guardians).toEqual([expect.objectContaining({ name: 'Sita Imp', relationship: 'MOTHER', phone: '+919876543210', isPrimary: true })]);
    expect((await get(`/students/${res.created[2].id}`).expect(200)).body).toMatchObject({ placement: null, guardians: [] });
    // every row audited with the batch id, plus a start and a finish
    const rows = await auditRows(A());
    const batch = dry.fileHash;
    const batchOf = (r: { details?: unknown }) => String((r.details as { importBatchId?: string } | null)?.importBatchId ?? '').replaceAll('-', '');
    expect(rows.filter((r) => r.action === 'student.create' && batchOf(r) === res.batchId.replaceAll('-', ''))).toHaveLength(3);
    expect(rows.filter((r) => r.action === 'import.start' && JSON.stringify(r.details).includes(batch))).toHaveLength(1);
    expect(rows.filter((r) => r.action === 'import.finish' && JSON.stringify(r.details).includes('"createdCount":3'))).toHaveLength(1);
    // the same file again
    await post('students', csv).expect(409);
    expect((await post('students/dry-run', csv).expect(200)).body).toMatchObject({ alreadyImported: true, canImport: false });
    // a second file with the same people is allowed but warned about
    const again = `first name,last name,dob\nRavi${t},Imp,2012-01-05\n`;
    const warn = (await post('students/dry-run', again).expect(200)).body;
    expect(warn.canImport).toBe(true);
    expect(warn.warnings).toEqual([expect.objectContaining({ row: 2, rule: 'mayAlreadyExist' })]);
  });

  it('concurrent admissions during an import do not break numbering', async () => {
    const t = uniq();
    const csv = `first,last\n${Array.from({ length: 12 }, (_, i) => `C${i}${t},Race`).join('\n')}\n`;
    const [res] = await Promise.all([
      post('students', csv).expect(201),
      ...Array.from({ length: 3 }, () => agent(app!).post('/v1/students').set('Authorization', `Bearer ${acad().token}`).set('X-School-Id', A()).send({ firstName: `Live${t}`, lastName: 'Race' }).expect(201)),
    ]);
    const all = (await get(`/students?search=${t}&pageSize=100`).expect(200)).body;
    expect(all.total).toBe(15);
    expect(res.body.createdCount).toBe(12);
    const numbers = (await Promise.all(all.items.map((i: { id: string }) => get(`/students/${i.id}`).expect(200)))).map((r) => r.body.enrollmentId);
    expect(new Set(numbers).size).toBe(15);
  }, 120_000);

  it('staff: dry run and import with generated employee numbers and phone clean-up', async () => {
    const t = uniq();
    const csv = `First Name,Surname,Dept,Title,Mobile,Email,Joined\nAsha${t},Nair,Science,Teacher,9812345678,asha${t}@example.com,01/06/2020\nBen${t},Joseph,Admin,Clerk,,,\n`;
    const dry = (await post('staff/dry-run', csv, hr()).expect(200)).body;
    expect(dry).toMatchObject({ validRows: 2, canImport: true });
    const res = (await post('staff', csv, hr()).expect(201)).body;
    expect(res).toMatchObject({ status: 'COMPLETED', createdCount: 2 });
    expect(res.created.every((c: { number: string }) => /^E\d{4}$/.test(c.number))).toBe(true);
    const asha = (await get(`/staff/${res.created[0].id}`, hr()).expect(200)).body;
    expect(asha).toMatchObject({ department: 'Science', designation: 'Teacher', phone: '+919812345678', email: `asha${t}@example.com`, dateOfJoining: '2020-06-01' });
    const bad = (await post('staff/dry-run', 'first,last,email,phone\nX,Y,not-an-email,1234\n', hr()).expect(200)).body;
    expect(problemsOf(bad)).toEqual(['2|email|matches', '2|phone|matches']);
  });

  it('guardians: attach to existing students by enrolment id; an unknown id is a problem; another school cannot reach A\'s students', async () => {
    const t = uniq();
    const made = await post('students', `first,last\nG${t},Kid\n`).expect(201);
    const number = made.body.created[0].number as string;
    const csv = `student id,name,relationship,phone,email,primary\n${number},Parent One,MOTHER,9876500001,,yes\n${number},Parent Two,father,,two${t}@example.com,no\nS9999,Nobody,MOTHER,9876500002,,\n`;
    const dry = (await post('guardians/dry-run', csv).expect(200)).body;
    expect(problemsOf(dry)).toEqual(['4|student id|unknownStudent']);
    const fixed = csv.split('\n').slice(0, 3).join('\n') + '\n';
    const res = (await post('guardians', fixed).expect(201)).body;
    expect(res).toMatchObject({ status: 'COMPLETED', createdCount: 2 });
    const kid = (await get(`/students/${made.body.created[0].id}`).expect(200)).body;
    expect(kid.guardians.map((g: { name: string }) => g.name)).toEqual(['Parent One', 'Parent Two']);
    expect(kid.guardians[0]).toMatchObject({ isPrimary: true, phone: '+919876500001' });
    // school B has no students: A's number does not resolve there
    const bAdmin = w!.roles.B.ACADEMIC_ADMIN;
    expect(problemsOf((await post('guardians/dry-run', `student id,name,relationship,phone\n${number},Spy,MOTHER,9876500003\n`, bAdmin, B()).expect(200)).body)).toEqual(['2|student id|unknownStudent']);
    await post('guardians', `student id,name,relationship,phone\n${number},Spy,MOTHER,9876500003\n`, bAdmin, B()).expect(400);
    expect((await get(`/students/${made.body.created[0].id}`).expect(200)).body.guardians).toHaveLength(2);
  });

  it('roles: Academic Admin and Admissions Officer import students, HR and System Admin import staff; Principal, Teacher, Driver are refused', async () => {
    const csv = (n: string) => `first,last\n${n}${uniq()},Role\n`;
    await post('students/dry-run', csv('R'), w!.roles.A.ADMISSIONS_OFFICER).expect(200);
    await post('staff/dry-run', csv('R'), w!.roles.A.SYSTEM_ADMIN).expect(200);
    await post('staff/dry-run', csv('R'), acad()).expect(403); // Academic Admin only reads staff
    await post('students/dry-run', csv('R'), hr()).expect(403); // HR has no student access
    await post('students/dry-run', csv('R'), w!.roles.A.PRINCIPAL).expect(403);
    await post('students', csv('R'), w!.roles.A.PRINCIPAL).expect(403);
    await post('students/dry-run', csv('R'), w!.roles.A.TEACHER).expect(403);
    await post('guardians/dry-run', csv('R'), w!.roles.A.DRIVER).expect(403);
  });
});
