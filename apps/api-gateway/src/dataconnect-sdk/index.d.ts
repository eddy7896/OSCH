import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum AcademicYearStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
};

export enum GlobalRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  USER = "USER",
};

export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
};

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
};

export enum PayrollStatus {
  PENDING = "PENDING",
  PAID = "PAID",
};

export enum SchoolRole {
  PRINCIPAL = "PRINCIPAL",
  BURSAR = "BURSAR",
  ACADEMIC_ADMIN = "ACADEMIC_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  TEACHER = "TEACHER",
  STAFF = "STAFF",
  DRIVER = "DRIVER",
  PARENT = "PARENT",
};



export interface AcademicYear_Key {
  id: UUIDString;
  __typename?: 'AcademicYear_Key';
}

export interface AuditLog_Key {
  id: UUIDString;
  __typename?: 'AuditLog_Key';
}

export interface ClassSchedule_Key {
  id: UUIDString;
  __typename?: 'ClassSchedule_Key';
}

export interface Classroom_Key {
  id: UUIDString;
  __typename?: 'Classroom_Key';
}

export interface CreateAcademicYearData {
  academicYear_insert: AcademicYear_Key;
}

export interface CreateAcademicYearVariables {
  schoolId: UUIDString;
  name: string;
  startDate: DateString;
  endDate: DateString;
}

export interface CreateAuditLogData {
  auditLog_insert: AuditLog_Key;
}

export interface CreateAuditLogVariables {
  schoolId?: UUIDString | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown | null;
}

export interface CreateClassroomData {
  classroom_insert: Classroom_Key;
}

export interface CreateClassroomVariables {
  schoolId: UUIDString;
  name: string;
  gradeLevel: string;
  capacity: number;
}

export interface CreateExamData {
  exam_insert: Exam_Key;
}

export interface CreateExamVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  title: string;
  examDate: DateString;
  maxScore: number;
}

export interface CreateInvoiceData {
  query?: {
    students: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  invoice_insert: Invoice_Key;
}

export interface CreateInvoiceVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  amountMinor: Int64String;
  dueDate: DateString;
}

export interface CreateLeaveRequestData {
  leaveRequest_insert: LeaveRequest_Key;
}

export interface CreateLeaveRequestVariables {
  schoolId: UUIDString;
  userId: string;
  startDate: DateString;
  endDate: DateString;
  reason?: string | null;
}

export interface CreatePayrollData {
  payroll_insert: Payroll_Key;
}

export interface CreatePayrollVariables {
  schoolId: UUIDString;
  userId: string;
  amountMinor: Int64String;
  payDate: DateString;
}

export interface CreateScheduleData {
  classSchedule_insert: ClassSchedule_Key;
}

export interface CreateScheduleVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface CreateSchoolData {
  school_insert: School_Key;
}

export interface CreateSchoolMemberData {
  schoolMember_insert: SchoolMember_Key;
}

export interface CreateSchoolMemberVariables {
  schoolId: UUIDString;
  userId: string;
  schoolRole: SchoolRole;
}

export interface CreateSchoolVariables {
  id: UUIDString;
  name: string;
  subDomain: string;
}

export interface CreateStudentData {
  student_insert: Student_Key;
}

export interface CreateStudentVariables {
  schoolId: UUIDString;
  firstName: string;
  lastName: string;
  enrollmentId: string;
  gradeLevel: string;
}

export interface CreateSubjectData {
  subject_insert: Subject_Key;
}

export interface CreateSubjectVariables {
  schoolId: UUIDString;
  name: string;
  code: string;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  id: string;
  email: string;
  globalRole: GlobalRole;
}

