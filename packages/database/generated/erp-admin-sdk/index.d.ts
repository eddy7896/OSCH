import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export enum AcademicYearStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}
export enum ApplicationStatus {
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
  ADMITTED = "ADMITTED",
}
export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  LEAVE = "LEAVE",
  MEDICAL = "MEDICAL",
  HALF_DAY = "HALF_DAY",
  EXCUSED = "EXCUSED",
}
export enum ConcessionKind {
  PERCENT = "PERCENT",
  FIXED = "FIXED",
}
export enum Gender {
  FEMALE = "FEMALE",
  MALE = "MALE",
  OTHER = "OTHER",
}
export enum GlobalRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  USER = "USER",
}
export enum ImportStatus {
  STARTED = "STARTED",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL",
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
export enum PaymentMethod {
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  BANK_TRANSFER = "BANK_TRANSFER",
  UPI = "UPI",
  OTHER = "OTHER",
}
export enum PayrollRunStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  PAID = "PAID",
}
export enum SalaryLineKind {
  EARNING = "EARNING",
  DEDUCTION = "DEDUCTION",
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
export enum StaffDocumentKind {
  APPOINTMENT_LETTER = "APPOINTMENT_LETTER",
  ID_PROOF = "ID_PROOF",
  QUALIFICATION = "QUALIFICATION",
  EXPERIENCE = "EXPERIENCE",
  MEDICAL = "MEDICAL",
  OTHER = "OTHER",
}
export enum StaffStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  LEFT = "LEFT",
}
export enum StudentDocumentKind {
  BIRTH_CERTIFICATE = "BIRTH_CERTIFICATE",
  TRANSFER_CERTIFICATE = "TRANSFER_CERTIFICATE",
  REPORT_CARD = "REPORT_CARD",
  ID_PROOF = "ID_PROOF",
  MEDICAL = "MEDICAL",
  OTHER = "OTHER",
}
export enum StudentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  LEFT = "LEFT",
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

export interface ActivateAcademicYearData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  academicYear_updateMany: number;
  academicYear_update?: AcademicYear_Key | null;
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface ActivateAcademicYearVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface AddFeeInstalmentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    item: ({
      id: UUIDString;
    } & FeeItem_Key)[];
  };
  feeInstalment_insert: FeeInstalment_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddFeeInstalmentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  itemId: UUIDString;
  sequence: number;
  label?: string | null;
  amountMinor: Int64String;
  dueDate: DateString;
  actorId: string;
  details?: unknown | null;
}

export interface AddGuardianData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  guardian_insert: Guardian_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddGuardianVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  name: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  actorId: string;
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

export interface AddPayslipLineData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
    payslip: ({
      id: UUIDString;
    } & Payslip_Key)[];
  };
  payslipLine_insert: PayslipLine_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddPayslipLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
  runId: UUIDString;
  payslipId: UUIDString;
  kind: SalaryLineKind;
  name: string;
  amountMinor: Int64String;
  manual: boolean;
  actorId: string;
  details?: unknown | null;
}

export interface AddSalaryLineData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  salaryLine_insert: SalaryLine_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddSalaryLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  kind: SalaryLineKind;
  name: string;
  amountMinor: Int64String;
  actorId: string;
  details?: unknown | null;
}

export interface AddStaffDocumentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  staffDocument_insert: StaffDocument_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddStaffDocumentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  kind: StaffDocumentKind;
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  actorId: string;
  details?: unknown | null;
}

export interface AddStudentDocumentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  studentDocument_insert: StudentDocument_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddStudentDocumentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  kind: StudentDocumentKind;
  fileKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  actorId: string;
  details?: unknown | null;
}

export interface AddTeacherSubjectData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    subject: ({
      id: UUIDString;
    } & Subject_Key)[];
  };
  teacherSubject_insert: TeacherSubject_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AddTeacherSubjectVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  subjectId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface AdmitApplicationData {
  query?: {
    actor: ({
      userId: string;
    })[];
    app: ({
      id: UUIDString;
    } & Application_Key)[];
    counter: ({
      id: UUIDString;
    } & School_Key)[];
    room: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  school_update?: School_Key | null;
  student_insert: Student_Key;
  studentEnrollment_insert: StudentEnrollment_Key;
  guardian_insert: Guardian_Key;
  application_update?: Application_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface AdmitApplicationVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  expectedSeq: number;
  enrollmentId: string;
  academicYearId: UUIDString;
  classroomId: UUIDString;
  firstName: string;
  lastName: string;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  address?: string | null;
  admissionDate?: DateString | null;
  guardianId: UUIDString;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface ApplicationSeqInfoData {
  school?: {
    id: UUIDString;
    applicationSeq: number;
    studentSeq: number;
    enrollmentPrefix: string;
  } & School_Key;
}

export interface ApplicationSeqInfoVariables {
  schoolId: UUIDString;
}

export interface Application_Key {
  id: UUIDString;
  __typename?: 'Application_Key';
}

export interface ApplyShortDayScheduleData {
  query?: {
    actor: ({
      userId: string;
    })[];
    existing: ({
      id: UUIDString;
    } & Period_Key)[];
  };
  p1: Period_Key;
  p2: Period_Key;
  p3: Period_Key;
  p4: Period_Key;
  p5: Period_Key;
  p6: Period_Key;
  auditLog_insert: AuditLog_Key;
}

export interface ApplyShortDayScheduleVariables {
  schoolId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface ApplyStandardScheduleData {
  query?: {
    actor: ({
      userId: string;
    })[];
    existing: ({
      id: UUIDString;
    } & Period_Key)[];
  };
  p1: Period_Key;
  p2: Period_Key;
  p3: Period_Key;
  p4: Period_Key;
  p5: Period_Key;
  p6: Period_Key;
  p7: Period_Key;
  p8: Period_Key;
  p9: Period_Key;
  p10: Period_Key;
  auditLog_insert: AuditLog_Key;
}

export interface ApplyStandardScheduleVariables {
  schoolId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface ApprovePayrollRunData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
  };
  payrollRun_update?: PayrollRun_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface ApprovePayrollRunVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface AssessmentTerm_Key {
  id: UUIDString;
  __typename?: 'AssessmentTerm_Key';
}

export interface AssignClassTeacherData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    classroom: ({
      id: UUIDString;
    } & Classroom_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  classTeacher_insert: ClassTeacher_Key;
  auditLog_insert: AuditLog_Key;
}

export interface AssignClassTeacherVariables {
  schoolId: UUIDString;
  id: UUIDString;
  classroomId: UUIDString;
  academicYearId: UUIDString;
  staffId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface AttendanceDay_Key {
  id: UUIDString;
  __typename?: 'AttendanceDay_Key';
}

export interface AttendanceDaysOnData {
  attendanceDays: ({
    id: UUIDString;
    classroomId: UUIDString;
    locked: boolean;
  } & AttendanceDay_Key)[];
}

export interface AttendanceDaysOnVariables {
  schoolId: UUIDString;
  date: DateString;
}

export interface AttendanceMark_Key {
  id: UUIDString;
  __typename?: 'AttendanceMark_Key';
}

export interface AttendanceOfStudentData {
  attendanceMarks: ({
    status: AttendanceStatus;
    note?: string | null;
    day: {
      date: DateString;
      classroomId: UUIDString;
    };
  })[];
}

export interface AttendanceOfStudentVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  from: DateString;
  to: DateString;
}

export interface AttendanceStatusLabel_Key {
  id: UUIDString;
  __typename?: 'AttendanceStatusLabel_Key';
}

export interface AuditLog_Key {
  id: UUIDString;
  __typename?: 'AuditLog_Key';
}

export interface ChangeClassTeacherData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    link: ({
      id: UUIDString;
    } & ClassTeacher_Key)[];
  };
  classTeacher_update?: ClassTeacher_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface ChangeClassTeacherVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface CheckInStaffData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  staffAttendance_insert: StaffAttendance_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CheckInStaffVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  date: DateString;
  actorId: string;
  details?: unknown | null;
}

export interface CheckOutStaffData {
  query?: {
    actor: ({
      userId: string;
    })[];
    row: ({
      id: UUIDString;
    } & StaffAttendance_Key)[];
  };
  staffAttendance_update?: StaffAttendance_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface CheckOutStaffVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface ClassRosterData {
  studentEnrollments: ({
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
  })[];
}

export interface ClassRosterVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  classroomId: UUIDString;
}

export interface ClassTeacher_Key {
  id: UUIDString;
  __typename?: 'ClassTeacher_Key';
}

export interface Classroom_Key {
  id: UUIDString;
  __typename?: 'Classroom_Key';
}

export interface Concession_Key {
  id: UUIDString;
  __typename?: 'Concession_Key';
}

export interface CorrectStaffAttendanceData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  staffAttendance_upsert: StaffAttendance_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CorrectStaffAttendanceVariables {
  schoolId: UUIDString;
  id: UUIDString;
  staffId: UUIDString;
  date: DateString;
  checkIn?: TimestampString | null;
  checkOut?: TimestampString | null;
  actorId: string;
  details?: unknown | null;
}

export interface CountApplicationsData {
  applications: ({
    _count: number;
  })[];
}

export interface CountApplicationsVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: ApplicationStatus | null;
  academicYearId?: UUIDString | null;
}

export interface CountDuesInvoicesData {
  invoices: ({
    _count: number;
  })[];
}

export interface CountDuesInvoicesVariables {
  schoolId: UUIDString;
  dueOnOrBefore: DateString;
  academicYearId?: UUIDString | null;
}

export interface CountExamsOfTermData {
  exams: ({
    _count: number;
  })[];
}

export interface CountExamsOfTermVariables {
  schoolId: UUIDString;
  termId: UUIDString;
}

export interface CountInvoicesData {
  invoices: ({
    _count: number;
    amountMinor_sum?: Int64String | null;
    paidMinor_sum?: Int64String | null;
  })[];
}

export interface CountInvoicesForInstalmentsData {
  invoices: ({
    _count: number;
  })[];
}

export interface CountInvoicesForInstalmentsVariables {
  schoolId: UUIDString;
  ids: UUIDString[];
}

export interface CountInvoicesVariables {
  schoolId: UUIDString;
  studentId?: UUIDString | null;
  academicYearId?: UUIDString | null;
  status?: InvoiceStatus | null;
  dueOnOrBefore?: DateString | null;
  dueOnOrAfter?: DateString | null;
}

export interface CountMarksOfExamData {
  marks: ({
    _count: number;
  })[];
}

export interface CountMarksOfExamVariables {
  schoolId: UUIDString;
  examId: UUIDString;
}

export interface CountPaymentsInRangeData {
  payments: ({
    _count: number;
  })[];
}

export interface CountPaymentsInRangeVariables {
  schoolId: UUIDString;
  from: DateString;
  to: DateString;
}

export interface CountReceiptsData {
  receipts: ({
    _count: number;
    amountMinor_sum?: Int64String | null;
  })[];
}

export interface CountReceiptsVariables {
  schoolId: UUIDString;
  studentId?: UUIDString | null;
  academicYearId?: UUIDString | null;
}

export interface CountStaffProfilesData {
  staffProfiles: ({
    _count: number;
  })[];
}

export interface CountStaffProfilesVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: StaffStatus | null;
  department?: string | null;
}

export interface CountStudentsData {
  students: ({
    _count: number;
  })[];
}

export interface CountStudentsVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: StudentStatus | null;
}

export interface CountTimetableForPeriodData {
  timetableEntries: ({
    _count: number;
  })[];
}

export interface CountTimetableForPeriodVariables {
  schoolId: UUIDString;
  periodId: UUIDString;
}

export interface CreateAcademicYearData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  academicYear_insert: AcademicYear_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateAcademicYearVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name: string;
  startDate: DateString;
  endDate: DateString;
  actorId: string;
  details?: unknown | null;
}

