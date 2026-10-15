const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const AcademicYearStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
}
exports.AcademicYearStatus = AcademicYearStatus;

const GlobalRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "USER",
}
exports.GlobalRole = GlobalRole;

const InvoiceStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
}
exports.InvoiceStatus = InvoiceStatus;

const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
}
exports.LeaveStatus = LeaveStatus;

const PayrollStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
}
exports.PayrollStatus = PayrollStatus;

const SchoolRole = {
  PRINCIPAL: "PRINCIPAL",
  MANAGEMENT: "MANAGEMENT",
  BURSAR: "BURSAR",
  ACADEMIC_ADMIN: "ACADEMIC_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  HR_MANAGER: "HR_MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  ADMISSIONS_OFFICER: "ADMISSIONS_OFFICER",
  TRANSPORT_MANAGER: "TRANSPORT_MANAGER",
  OPERATIONS_MANAGER: "OPERATIONS_MANAGER",
  TEACHER: "TEACHER",
  STAFF: "STAFF",
  DRIVER: "DRIVER",
  PARENT: "PARENT",
}
exports.SchoolRole = SchoolRole;

const connectorConfig = {
  connector: 'erp-connector',
  service: 'oruschools',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
exports.dataConnectSettings = dataConnectSettings;

const createAcademicYearRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAcademicYear', inputVars);
}
createAcademicYearRef.operationName = 'CreateAcademicYear';
exports.createAcademicYearRef = createAcademicYearRef;

exports.createAcademicYear = function createAcademicYear(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createAcademicYearRef(dcInstance, inputVars));
}
;

const createSchoolRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateSchool', inputVars);
}
createSchoolRef.operationName = 'CreateSchool';
exports.createSchoolRef = createSchoolRef;

exports.createSchool = function createSchool(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createSchoolRef(dcInstance, inputVars));
}
;

const createUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUser', inputVars);
}
createUserRef.operationName = 'CreateUser';
exports.createUserRef = createUserRef;

exports.createUser = function createUser(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createUserRef(dcInstance, inputVars));
}
;

const createClassroomRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateClassroom', inputVars);
}
createClassroomRef.operationName = 'CreateClassroom';
exports.createClassroomRef = createClassroomRef;

exports.createClassroom = function createClassroom(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createClassroomRef(dcInstance, inputVars));
}
;

const createStudentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStudent', inputVars);
}
createStudentRef.operationName = 'CreateStudent';
exports.createStudentRef = createStudentRef;

exports.createStudent = function createStudent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createStudentRef(dcInstance, inputVars));
}
;

const createSchoolMemberRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateSchoolMember', inputVars);
}
createSchoolMemberRef.operationName = 'CreateSchoolMember';
exports.createSchoolMemberRef = createSchoolMemberRef;

exports.createSchoolMember = function createSchoolMember(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createSchoolMemberRef(dcInstance, inputVars));
}
;

const createInvoiceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateInvoice', inputVars);
}
createInvoiceRef.operationName = 'CreateInvoice';
exports.createInvoiceRef = createInvoiceRef;

exports.createInvoice = function createInvoice(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createInvoiceRef(dcInstance, inputVars));
}
;

const createPayrollRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePayroll', inputVars);
}
createPayrollRef.operationName = 'CreatePayroll';
exports.createPayrollRef = createPayrollRef;

exports.createPayroll = function createPayroll(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createPayrollRef(dcInstance, inputVars));
}
;

const createSubjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateSubject', inputVars);
}
createSubjectRef.operationName = 'CreateSubject';
exports.createSubjectRef = createSubjectRef;

exports.createSubject = function createSubject(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createSubjectRef(dcInstance, inputVars));
}
;

const createScheduleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateSchedule', inputVars);
}
createScheduleRef.operationName = 'CreateSchedule';
exports.createScheduleRef = createScheduleRef;

exports.createSchedule = function createSchedule(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createScheduleRef(dcInstance, inputVars));
}
;

const createLeaveRequestRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateLeaveRequest', inputVars);
}
createLeaveRequestRef.operationName = 'CreateLeaveRequest';
exports.createLeaveRequestRef = createLeaveRequestRef;

exports.createLeaveRequest = function createLeaveRequest(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createLeaveRequestRef(dcInstance, inputVars));
}
;

const updateLeaveRequestRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateLeaveRequest', inputVars);
}
updateLeaveRequestRef.operationName = 'UpdateLeaveRequest';
exports.updateLeaveRequestRef = updateLeaveRequestRef;

exports.updateLeaveRequest = function updateLeaveRequest(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(updateLeaveRequestRef(dcInstance, inputVars));
}
;

const createExamRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateExam', inputVars);
}
createExamRef.operationName = 'CreateExam';
exports.createExamRef = createExamRef;

exports.createExam = function createExam(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createExamRef(dcInstance, inputVars));
}
;

const createAuditLogRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAuditLog', inputVars);
}
createAuditLogRef.operationName = 'CreateAuditLog';
exports.createAuditLogRef = createAuditLogRef;

exports.createAuditLog = function createAuditLog(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createAuditLogRef(dcInstance, inputVars));
}
;

const listAcademicYearsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAcademicYears', inputVars);
}
listAcademicYearsRef.operationName = 'ListAcademicYears';
exports.listAcademicYearsRef = listAcademicYearsRef;

exports.listAcademicYears = function listAcademicYears(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listAcademicYearsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listClassroomsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListClassrooms', inputVars);
}
listClassroomsRef.operationName = 'ListClassrooms';
exports.listClassroomsRef = listClassroomsRef;

exports.listClassrooms = function listClassrooms(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listClassroomsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listInvoicesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListInvoices', inputVars);
}
listInvoicesRef.operationName = 'ListInvoices';
exports.listInvoicesRef = listInvoicesRef;

exports.listInvoices = function listInvoices(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listInvoicesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStudentsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStudents', inputVars);
}
listStudentsRef.operationName = 'ListStudents';
exports.listStudentsRef = listStudentsRef;

exports.listStudents = function listStudents(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listStudentsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listStaffRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListStaff', inputVars);
}
listStaffRef.operationName = 'ListStaff';
exports.listStaffRef = listStaffRef;

exports.listStaff = function listStaff(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listStaffRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listPayrollRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPayroll', inputVars);
}
listPayrollRef.operationName = 'ListPayroll';
exports.listPayrollRef = listPayrollRef;

exports.listPayroll = function listPayroll(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listPayrollRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSubjectsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSubjects', inputVars);
}
listSubjectsRef.operationName = 'ListSubjects';
exports.listSubjectsRef = listSubjectsRef;

exports.listSubjects = function listSubjects(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listSubjectsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listSchedulesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListSchedules', inputVars);
}
listSchedulesRef.operationName = 'ListSchedules';
exports.listSchedulesRef = listSchedulesRef;

exports.listSchedules = function listSchedules(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listSchedulesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listLeaveRequestsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListLeaveRequests', inputVars);
}
listLeaveRequestsRef.operationName = 'ListLeaveRequests';
exports.listLeaveRequestsRef = listLeaveRequestsRef;

exports.listLeaveRequests = function listLeaveRequests(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listLeaveRequestsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listExamsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListExams', inputVars);
}
listExamsRef.operationName = 'ListExams';
exports.listExamsRef = listExamsRef;

exports.listExams = function listExams(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listExamsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
