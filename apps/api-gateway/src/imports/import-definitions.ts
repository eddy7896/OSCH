import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateGuardianDto, CreateStudentDto } from '../students/dto/students.dto.js';
import { CreateStaffDto } from '../staff/dto/staff.dto.js';
import { normalizeHeader } from './csv.js';

export type ImportKind = 'students' | 'staff' | 'guardians';

export interface ColumnSpec {
  /** The property on the row object. */
  key: string;
  /** Header spellings accepted (normalised: case, spaces and punctuation ignored). The key itself always counts. */
  aliases: string[];
  required?: boolean;
}

const c = (key: string, aliases: string[] = [], required = false): ColumnSpec => ({ key, aliases, required });

const PERSON = [c('dateOfBirth', ['dob', 'birthdate', 'dateofbirth', 'born']), c('gender', ['sex']), c('address')];
export const COLUMNS: Record<ImportKind, ColumnSpec[]> = {
  students: [
    c('firstName', ['first', 'givenname', 'name'], true), c('lastName', ['last', 'surname', 'familyname'], true), ...PERSON,
    c('admissionDate', ['dateofadmission', 'admitted']), c('class', ['classname', 'section', 'classsection']),
    c('guardianName', ['parentname', 'parent', 'guardian']), c('guardianRelationship', ['parentrelationship', 'relationship', 'relation']),
    c('guardianPhone', ['parentphone', 'parentmobile', 'guardianmobile', 'guardiancontact']), c('guardianEmail', ['parentemail']),
  ],
  staff: [
    c('firstName', ['first', 'givenname'], true), c('lastName', ['last', 'surname', 'familyname'], true), c('department', ['dept']), c('designation', ['title', 'jobtitle', 'position']),
    c('phone', ['mobile', 'contact', 'phonenumber']), c('email', ['emailaddress']), ...PERSON.slice(0, 2), c('dateOfJoining', ['joiningdate', 'joined', 'dateofjoining', 'doj']), c('address'),
    c('emergencyContactName', ['emergencyname', 'emergencycontact']), c('emergencyContactPhone', ['emergencyphone', 'emergencymobile']),
  ],
  guardians: [
    c('enrollmentId', ['studentid', 'enrolmentid', 'enrollmentno', 'enrolmentno', 'admissionno', 'studentnumber'], true), c('name', ['guardianname', 'parentname'], true),
    c('relationship', ['relation', 'guardianrelationship'], true), c('phone', ['mobile', 'contact', 'phonenumber']), c('email', ['emailaddress']), c('isPrimary', ['primary']),
  ],
};

/** Header text -> column key, plus what was not understood. Two headers that mean the same column: the first wins, the second is ignored. */
export function mapHeader(kind: ImportKind, header: string[]) {
  const lookup = new Map<string, ColumnSpec>();
  for (const spec of COLUMNS[kind]) for (const name of [spec.key, ...spec.aliases]) lookup.set(normalizeHeader(name), spec);
  const byIndex: Array<ColumnSpec | undefined> = [];
  const taken = new Set<string>();
  const ignored: string[] = [];
  header.forEach((h, i) => {
    const spec = lookup.get(normalizeHeader(h));
    if (spec && !taken.has(spec.key)) {
      taken.add(spec.key);
      byIndex[i] = spec;
    } else {
      byIndex[i] = undefined;
      if (h.trim() !== '') ignored.push(h);
    }
  });
  const missingRequired = COLUMNS[kind].filter((s) => s.required && !taken.has(s.key)).map((s) => s.key);
  return { byIndex, ignored, missingRequired };
}

// ---- cell clean-up: what people type in a spreadsheet becomes what the API takes ----
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
/** `31/03/2015` and `31-3-2015` (day first, as written in India) become `2015-03-31`; anything else is left for the validator. */
export function cleanDate(v: string): string {
  const m = DMY.exec(v);
  return m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : v;
}
/** `98765 43210` and `098765-43210` and `9876543210` become `+919876543210` (the schools are in India); `+` numbers keep their country. */
export function cleanPhone(v: string): string {
  const compact = v.replace(/[\s\-().]/g, '');
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  if (/^0\d{10}$/.test(compact)) return `+91${compact.slice(1)}`;
  if (/^91\d{10}$/.test(compact)) return `+${compact}`;
  return compact;
}
export function cleanGender(v: string): string {
  const u = v.trim().toUpperCase();
  return u === 'M' ? 'MALE' : u === 'F' ? 'FEMALE' : u === 'O' ? 'OTHER' : u;
}
const DATE_KEYS = new Set(['dateOfBirth', 'admissionDate', 'dateOfJoining']);
const PHONE_KEYS = new Set(['phone', 'guardianPhone', 'emergencyContactPhone']);
const UPPER_KEYS = new Set(['guardianRelationship', 'relationship']);

export function cleanCell(key: string, v: string): unknown {
  if (v === '') return undefined; // an empty cell means "not given"
  if (DATE_KEYS.has(key)) return cleanDate(v);
  if (PHONE_KEYS.has(key)) return cleanPhone(v);
  if (key === 'gender') return cleanGender(v);
  if (UPPER_KEYS.has(key)) return v.toUpperCase();
  if (key === 'isPrimary') return /^(true|yes|y|1)$/i.test(v) ? true : /^(false|no|n|0)$/i.test(v) ? false : v;
  return v;
}

export interface FieldProblem {
  column: string;
  rule: string;
}

/** Runs the API's own validation rules (the same DTO classes) over the cleaned cells of one row. */
export function validateRow(kind: ImportKind, values: Record<string, unknown>, header: (key: string) => string): FieldProblem[] {
  const problems: FieldProblem[] = [];
  const push = (cls: new () => object, obj: Record<string, unknown>, rename: (p: string) => string = (p) => p) => {
    const instance = plainToInstance(cls, obj);
    for (const e of validateSync(instance, { whitelist: false })) {
      for (const rule of Object.keys(e.constraints ?? {})) problems.push({ column: header(rename(e.property)), rule });
    }
    return instance;
  };
  const required = COLUMNS[kind].filter((s) => s.required);
  for (const s of required) if (values[s.key] === undefined) problems.push({ column: header(s.key), rule: 'required' });
  if (problems.length > 0) return problems; // a missing required cell: say that, not the follow-on rules
  const { class: _class, guardianName, guardianRelationship, guardianPhone, guardianEmail, enrollmentId: _id, name, ...rest } = values as Record<string, unknown>;
  if (kind === 'students') {
    push(CreateStudentDto as never, rest);
    if (guardianName !== undefined || guardianPhone !== undefined || guardianEmail !== undefined || guardianRelationship !== undefined) {
      if (guardianName === undefined) problems.push({ column: header('guardianName'), rule: 'required' });
      else {
        push(CreateGuardianDto as never, { name: guardianName, relationship: guardianRelationship ?? 'GUARDIAN', phone: guardianPhone, email: guardianEmail }, (p) => ({ name: 'guardianName', relationship: 'guardianRelationship', phone: 'guardianPhone', email: 'guardianEmail' } as Record<string, string>)[p] ?? p);
        if (guardianPhone === undefined && guardianEmail === undefined) problems.push({ column: header('guardianPhone'), rule: 'phoneOrEmail' });
      }
    }
  } else if (kind === 'staff') push(CreateStaffDto as never, rest);
  else {
    push(CreateGuardianDto as never, { name, relationship: values['relationship'], phone: values['phone'], email: values['email'], isPrimary: values['isPrimary'] });
    if (values['phone'] === undefined && values['email'] === undefined) problems.push({ column: header('phone'), rule: 'phoneOrEmail' });
  }
  return problems;
}
