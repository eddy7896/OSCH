import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export enum AcademicYearStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}
export enum GlobalRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  USER = "USER",
}
export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REVOKED = "REVOKED",
}
export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}
export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
export enum MembershipStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}
export enum PayrollStatus {
  PENDING = "PENDING",
  PAID = "PAID",
}
export enum SchoolRole {
  PRINCIPAL = "PRINCIPAL",
  MANAGEMENT = "MANAGEMENT",
  BURSAR = "BURSAR",
  ACADEMIC_ADMIN = "ACADEMIC_ADMIN",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  HR_MANAGER = "HR_MANAGER",
  ACCOUNTANT = "ACCOUNTANT",
  ADMISSIONS_OFFICER = "ADMISSIONS_OFFICER",
  TRANSPORT_MANAGER = "TRANSPORT_MANAGER",
  OPERATIONS_MANAGER = "OPERATIONS_MANAGER",
  TEACHER = "TEACHER",
  STAFF = "STAFF",
  DRIVER = "DRIVER",
  PARENT = "PARENT",
}
export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIAL = "TRIAL",
  SUSPENDED = "SUSPENDED",
}

export interface AcademicYear_Key {
  id: UUIDString;
  __typename?: 'AcademicYear_Key';
}

export interface AcceptInvitationData {
  query?: {
    pending: ({
      id: UUIDString;
    } & Invitation_Key)[];
  };
  schoolMember_insert: SchoolMember_Key;
  invitation_updateMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface AcceptInvitationVariables {
  schoolId: UUIDString;
  invitationId: UUIDString;
  userId: string;
  schoolRole: SchoolRole;
  now: TimestampString;
  details?: unknown | null;
}

export interface AddMembershipData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  schoolMember_insert: SchoolMember_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddMembershipVariables {
  schoolId: UUIDString;
  userId: string;
  schoolRole: SchoolRole;
  actorId: string;
  details?: unknown | null;
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
  query?: {
    classrooms: ({
      id: UUIDString;
    } & Classroom_Key)[];
    subjects: ({
      id: UUIDString;
    } & Subject_Key)[];
  };
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

export interface CreateInvitationData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  invitation_insert: Invitation_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateInvitationVariables {
  schoolId: UUIDString;
  email: string;
  phoneNumber?: string | null;
  schoolRole: SchoolRole;
  tokenHash: string;
  expiresAt: TimestampString;
  actorId: string;
  details?: unknown | null;
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
  query?: {
    schoolMembers: ({
      userId: string;
    })[];
  };
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
  query?: {
    schoolMembers: ({
      userId: string;
    })[];
  };
  payroll_insert: Payroll_Key;
}

export interface CreatePayrollVariables {
  schoolId: UUIDString;
  userId: string;
  amountMinor: Int64String;
  payDate: DateString;
}

export interface CreateScheduleData {
  query?: {
    classrooms: ({
      id: UUIDString;
    } & Classroom_Key)[];
    subjects: ({
      id: UUIDString;
    } & Subject_Key)[];
    schoolMembers: ({
      userId: string;
    })[];
  };
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

export interface GetInvitationByTokenHashData {
  invitations: ({
    id: UUIDString;
    schoolRole: SchoolRole;
    status: InvitationStatus;
    expiresAt: TimestampString;
    email: string;
    school: {
      id: UUIDString;
      name: string;
      subscriptionStatus: SubscriptionStatus;
    } & School_Key;
  } & Invitation_Key)[];
}

export interface GetInvitationByTokenHashVariables {
  tokenHash: string;
}

export interface GetMembershipData {
  schoolMembers: ({
    schoolRole: SchoolRole;
    status: MembershipStatus;
    school: {
      id: UUIDString;
      name: string;
      subscriptionStatus: SubscriptionStatus;
      defaultLanguage: string;
    } & School_Key;
  })[];
}

export interface GetMembershipVariables {
  schoolId: UUIDString;
  userId: string;
}

export interface GetSchoolBySubDomainData {
  schools: ({
    id: UUIDString;
    name: string;
    subDomain: string;
    subscriptionStatus: SubscriptionStatus;
    defaultLanguage: string;
  } & School_Key)[];
}

export interface GetSchoolBySubDomainVariables {
  subDomain: string;
}

export interface GetSchoolData {
  school?: {
    id: UUIDString;
    name: string;
    subDomain: string;
    subscriptionStatus: SubscriptionStatus;
    currency: string;
    locale: string;
    defaultLanguage: string;
    createdAt: TimestampString;
    administrators: ({
      userId: string;
    })[];
  } & School_Key;
}

export interface GetSchoolVariables {
  schoolId: UUIDString;
}

export interface GetUserData {
  user?: {
    id: string;
    email: string;
    phoneNumber?: string | null;
    displayName?: string | null;
    language?: string | null;
    globalRole: GlobalRole;
  } & User_Key;
}

export interface GetUserVariables {
  id: string;
}

export interface Invitation_Key {
  id: UUIDString;
  __typename?: 'Invitation_Key';
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

export interface ListAuditLogData {
  auditLogs: ({
    id: UUIDString;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: unknown | null;
    createdAt: TimestampString;
    actor: {
      id: string;
      email: string;
      displayName?: string | null;
    } & User_Key;
  } & AuditLog_Key)[];
}

export interface ListAuditLogVariables {
  schoolId: UUIDString;
  limit: number;
  offset: number;
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

export interface ListInvitationsData {
  invitations: ({
    id: UUIDString;
    email: string;
    phoneNumber?: string | null;
    schoolRole: SchoolRole;
    status: InvitationStatus;
    expiresAt: TimestampString;
    createdAt: TimestampString;
    acceptedAt?: TimestampString | null;
    createdBy: {
      id: string;
      displayName?: string | null;
    } & User_Key;
  } & Invitation_Key)[];
}

export interface ListInvitationsVariables {
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

export interface ListMembershipsData {
  schoolMembers: ({
    schoolRole: SchoolRole;
    status: MembershipStatus;
    createdAt: TimestampString;
    user: {
      id: string;
      email: string;
      displayName?: string | null;
      phoneNumber?: string | null;
    } & User_Key;
  })[];
}

export interface ListMembershipsForUserData {
  schoolMembers: ({
    schoolRole: SchoolRole;
    status: MembershipStatus;
    school: {
      id: UUIDString;
      name: string;
      subDomain: string;
      subscriptionStatus: SubscriptionStatus;
      defaultLanguage: string;
    } & School_Key;
  })[];
}

export interface ListMembershipsForUserVariables {
  userId: string;
}

export interface ListMembershipsVariables {
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

export interface ListSchoolsData {
  schools: ({
    id: UUIDString;
    name: string;
    subDomain: string;
    subscriptionStatus: SubscriptionStatus;
    defaultLanguage: string;
    createdAt: TimestampString;
    administrators: ({
      userId: string;
    })[];
  } & School_Key)[];
}

export interface ListSchoolsVariables {
  limit: number;
  offset: number;
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

export interface ProvisionSchoolAdminData {
  query?: {
    school: ({
      id: UUIDString;
    } & School_Key)[];
    admins: ({
      userId: string;
    })[];
  };
  schoolMember_insert: SchoolMember_Key;
  auditLog_insert: AuditLog_Key;
}

export interface ProvisionSchoolAdminVariables {
  schoolId: UUIDString;
  userId: string;
  actorId: string;
  details?: unknown | null;
}

export interface ProvisionSchoolData {
  school_insert: School_Key;
  auditLog_insert: AuditLog_Key;
}

export interface ProvisionSchoolVariables {
  id: UUIDString;
  name: string;
  subDomain: string;
  defaultLanguage: string;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveMembershipData {
  query?: {
    target: ({
      userId: string;
    })[];
  };
  schoolMember_deleteMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveMembershipVariables {
  schoolId: UUIDString;
  userId: string;
  actorId: string;
  details?: unknown | null;
}

export interface RevokeInvitationData {
  query?: {
    pending: ({
      id: UUIDString;
    } & Invitation_Key)[];
  };
  invitation_updateMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface RevokeInvitationVariables {
  schoolId: UUIDString;
  invitationId: UUIDString;
  actorId: string;
  details?: unknown | null;
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

export interface SetSubscriptionStatusData {
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetSubscriptionStatusVariables {
  schoolId: UUIDString;
  status: SubscriptionStatus;
  actorId: string;
  details?: unknown | null;
}

export interface SetUserLanguageData {
  user_update?: User_Key | null;
}

export interface SetUserLanguageVariables {
  userId: string;
  language?: string | null;
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
  query?: {
    schoolMembers: ({
      userId: string;
    })[];
  };
  leaveRequest_updateMany: number;
}

export interface UpdateLeaveRequestVariables {
  schoolId: UUIDString;
  id: UUIDString;
  status: LeaveStatus;
  substituteId?: string | null;
}

export interface UpdateMembershipData {
  query?: {
    target: ({
      userId: string;
    })[];
  };
  schoolMember_updateMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateMembershipVariables {
  schoolId: UUIDString;
  userId: string;
  schoolRole: SchoolRole;
  status: MembershipStatus;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateSchoolData {
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateSchoolVariables {
  schoolId: UUIDString;
  name: string;
  defaultLanguage: string;
  actorId: string;
  details?: unknown | null;
}

export interface UpsertUserData {
  user_upsert: User_Key;
}

export interface UpsertUserVariables {
  id: string;
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

/** Generated Node Admin SDK operation action function for the 'CreateAcademicYear' Mutation. Allow users to execute without passing in DataConnect. */
export function createAcademicYear(dc: DataConnect, vars: CreateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAcademicYearData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAcademicYear' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAcademicYear(vars: CreateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAcademicYearData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSchool' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchool(dc: DataConnect, vars: CreateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchool' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchool(vars: CreateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolData>>;

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateClassroom' Mutation. Allow users to execute without passing in DataConnect. */
export function createClassroom(dc: DataConnect, vars: CreateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateClassroomData>>;
/** Generated Node Admin SDK operation action function for the 'CreateClassroom' Mutation. Allow users to pass in custom DataConnect instances. */
export function createClassroom(vars: CreateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateClassroomData>>;

/** Generated Node Admin SDK operation action function for the 'CreateStudent' Mutation. Allow users to execute without passing in DataConnect. */
export function createStudent(dc: DataConnect, vars: CreateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStudentData>>;
/** Generated Node Admin SDK operation action function for the 'CreateStudent' Mutation. Allow users to pass in custom DataConnect instances. */
export function createStudent(vars: CreateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStudentData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSchoolMember' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchoolMember(dc: DataConnect, vars: CreateSchoolMemberVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolMemberData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchoolMember' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchoolMember(vars: CreateSchoolMemberVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolMemberData>>;

/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to execute without passing in DataConnect. */
export function createInvoice(dc: DataConnect, vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to pass in custom DataConnect instances. */
export function createInvoice(vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePayroll' Mutation. Allow users to execute without passing in DataConnect. */
export function createPayroll(dc: DataConnect, vars: CreatePayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayrollData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePayroll' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPayroll(vars: CreatePayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayrollData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function createSubject(dc: DataConnect, vars: CreateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSubject(vars: CreateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSchedule' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchedule(dc: DataConnect, vars: CreateScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateScheduleData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchedule' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchedule(vars: CreateScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateScheduleData>>;

/** Generated Node Admin SDK operation action function for the 'CreateLeaveRequest' Mutation. Allow users to execute without passing in DataConnect. */
export function createLeaveRequest(dc: DataConnect, vars: CreateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateLeaveRequestData>>;
/** Generated Node Admin SDK operation action function for the 'CreateLeaveRequest' Mutation. Allow users to pass in custom DataConnect instances. */
export function createLeaveRequest(vars: CreateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateLeaveRequestData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateLeaveRequest' Mutation. Allow users to execute without passing in DataConnect. */
export function updateLeaveRequest(dc: DataConnect, vars: UpdateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLeaveRequestData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateLeaveRequest' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateLeaveRequest(vars: UpdateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLeaveRequestData>>;

/** Generated Node Admin SDK operation action function for the 'CreateExam' Mutation. Allow users to execute without passing in DataConnect. */
export function createExam(dc: DataConnect, vars: CreateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExamData>>;
/** Generated Node Admin SDK operation action function for the 'CreateExam' Mutation. Allow users to pass in custom DataConnect instances. */
export function createExam(vars: CreateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExamData>>;

/** Generated Node Admin SDK operation action function for the 'CreateAuditLog' Mutation. Allow users to execute without passing in DataConnect. */
export function createAuditLog(dc: DataConnect, vars: CreateAuditLogVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAuditLogData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAuditLog' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAuditLog(vars: CreateAuditLogVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAuditLogData>>;

/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertUser(dc: DataConnect, vars: UpsertUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertUser(vars: UpsertUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertUserData>>;

/** Generated Node Admin SDK operation action function for the 'SetUserLanguage' Mutation. Allow users to execute without passing in DataConnect. */
export function setUserLanguage(dc: DataConnect, vars: SetUserLanguageVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetUserLanguageData>>;
/** Generated Node Admin SDK operation action function for the 'SetUserLanguage' Mutation. Allow users to pass in custom DataConnect instances. */
export function setUserLanguage(vars: SetUserLanguageVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetUserLanguageData>>;

/** Generated Node Admin SDK operation action function for the 'ProvisionSchool' Mutation. Allow users to execute without passing in DataConnect. */
export function provisionSchool(dc: DataConnect, vars: ProvisionSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ProvisionSchoolData>>;
/** Generated Node Admin SDK operation action function for the 'ProvisionSchool' Mutation. Allow users to pass in custom DataConnect instances. */
export function provisionSchool(vars: ProvisionSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ProvisionSchoolData>>;

/** Generated Node Admin SDK operation action function for the 'ProvisionSchoolAdmin' Mutation. Allow users to execute without passing in DataConnect. */
export function provisionSchoolAdmin(dc: DataConnect, vars: ProvisionSchoolAdminVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ProvisionSchoolAdminData>>;
/** Generated Node Admin SDK operation action function for the 'ProvisionSchoolAdmin' Mutation. Allow users to pass in custom DataConnect instances. */
export function provisionSchoolAdmin(vars: ProvisionSchoolAdminVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ProvisionSchoolAdminData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateSchool' Mutation. Allow users to execute without passing in DataConnect. */
export function updateSchool(dc: DataConnect, vars: UpdateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSchoolData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateSchool' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateSchool(vars: UpdateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSchoolData>>;

/** Generated Node Admin SDK operation action function for the 'SetSubscriptionStatus' Mutation. Allow users to execute without passing in DataConnect. */
export function setSubscriptionStatus(dc: DataConnect, vars: SetSubscriptionStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetSubscriptionStatusData>>;
/** Generated Node Admin SDK operation action function for the 'SetSubscriptionStatus' Mutation. Allow users to pass in custom DataConnect instances. */
export function setSubscriptionStatus(vars: SetSubscriptionStatusVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetSubscriptionStatusData>>;

/** Generated Node Admin SDK operation action function for the 'AddMembership' Mutation. Allow users to execute without passing in DataConnect. */
export function addMembership(dc: DataConnect, vars: AddMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddMembershipData>>;
/** Generated Node Admin SDK operation action function for the 'AddMembership' Mutation. Allow users to pass in custom DataConnect instances. */
export function addMembership(vars: AddMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddMembershipData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateMembership' Mutation. Allow users to execute without passing in DataConnect. */
export function updateMembership(dc: DataConnect, vars: UpdateMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateMembershipData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateMembership' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateMembership(vars: UpdateMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateMembershipData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveMembership' Mutation. Allow users to execute without passing in DataConnect. */
export function removeMembership(dc: DataConnect, vars: RemoveMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveMembershipData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveMembership' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeMembership(vars: RemoveMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveMembershipData>>;

/** Generated Node Admin SDK operation action function for the 'CreateInvitation' Mutation. Allow users to execute without passing in DataConnect. */
export function createInvitation(dc: DataConnect, vars: CreateInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvitationData>>;
/** Generated Node Admin SDK operation action function for the 'CreateInvitation' Mutation. Allow users to pass in custom DataConnect instances. */
export function createInvitation(vars: CreateInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvitationData>>;

/** Generated Node Admin SDK operation action function for the 'RevokeInvitation' Mutation. Allow users to execute without passing in DataConnect. */
export function revokeInvitation(dc: DataConnect, vars: RevokeInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RevokeInvitationData>>;
/** Generated Node Admin SDK operation action function for the 'RevokeInvitation' Mutation. Allow users to pass in custom DataConnect instances. */
export function revokeInvitation(vars: RevokeInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RevokeInvitationData>>;

/** Generated Node Admin SDK operation action function for the 'AcceptInvitation' Mutation. Allow users to execute without passing in DataConnect. */
export function acceptInvitation(dc: DataConnect, vars: AcceptInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AcceptInvitationData>>;
/** Generated Node Admin SDK operation action function for the 'AcceptInvitation' Mutation. Allow users to pass in custom DataConnect instances. */
export function acceptInvitation(vars: AcceptInvitationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AcceptInvitationData>>;

/** Generated Node Admin SDK operation action function for the 'ListAcademicYears' Query. Allow users to execute without passing in DataConnect. */
export function listAcademicYears(dc: DataConnect, vars: ListAcademicYearsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAcademicYearsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAcademicYears' Query. Allow users to pass in custom DataConnect instances. */
export function listAcademicYears(vars: ListAcademicYearsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAcademicYearsData>>;

/** Generated Node Admin SDK operation action function for the 'ListClassrooms' Query. Allow users to execute without passing in DataConnect. */
export function listClassrooms(dc: DataConnect, vars: ListClassroomsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassroomsData>>;
/** Generated Node Admin SDK operation action function for the 'ListClassrooms' Query. Allow users to pass in custom DataConnect instances. */
export function listClassrooms(vars: ListClassroomsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassroomsData>>;

/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to execute without passing in DataConnect. */
export function listInvoices(dc: DataConnect, vars: ListInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function listInvoices(vars: ListInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'ListStudents' Query. Allow users to execute without passing in DataConnect. */
export function listStudents(dc: DataConnect, vars: ListStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStudentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListStudents' Query. Allow users to pass in custom DataConnect instances. */
export function listStudents(vars: ListStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStudentsData>>;

/** Generated Node Admin SDK operation action function for the 'ListStaff' Query. Allow users to execute without passing in DataConnect. */
export function listStaff(dc: DataConnect, vars: ListStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffData>>;
/** Generated Node Admin SDK operation action function for the 'ListStaff' Query. Allow users to pass in custom DataConnect instances. */
export function listStaff(vars: ListStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffData>>;

/** Generated Node Admin SDK operation action function for the 'ListPayroll' Query. Allow users to execute without passing in DataConnect. */
export function listPayroll(dc: DataConnect, vars: ListPayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPayrollData>>;
/** Generated Node Admin SDK operation action function for the 'ListPayroll' Query. Allow users to pass in custom DataConnect instances. */
export function listPayroll(vars: ListPayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPayrollData>>;

/** Generated Node Admin SDK operation action function for the 'ListSubjects' Query. Allow users to execute without passing in DataConnect. */
export function listSubjects(dc: DataConnect, vars: ListSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSubjectsData>>;
/** Generated Node Admin SDK operation action function for the 'ListSubjects' Query. Allow users to pass in custom DataConnect instances. */
export function listSubjects(vars: ListSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSubjectsData>>;

/** Generated Node Admin SDK operation action function for the 'ListSchedules' Query. Allow users to execute without passing in DataConnect. */
export function listSchedules(dc: DataConnect, vars: ListSchedulesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSchedulesData>>;
/** Generated Node Admin SDK operation action function for the 'ListSchedules' Query. Allow users to pass in custom DataConnect instances. */
export function listSchedules(vars: ListSchedulesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSchedulesData>>;

/** Generated Node Admin SDK operation action function for the 'ListLeaveRequests' Query. Allow users to execute without passing in DataConnect. */
export function listLeaveRequests(dc: DataConnect, vars: ListLeaveRequestsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLeaveRequestsData>>;
/** Generated Node Admin SDK operation action function for the 'ListLeaveRequests' Query. Allow users to pass in custom DataConnect instances. */
export function listLeaveRequests(vars: ListLeaveRequestsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLeaveRequestsData>>;

/** Generated Node Admin SDK operation action function for the 'ListExams' Query. Allow users to execute without passing in DataConnect. */
export function listExams(dc: DataConnect, vars: ListExamsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListExamsData>>;
/** Generated Node Admin SDK operation action function for the 'ListExams' Query. Allow users to pass in custom DataConnect instances. */
export function listExams(vars: ListExamsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListExamsData>>;

/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to execute without passing in DataConnect. */
export function getUser(dc: DataConnect, vars: GetUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;
/** Generated Node Admin SDK operation action function for the 'GetUser' Query. Allow users to pass in custom DataConnect instances. */
export function getUser(vars: GetUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserData>>;

/** Generated Node Admin SDK operation action function for the 'GetMembership' Query. Allow users to execute without passing in DataConnect. */
export function getMembership(dc: DataConnect, vars: GetMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMembershipData>>;
/** Generated Node Admin SDK operation action function for the 'GetMembership' Query. Allow users to pass in custom DataConnect instances. */
export function getMembership(vars: GetMembershipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMembershipData>>;

/** Generated Node Admin SDK operation action function for the 'ListMembershipsForUser' Query. Allow users to execute without passing in DataConnect. */
export function listMembershipsForUser(dc: DataConnect, vars: ListMembershipsForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMembershipsForUserData>>;
/** Generated Node Admin SDK operation action function for the 'ListMembershipsForUser' Query. Allow users to pass in custom DataConnect instances. */
export function listMembershipsForUser(vars: ListMembershipsForUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMembershipsForUserData>>;

/** Generated Node Admin SDK operation action function for the 'GetSchool' Query. Allow users to execute without passing in DataConnect. */
export function getSchool(dc: DataConnect, vars: GetSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolData>>;
/** Generated Node Admin SDK operation action function for the 'GetSchool' Query. Allow users to pass in custom DataConnect instances. */
export function getSchool(vars: GetSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolData>>;

/** Generated Node Admin SDK operation action function for the 'GetSchoolBySubDomain' Query. Allow users to execute without passing in DataConnect. */
export function getSchoolBySubDomain(dc: DataConnect, vars: GetSchoolBySubDomainVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolBySubDomainData>>;
/** Generated Node Admin SDK operation action function for the 'GetSchoolBySubDomain' Query. Allow users to pass in custom DataConnect instances. */
export function getSchoolBySubDomain(vars: GetSchoolBySubDomainVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolBySubDomainData>>;

/** Generated Node Admin SDK operation action function for the 'ListSchools' Query. Allow users to execute without passing in DataConnect. */
export function listSchools(dc: DataConnect, vars: ListSchoolsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSchoolsData>>;
/** Generated Node Admin SDK operation action function for the 'ListSchools' Query. Allow users to pass in custom DataConnect instances. */
export function listSchools(vars: ListSchoolsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSchoolsData>>;

/** Generated Node Admin SDK operation action function for the 'ListMemberships' Query. Allow users to execute without passing in DataConnect. */
export function listMemberships(dc: DataConnect, vars: ListMembershipsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMembershipsData>>;
/** Generated Node Admin SDK operation action function for the 'ListMemberships' Query. Allow users to pass in custom DataConnect instances. */
export function listMemberships(vars: ListMembershipsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMembershipsData>>;

/** Generated Node Admin SDK operation action function for the 'ListInvitations' Query. Allow users to execute without passing in DataConnect. */
export function listInvitations(dc: DataConnect, vars: ListInvitationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvitationsData>>;
/** Generated Node Admin SDK operation action function for the 'ListInvitations' Query. Allow users to pass in custom DataConnect instances. */
export function listInvitations(vars: ListInvitationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvitationsData>>;

/** Generated Node Admin SDK operation action function for the 'GetInvitationByTokenHash' Query. Allow users to execute without passing in DataConnect. */
export function getInvitationByTokenHash(dc: DataConnect, vars: GetInvitationByTokenHashVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetInvitationByTokenHashData>>;
/** Generated Node Admin SDK operation action function for the 'GetInvitationByTokenHash' Query. Allow users to pass in custom DataConnect instances. */
export function getInvitationByTokenHash(vars: GetInvitationByTokenHashVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetInvitationByTokenHashData>>;

/** Generated Node Admin SDK operation action function for the 'ListAuditLog' Query. Allow users to execute without passing in DataConnect. */
export function listAuditLog(dc: DataConnect, vars: ListAuditLogVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAuditLogData>>;
/** Generated Node Admin SDK operation action function for the 'ListAuditLog' Query. Allow users to pass in custom DataConnect instances. */
export function listAuditLog(vars: ListAuditLogVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAuditLogData>>;