export interface CreateApplicationData {
  query?: {
    actor: ({
      userId: string;
    })[];
    counter: ({
      id: UUIDString;
    } & School_Key)[];
    level: ({
      id: UUIDString;
    } & GradeLevel_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  school_update?: School_Key | null;
  application_insert: Application_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateApplicationVariables {
  schoolId: UUIDString;
  id: UUIDString;
  expectedSeq: number;
  applicationNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  address?: string | null;
  gradeLevelId: UUIDString;
  academicYearId: UUIDString;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  previousSchool?: string | null;
  notes?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface CreateAssessmentTermData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  assessmentTerm_insert: AssessmentTerm_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateAssessmentTermVariables {
  schoolId: UUIDString;
  id: UUIDString;
  academicYearId: UUIDString;
  name: string;
  actorId: string;
  details?: unknown | null;
}

export interface CreateAttendanceDayData {
  query?: {
    actor: ({
      userId: string;
    })[];
    classroom: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  attendanceDay_insert: AttendanceDay_Key;
}

export interface CreateAttendanceDayVariables {
  schoolId: UUIDString;
  id: UUIDString;
  classroomId: UUIDString;
  date: DateString;
  actorId: string;
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
  query?: {
    actor: ({
      userId: string;
    })[];
    level: ({
      id: UUIDString;
    } & GradeLevel_Key)[];
  };
  classroom_insert: Classroom_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateClassroomVariables {
  schoolId: UUIDString;
  id: UUIDString;
  gradeLevelId: UUIDString;
  section: string;
  name: string;
  capacity: number;
  actorId: string;
  details?: unknown | null;
}

export interface CreateConcessionData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  concession_insert: Concession_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateConcessionVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  academicYearId: UUIDString;
  name: string;
  kind: ConcessionKind;
  basisPoints?: number | null;
  amountMinor?: Int64String | null;
  actorId: string;
  details?: unknown | null;
}

export interface CreateExamData {
  query?: {
    actor: ({
      userId: string;
    })[];
    term: ({
      id: UUIDString;
    } & AssessmentTerm_Key)[];
    classroom: ({
      id: UUIDString;
    } & Classroom_Key)[];
    subject: ({
      id: UUIDString;
    } & Subject_Key)[];
  };
  exam_insert: Exam_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateExamVariables {
  schoolId: UUIDString;
  id: UUIDString;
  termId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  title: string;
  examDate: DateString;
  maxTenths: number;
  actorId: string;
  details?: unknown | null;
}

export interface CreateFeeItemData {
  query?: {
    actor: ({
      userId: string;
    })[];
    structure: ({
      id: UUIDString;
    } & FeeStructure_Key)[];
  };
  feeItem_insert: FeeItem_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateFeeItemVariables {
  schoolId: UUIDString;
  id: UUIDString;
  structureId: UUIDString;
  name: string;
  actorId: string;
  details?: unknown | null;
}

export interface CreateFeeStructureData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
    level: ({
      id: UUIDString;
    } & GradeLevel_Key)[];
  };
  feeStructure_insert: FeeStructure_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateFeeStructureVariables {
  schoolId: UUIDString;
  id: UUIDString;
  academicYearId: UUIDString;
  gradeLevelId: UUIDString;
  name: string;
  actorId: string;
  details?: unknown | null;
}

export interface CreateGradeLevelData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  gradeLevel_insert: GradeLevel_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateGradeLevelVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name: string;
  position: number;
  actorId: string;
  details?: unknown | null;
}

export interface CreateInstalmentInvoiceData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    inst: ({
      id: UUIDString;
    } & FeeInstalment_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  invoice_insert: Invoice_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateInstalmentInvoiceVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  instalmentId: UUIDString;
  academicYearId: UUIDString;
  title: string;
  grossMinor: Int64String;
  discountMinor: Int64String;
  amountMinor: Int64String;
  dueDate: DateString;
  actorId: string;
  details?: unknown | null;
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
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  invoice_insert: Invoice_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateInvoiceVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  title: string;
  amountMinor: Int64String;
  dueDate: DateString;
  actorId: string;
  details?: unknown | null;
}

export interface CreateItemConcessionData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
    item: ({
      id: UUIDString;
    } & FeeItem_Key)[];
  };
  concession_insert: Concession_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateItemConcessionVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  academicYearId: UUIDString;
  feeItemId: UUIDString;
  name: string;
  kind: ConcessionKind;
  basisPoints?: number | null;
  amountMinor?: Int64String | null;
  actorId: string;
  details?: unknown | null;
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

export interface CreatePayrollRunData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  payrollRun_insert: PayrollRun_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreatePayrollRunVariables {
  schoolId: UUIDString;
  id: UUIDString;
  year: number;
  month: number;
  actorId: string;
  details?: unknown | null;
}

export interface CreatePayslipData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  payslip_insert: Payslip_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreatePayslipVariables {
  schoolId: UUIDString;
  id: UUIDString;
  runId: UUIDString;
  staffId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface CreatePeriodData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  period_insert: Period_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreatePeriodVariables {
  schoolId: UUIDString;
  id: UUIDString;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  actorId: string;
  details?: unknown | null;
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

export interface CreateStaffData {
  query?: {
    actor: ({
      userId: string;
    })[];
    counter: ({
      id: UUIDString;
    } & School_Key)[];
  };
  school_update?: School_Key | null;
  staffProfile_insert: StaffProfile_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateStaffVariables {
  schoolId: UUIDString;
  id: UUIDString;
  expectedSeq: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  dateOfJoining?: DateString | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface CreateStudentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    counter: ({
      id: UUIDString;
    } & School_Key)[];
  };
  school_update?: School_Key | null;
  student_insert: Student_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateStudentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  expectedSeq: number;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  admissionDate?: DateString | null;
  address?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface CreateSubjectData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  subject_insert: Subject_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateSubjectVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name: string;
  code: string;
  actorId: string;
  details?: unknown | null;
}

export interface CreateTimetableEntryData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
    classroom: ({
      id: UUIDString;
    } & Classroom_Key)[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    teaches: ({
      id: UUIDString;
    } & TeacherSubject_Key)[];
    period: ({
      id: UUIDString;
    } & Period_Key)[];
  };
  timetableEntry_insert: TimetableEntry_Key;
  auditLog_insert: AuditLog_Key;
}

export interface CreateTimetableEntryVariables {
  schoolId: UUIDString;
  id: UUIDString;
  academicYearId: UUIDString;
  classroomId: UUIDString;
  subjectId: UUIDString;
  staffId: UUIDString;
  day: string;
  periodId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  id: string;
  email: string;
  globalRole: GlobalRole;
}

export interface DaysOfClassData {
  attendanceDays: ({
    date: DateString;
  })[];
}

export interface DaysOfClassVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  from: DateString;
  to: DateString;
}

export interface DecideApplicationData {
  query?: {
    actor: ({
      userId: string;
    })[];
    app: ({
      id: UUIDString;
    } & Application_Key)[];
  };
  application_update?: Application_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DecideApplicationVariables {
  schoolId: UUIDString;
  id: UUIDString;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  decisionNote?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteAcademicYearData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
    notActive: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  academicYear_delete?: AcademicYear_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteAcademicYearVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteAssessmentTermData {
  query?: {
    actor: ({
      userId: string;
    })[];
    term: ({
      id: UUIDString;
    } & AssessmentTerm_Key)[];
    exams: ({
      id: UUIDString;
    } & Exam_Key)[];
  };
  assessmentTerm_delete?: AssessmentTerm_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteAssessmentTermVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteClassroomData {
  query?: {
    actor: ({
      userId: string;
    })[];
    room: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  classroom_delete?: Classroom_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteClassroomVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteConcessionData {
  query?: {
    actor: ({
      userId: string;
    })[];
    concession: ({
      id: UUIDString;
    } & Concession_Key)[];
  };
  concession_delete?: Concession_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteConcessionVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteExamData {
  query?: {
    actor: ({
      userId: string;
    })[];
    exam: ({
      id: UUIDString;
    } & Exam_Key)[];
    marks: ({
      id: UUIDString;
    } & Mark_Key)[];
  };
  exam_delete?: Exam_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteExamVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteFeeInstalmentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    inst: ({
      id: UUIDString;
    } & FeeInstalment_Key)[];
  };
  feeInstalment_delete?: FeeInstalment_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteFeeInstalmentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteFeeItemData {
  query?: {
    actor: ({
      userId: string;
    })[];
    item: ({
      id: UUIDString;
    } & FeeItem_Key)[];
  };
  feeItem_delete?: FeeItem_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteFeeItemVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteFeeStructureData {
  query?: {
    actor: ({
      userId: string;
    })[];
    structure: ({
      id: UUIDString;
    } & FeeStructure_Key)[];
  };
  feeStructure_delete?: FeeStructure_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteFeeStructureVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteGradeLevelData {
  query?: {
    actor: ({
      userId: string;
    })[];
    level: ({
      id: UUIDString;
    } & GradeLevel_Key)[];
    classes: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  gradeLevel_delete?: GradeLevel_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteGradeLevelVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeletePayrollRunData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
  };
  payrollRun_delete?: PayrollRun_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeletePayrollRunVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeletePeriodData {
  query?: {
    actor: ({
      userId: string;
    })[];
    period: ({
      id: UUIDString;
    } & Period_Key)[];
  };
  period_delete?: Period_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeletePeriodVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteSubjectData {
  query?: {
    actor: ({
      userId: string;
    })[];
    subject: ({
      id: UUIDString;
    } & Subject_Key)[];
  };
  subject_delete?: Subject_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteSubjectVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DeleteTimetableEntryData {
  query?: {
    actor: ({
      userId: string;
    })[];
    entry: ({
      id: UUIDString;
    } & TimetableEntry_Key)[];
  };
  timetableEntry_delete?: TimetableEntry_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface DeleteTimetableEntryVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface DuesInvoicesData {
  invoices: ({
    id: UUIDString;
    title: string;
    amountMinor: Int64String;
    paidMinor: Int64String;
    dueDate: DateString;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
  } & Invoice_Key)[];
}

export interface DuesInvoicesVariables {
  schoolId: UUIDString;
  dueOnOrBefore: DateString;
  academicYearId?: UUIDString | null;
  limit: number;
  offset: number;
}

export interface EnrollmentsOfStudentsData {
  studentEnrollments: ({
    studentId: UUIDString;
    classroom: {
      id: UUIDString;
      name: string;
    } & Classroom_Key;
  })[];
}

export interface EnrollmentsOfStudentsVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  studentIds: UUIDString[];
}

export interface Exam_Key {
  id: UUIDString;
  __typename?: 'Exam_Key';
}

export interface FeeInstalment_Key {
  id: UUIDString;
  __typename?: 'FeeInstalment_Key';
}

export interface FeeItem_Key {
  id: UUIDString;
  __typename?: 'FeeItem_Key';
}

export interface FeeStructure_Key {
  id: UUIDString;
  __typename?: 'FeeStructure_Key';
}

export interface FindImportBatchData {
  importBatches: ({
    id: UUIDString;
    status: ImportStatus;
    rowCount: number;
    createdCount: number;
    failedCount: number;
    createdAt: TimestampString;
  } & ImportBatch_Key)[];
}

export interface FindImportBatchVariables {
  schoolId: UUIDString;
  kind: string;
  fileHash: string;
}

export interface FindPayrollRunData {
  payrollRuns: ({
    id: UUIDString;
    status: PayrollRunStatus;
  } & PayrollRun_Key)[];
}

export interface FindPayrollRunVariables {
  schoolId: UUIDString;
  year: number;
  month: number;
}

export interface FinishAttendanceCorrectionData {
  query?: {
    actor: ({
      userId: string;
    })[];
    day: ({
      id: UUIDString;
    } & AttendanceDay_Key)[];
  };
  attendanceDay_update?: AttendanceDay_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface FinishAttendanceCorrectionVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface FinishAttendanceSubmitData {
  query?: {
    actor: ({
      userId: string;
    })[];
    day: ({
      id: UUIDString;
    } & AttendanceDay_Key)[];
  };
  attendanceDay_update?: AttendanceDay_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface FinishAttendanceSubmitVariables {
  schoolId: UUIDString;
  id: UUIDString;
  submissionId?: string | null;
  locked: boolean;
  actorId: string;
  details?: unknown | null;
}

export interface FinishImportBatchData {
  query?: {
    actor: ({
      userId: string;
    })[];
    batch: ({
      id: UUIDString;
    } & ImportBatch_Key)[];
  };
  importBatch_update?: ImportBatch_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface FinishImportBatchVariables {
  schoolId: UUIDString;
  id: UUIDString;
  status: ImportStatus;
  createdCount: number;
  failedCount: number;
  actorId: string;
  details?: unknown | null;
}

export interface FinishMarkEntryData {
  query?: {
    actor: ({
      userId: string;
    })[];
    exam: ({
      id: UUIDString;
    } & Exam_Key)[];
  };
  exam_update?: Exam_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface FinishMarkEntryVariables {
  schoolId: UUIDString;
  id: UUIDString;
  submissionId?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface GetApplicationData {
  applications: ({
    id: UUIDString;
    applicationNo: string;
    status: ApplicationStatus;
    firstName: string;
    lastName: string;
    dateOfBirth?: DateString | null;
    gender?: Gender | null;
    address?: string | null;
    guardianName: string;
    guardianRelationship: string;
    guardianPhone?: string | null;
    guardianEmail?: string | null;
    previousSchool?: string | null;
    notes?: string | null;
    decisionNote?: string | null;
    createdAt: TimestampString;
    studentId?: UUIDString | null;
    gradeLevel: {
      id: UUIDString;
      name: string;
    } & GradeLevel_Key;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
  } & Application_Key)[];
}

export interface GetApplicationVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetAttendanceDayData {
  attendanceDays: ({
    id: UUIDString;
    date: DateString;
    locked: boolean;
    submittedAt: TimestampString;
    submissionId?: string | null;
    submittedBy: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    marks: ({
      id: UUIDString;
      status: AttendanceStatus;
      note?: string | null;
      student: {
        id: UUIDString;
      } & Student_Key;
    } & AttendanceMark_Key)[];
  } & AttendanceDay_Key)[];
}

export interface GetAttendanceDayVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  date: DateString;
}

export interface GetExamData {
  exams: ({
    id: UUIDString;
    title: string;
    examDate: DateString;
    maxTenths: number;
    lastSubmissionId?: string | null;
    termId: UUIDString;
    term: {
      id: UUIDString;
      name: string;
      academicYearId: UUIDString;
    } & AssessmentTerm_Key;
    classroom: {
      id: UUIDString;
      name: string;
    } & Classroom_Key;
    subject: {
      id: UUIDString;
      name: string;
      code: string;
    } & Subject_Key;
    marks: ({
      id: UUIDString;
      tenths: number;
      absent: boolean;
      studentId: UUIDString;
    } & Mark_Key)[];
  } & Exam_Key)[];
}

export interface GetExamVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetFeeInstalmentData {
  feeInstalments: ({
    id: UUIDString;
    sequence: number;
    label?: string | null;
    amountMinor: Int64String;
    dueDate: DateString;
    item: {
      id: UUIDString;
      name: string;
      structure: {
        id: UUIDString;
      } & FeeStructure_Key;
    } & FeeItem_Key;
  } & FeeInstalment_Key)[];
}

export interface GetFeeInstalmentVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetFeeItemData {
  feeItems: ({
    id: UUIDString;
    name: string;
    structure: {
      id: UUIDString;
    } & FeeStructure_Key;
    instalments: ({
      id: UUIDString;
      sequence: number;
    } & FeeInstalment_Key)[];
  } & FeeItem_Key)[];
}

export interface GetFeeItemVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetFeeStructureData {
  feeStructures: ({
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    gradeLevel: {
      id: UUIDString;
      name: string;
      position: number;
    } & GradeLevel_Key;
    items: ({
      id: UUIDString;
      name: string;
      instalments: ({
        id: UUIDString;
        sequence: number;
        label?: string | null;
        amountMinor: Int64String;
        dueDate: DateString;
      } & FeeInstalment_Key)[];
    } & FeeItem_Key)[];
  } & FeeStructure_Key)[];
}

export interface GetFeeStructureVariables {
  schoolId: UUIDString;
  id: UUIDString;
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

export interface GetInvoiceData {
  invoices: ({
    id: UUIDString;
    title: string;
    amountMinor: Int64String;
    paidMinor: Int64String;
    grossMinor?: Int64String | null;
    discountMinor?: Int64String | null;
    dueDate: DateString;
    status: InvoiceStatus;
    createdAt: TimestampString;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    academicYear?: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    instalmentId?: UUIDString | null;
    payments: ({
      id: UUIDString;
      amountMinor: Int64String;
      method: PaymentMethod;
      reference?: string | null;
      paidOn: DateString;
      reversedAt?: TimestampString | null;
      reversalReason?: string | null;
      createdAt: TimestampString;
      recordedBy: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
      receipt?: {
        id: UUIDString;
        number: string;
        cancelledAt?: TimestampString | null;
      } & Receipt_Key;
    } & Payment_Key)[];
  } & Invoice_Key)[];
}

export interface GetInvoiceVariables {
  schoolId: UUIDString;
  id: UUIDString;
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

export interface GetPaymentData {
  payments: ({
    id: UUIDString;
    amountMinor: Int64String;
    reversedAt?: TimestampString | null;
    invoice: {
      id: UUIDString;
      amountMinor: Int64String;
      paidMinor: Int64String;
      status: InvoiceStatus;
    } & Invoice_Key;
  } & Payment_Key)[];
}

export interface GetPaymentVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetPayrollRunData {
  payrollRuns: ({
    id: UUIDString;
    year: number;
    month: number;
    status: PayrollRunStatus;
    createdAt: TimestampString;
    approvedAt?: TimestampString | null;
    paidAt?: TimestampString | null;
    paidOn?: DateString | null;
    paymentReference?: string | null;
    preparedBy: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    approvedBy?: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    paidBy?: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    payslips: ({
      id: UUIDString;
      staff: {
        id: UUIDString;
        employeeId: string;
        firstName: string;
        lastName: string;
        department?: string | null;
        designation?: string | null;
      } & StaffProfile_Key;
      lines: ({
        id: UUIDString;
        kind: SalaryLineKind;
        name: string;
        amountMinor: Int64String;
        manual: boolean;
      } & PayslipLine_Key)[];
    } & Payslip_Key)[];
  } & PayrollRun_Key)[];
}

export interface GetPayrollRunVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetPayslipData {
  payslips: ({
    id: UUIDString;
    run: {
      id: UUIDString;
      year: number;
      month: number;
      status: PayrollRunStatus;
      createdAt: TimestampString;
      approvedAt?: TimestampString | null;
      paidAt?: TimestampString | null;
      paidOn?: DateString | null;
      paymentReference?: string | null;
      preparedBy: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
      approvedBy?: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
      paidBy?: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
    } & PayrollRun_Key;
    staff: {
      id: UUIDString;
      employeeId: string;
      firstName: string;
      lastName: string;
      department?: string | null;
      designation?: string | null;
    } & StaffProfile_Key;
    lines: ({
      id: UUIDString;
      kind: SalaryLineKind;
      name: string;
      amountMinor: Int64String;
      manual: boolean;
    } & PayslipLine_Key)[];
  } & Payslip_Key)[];
}

export interface GetPayslipVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetReceiptByPaymentData {
  receipts: ({
    id: UUIDString;
    number: string;
    serial: number;
    amountMinor: Int64String;
    balanceAfterMinor: Int64String;
    cancelledAt?: TimestampString | null;
    cancelReason?: string | null;
    createdAt: TimestampString;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    invoice: {
      id: UUIDString;
      title: string;
    } & Invoice_Key;
    payment: {
      id: UUIDString;
      method: PaymentMethod;
      reference?: string | null;
      paidOn: DateString;
      recordedBy: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
    } & Payment_Key;
  } & Receipt_Key)[];
}

export interface GetReceiptByPaymentVariables {
  schoolId: UUIDString;
  paymentId: UUIDString;
}

export interface GetReceiptData {
  receipts: ({
    id: UUIDString;
    number: string;
    serial: number;
    amountMinor: Int64String;
    balanceAfterMinor: Int64String;
    cancelledAt?: TimestampString | null;
    cancelReason?: string | null;
    createdAt: TimestampString;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    invoice: {
      id: UUIDString;
      title: string;
    } & Invoice_Key;
    payment: {
      id: UUIDString;
      method: PaymentMethod;
      reference?: string | null;
      paidOn: DateString;
      recordedBy: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
    } & Payment_Key;
  } & Receipt_Key)[];
}

export interface GetReceiptVariables {
  schoolId: UUIDString;
  id: UUIDString;
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

export interface GetSchoolProfileData {
  school?: {
    id: UUIDString;
    name: string;
    subDomain: string;
    defaultLanguage: string;
    currency: string;
    locale: string;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    primaryColor?: string | null;
    logoKey?: string | null;
    activeAcademicYear?: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
  } & School_Key;
}

export interface GetSchoolProfileVariables {
  schoolId: UUIDString;
}

export interface GetSchoolVariables {
  schoolId: UUIDString;
}

export interface GetStaffAttendanceData {
  staffAttendances: ({
    id: UUIDString;
    date: DateString;
    checkIn?: TimestampString | null;
    checkOut?: TimestampString | null;
  } & StaffAttendance_Key)[];
}

export interface GetStaffAttendanceVariables {
  schoolId: UUIDString;
  staffId: UUIDString;
  date: DateString;
}

export interface GetStaffProfileData {
  staffProfiles: ({
    id: UUIDString;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: string | null;
    designation?: string | null;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: DateString | null;
    gender?: Gender | null;
    dateOfJoining?: DateString | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    status: StaffStatus;
    photoKey?: string | null;
    createdAt: TimestampString;
    userId?: string | null;
    documents: ({
      id: UUIDString;
      kind: StaffDocumentKind;
      fileKey: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      createdAt: TimestampString;
    } & StaffDocument_Key)[];
  } & StaffProfile_Key)[];
}

export interface GetStaffProfileVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface GetStudentData {
  students: ({
    id: UUIDString;
    firstName: string;
    lastName: string;
    enrollmentId: string;
    serial: number;
    status: StudentStatus;
    gender?: Gender | null;
    dateOfBirth?: DateString | null;
    admissionDate?: DateString | null;
    address?: string | null;
    photoKey?: string | null;
    createdAt: TimestampString;
    placements: ({
      academicYear: {
        id: UUIDString;
        name: string;
      } & AcademicYear_Key;
      classroom: {
        id: UUIDString;
        name: string;
      } & Classroom_Key;
    })[];
    guardians: ({
      id: UUIDString;
      name: string;
      relationship: string;
      phone?: string | null;
      email?: string | null;
      isPrimary: boolean;
    } & Guardian_Key)[];
    documents: ({
      id: UUIDString;
      kind: StudentDocumentKind;
      fileKey: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      createdAt: TimestampString;
    } & StudentDocument_Key)[];
  } & Student_Key)[];
}

export interface GetStudentLevelData {
  studentEnrollments: ({
    classroom: {
      id: UUIDString;
      name: string;
      gradeLevel: {
        id: UUIDString;
        name: string;
      } & GradeLevel_Key;
    } & Classroom_Key;
  })[];
}

export interface GetStudentLevelVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  academicYearId: UUIDString;
}

export interface GetStudentVariables {
  schoolId: UUIDString;
  id: UUIDString;
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

export interface GradeLevel_Key {
  id: UUIDString;
  __typename?: 'GradeLevel_Key';
}

export interface Guardian_Key {
  id: UUIDString;
  __typename?: 'Guardian_Key';
}

export interface ImportBatch_Key {
  id: UUIDString;
  __typename?: 'ImportBatch_Key';
}

export interface Invitation_Key {
  id: UUIDString;
  __typename?: 'Invitation_Key';
}

export interface Invoice_Key {
  id: UUIDString;
  __typename?: 'Invoice_Key';
}

export interface InvoicedForYearData {
  invoices: ({
    studentId: UUIDString;
    instalmentId?: UUIDString | null;
  })[];
}

export interface InvoicedForYearVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  limit: number;
  offset: number;
}

export interface LeaveRequest_Key {
  id: UUIDString;
  __typename?: 'LeaveRequest_Key';
}

export interface LinkParentAccountData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    parent: ({
      userId: string;
    })[];
  };
  parentLink_insert: ParentLink_Key;
  auditLog_insert: AuditLog_Key;
}

export interface LinkParentAccountVariables {
  schoolId: UUIDString;
  id: UUIDString;
  studentId: UUIDString;
  userId: string;
  relationship: string;
  actorId: string;
  details?: unknown | null;
}

export interface LinkStaffAccountData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    member: ({
      userId: string;
    })[];
  };
  staffProfile_update?: StaffProfile_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface LinkStaffAccountVariables {
  schoolId: UUIDString;
  id: UUIDString;
  userId: string;
  actorId: string;
  details?: unknown | null;
}

export interface ListAcademicYearsData {
  academicYears: ({
    id: UUIDString;
    name: string;
    startDate: DateString;
    endDate: DateString;
    status: AcademicYearStatus;
    receiptSeq: number;
  } & AcademicYear_Key)[];
}

export interface ListAcademicYearsVariables {
  schoolId: UUIDString;
}

export interface ListApplicationsData {
  applications: ({
    id: UUIDString;
    applicationNo: string;
    status: ApplicationStatus;
    firstName: string;
    lastName: string;
    guardianName: string;
    createdAt: TimestampString;
    gradeLevel: {
      id: UUIDString;
      name: string;
    } & GradeLevel_Key;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
  } & Application_Key)[];
}

export interface ListApplicationsVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: ApplicationStatus | null;
  academicYearId?: UUIDString | null;
  limit: number;
  offset: number;
}

export interface ListAssessmentTermsData {
  assessmentTerms: ({
    id: UUIDString;
    name: string;
    academicYearId: UUIDString;
  } & AssessmentTerm_Key)[];
}

export interface ListAssessmentTermsVariables {
  schoolId: UUIDString;
  academicYearId?: UUIDString | null;
}

export interface ListAttendanceDaysData {
  attendanceDays: ({
    id: UUIDString;
    date: DateString;
    locked: boolean;
    marks: ({
      status: AttendanceStatus;
    })[];
  } & AttendanceDay_Key)[];
}

export interface ListAttendanceDaysVariables {
  schoolId: UUIDString;
  classroomId: UUIDString;
  from: DateString;
  to: DateString;
}

export interface ListAttendanceStatusLabelsData {
  attendanceStatusLabels: ({
    status: AttendanceStatus;
    label: string;
  })[];
}

export interface ListAttendanceStatusLabelsVariables {
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

export interface ListClassTeachersData {
  classTeachers: ({
    id: UUIDString;
    classroom: {
      id: UUIDString;
      name: string;
    } & Classroom_Key;
    staff: {
      id: UUIDString;
      employeeId: string;
      firstName: string;
      lastName: string;
      status: StaffStatus;
      userId?: string | null;
    } & StaffProfile_Key;
  } & ClassTeacher_Key)[];
}

export interface ListClassTeachersVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
}

export interface ListClassroomsData {
  classrooms: ({
    id: UUIDString;
    name: string;
    section: string;
    capacity: number;
    gradeLevel: {
      id: UUIDString;
      name: string;
      position: number;
    } & GradeLevel_Key;
  } & Classroom_Key)[];
}

export interface ListClassroomsVariables {
  schoolId: UUIDString;
}

export interface ListConcessionsData {
  concessions: ({
    id: UUIDString;
    name: string;
    kind: ConcessionKind;
    basisPoints?: number | null;
    amountMinor?: Int64String | null;
    createdAt: TimestampString;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    targetItem?: {
      id: UUIDString;
      name: string;
    } & FeeItem_Key;
  } & Concession_Key)[];
}

export interface ListConcessionsVariables {
  schoolId: UUIDString;
  studentId?: UUIDString | null;
  academicYearId?: UUIDString | null;
}

export interface ListExamsData {
  exams: ({
    id: UUIDString;
    title: string;
    examDate: DateString;
    maxTenths: number;
    termId: UUIDString;
    term: {
      id: UUIDString;
      name: string;
      academicYearId: UUIDString;
    } & AssessmentTerm_Key;
    classroom: {
      id: UUIDString;
      name: string;
    } & Classroom_Key;
    subject: {
      id: UUIDString;
      name: string;
      code: string;
    } & Subject_Key;
  } & Exam_Key)[];
}

export interface ListExamsVariables {
  schoolId: UUIDString;
  termId?: UUIDString | null;
  classroomId?: UUIDString | null;
  subjectId?: UUIDString | null;
}

export interface ListFeeStructuresData {
  feeStructures: ({
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    gradeLevel: {
      id: UUIDString;
      name: string;
      position: number;
    } & GradeLevel_Key;
    items: ({
      id: UUIDString;
      name: string;
      instalments: ({
        id: UUIDString;
        sequence: number;
        label?: string | null;
        amountMinor: Int64String;
        dueDate: DateString;
      } & FeeInstalment_Key)[];
    } & FeeItem_Key)[];
  } & FeeStructure_Key)[];
}

export interface ListFeeStructuresVariables {
  schoolId: UUIDString;
  academicYearId?: UUIDString | null;
  gradeLevelId?: UUIDString | null;
}

export interface ListGradeLevelsData {
  gradeLevels: ({
    id: UUIDString;
    name: string;
    position: number;
    classrooms: ({
      id: UUIDString;
      section: string;
      name: string;
      capacity: number;
    } & Classroom_Key)[];
  } & GradeLevel_Key)[];
}

export interface ListGradeLevelsVariables {
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
    title: string;
    amountMinor: Int64String;
    paidMinor: Int64String;
    grossMinor?: Int64String | null;
    discountMinor?: Int64String | null;
    dueDate: DateString;
    status: InvoiceStatus;
    createdAt: TimestampString;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    academicYear?: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
  } & Invoice_Key)[];
}

export interface ListInvoicesVariables {
  schoolId: UUIDString;
  studentId?: UUIDString | null;
  academicYearId?: UUIDString | null;
  status?: InvoiceStatus | null;
  dueOnOrBefore?: DateString | null;
  dueOnOrAfter?: DateString | null;
  limit: number;
  offset: number;
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

export interface ListPayrollRunsData {
  payrollRuns: ({
    id: UUIDString;
    year: number;
    month: number;
    status: PayrollRunStatus;
    createdAt: TimestampString;
    approvedAt?: TimestampString | null;
    paidAt?: TimestampString | null;
    paidOn?: DateString | null;
    paymentReference?: string | null;
    preparedBy: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    approvedBy?: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    paidBy?: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
  } & PayrollRun_Key)[];
}

export interface ListPayrollRunsVariables {
  schoolId: UUIDString;
  limit: number;
  offset: number;
}

export interface ListPeriodsData {
  periods: ({
    id: UUIDString;
    label: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
  } & Period_Key)[];
}

export interface ListPeriodsVariables {
  schoolId: UUIDString;
}

export interface ListReceiptsData {
  receipts: ({
    id: UUIDString;
    number: string;
    serial: number;
    amountMinor: Int64String;
    balanceAfterMinor: Int64String;
    cancelledAt?: TimestampString | null;
    cancelReason?: string | null;
    createdAt: TimestampString;
    academicYear: {
      id: UUIDString;
      name: string;
    } & AcademicYear_Key;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    invoice: {
      id: UUIDString;
      title: string;
    } & Invoice_Key;
    payment: {
      id: UUIDString;
      method: PaymentMethod;
      reference?: string | null;
      paidOn: DateString;
      recordedBy: {
        id: string;
        displayName?: string | null;
        email: string;
      } & User_Key;
    } & Payment_Key;
  } & Receipt_Key)[];
}

export interface ListReceiptsVariables {
  schoolId: UUIDString;
  studentId?: UUIDString | null;
  academicYearId?: UUIDString | null;
  limit: number;
  offset: number;
}

export interface ListSalaryLinesData {
  salaryLines: ({
    id: UUIDString;
    kind: SalaryLineKind;
    name: string;
    amountMinor: Int64String;
  } & SalaryLine_Key)[];
}

export interface ListSalaryLinesVariables {
  schoolId: UUIDString;
  staffId: UUIDString;
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

export interface ListStaffDepartmentsData {
  staffProfiles: ({
    department?: string | null;
  })[];
}

export interface ListStaffDepartmentsVariables {
  schoolId: UUIDString;
}

export interface ListStaffProfilesData {
  staffProfiles: ({
    id: UUIDString;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: string | null;
    designation?: string | null;
    status: StaffStatus;
    userId?: string | null;
  } & StaffProfile_Key)[];
}

export interface ListStaffProfilesVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: StaffStatus | null;
  department?: string | null;
  limit: number;
  offset: number;
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
    serial: number;
    status: StudentStatus;
    gender?: Gender | null;
    dateOfBirth?: DateString | null;
    placements: ({
      academicYear: {
        id: UUIDString;
        name: string;
      } & AcademicYear_Key;
      classroom: {
        id: UUIDString;
        name: string;
      } & Classroom_Key;
    })[];
  } & Student_Key)[];
}

export interface ListStudentsVariables {
  schoolId: UUIDString;
  search?: string | null;
  status?: StudentStatus | null;
  limit: number;
  offset: number;
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

export interface ListTeacherSubjectsData {
  teacherSubjects: ({
    id: UUIDString;
    staff: {
      id: UUIDString;
      employeeId: string;
      firstName: string;
      lastName: string;
      status: StaffStatus;
      userId?: string | null;
    } & StaffProfile_Key;
    subject: {
      id: UUIDString;
      name: string;
      code: string;
    } & Subject_Key;
  } & TeacherSubject_Key)[];
}

export interface ListTeacherSubjectsVariables {
  schoolId: UUIDString;
}

export interface ListTimetableForClassData {
  timetableEntries: ({
    id: UUIDString;
    day: string;
    periodId: UUIDString;
    subject: {
      id: UUIDString;
      name: string;
      code: string;
    } & Subject_Key;
    staff: {
      id: UUIDString;
      employeeId: string;
      firstName: string;
      lastName: string;
    } & StaffProfile_Key;
  } & TimetableEntry_Key)[];
}

export interface ListTimetableForClassVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  classroomId: UUIDString;
}

export interface ListTimetableForStaffData {
  timetableEntries: ({
    id: UUIDString;
    day: string;
    periodId: UUIDString;
    classroom: {
      id: UUIDString;
      name: string;
    } & Classroom_Key;
    subject: {
      id: UUIDString;
      name: string;
      code: string;
    } & Subject_Key;
  } & TimetableEntry_Key)[];
}

export interface ListTimetableForStaffVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  staffId: UUIDString;
}

export interface ListTimetableForYearData {
  timetableEntries: ({
    id: UUIDString;
    day: string;
    periodId: UUIDString;
    classroomId: UUIDString;
    staffId: UUIDString;
    subjectId: UUIDString;
    staff: {
      id: UUIDString;
      employeeId: string;
      firstName: string;
      lastName: string;
      status: StaffStatus;
    } & StaffProfile_Key;
  } & TimetableEntry_Key)[];
}

export interface ListTimetableForYearVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
}

export interface LockAttendanceDayData {
  query?: {
    actor: ({
      userId: string;
    })[];
    day: ({
      id: UUIDString;
    } & AttendanceDay_Key)[];
  };
  attendanceDay_update?: AttendanceDay_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface LockAttendanceDayVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface MarkPayrollRunPaidData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
  };
  payrollRun_update?: PayrollRun_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface MarkPayrollRunPaidVariables {
  schoolId: UUIDString;
  id: UUIDString;
  paidOn: DateString;
  paymentReference?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface Mark_Key {
  id: UUIDString;
  __typename?: 'Mark_Key';
}

export interface MarksOfStudentInTermData {
  marks: ({
    examId: UUIDString;
    tenths: number;
    absent: boolean;
  })[];
}

export interface MarksOfStudentInTermVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  termId: UUIDString;
}

export interface MoveStudentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    room: ({
      id: UUIDString;
    } & Classroom_Key)[];
    placement: ({
      id: UUIDString;
    } & StudentEnrollment_Key)[];
  };
  studentEnrollment_updateMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface MoveStudentVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  academicYearId: UUIDString;
  classroomId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface ParentLink_Key {
  id: UUIDString;
  __typename?: 'ParentLink_Key';
}

export interface ParentLinksOfStudentData {
  parentLinks: ({
    id: UUIDString;
    relationship: string;
    user: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
  } & ParentLink_Key)[];
}

export interface ParentLinksOfStudentVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
}

export interface ParentLinksOfUserData {
  parentLinks: ({
    id: UUIDString;
    relationship: string;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
  } & ParentLink_Key)[];
}

export interface ParentLinksOfUserVariables {
  schoolId: UUIDString;
  userId: string;
}

export interface Payment_Key {
  id: UUIDString;
  __typename?: 'Payment_Key';
}

export interface PaymentsInRangeData {
  payments: ({
    id: UUIDString;
    amountMinor: Int64String;
    method: PaymentMethod;
    reference?: string | null;
    paidOn: DateString;
    reversedAt?: TimestampString | null;
    reversalReason?: string | null;
    createdAt: TimestampString;
    student: {
      id: UUIDString;
      enrollmentId: string;
      firstName: string;
      lastName: string;
    } & Student_Key;
    invoice: {
      id: UUIDString;
      title: string;
    } & Invoice_Key;
    recordedBy: {
      id: string;
      displayName?: string | null;
      email: string;
    } & User_Key;
    receipt?: {
      number: string;
    };
  } & Payment_Key)[];
}

export interface PaymentsInRangeVariables {
  schoolId: UUIDString;
  from: DateString;
  to: DateString;
  limit: number;
  offset: number;
}

export interface PayrollRunSumData {
  payslipLines: ({
    _count: number;
    amountMinor_sum?: Int64String | null;
  })[];
}

export interface PayrollRunSumVariables {
  schoolId: UUIDString;
  runId: UUIDString;
  kind: SalaryLineKind;
}

export interface PayrollRun_Key {
  id: UUIDString;
  __typename?: 'PayrollRun_Key';
}

export interface PayslipLineData {
  payslipLines: ({
    id: UUIDString;
    kind: SalaryLineKind;
    name: string;
    amountMinor: Int64String;
    manual: boolean;
    run: {
      id: UUIDString;
      status: PayrollRunStatus;
    } & PayrollRun_Key;
    payslip: {
      id: UUIDString;
    } & Payslip_Key;
  } & PayslipLine_Key)[];
}

export interface PayslipLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface PayslipLine_Key {
  id: UUIDString;
  __typename?: 'PayslipLine_Key';
}

export interface Payslip_Key {
  id: UUIDString;
  __typename?: 'Payslip_Key';
}

export interface Period_Key {
  id: UUIDString;
  __typename?: 'Period_Key';
}

export interface PlaceStudentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
    room: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  studentEnrollment_insert: StudentEnrollment_Key;
  auditLog_insert: AuditLog_Key;
}

export interface PlaceStudentVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  academicYearId: UUIDString;
  classroomId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface PlacedStudentsData {
  studentEnrollments: ({
    studentId: UUIDString;
    classroom: {
      id: UUIDString;
      gradeLevelId: UUIDString;
    } & Classroom_Key;
  })[];
}

export interface PlacedStudentsVariables {
  schoolId: UUIDString;
  academicYearId: UUIDString;
  gradeLevelId?: UUIDString | null;
  classroomId?: UUIDString | null;
  limit: number;
  offset: number;
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
  level1: GradeLevel_Key;
  level2: GradeLevel_Key;
  level3: GradeLevel_Key;
  level4: GradeLevel_Key;
  level5: GradeLevel_Key;
  level6: GradeLevel_Key;
  level7: GradeLevel_Key;
  level8: GradeLevel_Key;
  level9: GradeLevel_Key;
  level10: GradeLevel_Key;
  level11: GradeLevel_Key;
  level12: GradeLevel_Key;
  level13: GradeLevel_Key;
  level14: GradeLevel_Key;
  level15: GradeLevel_Key;
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

export interface Receipt_Key {
  id: UUIDString;
  __typename?: 'Receipt_Key';
}

export interface RecordPaymentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    invoice: ({
      id: UUIDString;
    } & Invoice_Key)[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  academicYear_update?: AcademicYear_Key | null;
  invoice_update?: Invoice_Key | null;
  payment_insert: Payment_Key;
  receipt_insert: Receipt_Key;
  auditLog_insert: AuditLog_Key;
}

export interface RecordPaymentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  receiptId: UUIDString;
  invoiceId: UUIDString;
  studentId: UUIDString;
  amountMinor: Int64String;
  method: PaymentMethod;
  reference?: string | null;
  paidOn: DateString;
  expectedPaidMinor: Int64String;
  newPaidMinor: Int64String;
  newStatus: InvoiceStatus;
  balanceAfterMinor: Int64String;
  receiptYearId: UUIDString;
  expectedReceiptSeq: number;
  receiptNumber: string;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveAttendanceMarkData {
  query?: {
    actor: ({
      userId: string;
    })[];
    day: ({
      id: UUIDString;
    } & AttendanceDay_Key)[];
    mark: ({
      id: UUIDString;
    } & AttendanceMark_Key)[];
  };
  attendanceMark_delete?: AttendanceMark_Key | null;
}

export interface RemoveAttendanceMarkVariables {
  schoolId: UUIDString;
  id: UUIDString;
  dayId: UUIDString;
  lockedOk: boolean[];
  actorId: string;
}

export interface RemoveClassTeacherData {
  query?: {
    actor: ({
      userId: string;
    })[];
    link: ({
      id: UUIDString;
    } & ClassTeacher_Key)[];
  };
  classTeacher_delete?: ClassTeacher_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveClassTeacherVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveGuardianData {
  query?: {
    actor: ({
      userId: string;
    })[];
    guardian: ({
      id: UUIDString;
    } & Guardian_Key)[];
  };
  guardian_delete?: Guardian_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveGuardianVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveMarkData {
  query?: {
    actor: ({
      userId: string;
    })[];
    mark: ({
      id: UUIDString;
    } & Mark_Key)[];
  };
  mark_delete?: Mark_Key | null;
}

export interface RemoveMarkVariables {
  schoolId: UUIDString;
  id: UUIDString;
  examId: UUIDString;
  actorId: string;
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

export interface RemovePayslipLineData {
  query?: {
    actor: ({
      userId: string;
    })[];
    run: ({
      id: UUIDString;
    } & PayrollRun_Key)[];
    line: ({
      id: UUIDString;
    } & PayslipLine_Key)[];
  };
  payslipLine_delete?: PayslipLine_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemovePayslipLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
  runId: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveSalaryLineData {
  query?: {
    actor: ({
      userId: string;
    })[];
    line: ({
      id: UUIDString;
    } & SalaryLine_Key)[];
  };
  salaryLine_delete?: SalaryLine_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveSalaryLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveStaffDocumentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    doc: ({
      id: UUIDString;
    } & StaffDocument_Key)[];
  };
  staffDocument_delete?: StaffDocument_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveStaffDocumentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveStudentDocumentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    doc: ({
      id: UUIDString;
    } & StudentDocument_Key)[];
  };
  studentDocument_delete?: StudentDocument_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveStudentDocumentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface RemoveTeacherSubjectData {
  query?: {
    actor: ({
      userId: string;
    })[];
    link: ({
      id: UUIDString;
    } & TeacherSubject_Key)[];
  };
  teacherSubject_delete?: TeacherSubject_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface RemoveTeacherSubjectVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface ReversePaymentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    payment: ({
      id: UUIDString;
    } & Payment_Key)[];
    invoice: ({
      id: UUIDString;
    } & Invoice_Key)[];
  };
  invoice_update?: Invoice_Key | null;
  payment_update?: Payment_Key | null;
  receipt_updateMany: number;
  auditLog_insert: AuditLog_Key;
}

export interface ReversePaymentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  invoiceId: UUIDString;
  reason: string;
  expectedPaidMinor: Int64String;
  newPaidMinor: Int64String;
  newStatus: InvoiceStatus;
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

export interface SalaryLineByIdData {
  salaryLines: ({
    id: UUIDString;
    kind: SalaryLineKind;
    name: string;
    amountMinor: Int64String;
    staff: {
      id: UUIDString;
    } & StaffProfile_Key;
  } & SalaryLine_Key)[];
}

export interface SalaryLineByIdVariables {
  schoolId: UUIDString;
  id: UUIDString;
}

export interface SalaryLine_Key {
  id: UUIDString;
  __typename?: 'SalaryLine_Key';
}

export interface SaveAttendanceMarkData {
  query?: {
    actor: ({
      userId: string;
    })[];
    day: ({
      id: UUIDString;
    } & AttendanceDay_Key)[];
    placed: ({
      id: UUIDString;
    } & StudentEnrollment_Key)[];
  };
  attendanceMark_upsert: AttendanceMark_Key;
}

export interface SaveAttendanceMarkVariables {
  schoolId: UUIDString;
  id: UUIDString;
  dayId: UUIDString;
  studentId: UUIDString;
  classroomId: UUIDString;
  academicYearId: UUIDString;
  status: AttendanceStatus;
  note?: string | null;
  lockedOk: boolean[];
  actorId: string;
}

export interface SaveMarkData {
  query?: {
    actor: ({
      userId: string;
    })[];
    exam: ({
      id: UUIDString;
    } & Exam_Key)[];
    placed: ({
      id: UUIDString;
    } & StudentEnrollment_Key)[];
  };
  mark_upsert: Mark_Key;
}

export interface SaveMarkVariables {
  schoolId: UUIDString;
  id: UUIDString;
  examId: UUIDString;
  studentId: UUIDString;
  classroomId: UUIDString;
  academicYearId: UUIDString;
  tenths: number;
  absent: boolean;
  actorId: string;
}

export interface SchoolGradeBandsData {
  school?: {
    gradeBands: string;
  };
}

export interface SchoolGradeBandsVariables {
  schoolId: UUIDString;
}

export interface SchoolMember_Key {
  schoolId: UUIDString;
  userId: string;
  __typename?: 'SchoolMember_Key';
}

export interface SchoolSeqData {
  school?: {
    id: UUIDString;
    studentSeq: number;
    enrollmentPrefix: string;
  } & School_Key;
}

export interface SchoolSeqVariables {
  schoolId: UUIDString;
}

export interface SchoolWorkingDaysData {
  school?: {
    id: UUIDString;
    workingDays: string;
  } & School_Key;
}

export interface SchoolWorkingDaysVariables {
  schoolId: UUIDString;
}

export interface School_Key {
  id: UUIDString;
  __typename?: 'School_Key';
}

export interface SetAttendanceStatusLabelData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  attendanceStatusLabel_upsert: AttendanceStatusLabel_Key;
  auditLog_insert: AuditLog_Key;
}

export interface SetAttendanceStatusLabelVariables {
  schoolId: UUIDString;
  id: UUIDString;
  status: AttendanceStatus;
  label: string;
  actorId: string;
  details?: unknown | null;
}

export interface SetGradeBandsData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetGradeBandsVariables {
  schoolId: UUIDString;
  bands: string;
  actorId: string;
  details?: unknown | null;
}

export interface SetSchoolLogoData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetSchoolLogoVariables {
  schoolId: UUIDString;
  logoKey: string;
  actorId: string;
  details?: unknown | null;
}

export interface SetStaffPhotoData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  staffProfile_update?: StaffProfile_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetStaffPhotoVariables {
  schoolId: UUIDString;
  id: UUIDString;
  photoKey: string;
  actorId: string;
  details?: unknown | null;
}

export interface SetStudentPhotoData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  student_update?: Student_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetStudentPhotoVariables {
  schoolId: UUIDString;
  studentId: UUIDString;
  photoKey: string;
  actorId: string;
  details?: unknown | null;
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

export interface SetWorkingDaysData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface SetWorkingDaysVariables {
  schoolId: UUIDString;
  workingDays: string;
  actorId: string;
  details?: unknown | null;
}

export interface StaffAttendanceOfStaffData {
  staffAttendances: ({
    date: DateString;
    checkIn?: TimestampString | null;
    checkOut?: TimestampString | null;
  })[];
}

export interface StaffAttendanceOfStaffVariables {
  schoolId: UUIDString;
  staffId: UUIDString;
  from: DateString;
  to: DateString;
}

export interface StaffAttendanceOnData {
  staffAttendances: ({
    staffId: UUIDString;
    checkIn?: TimestampString | null;
    checkOut?: TimestampString | null;
  })[];
}

export interface StaffAttendanceOnVariables {
  schoolId: UUIDString;
  date: DateString;
}

export interface StaffAttendance_Key {
  id: UUIDString;
  __typename?: 'StaffAttendance_Key';
}

export interface StaffDocument_Key {
  id: UUIDString;
  __typename?: 'StaffDocument_Key';
}

export interface StaffForPayrollData {
  staffProfiles: ({
    id: UUIDString;
    employeeId: string;
    firstName: string;
    lastName: string;
    lines: ({
      kind: SalaryLineKind;
      name: string;
      amountMinor: Int64String;
    })[];
  } & StaffProfile_Key)[];
}

export interface StaffForPayrollVariables {
  schoolId: UUIDString;
  limit: number;
  offset: number;
}

export interface StaffIdentitiesData {
  staffProfiles: ({
    firstName: string;
    lastName: string;
    dateOfBirth?: DateString | null;
  })[];
}

export interface StaffIdentitiesVariables {
  schoolId: UUIDString;
  limit: number;
  offset: number;
}

export interface StaffOfUserData {
  staffProfiles: ({
    id: UUIDString;
    employeeId: string;
    firstName: string;
    lastName: string;
    status: StaffStatus;
  } & StaffProfile_Key)[];
}

export interface StaffOfUserVariables {
  schoolId: UUIDString;
  userId: string;
}

export interface StaffProfile_Key {
  id: UUIDString;
  __typename?: 'StaffProfile_Key';
}

export interface StaffSeqInfoData {
  school?: {
    id: UUIDString;
    staffSeq: number;
  } & School_Key;
}

export interface StaffSeqInfoVariables {
  schoolId: UUIDString;
}

export interface StartImportBatchData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  importBatch_insert: ImportBatch_Key;
  auditLog_insert: AuditLog_Key;
}

export interface StartImportBatchVariables {
  schoolId: UUIDString;
  id: UUIDString;
  kind: string;
  fileHash: string;
  rowCount: number;
  actorId: string;
  details?: unknown | null;
}

export interface StudentDocument_Key {
  id: UUIDString;
  __typename?: 'StudentDocument_Key';
}

export interface StudentEnrollment_Key {
  id: UUIDString;
  __typename?: 'StudentEnrollment_Key';
}

export interface StudentIdentitiesData {
  students: ({
    firstName: string;
    lastName: string;
    dateOfBirth?: DateString | null;
  })[];
}

export interface StudentIdentitiesVariables {
  schoolId: UUIDString;
  limit: number;
  offset: number;
}

export interface Student_Key {
  id: UUIDString;
  __typename?: 'Student_Key';
}

export interface StudentsByEnrollmentIdsData {
  students: ({
    id: UUIDString;
    enrollmentId: string;
    firstName: string;
    lastName: string;
  } & Student_Key)[];
}

export interface StudentsByEnrollmentIdsVariables {
  schoolId: UUIDString;
  ids: string[];
}

export interface Subject_Key {
  id: UUIDString;
  __typename?: 'Subject_Key';
}

export interface TeacherSubject_Key {
  id: UUIDString;
  __typename?: 'TeacherSubject_Key';
}

export interface TimetableEntry_Key {
  id: UUIDString;
  __typename?: 'TimetableEntry_Key';
}

export interface UnlinkParentAccountData {
  query?: {
    actor: ({
      userId: string;
    })[];
    link: ({
      id: UUIDString;
    } & ParentLink_Key)[];
  };
  parentLink_delete?: ParentLink_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UnlinkParentAccountVariables {
  schoolId: UUIDString;
  id: UUIDString;
  actorId: string;
  details?: unknown | null;
}

export interface UnpaidTotalsData {
  invoices: ({
    _count: number;
    amountMinor_sum?: Int64String | null;
    paidMinor_sum?: Int64String | null;
  })[];
}

export interface UnpaidTotalsVariables {
  schoolId: UUIDString;
  dueOnOrBefore?: DateString | null;
  dueOnOrAfter?: DateString | null;
}

export interface UpdateAcademicYearData {
  query?: {
    actor: ({
      userId: string;
    })[];
    year: ({
      id: UUIDString;
    } & AcademicYear_Key)[];
  };
  academicYear_update?: AcademicYear_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateAcademicYearVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  startDate?: DateString | null;
  endDate?: DateString | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateApplicationData {
  query?: {
    actor: ({
      userId: string;
    })[];
    app: ({
      id: UUIDString;
    } & Application_Key)[];
  };
  application_update?: Application_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateApplicationVariables {
  schoolId: UUIDString;
  id: UUIDString;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  address?: string | null;
  gradeLevelId?: UUIDString | null;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  previousSchool?: string | null;
  notes?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateAssessmentTermData {
  query?: {
    actor: ({
      userId: string;
    })[];
    term: ({
      id: UUIDString;
    } & AssessmentTerm_Key)[];
  };
  assessmentTerm_update?: AssessmentTerm_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateAssessmentTermVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name: string;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateClassroomData {
  query?: {
    actor: ({
      userId: string;
    })[];
    room: ({
      id: UUIDString;
    } & Classroom_Key)[];
  };
  classroom_update?: Classroom_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateClassroomVariables {
  schoolId: UUIDString;
  id: UUIDString;
  section?: string | null;
  name?: string | null;
  capacity?: number | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateExamData {
  query?: {
    actor: ({
      userId: string;
    })[];
    exam: ({
      id: UUIDString;
    } & Exam_Key)[];
    above: ({
      id: UUIDString;
    } & Mark_Key)[];
  };
  exam_update?: Exam_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateExamVariables {
  schoolId: UUIDString;
  id: UUIDString;
  title: string;
  examDate: DateString;
  maxTenths: number;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateFeeInstalmentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    inst: ({
      id: UUIDString;
    } & FeeInstalment_Key)[];
  };
  feeInstalment_update?: FeeInstalment_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateFeeInstalmentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  label?: string | null;
  amountMinor?: Int64String | null;
  dueDate?: DateString | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateFeeItemData {
  query?: {
    actor: ({
      userId: string;
    })[];
    item: ({
      id: UUIDString;
    } & FeeItem_Key)[];
  };
  feeItem_update?: FeeItem_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateFeeItemVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateFeeStructureData {
  query?: {
    actor: ({
      userId: string;
    })[];
    structure: ({
      id: UUIDString;
    } & FeeStructure_Key)[];
  };
  feeStructure_update?: FeeStructure_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateFeeStructureVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateGradeLevelData {
  query?: {
    actor: ({
      userId: string;
    })[];
    level: ({
      id: UUIDString;
    } & GradeLevel_Key)[];
  };
  gradeLevel_update?: GradeLevel_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateGradeLevelVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  position?: number | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateGuardianData {
  query?: {
    actor: ({
      userId: string;
    })[];
    guardian: ({
      id: UUIDString;
    } & Guardian_Key)[];
  };
  guardian_update?: Guardian_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateGuardianVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean | null;
  actorId: string;
  details?: unknown | null;
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

export interface UpdatePeriodData {
  query?: {
    actor: ({
      userId: string;
    })[];
    period: ({
      id: UUIDString;
    } & Period_Key)[];
  };
  period_update?: Period_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdatePeriodVariables {
  schoolId: UUIDString;
  id: UUIDString;
  label?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isBreak?: boolean | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateSalaryLineData {
  query?: {
    actor: ({
      userId: string;
    })[];
    line: ({
      id: UUIDString;
    } & SalaryLine_Key)[];
  };
  salaryLine_update?: SalaryLine_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateSalaryLineVariables {
  schoolId: UUIDString;
  id: UUIDString;
  kind?: SalaryLineKind | null;
  name?: string | null;
  amountMinor?: Int64String | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateSchoolData {
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateSchoolProfileData {
  query?: {
    actor: ({
      userId: string;
    })[];
  };
  school_update?: School_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateSchoolProfileVariables {
  schoolId: UUIDString;
  name?: string | null;
  address?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  primaryColor?: string | null;
  defaultLanguage?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateSchoolVariables {
  schoolId: UUIDString;
  name: string;
  defaultLanguage: string;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateStaffData {
  query?: {
    actor: ({
      userId: string;
    })[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
  };
  staffProfile_update?: StaffProfile_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateStaffVariables {
  schoolId: UUIDString;
  id: UUIDString;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  dateOfJoining?: DateString | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status?: StaffStatus | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateStudentData {
  query?: {
    actor: ({
      userId: string;
    })[];
    student: ({
      id: UUIDString;
    } & Student_Key)[];
  };
  student_update?: Student_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateStudentVariables {
  schoolId: UUIDString;
  id: UUIDString;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: DateString | null;
  gender?: Gender | null;
  admissionDate?: DateString | null;
  address?: string | null;
  status?: StudentStatus | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateSubjectData {
  query?: {
    actor: ({
      userId: string;
    })[];
    subject: ({
      id: UUIDString;
    } & Subject_Key)[];
  };
  subject_update?: Subject_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateSubjectVariables {
  schoolId: UUIDString;
  id: UUIDString;
  name?: string | null;
  code?: string | null;
  actorId: string;
  details?: unknown | null;
}

export interface UpdateTimetableEntryData {
  query?: {
    actor: ({
      userId: string;
    })[];
    entry: ({
      id: UUIDString;
    } & TimetableEntry_Key)[];
    staff: ({
      id: UUIDString;
    } & StaffProfile_Key)[];
    teaches: ({
      id: UUIDString;
    } & TeacherSubject_Key)[];
  };
  timetableEntry_update?: TimetableEntry_Key | null;
  auditLog_insert: AuditLog_Key;
}

export interface UpdateTimetableEntryVariables {
  schoolId: UUIDString;
  id: UUIDString;
  subjectId: UUIDString;
  staffId: UUIDString;
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

/** Generated Node Admin SDK operation action function for the 'CreateSchool' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchool(dc: DataConnect, vars: CreateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchool' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchool(vars: CreateSchoolVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolData>>;

/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to execute without passing in DataConnect. */
export function createUser(dc: DataConnect, vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;
/** Generated Node Admin SDK operation action function for the 'CreateUser' Mutation. Allow users to pass in custom DataConnect instances. */
export function createUser(vars: CreateUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateUserData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSchoolMember' Mutation. Allow users to execute without passing in DataConnect. */
export function createSchoolMember(dc: DataConnect, vars: CreateSchoolMemberVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolMemberData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSchoolMember' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSchoolMember(vars: CreateSchoolMemberVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSchoolMemberData>>;

/** Generated Node Admin SDK operation action function for the 'CreateLeaveRequest' Mutation. Allow users to execute without passing in DataConnect. */
export function createLeaveRequest(dc: DataConnect, vars: CreateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateLeaveRequestData>>;
/** Generated Node Admin SDK operation action function for the 'CreateLeaveRequest' Mutation. Allow users to pass in custom DataConnect instances. */
export function createLeaveRequest(vars: CreateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateLeaveRequestData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateLeaveRequest' Mutation. Allow users to execute without passing in DataConnect. */
export function updateLeaveRequest(dc: DataConnect, vars: UpdateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLeaveRequestData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateLeaveRequest' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateLeaveRequest(vars: UpdateLeaveRequestVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateLeaveRequestData>>;

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

/** Generated Node Admin SDK operation action function for the 'UpdateSchoolProfile' Mutation. Allow users to execute without passing in DataConnect. */
export function updateSchoolProfile(dc: DataConnect, vars: UpdateSchoolProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSchoolProfileData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateSchoolProfile' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateSchoolProfile(vars: UpdateSchoolProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSchoolProfileData>>;

/** Generated Node Admin SDK operation action function for the 'SetSchoolLogo' Mutation. Allow users to execute without passing in DataConnect. */
export function setSchoolLogo(dc: DataConnect, vars: SetSchoolLogoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetSchoolLogoData>>;
/** Generated Node Admin SDK operation action function for the 'SetSchoolLogo' Mutation. Allow users to pass in custom DataConnect instances. */
export function setSchoolLogo(vars: SetSchoolLogoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetSchoolLogoData>>;

/** Generated Node Admin SDK operation action function for the 'CreateGradeLevel' Mutation. Allow users to execute without passing in DataConnect. */
export function createGradeLevel(dc: DataConnect, vars: CreateGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGradeLevelData>>;
/** Generated Node Admin SDK operation action function for the 'CreateGradeLevel' Mutation. Allow users to pass in custom DataConnect instances. */
export function createGradeLevel(vars: CreateGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateGradeLevelData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateGradeLevel' Mutation. Allow users to execute without passing in DataConnect. */
export function updateGradeLevel(dc: DataConnect, vars: UpdateGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateGradeLevelData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateGradeLevel' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateGradeLevel(vars: UpdateGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateGradeLevelData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteGradeLevel' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteGradeLevel(dc: DataConnect, vars: DeleteGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteGradeLevelData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteGradeLevel' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteGradeLevel(vars: DeleteGradeLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteGradeLevelData>>;

/** Generated Node Admin SDK operation action function for the 'CreateClassroom' Mutation. Allow users to execute without passing in DataConnect. */
export function createClassroom(dc: DataConnect, vars: CreateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateClassroomData>>;
/** Generated Node Admin SDK operation action function for the 'CreateClassroom' Mutation. Allow users to pass in custom DataConnect instances. */
export function createClassroom(vars: CreateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateClassroomData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateClassroom' Mutation. Allow users to execute without passing in DataConnect. */
export function updateClassroom(dc: DataConnect, vars: UpdateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateClassroomData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateClassroom' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateClassroom(vars: UpdateClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateClassroomData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteClassroom' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteClassroom(dc: DataConnect, vars: DeleteClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteClassroomData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteClassroom' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteClassroom(vars: DeleteClassroomVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteClassroomData>>;

/** Generated Node Admin SDK operation action function for the 'CreateSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function createSubject(dc: DataConnect, vars: CreateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'CreateSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function createSubject(vars: CreateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function updateSubject(dc: DataConnect, vars: UpdateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateSubject(vars: UpdateSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteSubject(dc: DataConnect, vars: DeleteSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteSubject(vars: DeleteSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'CreateAcademicYear' Mutation. Allow users to execute without passing in DataConnect. */
export function createAcademicYear(dc: DataConnect, vars: CreateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAcademicYearData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAcademicYear' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAcademicYear(vars: CreateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAcademicYearData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateAcademicYear' Mutation. Allow users to execute without passing in DataConnect. */
export function updateAcademicYear(dc: DataConnect, vars: UpdateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAcademicYearData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateAcademicYear' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateAcademicYear(vars: UpdateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAcademicYearData>>;

/** Generated Node Admin SDK operation action function for the 'ActivateAcademicYear' Mutation. Allow users to execute without passing in DataConnect. */
export function activateAcademicYear(dc: DataConnect, vars: ActivateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ActivateAcademicYearData>>;
/** Generated Node Admin SDK operation action function for the 'ActivateAcademicYear' Mutation. Allow users to pass in custom DataConnect instances. */
export function activateAcademicYear(vars: ActivateAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ActivateAcademicYearData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteAcademicYear' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteAcademicYear(dc: DataConnect, vars: DeleteAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAcademicYearData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteAcademicYear' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteAcademicYear(vars: DeleteAcademicYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAcademicYearData>>;

/** Generated Node Admin SDK operation action function for the 'CreateStudent' Mutation. Allow users to execute without passing in DataConnect. */
export function createStudent(dc: DataConnect, vars: CreateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStudentData>>;
/** Generated Node Admin SDK operation action function for the 'CreateStudent' Mutation. Allow users to pass in custom DataConnect instances. */
export function createStudent(vars: CreateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStudentData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateStudent' Mutation. Allow users to execute without passing in DataConnect. */
export function updateStudent(dc: DataConnect, vars: UpdateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStudentData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateStudent' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateStudent(vars: UpdateStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStudentData>>;

/** Generated Node Admin SDK operation action function for the 'PlaceStudent' Mutation. Allow users to execute without passing in DataConnect. */
export function placeStudent(dc: DataConnect, vars: PlaceStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PlaceStudentData>>;
/** Generated Node Admin SDK operation action function for the 'PlaceStudent' Mutation. Allow users to pass in custom DataConnect instances. */
export function placeStudent(vars: PlaceStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PlaceStudentData>>;

/** Generated Node Admin SDK operation action function for the 'MoveStudent' Mutation. Allow users to execute without passing in DataConnect. */
export function moveStudent(dc: DataConnect, vars: MoveStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MoveStudentData>>;
/** Generated Node Admin SDK operation action function for the 'MoveStudent' Mutation. Allow users to pass in custom DataConnect instances. */
export function moveStudent(vars: MoveStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MoveStudentData>>;

/** Generated Node Admin SDK operation action function for the 'AddGuardian' Mutation. Allow users to execute without passing in DataConnect. */
export function addGuardian(dc: DataConnect, vars: AddGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddGuardianData>>;
/** Generated Node Admin SDK operation action function for the 'AddGuardian' Mutation. Allow users to pass in custom DataConnect instances. */
export function addGuardian(vars: AddGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddGuardianData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateGuardian' Mutation. Allow users to execute without passing in DataConnect. */
export function updateGuardian(dc: DataConnect, vars: UpdateGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateGuardianData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateGuardian' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateGuardian(vars: UpdateGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateGuardianData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveGuardian' Mutation. Allow users to execute without passing in DataConnect. */
export function removeGuardian(dc: DataConnect, vars: RemoveGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveGuardianData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveGuardian' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeGuardian(vars: RemoveGuardianVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveGuardianData>>;

/** Generated Node Admin SDK operation action function for the 'SetStudentPhoto' Mutation. Allow users to execute without passing in DataConnect. */
export function setStudentPhoto(dc: DataConnect, vars: SetStudentPhotoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetStudentPhotoData>>;
/** Generated Node Admin SDK operation action function for the 'SetStudentPhoto' Mutation. Allow users to pass in custom DataConnect instances. */
export function setStudentPhoto(vars: SetStudentPhotoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetStudentPhotoData>>;

/** Generated Node Admin SDK operation action function for the 'AddStudentDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function addStudentDocument(dc: DataConnect, vars: AddStudentDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddStudentDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'AddStudentDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function addStudentDocument(vars: AddStudentDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddStudentDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveStudentDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function removeStudentDocument(dc: DataConnect, vars: RemoveStudentDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveStudentDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveStudentDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeStudentDocument(vars: RemoveStudentDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveStudentDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'CreateStaff' Mutation. Allow users to execute without passing in DataConnect. */
export function createStaff(dc: DataConnect, vars: CreateStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStaffData>>;
/** Generated Node Admin SDK operation action function for the 'CreateStaff' Mutation. Allow users to pass in custom DataConnect instances. */
export function createStaff(vars: CreateStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStaffData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateStaff' Mutation. Allow users to execute without passing in DataConnect. */
export function updateStaff(dc: DataConnect, vars: UpdateStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStaffData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateStaff' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateStaff(vars: UpdateStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateStaffData>>;

/** Generated Node Admin SDK operation action function for the 'LinkStaffAccount' Mutation. Allow users to execute without passing in DataConnect. */
export function linkStaffAccount(dc: DataConnect, vars: LinkStaffAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LinkStaffAccountData>>;
/** Generated Node Admin SDK operation action function for the 'LinkStaffAccount' Mutation. Allow users to pass in custom DataConnect instances. */
export function linkStaffAccount(vars: LinkStaffAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LinkStaffAccountData>>;

/** Generated Node Admin SDK operation action function for the 'SetStaffPhoto' Mutation. Allow users to execute without passing in DataConnect. */
export function setStaffPhoto(dc: DataConnect, vars: SetStaffPhotoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetStaffPhotoData>>;
/** Generated Node Admin SDK operation action function for the 'SetStaffPhoto' Mutation. Allow users to pass in custom DataConnect instances. */
export function setStaffPhoto(vars: SetStaffPhotoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetStaffPhotoData>>;

/** Generated Node Admin SDK operation action function for the 'AddStaffDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function addStaffDocument(dc: DataConnect, vars: AddStaffDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddStaffDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'AddStaffDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function addStaffDocument(vars: AddStaffDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddStaffDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveStaffDocument' Mutation. Allow users to execute without passing in DataConnect. */
export function removeStaffDocument(dc: DataConnect, vars: RemoveStaffDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveStaffDocumentData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveStaffDocument' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeStaffDocument(vars: RemoveStaffDocumentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveStaffDocumentData>>;

/** Generated Node Admin SDK operation action function for the 'CreateApplication' Mutation. Allow users to execute without passing in DataConnect. */
export function createApplication(dc: DataConnect, vars: CreateApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateApplicationData>>;
/** Generated Node Admin SDK operation action function for the 'CreateApplication' Mutation. Allow users to pass in custom DataConnect instances. */
export function createApplication(vars: CreateApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateApplicationData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateApplication' Mutation. Allow users to execute without passing in DataConnect. */
export function updateApplication(dc: DataConnect, vars: UpdateApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateApplicationData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateApplication' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateApplication(vars: UpdateApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateApplicationData>>;

/** Generated Node Admin SDK operation action function for the 'DecideApplication' Mutation. Allow users to execute without passing in DataConnect. */
export function decideApplication(dc: DataConnect, vars: DecideApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DecideApplicationData>>;
/** Generated Node Admin SDK operation action function for the 'DecideApplication' Mutation. Allow users to pass in custom DataConnect instances. */
export function decideApplication(vars: DecideApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DecideApplicationData>>;

/** Generated Node Admin SDK operation action function for the 'AdmitApplication' Mutation. Allow users to execute without passing in DataConnect. */
export function admitApplication(dc: DataConnect, vars: AdmitApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdmitApplicationData>>;
/** Generated Node Admin SDK operation action function for the 'AdmitApplication' Mutation. Allow users to pass in custom DataConnect instances. */
export function admitApplication(vars: AdmitApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdmitApplicationData>>;

/** Generated Node Admin SDK operation action function for the 'CreateFeeStructure' Mutation. Allow users to execute without passing in DataConnect. */
export function createFeeStructure(dc: DataConnect, vars: CreateFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFeeStructureData>>;
/** Generated Node Admin SDK operation action function for the 'CreateFeeStructure' Mutation. Allow users to pass in custom DataConnect instances. */
export function createFeeStructure(vars: CreateFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFeeStructureData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateFeeStructure' Mutation. Allow users to execute without passing in DataConnect. */
export function updateFeeStructure(dc: DataConnect, vars: UpdateFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeStructureData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateFeeStructure' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateFeeStructure(vars: UpdateFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeStructureData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteFeeStructure' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteFeeStructure(dc: DataConnect, vars: DeleteFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeStructureData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteFeeStructure' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteFeeStructure(vars: DeleteFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeStructureData>>;

/** Generated Node Admin SDK operation action function for the 'CreateFeeItem' Mutation. Allow users to execute without passing in DataConnect. */
export function createFeeItem(dc: DataConnect, vars: CreateFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFeeItemData>>;
/** Generated Node Admin SDK operation action function for the 'CreateFeeItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function createFeeItem(vars: CreateFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFeeItemData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateFeeItem' Mutation. Allow users to execute without passing in DataConnect. */
export function updateFeeItem(dc: DataConnect, vars: UpdateFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeItemData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateFeeItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateFeeItem(vars: UpdateFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeItemData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteFeeItem' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteFeeItem(dc: DataConnect, vars: DeleteFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeItemData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteFeeItem' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteFeeItem(vars: DeleteFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeItemData>>;

/** Generated Node Admin SDK operation action function for the 'AddFeeInstalment' Mutation. Allow users to execute without passing in DataConnect. */
export function addFeeInstalment(dc: DataConnect, vars: AddFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddFeeInstalmentData>>;
/** Generated Node Admin SDK operation action function for the 'AddFeeInstalment' Mutation. Allow users to pass in custom DataConnect instances. */
export function addFeeInstalment(vars: AddFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddFeeInstalmentData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateFeeInstalment' Mutation. Allow users to execute without passing in DataConnect. */
export function updateFeeInstalment(dc: DataConnect, vars: UpdateFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeInstalmentData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateFeeInstalment' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateFeeInstalment(vars: UpdateFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateFeeInstalmentData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteFeeInstalment' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteFeeInstalment(dc: DataConnect, vars: DeleteFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeInstalmentData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteFeeInstalment' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteFeeInstalment(vars: DeleteFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteFeeInstalmentData>>;

/** Generated Node Admin SDK operation action function for the 'CreateConcession' Mutation. Allow users to execute without passing in DataConnect. */
export function createConcession(dc: DataConnect, vars: CreateConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateConcessionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateConcession' Mutation. Allow users to pass in custom DataConnect instances. */
export function createConcession(vars: CreateConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateConcessionData>>;

/** Generated Node Admin SDK operation action function for the 'CreateItemConcession' Mutation. Allow users to execute without passing in DataConnect. */
export function createItemConcession(dc: DataConnect, vars: CreateItemConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateItemConcessionData>>;
/** Generated Node Admin SDK operation action function for the 'CreateItemConcession' Mutation. Allow users to pass in custom DataConnect instances. */
export function createItemConcession(vars: CreateItemConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateItemConcessionData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteConcession' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteConcession(dc: DataConnect, vars: DeleteConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteConcessionData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteConcession' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteConcession(vars: DeleteConcessionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteConcessionData>>;

/** Generated Node Admin SDK operation action function for the 'StartImportBatch' Mutation. Allow users to execute without passing in DataConnect. */
export function startImportBatch(dc: DataConnect, vars: StartImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StartImportBatchData>>;
/** Generated Node Admin SDK operation action function for the 'StartImportBatch' Mutation. Allow users to pass in custom DataConnect instances. */
export function startImportBatch(vars: StartImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StartImportBatchData>>;

/** Generated Node Admin SDK operation action function for the 'FinishImportBatch' Mutation. Allow users to execute without passing in DataConnect. */
export function finishImportBatch(dc: DataConnect, vars: FinishImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishImportBatchData>>;
/** Generated Node Admin SDK operation action function for the 'FinishImportBatch' Mutation. Allow users to pass in custom DataConnect instances. */
export function finishImportBatch(vars: FinishImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishImportBatchData>>;

/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to execute without passing in DataConnect. */
export function createInvoice(dc: DataConnect, vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'CreateInvoice' Mutation. Allow users to pass in custom DataConnect instances. */
export function createInvoice(vars: CreateInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'CreateInstalmentInvoice' Mutation. Allow users to execute without passing in DataConnect. */
export function createInstalmentInvoice(dc: DataConnect, vars: CreateInstalmentInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInstalmentInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'CreateInstalmentInvoice' Mutation. Allow users to pass in custom DataConnect instances. */
export function createInstalmentInvoice(vars: CreateInstalmentInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateInstalmentInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'RecordPayment' Mutation. Allow users to execute without passing in DataConnect. */
export function recordPayment(dc: DataConnect, vars: RecordPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RecordPaymentData>>;
/** Generated Node Admin SDK operation action function for the 'RecordPayment' Mutation. Allow users to pass in custom DataConnect instances. */
export function recordPayment(vars: RecordPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RecordPaymentData>>;

/** Generated Node Admin SDK operation action function for the 'ReversePayment' Mutation. Allow users to execute without passing in DataConnect. */
export function reversePayment(dc: DataConnect, vars: ReversePaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReversePaymentData>>;
/** Generated Node Admin SDK operation action function for the 'ReversePayment' Mutation. Allow users to pass in custom DataConnect instances. */
export function reversePayment(vars: ReversePaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ReversePaymentData>>;

/** Generated Node Admin SDK operation action function for the 'AddSalaryLine' Mutation. Allow users to execute without passing in DataConnect. */
export function addSalaryLine(dc: DataConnect, vars: AddSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddSalaryLineData>>;
/** Generated Node Admin SDK operation action function for the 'AddSalaryLine' Mutation. Allow users to pass in custom DataConnect instances. */
export function addSalaryLine(vars: AddSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddSalaryLineData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateSalaryLine' Mutation. Allow users to execute without passing in DataConnect. */
export function updateSalaryLine(dc: DataConnect, vars: UpdateSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSalaryLineData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateSalaryLine' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateSalaryLine(vars: UpdateSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateSalaryLineData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveSalaryLine' Mutation. Allow users to execute without passing in DataConnect. */
export function removeSalaryLine(dc: DataConnect, vars: RemoveSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveSalaryLineData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveSalaryLine' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeSalaryLine(vars: RemoveSalaryLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveSalaryLineData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePayrollRun' Mutation. Allow users to execute without passing in DataConnect. */
export function createPayrollRun(dc: DataConnect, vars: CreatePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayrollRunData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePayrollRun' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPayrollRun(vars: CreatePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayrollRunData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePayslip' Mutation. Allow users to execute without passing in DataConnect. */
export function createPayslip(dc: DataConnect, vars: CreatePayslipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayslipData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePayslip' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPayslip(vars: CreatePayslipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePayslipData>>;

/** Generated Node Admin SDK operation action function for the 'AddPayslipLine' Mutation. Allow users to execute without passing in DataConnect. */
export function addPayslipLine(dc: DataConnect, vars: AddPayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddPayslipLineData>>;
/** Generated Node Admin SDK operation action function for the 'AddPayslipLine' Mutation. Allow users to pass in custom DataConnect instances. */
export function addPayslipLine(vars: AddPayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddPayslipLineData>>;

/** Generated Node Admin SDK operation action function for the 'RemovePayslipLine' Mutation. Allow users to execute without passing in DataConnect. */
export function removePayslipLine(dc: DataConnect, vars: RemovePayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemovePayslipLineData>>;
/** Generated Node Admin SDK operation action function for the 'RemovePayslipLine' Mutation. Allow users to pass in custom DataConnect instances. */
export function removePayslipLine(vars: RemovePayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemovePayslipLineData>>;

/** Generated Node Admin SDK operation action function for the 'DeletePayrollRun' Mutation. Allow users to execute without passing in DataConnect. */
export function deletePayrollRun(dc: DataConnect, vars: DeletePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePayrollRunData>>;
/** Generated Node Admin SDK operation action function for the 'DeletePayrollRun' Mutation. Allow users to pass in custom DataConnect instances. */
export function deletePayrollRun(vars: DeletePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePayrollRunData>>;

/** Generated Node Admin SDK operation action function for the 'ApprovePayrollRun' Mutation. Allow users to execute without passing in DataConnect. */
export function approvePayrollRun(dc: DataConnect, vars: ApprovePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApprovePayrollRunData>>;
/** Generated Node Admin SDK operation action function for the 'ApprovePayrollRun' Mutation. Allow users to pass in custom DataConnect instances. */
export function approvePayrollRun(vars: ApprovePayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApprovePayrollRunData>>;

/** Generated Node Admin SDK operation action function for the 'MarkPayrollRunPaid' Mutation. Allow users to execute without passing in DataConnect. */
export function markPayrollRunPaid(dc: DataConnect, vars: MarkPayrollRunPaidVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarkPayrollRunPaidData>>;
/** Generated Node Admin SDK operation action function for the 'MarkPayrollRunPaid' Mutation. Allow users to pass in custom DataConnect instances. */
export function markPayrollRunPaid(vars: MarkPayrollRunPaidVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarkPayrollRunPaidData>>;

/** Generated Node Admin SDK operation action function for the 'CreatePeriod' Mutation. Allow users to execute without passing in DataConnect. */
export function createPeriod(dc: DataConnect, vars: CreatePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePeriodData>>;
/** Generated Node Admin SDK operation action function for the 'CreatePeriod' Mutation. Allow users to pass in custom DataConnect instances. */
export function createPeriod(vars: CreatePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreatePeriodData>>;

/** Generated Node Admin SDK operation action function for the 'UpdatePeriod' Mutation. Allow users to execute without passing in DataConnect. */
export function updatePeriod(dc: DataConnect, vars: UpdatePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdatePeriodData>>;
/** Generated Node Admin SDK operation action function for the 'UpdatePeriod' Mutation. Allow users to pass in custom DataConnect instances. */
export function updatePeriod(vars: UpdatePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdatePeriodData>>;

/** Generated Node Admin SDK operation action function for the 'DeletePeriod' Mutation. Allow users to execute without passing in DataConnect. */
export function deletePeriod(dc: DataConnect, vars: DeletePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePeriodData>>;
/** Generated Node Admin SDK operation action function for the 'DeletePeriod' Mutation. Allow users to pass in custom DataConnect instances. */
export function deletePeriod(vars: DeletePeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeletePeriodData>>;

/** Generated Node Admin SDK operation action function for the 'SetWorkingDays' Mutation. Allow users to execute without passing in DataConnect. */
export function setWorkingDays(dc: DataConnect, vars: SetWorkingDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetWorkingDaysData>>;
/** Generated Node Admin SDK operation action function for the 'SetWorkingDays' Mutation. Allow users to pass in custom DataConnect instances. */
export function setWorkingDays(vars: SetWorkingDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetWorkingDaysData>>;

/** Generated Node Admin SDK operation action function for the 'ApplyStandardSchedule' Mutation. Allow users to execute without passing in DataConnect. */
export function applyStandardSchedule(dc: DataConnect, vars: ApplyStandardScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplyStandardScheduleData>>;
/** Generated Node Admin SDK operation action function for the 'ApplyStandardSchedule' Mutation. Allow users to pass in custom DataConnect instances. */
export function applyStandardSchedule(vars: ApplyStandardScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplyStandardScheduleData>>;

/** Generated Node Admin SDK operation action function for the 'ApplyShortDaySchedule' Mutation. Allow users to execute without passing in DataConnect. */
export function applyShortDaySchedule(dc: DataConnect, vars: ApplyShortDayScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplyShortDayScheduleData>>;
/** Generated Node Admin SDK operation action function for the 'ApplyShortDaySchedule' Mutation. Allow users to pass in custom DataConnect instances. */
export function applyShortDaySchedule(vars: ApplyShortDayScheduleVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplyShortDayScheduleData>>;

/** Generated Node Admin SDK operation action function for the 'AddTeacherSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function addTeacherSubject(dc: DataConnect, vars: AddTeacherSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddTeacherSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'AddTeacherSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function addTeacherSubject(vars: AddTeacherSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddTeacherSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveTeacherSubject' Mutation. Allow users to execute without passing in DataConnect. */
export function removeTeacherSubject(dc: DataConnect, vars: RemoveTeacherSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveTeacherSubjectData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveTeacherSubject' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeTeacherSubject(vars: RemoveTeacherSubjectVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveTeacherSubjectData>>;

/** Generated Node Admin SDK operation action function for the 'AssignClassTeacher' Mutation. Allow users to execute without passing in DataConnect. */
export function assignClassTeacher(dc: DataConnect, vars: AssignClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AssignClassTeacherData>>;
/** Generated Node Admin SDK operation action function for the 'AssignClassTeacher' Mutation. Allow users to pass in custom DataConnect instances. */
export function assignClassTeacher(vars: AssignClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AssignClassTeacherData>>;

/** Generated Node Admin SDK operation action function for the 'ChangeClassTeacher' Mutation. Allow users to execute without passing in DataConnect. */
export function changeClassTeacher(dc: DataConnect, vars: ChangeClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ChangeClassTeacherData>>;
/** Generated Node Admin SDK operation action function for the 'ChangeClassTeacher' Mutation. Allow users to pass in custom DataConnect instances. */
export function changeClassTeacher(vars: ChangeClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ChangeClassTeacherData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveClassTeacher' Mutation. Allow users to execute without passing in DataConnect. */
export function removeClassTeacher(dc: DataConnect, vars: RemoveClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveClassTeacherData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveClassTeacher' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeClassTeacher(vars: RemoveClassTeacherVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveClassTeacherData>>;

/** Generated Node Admin SDK operation action function for the 'LinkParentAccount' Mutation. Allow users to execute without passing in DataConnect. */
export function linkParentAccount(dc: DataConnect, vars: LinkParentAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LinkParentAccountData>>;
/** Generated Node Admin SDK operation action function for the 'LinkParentAccount' Mutation. Allow users to pass in custom DataConnect instances. */
export function linkParentAccount(vars: LinkParentAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LinkParentAccountData>>;

/** Generated Node Admin SDK operation action function for the 'UnlinkParentAccount' Mutation. Allow users to execute without passing in DataConnect. */
export function unlinkParentAccount(dc: DataConnect, vars: UnlinkParentAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UnlinkParentAccountData>>;
/** Generated Node Admin SDK operation action function for the 'UnlinkParentAccount' Mutation. Allow users to pass in custom DataConnect instances. */
export function unlinkParentAccount(vars: UnlinkParentAccountVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UnlinkParentAccountData>>;

/** Generated Node Admin SDK operation action function for the 'CreateTimetableEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function createTimetableEntry(dc: DataConnect, vars: CreateTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateTimetableEntryData>>;
/** Generated Node Admin SDK operation action function for the 'CreateTimetableEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function createTimetableEntry(vars: CreateTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateTimetableEntryData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateTimetableEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function updateTimetableEntry(dc: DataConnect, vars: UpdateTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateTimetableEntryData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateTimetableEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateTimetableEntry(vars: UpdateTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateTimetableEntryData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteTimetableEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteTimetableEntry(dc: DataConnect, vars: DeleteTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteTimetableEntryData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteTimetableEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteTimetableEntry(vars: DeleteTimetableEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteTimetableEntryData>>;

/** Generated Node Admin SDK operation action function for the 'CreateAttendanceDay' Mutation. Allow users to execute without passing in DataConnect. */
export function createAttendanceDay(dc: DataConnect, vars: CreateAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAttendanceDayData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAttendanceDay' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAttendanceDay(vars: CreateAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAttendanceDayData>>;

/** Generated Node Admin SDK operation action function for the 'SaveAttendanceMark' Mutation. Allow users to execute without passing in DataConnect. */
export function saveAttendanceMark(dc: DataConnect, vars: SaveAttendanceMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SaveAttendanceMarkData>>;
/** Generated Node Admin SDK operation action function for the 'SaveAttendanceMark' Mutation. Allow users to pass in custom DataConnect instances. */
export function saveAttendanceMark(vars: SaveAttendanceMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SaveAttendanceMarkData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveAttendanceMark' Mutation. Allow users to execute without passing in DataConnect. */
export function removeAttendanceMark(dc: DataConnect, vars: RemoveAttendanceMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveAttendanceMarkData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveAttendanceMark' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeAttendanceMark(vars: RemoveAttendanceMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveAttendanceMarkData>>;

/** Generated Node Admin SDK operation action function for the 'FinishAttendanceSubmit' Mutation. Allow users to execute without passing in DataConnect. */
export function finishAttendanceSubmit(dc: DataConnect, vars: FinishAttendanceSubmitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishAttendanceSubmitData>>;
/** Generated Node Admin SDK operation action function for the 'FinishAttendanceSubmit' Mutation. Allow users to pass in custom DataConnect instances. */
export function finishAttendanceSubmit(vars: FinishAttendanceSubmitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishAttendanceSubmitData>>;

/** Generated Node Admin SDK operation action function for the 'FinishAttendanceCorrection' Mutation. Allow users to execute without passing in DataConnect. */
export function finishAttendanceCorrection(dc: DataConnect, vars: FinishAttendanceCorrectionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishAttendanceCorrectionData>>;
/** Generated Node Admin SDK operation action function for the 'FinishAttendanceCorrection' Mutation. Allow users to pass in custom DataConnect instances. */
export function finishAttendanceCorrection(vars: FinishAttendanceCorrectionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishAttendanceCorrectionData>>;

/** Generated Node Admin SDK operation action function for the 'LockAttendanceDay' Mutation. Allow users to execute without passing in DataConnect. */
export function lockAttendanceDay(dc: DataConnect, vars: LockAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LockAttendanceDayData>>;
/** Generated Node Admin SDK operation action function for the 'LockAttendanceDay' Mutation. Allow users to pass in custom DataConnect instances. */
export function lockAttendanceDay(vars: LockAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LockAttendanceDayData>>;

/** Generated Node Admin SDK operation action function for the 'SetAttendanceStatusLabel' Mutation. Allow users to execute without passing in DataConnect. */
export function setAttendanceStatusLabel(dc: DataConnect, vars: SetAttendanceStatusLabelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetAttendanceStatusLabelData>>;
/** Generated Node Admin SDK operation action function for the 'SetAttendanceStatusLabel' Mutation. Allow users to pass in custom DataConnect instances. */
export function setAttendanceStatusLabel(vars: SetAttendanceStatusLabelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetAttendanceStatusLabelData>>;

/** Generated Node Admin SDK operation action function for the 'CheckInStaff' Mutation. Allow users to execute without passing in DataConnect. */
export function checkInStaff(dc: DataConnect, vars: CheckInStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CheckInStaffData>>;
/** Generated Node Admin SDK operation action function for the 'CheckInStaff' Mutation. Allow users to pass in custom DataConnect instances. */
export function checkInStaff(vars: CheckInStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CheckInStaffData>>;

/** Generated Node Admin SDK operation action function for the 'CheckOutStaff' Mutation. Allow users to execute without passing in DataConnect. */
export function checkOutStaff(dc: DataConnect, vars: CheckOutStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CheckOutStaffData>>;
/** Generated Node Admin SDK operation action function for the 'CheckOutStaff' Mutation. Allow users to pass in custom DataConnect instances. */
export function checkOutStaff(vars: CheckOutStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CheckOutStaffData>>;

/** Generated Node Admin SDK operation action function for the 'CorrectStaffAttendance' Mutation. Allow users to execute without passing in DataConnect. */
export function correctStaffAttendance(dc: DataConnect, vars: CorrectStaffAttendanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CorrectStaffAttendanceData>>;
/** Generated Node Admin SDK operation action function for the 'CorrectStaffAttendance' Mutation. Allow users to pass in custom DataConnect instances. */
export function correctStaffAttendance(vars: CorrectStaffAttendanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CorrectStaffAttendanceData>>;

/** Generated Node Admin SDK operation action function for the 'CreateAssessmentTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function createAssessmentTerm(dc: DataConnect, vars: CreateAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAssessmentTermData>>;
/** Generated Node Admin SDK operation action function for the 'CreateAssessmentTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function createAssessmentTerm(vars: CreateAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateAssessmentTermData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateAssessmentTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function updateAssessmentTerm(dc: DataConnect, vars: UpdateAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAssessmentTermData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateAssessmentTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateAssessmentTerm(vars: UpdateAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateAssessmentTermData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteAssessmentTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteAssessmentTerm(dc: DataConnect, vars: DeleteAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAssessmentTermData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteAssessmentTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteAssessmentTerm(vars: DeleteAssessmentTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteAssessmentTermData>>;

/** Generated Node Admin SDK operation action function for the 'SetGradeBands' Mutation. Allow users to execute without passing in DataConnect. */
export function setGradeBands(dc: DataConnect, vars: SetGradeBandsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetGradeBandsData>>;
/** Generated Node Admin SDK operation action function for the 'SetGradeBands' Mutation. Allow users to pass in custom DataConnect instances. */
export function setGradeBands(vars: SetGradeBandsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SetGradeBandsData>>;

/** Generated Node Admin SDK operation action function for the 'CreateExam' Mutation. Allow users to execute without passing in DataConnect. */
export function createExam(dc: DataConnect, vars: CreateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExamData>>;
/** Generated Node Admin SDK operation action function for the 'CreateExam' Mutation. Allow users to pass in custom DataConnect instances. */
export function createExam(vars: CreateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateExamData>>;

/** Generated Node Admin SDK operation action function for the 'UpdateExam' Mutation. Allow users to execute without passing in DataConnect. */
export function updateExam(dc: DataConnect, vars: UpdateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateExamData>>;
/** Generated Node Admin SDK operation action function for the 'UpdateExam' Mutation. Allow users to pass in custom DataConnect instances. */
export function updateExam(vars: UpdateExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UpdateExamData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteExam' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteExam(dc: DataConnect, vars: DeleteExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteExamData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteExam' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteExam(vars: DeleteExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteExamData>>;

/** Generated Node Admin SDK operation action function for the 'SaveMark' Mutation. Allow users to execute without passing in DataConnect. */
export function saveMark(dc: DataConnect, vars: SaveMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SaveMarkData>>;
/** Generated Node Admin SDK operation action function for the 'SaveMark' Mutation. Allow users to pass in custom DataConnect instances. */
export function saveMark(vars: SaveMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SaveMarkData>>;

/** Generated Node Admin SDK operation action function for the 'RemoveMark' Mutation. Allow users to execute without passing in DataConnect. */
export function removeMark(dc: DataConnect, vars: RemoveMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveMarkData>>;
/** Generated Node Admin SDK operation action function for the 'RemoveMark' Mutation. Allow users to pass in custom DataConnect instances. */
export function removeMark(vars: RemoveMarkVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<RemoveMarkData>>;

/** Generated Node Admin SDK operation action function for the 'FinishMarkEntry' Mutation. Allow users to execute without passing in DataConnect. */
export function finishMarkEntry(dc: DataConnect, vars: FinishMarkEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishMarkEntryData>>;
/** Generated Node Admin SDK operation action function for the 'FinishMarkEntry' Mutation. Allow users to pass in custom DataConnect instances. */
export function finishMarkEntry(vars: FinishMarkEntryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FinishMarkEntryData>>;

/** Generated Node Admin SDK operation action function for the 'ListStaff' Query. Allow users to execute without passing in DataConnect. */
export function listStaff(dc: DataConnect, vars: ListStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffData>>;
/** Generated Node Admin SDK operation action function for the 'ListStaff' Query. Allow users to pass in custom DataConnect instances. */
export function listStaff(vars: ListStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffData>>;

/** Generated Node Admin SDK operation action function for the 'ListLeaveRequests' Query. Allow users to execute without passing in DataConnect. */
export function listLeaveRequests(dc: DataConnect, vars: ListLeaveRequestsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLeaveRequestsData>>;
/** Generated Node Admin SDK operation action function for the 'ListLeaveRequests' Query. Allow users to pass in custom DataConnect instances. */
export function listLeaveRequests(vars: ListLeaveRequestsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListLeaveRequestsData>>;

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

/** Generated Node Admin SDK operation action function for the 'GetSchoolProfile' Query. Allow users to execute without passing in DataConnect. */
export function getSchoolProfile(dc: DataConnect, vars: GetSchoolProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolProfileData>>;
/** Generated Node Admin SDK operation action function for the 'GetSchoolProfile' Query. Allow users to pass in custom DataConnect instances. */
export function getSchoolProfile(vars: GetSchoolProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetSchoolProfileData>>;

/** Generated Node Admin SDK operation action function for the 'ListGradeLevels' Query. Allow users to execute without passing in DataConnect. */
export function listGradeLevels(dc: DataConnect, vars: ListGradeLevelsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListGradeLevelsData>>;
/** Generated Node Admin SDK operation action function for the 'ListGradeLevels' Query. Allow users to pass in custom DataConnect instances. */
export function listGradeLevels(vars: ListGradeLevelsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListGradeLevelsData>>;

/** Generated Node Admin SDK operation action function for the 'ListClassrooms' Query. Allow users to execute without passing in DataConnect. */
export function listClassrooms(dc: DataConnect, vars: ListClassroomsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassroomsData>>;
/** Generated Node Admin SDK operation action function for the 'ListClassrooms' Query. Allow users to pass in custom DataConnect instances. */
export function listClassrooms(vars: ListClassroomsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassroomsData>>;

/** Generated Node Admin SDK operation action function for the 'ListSubjects' Query. Allow users to execute without passing in DataConnect. */
export function listSubjects(dc: DataConnect, vars: ListSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSubjectsData>>;
/** Generated Node Admin SDK operation action function for the 'ListSubjects' Query. Allow users to pass in custom DataConnect instances. */
export function listSubjects(vars: ListSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSubjectsData>>;

/** Generated Node Admin SDK operation action function for the 'ListAcademicYears' Query. Allow users to execute without passing in DataConnect. */
export function listAcademicYears(dc: DataConnect, vars: ListAcademicYearsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAcademicYearsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAcademicYears' Query. Allow users to pass in custom DataConnect instances. */
export function listAcademicYears(vars: ListAcademicYearsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAcademicYearsData>>;

/** Generated Node Admin SDK operation action function for the 'SchoolSeq' Query. Allow users to execute without passing in DataConnect. */
export function schoolSeq(dc: DataConnect, vars: SchoolSeqVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolSeqData>>;
/** Generated Node Admin SDK operation action function for the 'SchoolSeq' Query. Allow users to pass in custom DataConnect instances. */
export function schoolSeq(vars: SchoolSeqVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolSeqData>>;

/** Generated Node Admin SDK operation action function for the 'ListStudents' Query. Allow users to execute without passing in DataConnect. */
export function listStudents(dc: DataConnect, vars: ListStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStudentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListStudents' Query. Allow users to pass in custom DataConnect instances. */
export function listStudents(vars: ListStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStudentsData>>;

/** Generated Node Admin SDK operation action function for the 'CountStudents' Query. Allow users to execute without passing in DataConnect. */
export function countStudents(dc: DataConnect, vars: CountStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountStudentsData>>;
/** Generated Node Admin SDK operation action function for the 'CountStudents' Query. Allow users to pass in custom DataConnect instances. */
export function countStudents(vars: CountStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountStudentsData>>;

/** Generated Node Admin SDK operation action function for the 'GetStudent' Query. Allow users to execute without passing in DataConnect. */
export function getStudent(dc: DataConnect, vars: GetStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStudentData>>;
/** Generated Node Admin SDK operation action function for the 'GetStudent' Query. Allow users to pass in custom DataConnect instances. */
export function getStudent(vars: GetStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStudentData>>;

/** Generated Node Admin SDK operation action function for the 'StaffSeqInfo' Query. Allow users to execute without passing in DataConnect. */
export function staffSeqInfo(dc: DataConnect, vars: StaffSeqInfoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffSeqInfoData>>;
/** Generated Node Admin SDK operation action function for the 'StaffSeqInfo' Query. Allow users to pass in custom DataConnect instances. */
export function staffSeqInfo(vars: StaffSeqInfoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffSeqInfoData>>;

/** Generated Node Admin SDK operation action function for the 'ListStaffProfiles' Query. Allow users to execute without passing in DataConnect. */
export function listStaffProfiles(dc: DataConnect, vars: ListStaffProfilesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffProfilesData>>;
/** Generated Node Admin SDK operation action function for the 'ListStaffProfiles' Query. Allow users to pass in custom DataConnect instances. */
export function listStaffProfiles(vars: ListStaffProfilesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffProfilesData>>;

/** Generated Node Admin SDK operation action function for the 'CountStaffProfiles' Query. Allow users to execute without passing in DataConnect. */
export function countStaffProfiles(dc: DataConnect, vars: CountStaffProfilesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountStaffProfilesData>>;
/** Generated Node Admin SDK operation action function for the 'CountStaffProfiles' Query. Allow users to pass in custom DataConnect instances. */
export function countStaffProfiles(vars: CountStaffProfilesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountStaffProfilesData>>;

/** Generated Node Admin SDK operation action function for the 'GetStaffProfile' Query. Allow users to execute without passing in DataConnect. */
export function getStaffProfile(dc: DataConnect, vars: GetStaffProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStaffProfileData>>;
/** Generated Node Admin SDK operation action function for the 'GetStaffProfile' Query. Allow users to pass in custom DataConnect instances. */
export function getStaffProfile(vars: GetStaffProfileVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStaffProfileData>>;

/** Generated Node Admin SDK operation action function for the 'ListStaffDepartments' Query. Allow users to execute without passing in DataConnect. */
export function listStaffDepartments(dc: DataConnect, vars: ListStaffDepartmentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffDepartmentsData>>;
/** Generated Node Admin SDK operation action function for the 'ListStaffDepartments' Query. Allow users to pass in custom DataConnect instances. */
export function listStaffDepartments(vars: ListStaffDepartmentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListStaffDepartmentsData>>;

/** Generated Node Admin SDK operation action function for the 'ApplicationSeqInfo' Query. Allow users to execute without passing in DataConnect. */
export function applicationSeqInfo(dc: DataConnect, vars: ApplicationSeqInfoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplicationSeqInfoData>>;
/** Generated Node Admin SDK operation action function for the 'ApplicationSeqInfo' Query. Allow users to pass in custom DataConnect instances. */
export function applicationSeqInfo(vars: ApplicationSeqInfoVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ApplicationSeqInfoData>>;

/** Generated Node Admin SDK operation action function for the 'ListApplications' Query. Allow users to execute without passing in DataConnect. */
export function listApplications(dc: DataConnect, vars: ListApplicationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListApplicationsData>>;
/** Generated Node Admin SDK operation action function for the 'ListApplications' Query. Allow users to pass in custom DataConnect instances. */
export function listApplications(vars: ListApplicationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListApplicationsData>>;

/** Generated Node Admin SDK operation action function for the 'CountApplications' Query. Allow users to execute without passing in DataConnect. */
export function countApplications(dc: DataConnect, vars: CountApplicationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountApplicationsData>>;
/** Generated Node Admin SDK operation action function for the 'CountApplications' Query. Allow users to pass in custom DataConnect instances. */
export function countApplications(vars: CountApplicationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountApplicationsData>>;

/** Generated Node Admin SDK operation action function for the 'GetApplication' Query. Allow users to execute without passing in DataConnect. */
export function getApplication(dc: DataConnect, vars: GetApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetApplicationData>>;
/** Generated Node Admin SDK operation action function for the 'GetApplication' Query. Allow users to pass in custom DataConnect instances. */
export function getApplication(vars: GetApplicationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetApplicationData>>;

/** Generated Node Admin SDK operation action function for the 'ListFeeStructures' Query. Allow users to execute without passing in DataConnect. */
export function listFeeStructures(dc: DataConnect, vars: ListFeeStructuresVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListFeeStructuresData>>;
/** Generated Node Admin SDK operation action function for the 'ListFeeStructures' Query. Allow users to pass in custom DataConnect instances. */
export function listFeeStructures(vars: ListFeeStructuresVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListFeeStructuresData>>;

/** Generated Node Admin SDK operation action function for the 'GetFeeStructure' Query. Allow users to execute without passing in DataConnect. */
export function getFeeStructure(dc: DataConnect, vars: GetFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeStructureData>>;
/** Generated Node Admin SDK operation action function for the 'GetFeeStructure' Query. Allow users to pass in custom DataConnect instances. */
export function getFeeStructure(vars: GetFeeStructureVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeStructureData>>;

/** Generated Node Admin SDK operation action function for the 'GetFeeItem' Query. Allow users to execute without passing in DataConnect. */
export function getFeeItem(dc: DataConnect, vars: GetFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeItemData>>;
/** Generated Node Admin SDK operation action function for the 'GetFeeItem' Query. Allow users to pass in custom DataConnect instances. */
export function getFeeItem(vars: GetFeeItemVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeItemData>>;

/** Generated Node Admin SDK operation action function for the 'GetFeeInstalment' Query. Allow users to execute without passing in DataConnect. */
export function getFeeInstalment(dc: DataConnect, vars: GetFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeInstalmentData>>;
/** Generated Node Admin SDK operation action function for the 'GetFeeInstalment' Query. Allow users to pass in custom DataConnect instances. */
export function getFeeInstalment(vars: GetFeeInstalmentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetFeeInstalmentData>>;

/** Generated Node Admin SDK operation action function for the 'ListConcessions' Query. Allow users to execute without passing in DataConnect. */
export function listConcessions(dc: DataConnect, vars: ListConcessionsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListConcessionsData>>;
/** Generated Node Admin SDK operation action function for the 'ListConcessions' Query. Allow users to pass in custom DataConnect instances. */
export function listConcessions(vars: ListConcessionsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListConcessionsData>>;

/** Generated Node Admin SDK operation action function for the 'GetStudentLevel' Query. Allow users to execute without passing in DataConnect. */
export function getStudentLevel(dc: DataConnect, vars: GetStudentLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStudentLevelData>>;
/** Generated Node Admin SDK operation action function for the 'GetStudentLevel' Query. Allow users to pass in custom DataConnect instances. */
export function getStudentLevel(vars: GetStudentLevelVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStudentLevelData>>;

/** Generated Node Admin SDK operation action function for the 'FindImportBatch' Query. Allow users to execute without passing in DataConnect. */
export function findImportBatch(dc: DataConnect, vars: FindImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FindImportBatchData>>;
/** Generated Node Admin SDK operation action function for the 'FindImportBatch' Query. Allow users to pass in custom DataConnect instances. */
export function findImportBatch(vars: FindImportBatchVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FindImportBatchData>>;

/** Generated Node Admin SDK operation action function for the 'StudentsByEnrollmentIds' Query. Allow users to execute without passing in DataConnect. */
export function studentsByEnrollmentIds(dc: DataConnect, vars: StudentsByEnrollmentIdsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StudentsByEnrollmentIdsData>>;
/** Generated Node Admin SDK operation action function for the 'StudentsByEnrollmentIds' Query. Allow users to pass in custom DataConnect instances. */
export function studentsByEnrollmentIds(vars: StudentsByEnrollmentIdsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StudentsByEnrollmentIdsData>>;

/** Generated Node Admin SDK operation action function for the 'StudentIdentities' Query. Allow users to execute without passing in DataConnect. */
export function studentIdentities(dc: DataConnect, vars: StudentIdentitiesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StudentIdentitiesData>>;
/** Generated Node Admin SDK operation action function for the 'StudentIdentities' Query. Allow users to pass in custom DataConnect instances. */
export function studentIdentities(vars: StudentIdentitiesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StudentIdentitiesData>>;

/** Generated Node Admin SDK operation action function for the 'StaffIdentities' Query. Allow users to execute without passing in DataConnect. */
export function staffIdentities(dc: DataConnect, vars: StaffIdentitiesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffIdentitiesData>>;
/** Generated Node Admin SDK operation action function for the 'StaffIdentities' Query. Allow users to pass in custom DataConnect instances. */
export function staffIdentities(vars: StaffIdentitiesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffIdentitiesData>>;

/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to execute without passing in DataConnect. */
export function listInvoices(dc: DataConnect, vars: ListInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'ListInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function listInvoices(vars: ListInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'CountInvoices' Query. Allow users to execute without passing in DataConnect. */
export function countInvoices(dc: DataConnect, vars: CountInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'CountInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function countInvoices(vars: CountInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'GetInvoice' Query. Allow users to execute without passing in DataConnect. */
export function getInvoice(dc: DataConnect, vars: GetInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetInvoiceData>>;
/** Generated Node Admin SDK operation action function for the 'GetInvoice' Query. Allow users to pass in custom DataConnect instances. */
export function getInvoice(vars: GetInvoiceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetInvoiceData>>;

/** Generated Node Admin SDK operation action function for the 'InvoicedForYear' Query. Allow users to execute without passing in DataConnect. */
export function invoicedForYear(dc: DataConnect, vars: InvoicedForYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InvoicedForYearData>>;
/** Generated Node Admin SDK operation action function for the 'InvoicedForYear' Query. Allow users to pass in custom DataConnect instances. */
export function invoicedForYear(vars: InvoicedForYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<InvoicedForYearData>>;

/** Generated Node Admin SDK operation action function for the 'CountInvoicesForInstalments' Query. Allow users to execute without passing in DataConnect. */
export function countInvoicesForInstalments(dc: DataConnect, vars: CountInvoicesForInstalmentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountInvoicesForInstalmentsData>>;
/** Generated Node Admin SDK operation action function for the 'CountInvoicesForInstalments' Query. Allow users to pass in custom DataConnect instances. */
export function countInvoicesForInstalments(vars: CountInvoicesForInstalmentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountInvoicesForInstalmentsData>>;

/** Generated Node Admin SDK operation action function for the 'GetPayment' Query. Allow users to execute without passing in DataConnect. */
export function getPayment(dc: DataConnect, vars: GetPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPaymentData>>;
/** Generated Node Admin SDK operation action function for the 'GetPayment' Query. Allow users to pass in custom DataConnect instances. */
export function getPayment(vars: GetPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPaymentData>>;

/** Generated Node Admin SDK operation action function for the 'UnpaidTotals' Query. Allow users to execute without passing in DataConnect. */
export function unpaidTotals(dc: DataConnect, vars: UnpaidTotalsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UnpaidTotalsData>>;
/** Generated Node Admin SDK operation action function for the 'UnpaidTotals' Query. Allow users to pass in custom DataConnect instances. */
export function unpaidTotals(vars: UnpaidTotalsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UnpaidTotalsData>>;

/** Generated Node Admin SDK operation action function for the 'PlacedStudents' Query. Allow users to execute without passing in DataConnect. */
export function placedStudents(dc: DataConnect, vars: PlacedStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PlacedStudentsData>>;
/** Generated Node Admin SDK operation action function for the 'PlacedStudents' Query. Allow users to pass in custom DataConnect instances. */
export function placedStudents(vars: PlacedStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PlacedStudentsData>>;

/** Generated Node Admin SDK operation action function for the 'ListReceipts' Query. Allow users to execute without passing in DataConnect. */
export function listReceipts(dc: DataConnect, vars: ListReceiptsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListReceiptsData>>;
/** Generated Node Admin SDK operation action function for the 'ListReceipts' Query. Allow users to pass in custom DataConnect instances. */
export function listReceipts(vars: ListReceiptsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListReceiptsData>>;

/** Generated Node Admin SDK operation action function for the 'CountReceipts' Query. Allow users to execute without passing in DataConnect. */
export function countReceipts(dc: DataConnect, vars: CountReceiptsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountReceiptsData>>;
/** Generated Node Admin SDK operation action function for the 'CountReceipts' Query. Allow users to pass in custom DataConnect instances. */
export function countReceipts(vars: CountReceiptsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountReceiptsData>>;

/** Generated Node Admin SDK operation action function for the 'GetReceipt' Query. Allow users to execute without passing in DataConnect. */
export function getReceipt(dc: DataConnect, vars: GetReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReceiptData>>;
/** Generated Node Admin SDK operation action function for the 'GetReceipt' Query. Allow users to pass in custom DataConnect instances. */
export function getReceipt(vars: GetReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReceiptData>>;

/** Generated Node Admin SDK operation action function for the 'GetReceiptByPayment' Query. Allow users to execute without passing in DataConnect. */
export function getReceiptByPayment(dc: DataConnect, vars: GetReceiptByPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReceiptByPaymentData>>;
/** Generated Node Admin SDK operation action function for the 'GetReceiptByPayment' Query. Allow users to pass in custom DataConnect instances. */
export function getReceiptByPayment(vars: GetReceiptByPaymentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetReceiptByPaymentData>>;

/** Generated Node Admin SDK operation action function for the 'ListSalaryLines' Query. Allow users to execute without passing in DataConnect. */
export function listSalaryLines(dc: DataConnect, vars: ListSalaryLinesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSalaryLinesData>>;
/** Generated Node Admin SDK operation action function for the 'ListSalaryLines' Query. Allow users to pass in custom DataConnect instances. */
export function listSalaryLines(vars: ListSalaryLinesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListSalaryLinesData>>;

/** Generated Node Admin SDK operation action function for the 'StaffForPayroll' Query. Allow users to execute without passing in DataConnect. */
export function staffForPayroll(dc: DataConnect, vars: StaffForPayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffForPayrollData>>;
/** Generated Node Admin SDK operation action function for the 'StaffForPayroll' Query. Allow users to pass in custom DataConnect instances. */
export function staffForPayroll(vars: StaffForPayrollVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffForPayrollData>>;

/** Generated Node Admin SDK operation action function for the 'ListPayrollRuns' Query. Allow users to execute without passing in DataConnect. */
export function listPayrollRuns(dc: DataConnect, vars: ListPayrollRunsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPayrollRunsData>>;
/** Generated Node Admin SDK operation action function for the 'ListPayrollRuns' Query. Allow users to pass in custom DataConnect instances. */
export function listPayrollRuns(vars: ListPayrollRunsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPayrollRunsData>>;

/** Generated Node Admin SDK operation action function for the 'FindPayrollRun' Query. Allow users to execute without passing in DataConnect. */
export function findPayrollRun(dc: DataConnect, vars: FindPayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FindPayrollRunData>>;
/** Generated Node Admin SDK operation action function for the 'FindPayrollRun' Query. Allow users to pass in custom DataConnect instances. */
export function findPayrollRun(vars: FindPayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<FindPayrollRunData>>;

/** Generated Node Admin SDK operation action function for the 'GetPayrollRun' Query. Allow users to execute without passing in DataConnect. */
export function getPayrollRun(dc: DataConnect, vars: GetPayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPayrollRunData>>;
/** Generated Node Admin SDK operation action function for the 'GetPayrollRun' Query. Allow users to pass in custom DataConnect instances. */
export function getPayrollRun(vars: GetPayrollRunVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPayrollRunData>>;

/** Generated Node Admin SDK operation action function for the 'GetPayslip' Query. Allow users to execute without passing in DataConnect. */
export function getPayslip(dc: DataConnect, vars: GetPayslipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPayslipData>>;
/** Generated Node Admin SDK operation action function for the 'GetPayslip' Query. Allow users to pass in custom DataConnect instances. */
export function getPayslip(vars: GetPayslipVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetPayslipData>>;

/** Generated Node Admin SDK operation action function for the 'PayrollRunSum' Query. Allow users to execute without passing in DataConnect. */
export function payrollRunSum(dc: DataConnect, vars: PayrollRunSumVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PayrollRunSumData>>;
/** Generated Node Admin SDK operation action function for the 'PayrollRunSum' Query. Allow users to pass in custom DataConnect instances. */
export function payrollRunSum(vars: PayrollRunSumVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PayrollRunSumData>>;

/** Generated Node Admin SDK operation action function for the 'PayslipLine' Query. Allow users to execute without passing in DataConnect. */
export function payslipLine(dc: DataConnect, vars: PayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PayslipLineData>>;
/** Generated Node Admin SDK operation action function for the 'PayslipLine' Query. Allow users to pass in custom DataConnect instances. */
export function payslipLine(vars: PayslipLineVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PayslipLineData>>;

/** Generated Node Admin SDK operation action function for the 'SalaryLineById' Query. Allow users to execute without passing in DataConnect. */
export function salaryLineById(dc: DataConnect, vars: SalaryLineByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SalaryLineByIdData>>;
/** Generated Node Admin SDK operation action function for the 'SalaryLineById' Query. Allow users to pass in custom DataConnect instances. */
export function salaryLineById(vars: SalaryLineByIdVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SalaryLineByIdData>>;

/** Generated Node Admin SDK operation action function for the 'PaymentsInRange' Query. Allow users to execute without passing in DataConnect. */
export function paymentsInRange(dc: DataConnect, vars: PaymentsInRangeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PaymentsInRangeData>>;
/** Generated Node Admin SDK operation action function for the 'PaymentsInRange' Query. Allow users to pass in custom DataConnect instances. */
export function paymentsInRange(vars: PaymentsInRangeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<PaymentsInRangeData>>;

/** Generated Node Admin SDK operation action function for the 'CountPaymentsInRange' Query. Allow users to execute without passing in DataConnect. */
export function countPaymentsInRange(dc: DataConnect, vars: CountPaymentsInRangeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountPaymentsInRangeData>>;
/** Generated Node Admin SDK operation action function for the 'CountPaymentsInRange' Query. Allow users to pass in custom DataConnect instances. */
export function countPaymentsInRange(vars: CountPaymentsInRangeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountPaymentsInRangeData>>;

/** Generated Node Admin SDK operation action function for the 'DuesInvoices' Query. Allow users to execute without passing in DataConnect. */
export function duesInvoices(dc: DataConnect, vars: DuesInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DuesInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'DuesInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function duesInvoices(vars: DuesInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DuesInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'CountDuesInvoices' Query. Allow users to execute without passing in DataConnect. */
export function countDuesInvoices(dc: DataConnect, vars: CountDuesInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountDuesInvoicesData>>;
/** Generated Node Admin SDK operation action function for the 'CountDuesInvoices' Query. Allow users to pass in custom DataConnect instances. */
export function countDuesInvoices(vars: CountDuesInvoicesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountDuesInvoicesData>>;

/** Generated Node Admin SDK operation action function for the 'ListPeriods' Query. Allow users to execute without passing in DataConnect. */
export function listPeriods(dc: DataConnect, vars: ListPeriodsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPeriodsData>>;
/** Generated Node Admin SDK operation action function for the 'ListPeriods' Query. Allow users to pass in custom DataConnect instances. */
export function listPeriods(vars: ListPeriodsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListPeriodsData>>;

/** Generated Node Admin SDK operation action function for the 'SchoolWorkingDays' Query. Allow users to execute without passing in DataConnect. */
export function schoolWorkingDays(dc: DataConnect, vars: SchoolWorkingDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolWorkingDaysData>>;
/** Generated Node Admin SDK operation action function for the 'SchoolWorkingDays' Query. Allow users to pass in custom DataConnect instances. */
export function schoolWorkingDays(vars: SchoolWorkingDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolWorkingDaysData>>;

/** Generated Node Admin SDK operation action function for the 'ListTeacherSubjects' Query. Allow users to execute without passing in DataConnect. */
export function listTeacherSubjects(dc: DataConnect, vars: ListTeacherSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTeacherSubjectsData>>;
/** Generated Node Admin SDK operation action function for the 'ListTeacherSubjects' Query. Allow users to pass in custom DataConnect instances. */
export function listTeacherSubjects(vars: ListTeacherSubjectsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTeacherSubjectsData>>;

/** Generated Node Admin SDK operation action function for the 'ListClassTeachers' Query. Allow users to execute without passing in DataConnect. */
export function listClassTeachers(dc: DataConnect, vars: ListClassTeachersVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassTeachersData>>;
/** Generated Node Admin SDK operation action function for the 'ListClassTeachers' Query. Allow users to pass in custom DataConnect instances. */
export function listClassTeachers(vars: ListClassTeachersVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListClassTeachersData>>;

/** Generated Node Admin SDK operation action function for the 'StaffOfUser' Query. Allow users to execute without passing in DataConnect. */
export function staffOfUser(dc: DataConnect, vars: StaffOfUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffOfUserData>>;
/** Generated Node Admin SDK operation action function for the 'StaffOfUser' Query. Allow users to pass in custom DataConnect instances. */
export function staffOfUser(vars: StaffOfUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffOfUserData>>;

/** Generated Node Admin SDK operation action function for the 'ParentLinksOfUser' Query. Allow users to execute without passing in DataConnect. */
export function parentLinksOfUser(dc: DataConnect, vars: ParentLinksOfUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ParentLinksOfUserData>>;
/** Generated Node Admin SDK operation action function for the 'ParentLinksOfUser' Query. Allow users to pass in custom DataConnect instances. */
export function parentLinksOfUser(vars: ParentLinksOfUserVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ParentLinksOfUserData>>;

/** Generated Node Admin SDK operation action function for the 'ParentLinksOfStudent' Query. Allow users to execute without passing in DataConnect. */
export function parentLinksOfStudent(dc: DataConnect, vars: ParentLinksOfStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ParentLinksOfStudentData>>;
/** Generated Node Admin SDK operation action function for the 'ParentLinksOfStudent' Query. Allow users to pass in custom DataConnect instances. */
export function parentLinksOfStudent(vars: ParentLinksOfStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ParentLinksOfStudentData>>;

/** Generated Node Admin SDK operation action function for the 'EnrollmentsOfStudents' Query. Allow users to execute without passing in DataConnect. */
export function enrollmentsOfStudents(dc: DataConnect, vars: EnrollmentsOfStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<EnrollmentsOfStudentsData>>;
/** Generated Node Admin SDK operation action function for the 'EnrollmentsOfStudents' Query. Allow users to pass in custom DataConnect instances. */
export function enrollmentsOfStudents(vars: EnrollmentsOfStudentsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<EnrollmentsOfStudentsData>>;

/** Generated Node Admin SDK operation action function for the 'ListTimetableForYear' Query. Allow users to execute without passing in DataConnect. */
export function listTimetableForYear(dc: DataConnect, vars: ListTimetableForYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForYearData>>;
/** Generated Node Admin SDK operation action function for the 'ListTimetableForYear' Query. Allow users to pass in custom DataConnect instances. */
export function listTimetableForYear(vars: ListTimetableForYearVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForYearData>>;

/** Generated Node Admin SDK operation action function for the 'ListTimetableForClass' Query. Allow users to execute without passing in DataConnect. */
export function listTimetableForClass(dc: DataConnect, vars: ListTimetableForClassVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForClassData>>;
/** Generated Node Admin SDK operation action function for the 'ListTimetableForClass' Query. Allow users to pass in custom DataConnect instances. */
export function listTimetableForClass(vars: ListTimetableForClassVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForClassData>>;

/** Generated Node Admin SDK operation action function for the 'ListTimetableForStaff' Query. Allow users to execute without passing in DataConnect. */
export function listTimetableForStaff(dc: DataConnect, vars: ListTimetableForStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForStaffData>>;
/** Generated Node Admin SDK operation action function for the 'ListTimetableForStaff' Query. Allow users to pass in custom DataConnect instances. */
export function listTimetableForStaff(vars: ListTimetableForStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListTimetableForStaffData>>;

/** Generated Node Admin SDK operation action function for the 'CountTimetableForPeriod' Query. Allow users to execute without passing in DataConnect. */
export function countTimetableForPeriod(dc: DataConnect, vars: CountTimetableForPeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountTimetableForPeriodData>>;
/** Generated Node Admin SDK operation action function for the 'CountTimetableForPeriod' Query. Allow users to pass in custom DataConnect instances. */
export function countTimetableForPeriod(vars: CountTimetableForPeriodVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountTimetableForPeriodData>>;

/** Generated Node Admin SDK operation action function for the 'GetAttendanceDay' Query. Allow users to execute without passing in DataConnect. */
export function getAttendanceDay(dc: DataConnect, vars: GetAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAttendanceDayData>>;
/** Generated Node Admin SDK operation action function for the 'GetAttendanceDay' Query. Allow users to pass in custom DataConnect instances. */
export function getAttendanceDay(vars: GetAttendanceDayVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetAttendanceDayData>>;

/** Generated Node Admin SDK operation action function for the 'ListAttendanceDays' Query. Allow users to execute without passing in DataConnect. */
export function listAttendanceDays(dc: DataConnect, vars: ListAttendanceDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAttendanceDaysData>>;
/** Generated Node Admin SDK operation action function for the 'ListAttendanceDays' Query. Allow users to pass in custom DataConnect instances. */
export function listAttendanceDays(vars: ListAttendanceDaysVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAttendanceDaysData>>;

/** Generated Node Admin SDK operation action function for the 'AttendanceDaysOn' Query. Allow users to execute without passing in DataConnect. */
export function attendanceDaysOn(dc: DataConnect, vars: AttendanceDaysOnVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AttendanceDaysOnData>>;
/** Generated Node Admin SDK operation action function for the 'AttendanceDaysOn' Query. Allow users to pass in custom DataConnect instances. */
export function attendanceDaysOn(vars: AttendanceDaysOnVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AttendanceDaysOnData>>;

/** Generated Node Admin SDK operation action function for the 'AttendanceOfStudent' Query. Allow users to execute without passing in DataConnect. */
export function attendanceOfStudent(dc: DataConnect, vars: AttendanceOfStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AttendanceOfStudentData>>;
/** Generated Node Admin SDK operation action function for the 'AttendanceOfStudent' Query. Allow users to pass in custom DataConnect instances. */
export function attendanceOfStudent(vars: AttendanceOfStudentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AttendanceOfStudentData>>;

/** Generated Node Admin SDK operation action function for the 'DaysOfClass' Query. Allow users to execute without passing in DataConnect. */
export function daysOfClass(dc: DataConnect, vars: DaysOfClassVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DaysOfClassData>>;
/** Generated Node Admin SDK operation action function for the 'DaysOfClass' Query. Allow users to pass in custom DataConnect instances. */
export function daysOfClass(vars: DaysOfClassVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DaysOfClassData>>;

/** Generated Node Admin SDK operation action function for the 'ListAttendanceStatusLabels' Query. Allow users to execute without passing in DataConnect. */
export function listAttendanceStatusLabels(dc: DataConnect, vars: ListAttendanceStatusLabelsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAttendanceStatusLabelsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAttendanceStatusLabels' Query. Allow users to pass in custom DataConnect instances. */
export function listAttendanceStatusLabels(vars: ListAttendanceStatusLabelsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAttendanceStatusLabelsData>>;

/** Generated Node Admin SDK operation action function for the 'ClassRoster' Query. Allow users to execute without passing in DataConnect. */
export function classRoster(dc: DataConnect, vars: ClassRosterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ClassRosterData>>;
/** Generated Node Admin SDK operation action function for the 'ClassRoster' Query. Allow users to pass in custom DataConnect instances. */
export function classRoster(vars: ClassRosterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ClassRosterData>>;

/** Generated Node Admin SDK operation action function for the 'GetStaffAttendance' Query. Allow users to execute without passing in DataConnect. */
export function getStaffAttendance(dc: DataConnect, vars: GetStaffAttendanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStaffAttendanceData>>;
/** Generated Node Admin SDK operation action function for the 'GetStaffAttendance' Query. Allow users to pass in custom DataConnect instances. */
export function getStaffAttendance(vars: GetStaffAttendanceVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetStaffAttendanceData>>;

/** Generated Node Admin SDK operation action function for the 'StaffAttendanceOn' Query. Allow users to execute without passing in DataConnect. */
export function staffAttendanceOn(dc: DataConnect, vars: StaffAttendanceOnVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffAttendanceOnData>>;
/** Generated Node Admin SDK operation action function for the 'StaffAttendanceOn' Query. Allow users to pass in custom DataConnect instances. */
export function staffAttendanceOn(vars: StaffAttendanceOnVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffAttendanceOnData>>;

/** Generated Node Admin SDK operation action function for the 'StaffAttendanceOfStaff' Query. Allow users to execute without passing in DataConnect. */
export function staffAttendanceOfStaff(dc: DataConnect, vars: StaffAttendanceOfStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffAttendanceOfStaffData>>;
/** Generated Node Admin SDK operation action function for the 'StaffAttendanceOfStaff' Query. Allow users to pass in custom DataConnect instances. */
export function staffAttendanceOfStaff(vars: StaffAttendanceOfStaffVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<StaffAttendanceOfStaffData>>;

/** Generated Node Admin SDK operation action function for the 'SchoolGradeBands' Query. Allow users to execute without passing in DataConnect. */
export function schoolGradeBands(dc: DataConnect, vars: SchoolGradeBandsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolGradeBandsData>>;
/** Generated Node Admin SDK operation action function for the 'SchoolGradeBands' Query. Allow users to pass in custom DataConnect instances. */
export function schoolGradeBands(vars: SchoolGradeBandsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SchoolGradeBandsData>>;

/** Generated Node Admin SDK operation action function for the 'ListAssessmentTerms' Query. Allow users to execute without passing in DataConnect. */
export function listAssessmentTerms(dc: DataConnect, vars: ListAssessmentTermsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAssessmentTermsData>>;
/** Generated Node Admin SDK operation action function for the 'ListAssessmentTerms' Query. Allow users to pass in custom DataConnect instances. */
export function listAssessmentTerms(vars: ListAssessmentTermsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAssessmentTermsData>>;

/** Generated Node Admin SDK operation action function for the 'ListExams' Query. Allow users to execute without passing in DataConnect. */
export function listExams(dc: DataConnect, vars: ListExamsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListExamsData>>;
/** Generated Node Admin SDK operation action function for the 'ListExams' Query. Allow users to pass in custom DataConnect instances. */
export function listExams(vars: ListExamsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListExamsData>>;

/** Generated Node Admin SDK operation action function for the 'GetExam' Query. Allow users to execute without passing in DataConnect. */
export function getExam(dc: DataConnect, vars: GetExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetExamData>>;
/** Generated Node Admin SDK operation action function for the 'GetExam' Query. Allow users to pass in custom DataConnect instances. */
export function getExam(vars: GetExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetExamData>>;

/** Generated Node Admin SDK operation action function for the 'CountMarksOfExam' Query. Allow users to execute without passing in DataConnect. */
export function countMarksOfExam(dc: DataConnect, vars: CountMarksOfExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountMarksOfExamData>>;
/** Generated Node Admin SDK operation action function for the 'CountMarksOfExam' Query. Allow users to pass in custom DataConnect instances. */
export function countMarksOfExam(vars: CountMarksOfExamVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountMarksOfExamData>>;

/** Generated Node Admin SDK operation action function for the 'CountExamsOfTerm' Query. Allow users to execute without passing in DataConnect. */
export function countExamsOfTerm(dc: DataConnect, vars: CountExamsOfTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountExamsOfTermData>>;
/** Generated Node Admin SDK operation action function for the 'CountExamsOfTerm' Query. Allow users to pass in custom DataConnect instances. */
export function countExamsOfTerm(vars: CountExamsOfTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CountExamsOfTermData>>;

/** Generated Node Admin SDK operation action function for the 'MarksOfStudentInTerm' Query. Allow users to execute without passing in DataConnect. */
export function marksOfStudentInTerm(dc: DataConnect, vars: MarksOfStudentInTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarksOfStudentInTermData>>;
/** Generated Node Admin SDK operation action function for the 'MarksOfStudentInTerm' Query. Allow users to pass in custom DataConnect instances. */
export function marksOfStudentInTerm(vars: MarksOfStudentInTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<MarksOfStudentInTermData>>;