export interface Exam_Key {
  id: UUIDString;
  __typename?: 'Exam_Key';
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface LeaveRequest_Key {
  id: UUIDString;
  __typename?: 'LeaveRequest_Key';
}

export interface ListAcademicYearsData {
  academicYears: ({
    id: UUIDString;
    name: string;
    startDate: DateString;
    endDate: DateString;
    status: AcademicYearStatus;
  } & AcademicYear_Key)[];
}

export interface ListAcademicYearsVariables {
  schoolId: UUIDString;
}

export interface ListClassroomsData {
  classrooms: ({
    id: UUIDString;
    name: string;
    gradeLevel: string;
    capacity: number;
  } & Classroom_Key)[];
}

export interface ListClassroomsVariables {
  schoolId: UUIDString;
}

export interface ListExamsData {
  exams: ({
    id: UUIDString;
    title: string;
    examDate: DateString;
    maxScore: number;
    classroom: {
      name: string;
    };
    subject: {
      name: string;
    };
  } & Exam_Key)[];
}

export interface ListExamsVariables {
  schoolId: UUIDString;
}

export interface ListInvoicesData {
  invoices: ({
    id: UUIDString;
    amountMinor: Int64String;
    dueDate: DateString;
    status: InvoiceStatus;
    student: {
      firstName: string;
      lastName: string;
      enrollmentId: string;
    };
  } & Invoice_Key)[];
}

export interface ListInvoicesVariables {
  schoolId: UUIDString;
}

export interface ListLeaveRequestsData {
  leaveRequests: ({
    id: UUIDString;
    startDate: DateString;
    endDate: DateString;
    reason?: string | null;
    status: LeaveStatus;
    user: {
      email: string;
    };
    substitute?: {
      email: string;
    };
  } & LeaveRequest_Key)[];
}

export interface ListLeaveRequestsVariables {
  schoolId: UUIDString;
}

export interface ListPayrollData {
  payrolls: ({
    id: UUIDString;
    amountMinor: Int64String;
    payDate: DateString;
    status: PayrollStatus;
    user: {
      id: string;
      email: string;
    } & User_Key;
  } & Payroll_Key)[];
}

export interface ListPayrollVariables {
  schoolId: UUIDString;
}

export interface ListSchedulesData {
  classSchedules: ({
    id: UUIDString;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    classroom: {
      name: string;
    };
    subject: {
      name: string;
    };
    teacher: {
      email: string;
    };
  } & ClassSchedule_Key)[];
}

export interface ListSchedulesVariables {
  schoolId: UUIDString;
}

export interface ListStaffData {
  schoolMembers: ({
    schoolRole: SchoolRole;
    user: {
      id: string;
      email: string;
      phoneNumber?: string | null;
      globalRole: GlobalRole;
    } & User_Key;
  })[];
}

export interface ListStaffVariables {
  schoolId: UUIDString;
}

export interface ListStudentsData {
  students: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    enrollmentId: string;
    gradeLevel: string;
  } & Student_Key)[];
}

export interface ListStudentsVariables {
  schoolId: UUIDString;
}

export interface ListSubjectsData {
  subjects: ({
    id: UUIDString;
    name: string;
    code: string;
  } & Subject_Key)[];
}

export interface ListSubjectsVariables {
  schoolId: UUIDString;
}

export interface ParentGuardian_Key {
  studentId: UUIDString;
  userId: string;
  __typename?: 'ParentGuardian_Key';
}

export interface Payroll_Key {
  id: UUIDString;
  __typename?: 'Payroll_Key';
}

export interface SchoolMember_Key {
  schoolId: UUIDString;
  userId: string;
  __typename?: 'SchoolMember_Key';
}

export interface School_Key {
  id: UUIDString;
  __typename?: 'School_Key';
}

export interface Student_Key {
  id: UUIDString;
  __typename?: 'Student_Key';
}

export interface Subject_Key {
  id: UUIDString;
  __typename?: 'Subject_Key';
}

export interface UpdateLeaveRequestData {
  leaveRequest_updateMany: number;
}

export interface UpdateLeaveRequestVariables {
  schoolId: UUIDString;
  id: UUIDString;
  status: LeaveStatus;
  substituteId?: string | null;
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

interface CreateAcademicYearRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAcademicYearVariables): MutationRef<CreateAcademicYearData, CreateAcademicYearVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAcademicYearVariables): MutationRef<CreateAcademicYearData, CreateAcademicYearVariables>;
  operationName: string;
}
export const createAcademicYearRef: CreateAcademicYearRef;

export function createAcademicYear(vars: CreateAcademicYearVariables): MutationPromise<CreateAcademicYearData, CreateAcademicYearVariables>;
export function createAcademicYear(dc: DataConnect, vars: CreateAcademicYearVariables): MutationPromise<CreateAcademicYearData, CreateAcademicYearVariables>;

