// E-EXAM-1 / E-ATT-1 / E-ACAD-1, the structural half: what the build can prove without a database. The runtime halves are the gateway and database integration tests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(p, "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("E-EXAM-1 marks, percentages and grades use no floating point", () => {
  const src = strip(read("apps/api-gateway/src/grades/grade-rules.ts")).replace(/'[^'\n]*'|`[^`\n]*`|\/[^/\n]+\/[a-z]*(?=[.,;)])/g, "''"); // text and patterns are not arithmetic
  for (const banned of [/parseFloat/, /toFixed/, /Math\.round/, /Math\.fround/, /Number\([^)]*\.\d/, /\b\d+\.\d+\b/]) assert.doesNotMatch(src, banned, `grade-rules.ts must not contain ${banned}`);
  assert.match(src, /BigInt/, "the percentage is a BigInt product divided by the maximum");
  const svc = strip(read("apps/api-gateway/src/grades/grades.service.ts"));
  for (const banned of [/parseFloat/, /toFixed/, /Math\.round/]) assert.doesNotMatch(svc, banned);
});

test("E-EXAM-1 the vectors for marks, percentages, bands and the report card exist and cover the awkward cases", () => {
  const spec = read("apps/api-gateway/src/grades/grade-rules.spec.ts");
  for (const needle of ["[999, 1000, 99, '99.9']", "[1, 3, 33, '33.3']", "overlap", "gap", "startsAboveZero", "endsBelowHundred", "never rounds a student up", "adds up"]) assert.ok(spec.includes(needle), `missing vector or case: ${needle}`);
});

test("E-EXAM-1 the database holds marks as whole tenths (Int), never a float or a decimal", () => {
  const schema = read("dataconnect/schema/schema.gql");
  const mark = schema.match(/type Mark @table[\s\S]*?\n}/)[0];
  assert.match(mark, /tenths: Int!/);
  assert.doesNotMatch(mark, /Float|Decimal/);
  assert.match(schema.match(/type Exam @table[\s\S]*?\n}/)[0], /maxTenths: Int!/);
});

test("E-ATT-1 the seven statuses are a database enum and the label table can hold nothing else", () => {
  const schema = read("dataconnect/schema/schema.gql");
  assert.match(schema, /enum AttendanceStatus \{ PRESENT ABSENT LATE LEAVE MEDICAL HALF_DAY EXCUSED \}/);
  const label = schema.match(/type AttendanceStatusLabel @table[\s\S]*?\n}/)[0];
  assert.match(label, /status: AttendanceStatus!/);
  assert.doesNotMatch(label, /colou?r/i, "only the label is editable");
  const rules = read("apps/api-gateway/src/attendance/attendance-rules.ts");
  assert.match(rules, /STATUSES = \['PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'MEDICAL', 'HALF_DAY', 'EXCUSED'\]/);
});

test("E-ACAD-1 the timetable's clash rules are unique keys in the database, not only checks in code", () => {
  const entry = read("dataconnect/schema/schema.gql").match(/type TimetableEntry @table[^\n]*/)[0];
  assert.match(entry, /@unique\(fields: \["academicYear", "classroom", "day", "period"\]\)/);
  assert.match(entry, /@unique\(fields: \["academicYear", "staff", "day", "period"\]\)/);
});

test("E-ACAD-4 every operation that can set a leave request to APPROVED or REJECTED checks for an active Principal, and the route needs the approve grant", () => {
  const ops = read("dataconnect/erp-connector/mutations.gql").split(/\n(?=mutation )/).filter((m) => /leaveRequest_update/.test(m) && /status: (APPROVED|REJECTED)/.test(m));
  assert.ok(ops.length >= 3, "approve (paid), approve (unpaid) and reject");
  for (const op of ops) assert.match(op, /schoolRole: \{eq: PRINCIPAL\}, status: \{eq: ACTIVE\}/, `${op.slice(0, 60)} must check for an active Principal`);
  const controller = strip(read("apps/api-gateway/src/leave/leave.controller.ts"));
  for (const route of ["requests/:id/approve", "requests/:id/reject"]) assert.match(controller, new RegExp(`@Permission\\('leave', 'approve'\\)[\\s\\S]{0,260}'${route}'`), `${route} needs the approve grant`);
});

test("E-ACAD-2 a substitution is unique per lesson and date and per substitute, date and period; the write operation re-checks every rule", () => {
  const schema = read("dataconnect/schema/schema.gql");
  const row = schema.match(/type Substitution @table[^\n]*/)[0];
  assert.match(row, /@unique\(fields: \["timetableEntry", "date"\]\)/);
  assert.match(row, /@unique\(fields: \["substitute", "date", "period"\]\)/);
  const op = read("dataconnect/erp-connector/mutations.gql").split(/\n(?=mutation )/).find((m) => m.startsWith("mutation SetSubstitute"));
  for (const rule of ["status: {eq: APPROVED}", "teacherSubjects(", "this.size() == 0\", message: \"the substitute has a lesson of their own", "the substitute is on approved leave", "id: {ne: $absentStaffId}"]) assert.ok(op.includes(rule), `SetSubstitute must check: ${rule}`);
});