interface CreateSchoolRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSchoolVariables): MutationRef<CreateSchoolData, CreateSchoolVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateSchoolVariables): MutationRef<CreateSchoolData, CreateSchoolVariables>;
  operationName: string;
}
export const createSchoolRef: CreateSchoolRef;

export function createSchool(vars: CreateSchoolVariables): MutationPromise<CreateSchoolData, CreateSchoolVariables>;
export function createSchool(dc: DataConnect, vars: CreateSchoolVariables): MutationPromise<CreateSchoolData, CreateSchoolVariables>;

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateClassroomRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateClassroomVariables): MutationRef<CreateClassroomData, CreateClassroomVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateClassroomVariables): MutationRef<CreateClassroomData, CreateClassroomVariables>;
  operationName: string;
}
export const createClassroomRef: CreateClassroomRef;

export function createClassroom(vars: CreateClassroomVariables): MutationPromise<CreateClassroomData, CreateClassroomVariables>;
export function createClassroom(dc: DataConnect, vars: CreateClassroomVariables): MutationPromise<CreateClassroomData, CreateClassroomVariables>;

interface CreateStudentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStudentVariables): MutationRef<CreateStudentData, CreateStudentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStudentVariables): MutationRef<CreateStudentData, CreateStudentVariables>;
  operationName: string;
}
export const createStudentRef: CreateStudentRef;

export function createStudent(vars: CreateStudentVariables): MutationPromise<CreateStudentData, CreateStudentVariables>;
export function createStudent(dc: DataConnect, vars: CreateStudentVariables): MutationPromise<CreateStudentData, CreateStudentVariables>;

interface CreateSchoolMemberRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSchoolMemberVariables): MutationRef<CreateSchoolMemberData, CreateSchoolMemberVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateSchoolMemberVariables): MutationRef<CreateSchoolMemberData, CreateSchoolMemberVariables>;
  operationName: string;
}
export const createSchoolMemberRef: CreateSchoolMemberRef;

export function createSchoolMember(vars: CreateSchoolMemberVariables): MutationPromise<CreateSchoolMemberData, CreateSchoolMemberVariables>;
export function createSchoolMember(dc: DataConnect, vars: CreateSchoolMemberVariables): MutationPromise<CreateSchoolMemberData, CreateSchoolMemberVariables>;

interface CreateInvoiceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateInvoiceVariables): MutationRef<CreateInvoiceData, CreateInvoiceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateInvoiceVariables): MutationRef<CreateInvoiceData, CreateInvoiceVariables>;
  operationName: string;
}
export const createInvoiceRef: CreateInvoiceRef;

export function createInvoice(vars: CreateInvoiceVariables): MutationPromise<CreateInvoiceData, CreateInvoiceVariables>;
export function createInvoice(dc: DataConnect, vars: CreateInvoiceVariables): MutationPromise<CreateInvoiceData, CreateInvoiceVariables>;

interface CreatePayrollRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePayrollVariables): MutationRef<CreatePayrollData, CreatePayrollVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePayrollVariables): MutationRef<CreatePayrollData, CreatePayrollVariables>;
  operationName: string;
}
export const createPayrollRef: CreatePayrollRef;

export function createPayroll(vars: CreatePayrollVariables): MutationPromise<CreatePayrollData, CreatePayrollVariables>;
export function createPayroll(dc: DataConnect, vars: CreatePayrollVariables): MutationPromise<CreatePayrollData, CreatePayrollVariables>;

interface CreateSubjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateSubjectVariables): MutationRef<CreateSubjectData, CreateSubjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateSubjectVariables): MutationRef<CreateSubjectData, CreateSubjectVariables>;
  operationName: string;
}
export const createSubjectRef: CreateSubjectRef;

export function createSubject(vars: CreateSubjectVariables): MutationPromise<CreateSubjectData, CreateSubjectVariables>;
export function createSubject(dc: DataConnect, vars: CreateSubjectVariables): MutationPromise<CreateSubjectData, CreateSubjectVariables>;

interface CreateScheduleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateScheduleVariables): MutationRef<CreateScheduleData, CreateScheduleVariables>;
  operationName: string;
}
export const createScheduleRef: CreateScheduleRef;

export function createSchedule(vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;
export function createSchedule(dc: DataConnect, vars: CreateScheduleVariables): MutationPromise<CreateScheduleData, CreateScheduleVariables>;

interface CreateLeaveRequestRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateLeaveRequestVariables): MutationRef<CreateLeaveRequestData, CreateLeaveRequestVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateLeaveRequestVariables): MutationRef<CreateLeaveRequestData, CreateLeaveRequestVariables>;
  operationName: string;
}
export const createLeaveRequestRef: CreateLeaveRequestRef;

export function createLeaveRequest(vars: CreateLeaveRequestVariables): MutationPromise<CreateLeaveRequestData, CreateLeaveRequestVariables>;
export function createLeaveRequest(dc: DataConnect, vars: CreateLeaveRequestVariables): MutationPromise<CreateLeaveRequestData, CreateLeaveRequestVariables>;

interface UpdateLeaveRequestRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateLeaveRequestVariables): MutationRef<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateLeaveRequestVariables): MutationRef<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;
  operationName: string;
}
export const updateLeaveRequestRef: UpdateLeaveRequestRef;

export function updateLeaveRequest(vars: UpdateLeaveRequestVariables): MutationPromise<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;
export function updateLeaveRequest(dc: DataConnect, vars: UpdateLeaveRequestVariables): MutationPromise<UpdateLeaveRequestData, UpdateLeaveRequestVariables>;

interface CreateExamRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateExamVariables): MutationRef<CreateExamData, CreateExamVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateExamVariables): MutationRef<CreateExamData, CreateExamVariables>;
  operationName: string;
}
export const createExamRef: CreateExamRef;

export function createExam(vars: CreateExamVariables): MutationPromise<CreateExamData, CreateExamVariables>;
export function createExam(dc: DataConnect, vars: CreateExamVariables): MutationPromise<CreateExamData, CreateExamVariables>;

interface CreateAuditLogRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAuditLogVariables): MutationRef<CreateAuditLogData, CreateAuditLogVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAuditLogVariables): MutationRef<CreateAuditLogData, CreateAuditLogVariables>;
  operationName: string;
}
export const createAuditLogRef: CreateAuditLogRef;

export function createAuditLog(vars: CreateAuditLogVariables): MutationPromise<CreateAuditLogData, CreateAuditLogVariables>;
export function createAuditLog(dc: DataConnect, vars: CreateAuditLogVariables): MutationPromise<CreateAuditLogData, CreateAuditLogVariables>;

interface ListAcademicYearsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListAcademicYearsVariables): QueryRef<ListAcademicYearsData, ListAcademicYearsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListAcademicYearsVariables): QueryRef<ListAcademicYearsData, ListAcademicYearsVariables>;
  operationName: string;
}
export const listAcademicYearsRef: ListAcademicYearsRef;

export function listAcademicYears(vars: ListAcademicYearsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAcademicYearsData, ListAcademicYearsVariables>;
export function listAcademicYears(dc: DataConnect, vars: ListAcademicYearsVariables, options?: ExecuteQueryOptions): QueryPromise<ListAcademicYearsData, ListAcademicYearsVariables>;

interface ListClassroomsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListClassroomsVariables): QueryRef<ListClassroomsData, ListClassroomsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListClassroomsVariables): QueryRef<ListClassroomsData, ListClassroomsVariables>;
  operationName: string;
}
export const listClassroomsRef: ListClassroomsRef;

export function listClassrooms(vars: ListClassroomsVariables, options?: ExecuteQueryOptions): QueryPromise<ListClassroomsData, ListClassroomsVariables>;
export function listClassrooms(dc: DataConnect, vars: ListClassroomsVariables, options?: ExecuteQueryOptions): QueryPromise<ListClassroomsData, ListClassroomsVariables>;

interface ListInvoicesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListInvoicesVariables): QueryRef<ListInvoicesData, ListInvoicesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListInvoicesVariables): QueryRef<ListInvoicesData, ListInvoicesVariables>;
  operationName: string;
}
export const listInvoicesRef: ListInvoicesRef;

export function listInvoices(vars: ListInvoicesVariables, options?: ExecuteQueryOptions): QueryPromise<ListInvoicesData, ListInvoicesVariables>;
export function listInvoices(dc: DataConnect, vars: ListInvoicesVariables, options?: ExecuteQueryOptions): QueryPromise<ListInvoicesData, ListInvoicesVariables>;

interface ListStudentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListStudentsVariables): QueryRef<ListStudentsData, ListStudentsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListStudentsVariables): QueryRef<ListStudentsData, ListStudentsVariables>;
  operationName: string;
}
export const listStudentsRef: ListStudentsRef;

export function listStudents(vars: ListStudentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListStudentsData, ListStudentsVariables>;
export function listStudents(dc: DataConnect, vars: ListStudentsVariables, options?: ExecuteQueryOptions): QueryPromise<ListStudentsData, ListStudentsVariables>;

interface ListStaffRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListStaffVariables): QueryRef<ListStaffData, ListStaffVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListStaffVariables): QueryRef<ListStaffData, ListStaffVariables>;
  operationName: string;
}
export const listStaffRef: ListStaffRef;

export function listStaff(vars: ListStaffVariables, options?: ExecuteQueryOptions): QueryPromise<ListStaffData, ListStaffVariables>;
export function listStaff(dc: DataConnect, vars: ListStaffVariables, options?: ExecuteQueryOptions): QueryPromise<ListStaffData, ListStaffVariables>;

interface ListPayrollRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPayrollVariables): QueryRef<ListPayrollData, ListPayrollVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListPayrollVariables): QueryRef<ListPayrollData, ListPayrollVariables>;
  operationName: string;
}
export const listPayrollRef: ListPayrollRef;

export function listPayroll(vars: ListPayrollVariables, options?: ExecuteQueryOptions): QueryPromise<ListPayrollData, ListPayrollVariables>;
export function listPayroll(dc: DataConnect, vars: ListPayrollVariables, options?: ExecuteQueryOptions): QueryPromise<ListPayrollData, ListPayrollVariables>;

interface ListSubjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSubjectsVariables): QueryRef<ListSubjectsData, ListSubjectsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListSubjectsVariables): QueryRef<ListSubjectsData, ListSubjectsVariables>;
  operationName: string;
}
export const listSubjectsRef: ListSubjectsRef;

export function listSubjects(vars: ListSubjectsVariables, options?: ExecuteQueryOptions): QueryPromise<ListSubjectsData, ListSubjectsVariables>;
export function listSubjects(dc: DataConnect, vars: ListSubjectsVariables, options?: ExecuteQueryOptions): QueryPromise<ListSubjectsData, ListSubjectsVariables>;

interface ListSchedulesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListSchedulesVariables): QueryRef<ListSchedulesData, ListSchedulesVariables>;
  operationName: string;
}
export const listSchedulesRef: ListSchedulesRef;

export function listSchedules(vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;
export function listSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: ExecuteQueryOptions): QueryPromise<ListSchedulesData, ListSchedulesVariables>;

interface ListLeaveRequestsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListLeaveRequestsVariables): QueryRef<ListLeaveRequestsData, ListLeaveRequestsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListLeaveRequestsVariables): QueryRef<ListLeaveRequestsData, ListLeaveRequestsVariables>;
  operationName: string;
}
export const listLeaveRequestsRef: ListLeaveRequestsRef;

export function listLeaveRequests(vars: ListLeaveRequestsVariables, options?: ExecuteQueryOptions): QueryPromise<ListLeaveRequestsData, ListLeaveRequestsVariables>;
export function listLeaveRequests(dc: DataConnect, vars: ListLeaveRequestsVariables, options?: ExecuteQueryOptions): QueryPromise<ListLeaveRequestsData, ListLeaveRequestsVariables>;

interface ListExamsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListExamsVariables): QueryRef<ListExamsData, ListExamsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListExamsVariables): QueryRef<ListExamsData, ListExamsVariables>;
  operationName: string;
}
export const listExamsRef: ListExamsRef;

export function listExams(vars: ListExamsVariables, options?: ExecuteQueryOptions): QueryPromise<ListExamsData, ListExamsVariables>;
export function listExams(dc: DataConnect, vars: ListExamsVariables, options?: ExecuteQueryOptions): QueryPromise<ListExamsData, ListExamsVariables>;

