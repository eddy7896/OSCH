const { validateAdminArgs } = require('firebase-admin/data-connect');

const AcademicYearStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
}
exports.AcademicYearStatus = AcademicYearStatus;

const ApplicationStatus = {
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  ADMITTED: "ADMITTED",
}
exports.ApplicationStatus = ApplicationStatus;

const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  LEAVE: "LEAVE",
  MEDICAL: "MEDICAL",
  HALF_DAY: "HALF_DAY",
  EXCUSED: "EXCUSED",
}
exports.AttendanceStatus = AttendanceStatus;

const ConcessionKind = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
}
exports.ConcessionKind = ConcessionKind;

const DevicePlatform = {
  IOS: "IOS",
  ANDROID: "ANDROID",
}
exports.DevicePlatform = DevicePlatform;

const Gender = {
  FEMALE: "FEMALE",
  MALE: "MALE",
  OTHER: "OTHER",
}
exports.Gender = Gender;

const GlobalRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  USER: "USER",
}
exports.GlobalRole = GlobalRole;

const ImportStatus = {
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  PARTIAL: "PARTIAL",
}
exports.ImportStatus = ImportStatus;

const InvitationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REVOKED: "REVOKED",
}
exports.InvitationStatus = InvitationStatus;

const InvoiceStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
}
exports.InvoiceStatus = InvoiceStatus;

const LeaveRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
}
exports.LeaveRequestStatus = LeaveRequestStatus;

const MembershipStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
}
exports.MembershipStatus = MembershipStatus;

const PaymentMethod = {
  CASH: "CASH",
  CHEQUE: "CHEQUE",
  BANK_TRANSFER: "BANK_TRANSFER",
  UPI: "UPI",
  OTHER: "OTHER",
}
exports.PaymentMethod = PaymentMethod;

const PayrollRunStatus = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  PAID: "PAID",
}
exports.PayrollRunStatus = PayrollRunStatus;

const RouteDirection = {
  MORNING: "MORNING",
  AFTERNOON: "AFTERNOON",
}
exports.RouteDirection = RouteDirection;

const SalaryLineKind = {
  EARNING: "EARNING",
  DEDUCTION: "DEDUCTION",
}
exports.SalaryLineKind = SalaryLineKind;

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

const StaffDocumentKind = {
  APPOINTMENT_LETTER: "APPOINTMENT_LETTER",
  ID_PROOF: "ID_PROOF",
  QUALIFICATION: "QUALIFICATION",
  EXPERIENCE: "EXPERIENCE",
  MEDICAL: "MEDICAL",
  OTHER: "OTHER",
}
exports.StaffDocumentKind = StaffDocumentKind;

const StaffStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  LEFT: "LEFT",
}
exports.StaffStatus = StaffStatus;

const StudentDocumentKind = {
  BIRTH_CERTIFICATE: "BIRTH_CERTIFICATE",
  TRANSFER_CERTIFICATE: "TRANSFER_CERTIFICATE",
  REPORT_CARD: "REPORT_CARD",
  ID_PROOF: "ID_PROOF",
  MEDICAL: "MEDICAL",
  OTHER: "OTHER",
}
exports.StudentDocumentKind = StudentDocumentKind;

const StudentLeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
}
exports.StudentLeaveStatus = StudentLeaveStatus;

const StudentStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  LEFT: "LEFT",
}
exports.StudentStatus = StudentStatus;

const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  TRIAL: "TRIAL",
  SUSPENDED: "SUSPENDED",
}
exports.SubscriptionStatus = SubscriptionStatus;

const VehicleStatus = {
  ACTIVE: "ACTIVE",
  OUT_OF_SERVICE: "OUT_OF_SERVICE",
}
exports.VehicleStatus = VehicleStatus;

const connectorConfig = {
  connector: 'erp-connector',
  serviceId: 'oruschools',
  location: 'asia-south1'
};
exports.connectorConfig = connectorConfig;

function createSchool(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateSchool', inputVars, inputOpts);
}
exports.createSchool = createSchool;

function createUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateUser', inputVars, inputOpts);
}
exports.createUser = createUser;

function createSchoolMember(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateSchoolMember', inputVars, inputOpts);
}
exports.createSchoolMember = createSchoolMember;

function createAuditLog(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAuditLog', inputVars, inputOpts);
}
exports.createAuditLog = createAuditLog;

function upsertUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpsertUser', inputVars, inputOpts);
}
exports.upsertUser = upsertUser;

function setUserLanguage(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetUserLanguage', inputVars, inputOpts);
}
exports.setUserLanguage = setUserLanguage;

function provisionSchool(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ProvisionSchool', inputVars, inputOpts);
}
exports.provisionSchool = provisionSchool;

function provisionSchoolAdmin(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ProvisionSchoolAdmin', inputVars, inputOpts);
}
exports.provisionSchoolAdmin = provisionSchoolAdmin;

function updateSchool(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateSchool', inputVars, inputOpts);
}
exports.updateSchool = updateSchool;

function setSubscriptionStatus(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetSubscriptionStatus', inputVars, inputOpts);
}
exports.setSubscriptionStatus = setSubscriptionStatus;

function addMembership(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddMembership', inputVars, inputOpts);
}
exports.addMembership = addMembership;

function updateMembership(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateMembership', inputVars, inputOpts);
}
exports.updateMembership = updateMembership;

function removeMembership(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveMembership', inputVars, inputOpts);
}
exports.removeMembership = removeMembership;

function createInvitation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateInvitation', inputVars, inputOpts);
}
exports.createInvitation = createInvitation;

function revokeInvitation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RevokeInvitation', inputVars, inputOpts);
}
exports.revokeInvitation = revokeInvitation;

function acceptInvitation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AcceptInvitation', inputVars, inputOpts);
}
exports.acceptInvitation = acceptInvitation;

function updateSchoolProfile(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateSchoolProfile', inputVars, inputOpts);
}
exports.updateSchoolProfile = updateSchoolProfile;

function setSchoolLogo(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetSchoolLogo', inputVars, inputOpts);
}
exports.setSchoolLogo = setSchoolLogo;

function createGradeLevel(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateGradeLevel', inputVars, inputOpts);
}
exports.createGradeLevel = createGradeLevel;

function updateGradeLevel(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateGradeLevel', inputVars, inputOpts);
}
exports.updateGradeLevel = updateGradeLevel;

function deleteGradeLevel(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteGradeLevel', inputVars, inputOpts);
}
exports.deleteGradeLevel = deleteGradeLevel;

function createClassroom(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateClassroom', inputVars, inputOpts);
}
exports.createClassroom = createClassroom;

function updateClassroom(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateClassroom', inputVars, inputOpts);
}
exports.updateClassroom = updateClassroom;

function deleteClassroom(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteClassroom', inputVars, inputOpts);
}
exports.deleteClassroom = deleteClassroom;

function createSubject(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateSubject', inputVars, inputOpts);
}
exports.createSubject = createSubject;

function updateSubject(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateSubject', inputVars, inputOpts);
}
exports.updateSubject = updateSubject;

function deleteSubject(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteSubject', inputVars, inputOpts);
}
exports.deleteSubject = deleteSubject;

function createAcademicYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAcademicYear', inputVars, inputOpts);
}
exports.createAcademicYear = createAcademicYear;

function updateAcademicYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateAcademicYear', inputVars, inputOpts);
}
exports.updateAcademicYear = updateAcademicYear;

function activateAcademicYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ActivateAcademicYear', inputVars, inputOpts);
}
exports.activateAcademicYear = activateAcademicYear;

function deleteAcademicYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteAcademicYear', inputVars, inputOpts);
}
exports.deleteAcademicYear = deleteAcademicYear;

function createStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStudent', inputVars, inputOpts);
}
exports.createStudent = createStudent;

function updateStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateStudent', inputVars, inputOpts);
}
exports.updateStudent = updateStudent;

function placeStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('PlaceStudent', inputVars, inputOpts);
}
exports.placeStudent = placeStudent;

function moveStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('MoveStudent', inputVars, inputOpts);
}
exports.moveStudent = moveStudent;

function addGuardian(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddGuardian', inputVars, inputOpts);
}
exports.addGuardian = addGuardian;

function updateGuardian(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateGuardian', inputVars, inputOpts);
}
exports.updateGuardian = updateGuardian;

function removeGuardian(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveGuardian', inputVars, inputOpts);
}
exports.removeGuardian = removeGuardian;

function setStudentPhoto(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetStudentPhoto', inputVars, inputOpts);
}
exports.setStudentPhoto = setStudentPhoto;

function addStudentDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddStudentDocument', inputVars, inputOpts);
}
exports.addStudentDocument = addStudentDocument;

function removeStudentDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveStudentDocument', inputVars, inputOpts);
}
exports.removeStudentDocument = removeStudentDocument;

function createStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStaff', inputVars, inputOpts);
}
exports.createStaff = createStaff;

function updateStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateStaff', inputVars, inputOpts);
}
exports.updateStaff = updateStaff;

function linkStaffAccount(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('LinkStaffAccount', inputVars, inputOpts);
}
exports.linkStaffAccount = linkStaffAccount;

function setStaffPhoto(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetStaffPhoto', inputVars, inputOpts);
}
exports.setStaffPhoto = setStaffPhoto;

function addStaffDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddStaffDocument', inputVars, inputOpts);
}
exports.addStaffDocument = addStaffDocument;

function removeStaffDocument(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveStaffDocument', inputVars, inputOpts);
}
exports.removeStaffDocument = removeStaffDocument;

function createApplication(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateApplication', inputVars, inputOpts);
}
exports.createApplication = createApplication;

function updateApplication(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateApplication', inputVars, inputOpts);
}
exports.updateApplication = updateApplication;

function decideApplication(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DecideApplication', inputVars, inputOpts);
}
exports.decideApplication = decideApplication;

function admitApplication(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdmitApplication', inputVars, inputOpts);
}
exports.admitApplication = admitApplication;

function createFeeStructure(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateFeeStructure', inputVars, inputOpts);
}
exports.createFeeStructure = createFeeStructure;

function updateFeeStructure(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateFeeStructure', inputVars, inputOpts);
}
exports.updateFeeStructure = updateFeeStructure;

function deleteFeeStructure(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteFeeStructure', inputVars, inputOpts);
}
exports.deleteFeeStructure = deleteFeeStructure;

function createFeeItem(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateFeeItem', inputVars, inputOpts);
}
exports.createFeeItem = createFeeItem;

function updateFeeItem(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateFeeItem', inputVars, inputOpts);
}
exports.updateFeeItem = updateFeeItem;

function deleteFeeItem(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteFeeItem', inputVars, inputOpts);
}
exports.deleteFeeItem = deleteFeeItem;

function addFeeInstalment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddFeeInstalment', inputVars, inputOpts);
}
exports.addFeeInstalment = addFeeInstalment;

function updateFeeInstalment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateFeeInstalment', inputVars, inputOpts);
}
exports.updateFeeInstalment = updateFeeInstalment;

function deleteFeeInstalment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteFeeInstalment', inputVars, inputOpts);
}
exports.deleteFeeInstalment = deleteFeeInstalment;

function createConcession(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateConcession', inputVars, inputOpts);
}
exports.createConcession = createConcession;

function createItemConcession(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateItemConcession', inputVars, inputOpts);
}
exports.createItemConcession = createItemConcession;

function deleteConcession(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteConcession', inputVars, inputOpts);
}
exports.deleteConcession = deleteConcession;

function startImportBatch(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('StartImportBatch', inputVars, inputOpts);
}
exports.startImportBatch = startImportBatch;

function finishImportBatch(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('FinishImportBatch', inputVars, inputOpts);
}
exports.finishImportBatch = finishImportBatch;

function createInvoice(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateInvoice', inputVars, inputOpts);
}
exports.createInvoice = createInvoice;

function createInstalmentInvoice(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateInstalmentInvoice', inputVars, inputOpts);
}
exports.createInstalmentInvoice = createInstalmentInvoice;

function recordPayment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RecordPayment', inputVars, inputOpts);
}
exports.recordPayment = recordPayment;

function reversePayment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ReversePayment', inputVars, inputOpts);
}
exports.reversePayment = reversePayment;

function addSalaryLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddSalaryLine', inputVars, inputOpts);
}
exports.addSalaryLine = addSalaryLine;

function updateSalaryLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateSalaryLine', inputVars, inputOpts);
}
exports.updateSalaryLine = updateSalaryLine;

function removeSalaryLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveSalaryLine', inputVars, inputOpts);
}
exports.removeSalaryLine = removeSalaryLine;

function createPayrollRun(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreatePayrollRun', inputVars, inputOpts);
}
exports.createPayrollRun = createPayrollRun;

function createPayslip(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreatePayslip', inputVars, inputOpts);
}
exports.createPayslip = createPayslip;

function addPayslipLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddPayslipLine', inputVars, inputOpts);
}
exports.addPayslipLine = addPayslipLine;

function removePayslipLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemovePayslipLine', inputVars, inputOpts);
}
exports.removePayslipLine = removePayslipLine;

function deletePayrollRun(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeletePayrollRun', inputVars, inputOpts);
}
exports.deletePayrollRun = deletePayrollRun;

function approvePayrollRun(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ApprovePayrollRun', inputVars, inputOpts);
}
exports.approvePayrollRun = approvePayrollRun;

function markPayrollRunPaid(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('MarkPayrollRunPaid', inputVars, inputOpts);
}
exports.markPayrollRunPaid = markPayrollRunPaid;

function createPeriod(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreatePeriod', inputVars, inputOpts);
}
exports.createPeriod = createPeriod;

function updatePeriod(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdatePeriod', inputVars, inputOpts);
}
exports.updatePeriod = updatePeriod;

function deletePeriod(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeletePeriod', inputVars, inputOpts);
}
exports.deletePeriod = deletePeriod;

function setWorkingDays(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetWorkingDays', inputVars, inputOpts);
}
exports.setWorkingDays = setWorkingDays;

function applyStandardSchedule(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ApplyStandardSchedule', inputVars, inputOpts);
}
exports.applyStandardSchedule = applyStandardSchedule;

function applyShortDaySchedule(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ApplyShortDaySchedule', inputVars, inputOpts);
}
exports.applyShortDaySchedule = applyShortDaySchedule;

function addTeacherSubject(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddTeacherSubject', inputVars, inputOpts);
}
exports.addTeacherSubject = addTeacherSubject;

function removeTeacherSubject(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveTeacherSubject', inputVars, inputOpts);
}
exports.removeTeacherSubject = removeTeacherSubject;

function assignClassTeacher(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AssignClassTeacher', inputVars, inputOpts);
}
exports.assignClassTeacher = assignClassTeacher;

function changeClassTeacher(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ChangeClassTeacher', inputVars, inputOpts);
}
exports.changeClassTeacher = changeClassTeacher;

function removeClassTeacher(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveClassTeacher', inputVars, inputOpts);
}
exports.removeClassTeacher = removeClassTeacher;

function linkParentAccount(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('LinkParentAccount', inputVars, inputOpts);
}
exports.linkParentAccount = linkParentAccount;

function unlinkParentAccount(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UnlinkParentAccount', inputVars, inputOpts);
}
exports.unlinkParentAccount = unlinkParentAccount;

function createTimetableEntry(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateTimetableEntry', inputVars, inputOpts);
}
exports.createTimetableEntry = createTimetableEntry;

function updateTimetableEntry(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateTimetableEntry', inputVars, inputOpts);
}
exports.updateTimetableEntry = updateTimetableEntry;

function deleteTimetableEntry(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteTimetableEntry', inputVars, inputOpts);
}
exports.deleteTimetableEntry = deleteTimetableEntry;

function createAttendanceDay(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAttendanceDay', inputVars, inputOpts);
}
exports.createAttendanceDay = createAttendanceDay;

function saveAttendanceMark(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SaveAttendanceMark', inputVars, inputOpts);
}
exports.saveAttendanceMark = saveAttendanceMark;

function removeAttendanceMark(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveAttendanceMark', inputVars, inputOpts);
}
exports.removeAttendanceMark = removeAttendanceMark;

function finishAttendanceSubmit(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('FinishAttendanceSubmit', inputVars, inputOpts);
}
exports.finishAttendanceSubmit = finishAttendanceSubmit;

function finishAttendanceCorrection(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('FinishAttendanceCorrection', inputVars, inputOpts);
}
exports.finishAttendanceCorrection = finishAttendanceCorrection;

function lockAttendanceDay(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('LockAttendanceDay', inputVars, inputOpts);
}
exports.lockAttendanceDay = lockAttendanceDay;

function setAttendanceStatusLabel(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetAttendanceStatusLabel', inputVars, inputOpts);
}
exports.setAttendanceStatusLabel = setAttendanceStatusLabel;

function checkInStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CheckInStaff', inputVars, inputOpts);
}
exports.checkInStaff = checkInStaff;

function checkOutStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CheckOutStaff', inputVars, inputOpts);
}
exports.checkOutStaff = checkOutStaff;

function confirmStaffCheckIn(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ConfirmStaffCheckIn', inputVars, inputOpts);
}
exports.confirmStaffCheckIn = confirmStaffCheckIn;

function setSchoolGeofence(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetSchoolGeofence', inputVars, inputOpts);
}
exports.setSchoolGeofence = setSchoolGeofence;

function clearSchoolGeofence(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClearSchoolGeofence', inputVars, inputOpts);
}
exports.clearSchoolGeofence = clearSchoolGeofence;

function correctStaffAttendance(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CorrectStaffAttendance', inputVars, inputOpts);
}
exports.correctStaffAttendance = correctStaffAttendance;

function createAssessmentTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateAssessmentTerm', inputVars, inputOpts);
}
exports.createAssessmentTerm = createAssessmentTerm;

function updateAssessmentTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateAssessmentTerm', inputVars, inputOpts);
}
exports.updateAssessmentTerm = updateAssessmentTerm;

function deleteAssessmentTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteAssessmentTerm', inputVars, inputOpts);
}
exports.deleteAssessmentTerm = deleteAssessmentTerm;

function setGradeBands(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetGradeBands', inputVars, inputOpts);
}
exports.setGradeBands = setGradeBands;

function createExam(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateExam', inputVars, inputOpts);
}
exports.createExam = createExam;

function updateExam(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateExam', inputVars, inputOpts);
}
exports.updateExam = updateExam;

function deleteExam(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteExam', inputVars, inputOpts);
}
exports.deleteExam = deleteExam;

function saveMark(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SaveMark', inputVars, inputOpts);
}
exports.saveMark = saveMark;

function removeMark(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveMark', inputVars, inputOpts);
}
exports.removeMark = removeMark;

function finishMarkEntry(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('FinishMarkEntry', inputVars, inputOpts);
}
exports.finishMarkEntry = finishMarkEntry;

function createLeaveType(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateLeaveType', inputVars, inputOpts);
}
exports.createLeaveType = createLeaveType;

function updateLeaveType(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateLeaveType', inputVars, inputOpts);
}
exports.updateLeaveType = updateLeaveType;

function deleteLeaveType(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteLeaveType', inputVars, inputOpts);
}
exports.deleteLeaveType = deleteLeaveType;

function createLeaveBalance(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateLeaveBalance', inputVars, inputOpts);
}
exports.createLeaveBalance = createLeaveBalance;

function setLeaveBalance(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetLeaveBalance', inputVars, inputOpts);
}
exports.setLeaveBalance = setLeaveBalance;

function createLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateLeaveRequest', inputVars, inputOpts);
}
exports.createLeaveRequest = createLeaveRequest;

function cancelLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CancelLeaveRequest', inputVars, inputOpts);
}
exports.cancelLeaveRequest = cancelLeaveRequest;

function approveLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ApproveLeaveRequest', inputVars, inputOpts);
}
exports.approveLeaveRequest = approveLeaveRequest;

function approveUnpaidLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ApproveUnpaidLeaveRequest', inputVars, inputOpts);
}
exports.approveUnpaidLeaveRequest = approveUnpaidLeaveRequest;

function rejectLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RejectLeaveRequest', inputVars, inputOpts);
}
exports.rejectLeaveRequest = rejectLeaveRequest;

function setSubstitute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetSubstitute', inputVars, inputOpts);
}
exports.setSubstitute = setSubstitute;

function clearSubstitute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClearSubstitute', inputVars, inputOpts);
}
exports.clearSubstitute = clearSubstitute;

function markNotificationRead(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('MarkNotificationRead', inputVars, inputOpts);
}
exports.markNotificationRead = markNotificationRead;

function muteNotificationCategory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('MuteNotificationCategory', inputVars, inputOpts);
}
exports.muteNotificationCategory = muteNotificationCategory;

function unmuteNotificationCategory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UnmuteNotificationCategory', inputVars, inputOpts);
}
exports.unmuteNotificationCategory = unmuteNotificationCategory;

function registerDevice(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RegisterDevice', inputVars, inputOpts);
}
exports.registerDevice = registerDevice;

function removeDevice(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveDevice', inputVars, inputOpts);
}
exports.removeDevice = removeDevice;

function removeDevicesById(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveDevicesById', inputVars, inputOpts);
}
exports.removeDevicesById = removeDevicesById;

function claimNotificationPush(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClaimNotificationPush', inputVars, inputOpts);
}
exports.claimNotificationPush = claimNotificationPush;

function postAnnouncement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('PostAnnouncement', inputVars, inputOpts);
}
exports.postAnnouncement = postAnnouncement;

function editAnnouncement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('EditAnnouncement', inputVars, inputOpts);
}
exports.editAnnouncement = editAnnouncement;

function withdrawAnnouncement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('WithdrawAnnouncement', inputVars, inputOpts);
}
exports.withdrawAnnouncement = withdrawAnnouncement;

function createVehicle(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateVehicle', inputVars, inputOpts);
}
exports.createVehicle = createVehicle;

function updateVehicle(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateVehicle', inputVars, inputOpts);
}
exports.updateVehicle = updateVehicle;

function deleteVehicle(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteVehicle', inputVars, inputOpts);
}
exports.deleteVehicle = deleteVehicle;

function createTransportRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateTransportRoute', inputVars, inputOpts);
}
exports.createTransportRoute = createTransportRoute;

function updateTransportRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpdateTransportRoute', inputVars, inputOpts);
}
exports.updateTransportRoute = updateTransportRoute;

function setRouteVehicle(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetRouteVehicle', inputVars, inputOpts);
}
exports.setRouteVehicle = setRouteVehicle;

function clearRouteVehicle(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClearRouteVehicle', inputVars, inputOpts);
}
exports.clearRouteVehicle = clearRouteVehicle;

function setRouteDriver(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetRouteDriver', inputVars, inputOpts);
}
exports.setRouteDriver = setRouteDriver;

function clearRouteDriver(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClearRouteDriver', inputVars, inputOpts);
}
exports.clearRouteDriver = clearRouteDriver;

function deleteTransportRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteTransportRoute', inputVars, inputOpts);
}
exports.deleteTransportRoute = deleteTransportRoute;

function clearRouteStops(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('ClearRouteStops', inputVars, inputOpts);
}
exports.clearRouteStops = clearRouteStops;

function addRouteStop(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddRouteStop', inputVars, inputOpts);
}
exports.addRouteStop = addRouteStop;

function setStudentRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SetStudentRoute', inputVars, inputOpts);
}
exports.setStudentRoute = setStudentRoute;

function removeStudentRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveStudentRoute', inputVars, inputOpts);
}
exports.removeStudentRoute = removeStudentRoute;

function createStudentLeave(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStudentLeave', inputVars, inputOpts);
}
exports.createStudentLeave = createStudentLeave;

function createStudentLeaveNotifyTeacher(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStudentLeaveNotifyTeacher', inputVars, inputOpts);
}
exports.createStudentLeaveNotifyTeacher = createStudentLeaveNotifyTeacher;

function decideStudentLeave(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DecideStudentLeave', inputVars, inputOpts);
}
exports.decideStudentLeave = decideStudentLeave;

function cancelStudentLeave(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CancelStudentLeave', inputVars, inputOpts);
}
exports.cancelStudentLeave = cancelStudentLeave;

function addLearningResource(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddLearningResource', inputVars, inputOpts);
}
exports.addLearningResource = addLearningResource;

function removeLearningResource(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('RemoveLearningResource', inputVars, inputOpts);
}
exports.removeLearningResource = removeLearningResource;

function listStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStaff', inputVars, inputOpts);
}
exports.listStaff = listStaff;

function getUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetUser', inputVars, inputOpts);
}
exports.getUser = getUser;

function getMembership(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMembership', inputVars, inputOpts);
}
exports.getMembership = getMembership;

function listMembershipsForUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMembershipsForUser', inputVars, inputOpts);
}
exports.listMembershipsForUser = listMembershipsForUser;

function getSchool(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetSchool', inputVars, inputOpts);
}
exports.getSchool = getSchool;

function getSchoolBySubDomain(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetSchoolBySubDomain', inputVars, inputOpts);
}
exports.getSchoolBySubDomain = getSchoolBySubDomain;

function listSchools(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListSchools', inputVars, inputOpts);
}
exports.listSchools = listSchools;

function listMemberships(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMemberships', inputVars, inputOpts);
}
exports.listMemberships = listMemberships;

function listInvitations(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListInvitations', inputVars, inputOpts);
}
exports.listInvitations = listInvitations;

function getInvitationByTokenHash(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetInvitationByTokenHash', inputVars, inputOpts);
}
exports.getInvitationByTokenHash = getInvitationByTokenHash;

function listAuditLog(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAuditLog', inputVars, inputOpts);
}
exports.listAuditLog = listAuditLog;

function getSchoolProfile(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetSchoolProfile', inputVars, inputOpts);
}
exports.getSchoolProfile = getSchoolProfile;

function listGradeLevels(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListGradeLevels', inputVars, inputOpts);
}
exports.listGradeLevels = listGradeLevels;

function listClassrooms(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListClassrooms', inputVars, inputOpts);
}
exports.listClassrooms = listClassrooms;

function listSubjects(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListSubjects', inputVars, inputOpts);
}
exports.listSubjects = listSubjects;

function listAcademicYears(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAcademicYears', inputVars, inputOpts);
}
exports.listAcademicYears = listAcademicYears;

function schoolSeq(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('SchoolSeq', inputVars, inputOpts);
}
exports.schoolSeq = schoolSeq;

function listStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStudents', inputVars, inputOpts);
}
exports.listStudents = listStudents;

function countStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountStudents', inputVars, inputOpts);
}
exports.countStudents = countStudents;

function getStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStudent', inputVars, inputOpts);
}
exports.getStudent = getStudent;

function staffSeqInfo(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffSeqInfo', inputVars, inputOpts);
}
exports.staffSeqInfo = staffSeqInfo;

function listStaffProfiles(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStaffProfiles', inputVars, inputOpts);
}
exports.listStaffProfiles = listStaffProfiles;

function countStaffProfiles(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountStaffProfiles', inputVars, inputOpts);
}
exports.countStaffProfiles = countStaffProfiles;

function getStaffProfile(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStaffProfile', inputVars, inputOpts);
}
exports.getStaffProfile = getStaffProfile;

function listStaffDepartments(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStaffDepartments', inputVars, inputOpts);
}
exports.listStaffDepartments = listStaffDepartments;

function applicationSeqInfo(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ApplicationSeqInfo', inputVars, inputOpts);
}
exports.applicationSeqInfo = applicationSeqInfo;

function listApplications(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListApplications', inputVars, inputOpts);
}
exports.listApplications = listApplications;

function countApplications(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountApplications', inputVars, inputOpts);
}
exports.countApplications = countApplications;

function getApplication(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetApplication', inputVars, inputOpts);
}
exports.getApplication = getApplication;

function listFeeStructures(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListFeeStructures', inputVars, inputOpts);
}
exports.listFeeStructures = listFeeStructures;

function getFeeStructure(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetFeeStructure', inputVars, inputOpts);
}
exports.getFeeStructure = getFeeStructure;

function getFeeItem(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetFeeItem', inputVars, inputOpts);
}
exports.getFeeItem = getFeeItem;

function getFeeInstalment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetFeeInstalment', inputVars, inputOpts);
}
exports.getFeeInstalment = getFeeInstalment;

function listConcessions(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListConcessions', inputVars, inputOpts);
}
exports.listConcessions = listConcessions;

function getStudentLevel(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStudentLevel', inputVars, inputOpts);
}
exports.getStudentLevel = getStudentLevel;

function findImportBatch(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('FindImportBatch', inputVars, inputOpts);
}
exports.findImportBatch = findImportBatch;

function studentsByEnrollmentIds(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StudentsByEnrollmentIds', inputVars, inputOpts);
}
exports.studentsByEnrollmentIds = studentsByEnrollmentIds;

function studentIdentities(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StudentIdentities', inputVars, inputOpts);
}
exports.studentIdentities = studentIdentities;

function staffIdentities(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffIdentities', inputVars, inputOpts);
}
exports.staffIdentities = staffIdentities;

function listInvoices(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListInvoices', inputVars, inputOpts);
}
exports.listInvoices = listInvoices;

function countInvoices(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountInvoices', inputVars, inputOpts);
}
exports.countInvoices = countInvoices;

function getInvoice(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetInvoice', inputVars, inputOpts);
}
exports.getInvoice = getInvoice;

function invoicedForYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('InvoicedForYear', inputVars, inputOpts);
}
exports.invoicedForYear = invoicedForYear;

function countInvoicesForInstalments(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountInvoicesForInstalments', inputVars, inputOpts);
}
exports.countInvoicesForInstalments = countInvoicesForInstalments;

function getPayment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetPayment', inputVars, inputOpts);
}
exports.getPayment = getPayment;

function unpaidTotals(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('UnpaidTotals', inputVars, inputOpts);
}
exports.unpaidTotals = unpaidTotals;

function placedStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('PlacedStudents', inputVars, inputOpts);
}
exports.placedStudents = placedStudents;

function listReceipts(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListReceipts', inputVars, inputOpts);
}
exports.listReceipts = listReceipts;

function countReceipts(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountReceipts', inputVars, inputOpts);
}
exports.countReceipts = countReceipts;

function getReceipt(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetReceipt', inputVars, inputOpts);
}
exports.getReceipt = getReceipt;

function getReceiptByPayment(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetReceiptByPayment', inputVars, inputOpts);
}
exports.getReceiptByPayment = getReceiptByPayment;

function listSalaryLines(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListSalaryLines', inputVars, inputOpts);
}
exports.listSalaryLines = listSalaryLines;

function staffForPayroll(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffForPayroll', inputVars, inputOpts);
}
exports.staffForPayroll = staffForPayroll;

function listPayrollRuns(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListPayrollRuns', inputVars, inputOpts);
}
exports.listPayrollRuns = listPayrollRuns;

function findPayrollRun(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('FindPayrollRun', inputVars, inputOpts);
}
exports.findPayrollRun = findPayrollRun;

function getPayrollRun(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetPayrollRun', inputVars, inputOpts);
}
exports.getPayrollRun = getPayrollRun;

function getPayslip(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetPayslip', inputVars, inputOpts);
}
exports.getPayslip = getPayslip;

function payrollRunSum(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('PayrollRunSum', inputVars, inputOpts);
}
exports.payrollRunSum = payrollRunSum;

function payslipLine(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('PayslipLine', inputVars, inputOpts);
}
exports.payslipLine = payslipLine;

function salaryLineById(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('SalaryLineById', inputVars, inputOpts);
}
exports.salaryLineById = salaryLineById;

function paymentsInRange(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('PaymentsInRange', inputVars, inputOpts);
}
exports.paymentsInRange = paymentsInRange;

function countPaymentsInRange(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountPaymentsInRange', inputVars, inputOpts);
}
exports.countPaymentsInRange = countPaymentsInRange;

function duesInvoices(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('DuesInvoices', inputVars, inputOpts);
}
exports.duesInvoices = duesInvoices;

function countDuesInvoices(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountDuesInvoices', inputVars, inputOpts);
}
exports.countDuesInvoices = countDuesInvoices;

function listPeriods(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListPeriods', inputVars, inputOpts);
}
exports.listPeriods = listPeriods;

function schoolWorkingDays(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('SchoolWorkingDays', inputVars, inputOpts);
}
exports.schoolWorkingDays = schoolWorkingDays;

function listTeacherSubjects(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTeacherSubjects', inputVars, inputOpts);
}
exports.listTeacherSubjects = listTeacherSubjects;

function listClassTeachers(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListClassTeachers', inputVars, inputOpts);
}
exports.listClassTeachers = listClassTeachers;

function staffOfUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffOfUser', inputVars, inputOpts);
}
exports.staffOfUser = staffOfUser;

function parentLinksOfUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ParentLinksOfUser', inputVars, inputOpts);
}
exports.parentLinksOfUser = parentLinksOfUser;

function parentLinksOfStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ParentLinksOfStudent', inputVars, inputOpts);
}
exports.parentLinksOfStudent = parentLinksOfStudent;

function enrollmentsOfStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('EnrollmentsOfStudents', inputVars, inputOpts);
}
exports.enrollmentsOfStudents = enrollmentsOfStudents;

function listTimetableForYear(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTimetableForYear', inputVars, inputOpts);
}
exports.listTimetableForYear = listTimetableForYear;

function listTimetableForClass(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTimetableForClass', inputVars, inputOpts);
}
exports.listTimetableForClass = listTimetableForClass;

function listTimetableForStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTimetableForStaff', inputVars, inputOpts);
}
exports.listTimetableForStaff = listTimetableForStaff;

function countTimetableForPeriod(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountTimetableForPeriod', inputVars, inputOpts);
}
exports.countTimetableForPeriod = countTimetableForPeriod;

function getAttendanceDay(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetAttendanceDay', inputVars, inputOpts);
}
exports.getAttendanceDay = getAttendanceDay;

function listAttendanceDays(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAttendanceDays', inputVars, inputOpts);
}
exports.listAttendanceDays = listAttendanceDays;

function attendanceDaysOn(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AttendanceDaysOn', inputVars, inputOpts);
}
exports.attendanceDaysOn = attendanceDaysOn;

function attendanceOfStudent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AttendanceOfStudent', inputVars, inputOpts);
}
exports.attendanceOfStudent = attendanceOfStudent;

function daysOfClass(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('DaysOfClass', inputVars, inputOpts);
}
exports.daysOfClass = daysOfClass;

function listAttendanceStatusLabels(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAttendanceStatusLabels', inputVars, inputOpts);
}
exports.listAttendanceStatusLabels = listAttendanceStatusLabels;

function classRoster(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ClassRoster', inputVars, inputOpts);
}
exports.classRoster = classRoster;

function getStaffAttendance(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStaffAttendance', inputVars, inputOpts);
}
exports.getStaffAttendance = getStaffAttendance;

function staffAttendanceOn(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffAttendanceOn', inputVars, inputOpts);
}
exports.staffAttendanceOn = staffAttendanceOn;

function staffAttendanceOfStaff(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffAttendanceOfStaff', inputVars, inputOpts);
}
exports.staffAttendanceOfStaff = staffAttendanceOfStaff;

function schoolGradeBands(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('SchoolGradeBands', inputVars, inputOpts);
}
exports.schoolGradeBands = schoolGradeBands;

function listAssessmentTerms(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAssessmentTerms', inputVars, inputOpts);
}
exports.listAssessmentTerms = listAssessmentTerms;

function listExams(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListExams', inputVars, inputOpts);
}
exports.listExams = listExams;

function getExam(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetExam', inputVars, inputOpts);
}
exports.getExam = getExam;

function countMarksOfExam(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountMarksOfExam', inputVars, inputOpts);
}
exports.countMarksOfExam = countMarksOfExam;

function countExamsOfTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountExamsOfTerm', inputVars, inputOpts);
}
exports.countExamsOfTerm = countExamsOfTerm;

function marksOfStudentInTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('MarksOfStudentInTerm', inputVars, inputOpts);
}
exports.marksOfStudentInTerm = marksOfStudentInTerm;

function listLeaveTypes(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListLeaveTypes', inputVars, inputOpts);
}
exports.listLeaveTypes = listLeaveTypes;

function countLeaveOfType(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('CountLeaveOfType', inputVars, inputOpts);
}
exports.countLeaveOfType = countLeaveOfType;

function listLeaveBalances(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListLeaveBalances', inputVars, inputOpts);
}
exports.listLeaveBalances = listLeaveBalances;

function listLeaveRequests(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListLeaveRequests', inputVars, inputOpts);
}
exports.listLeaveRequests = listLeaveRequests;

function getLeaveRequest(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetLeaveRequest', inputVars, inputOpts);
}
exports.getLeaveRequest = getLeaveRequest;

function listSubstitutions(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListSubstitutions', inputVars, inputOpts);
}
exports.listSubstitutions = listSubstitutions;

function listNotifications(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListNotifications', inputVars, inputOpts);
}
exports.listNotifications = listNotifications;

function listNotificationMutes(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListNotificationMutes', inputVars, inputOpts);
}
exports.listNotificationMutes = listNotificationMutes;

function listTombstones(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTombstones', inputVars, inputOpts);
}
exports.listTombstones = listTombstones;

function leaveRequestByClientId(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('LeaveRequestByClientId', inputVars, inputOpts);
}
exports.leaveRequestByClientId = leaveRequestByClientId;

function getSubstitution(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetSubstitution', inputVars, inputOpts);
}
exports.getSubstitution = getSubstitution;

function getTimetableEntry(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetTimetableEntry', inputVars, inputOpts);
}
exports.getTimetableEntry = getTimetableEntry;

function listUnpushedNotifications(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListUnpushedNotifications', inputVars, inputOpts);
}
exports.listUnpushedNotifications = listUnpushedNotifications;

function listDevicesForUsers(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListDevicesForUsers', inputVars, inputOpts);
}
exports.listDevicesForUsers = listDevicesForUsers;

function listDevicesOfUser(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListDevicesOfUser', inputVars, inputOpts);
}
exports.listDevicesOfUser = listDevicesOfUser;

function getSchoolGeofence(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetSchoolGeofence', inputVars, inputOpts);
}
exports.getSchoolGeofence = getSchoolGeofence;

function listAnnouncements(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAnnouncements', inputVars, inputOpts);
}
exports.listAnnouncements = listAnnouncements;

function getAnnouncement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetAnnouncement', inputVars, inputOpts);
}
exports.getAnnouncement = getAnnouncement;

function listVehicles(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListVehicles', inputVars, inputOpts);
}
exports.listVehicles = listVehicles;

function listTransportRoutes(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListTransportRoutes', inputVars, inputOpts);
}
exports.listTransportRoutes = listTransportRoutes;

function getTransportRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetTransportRoute', inputVars, inputOpts);
}
exports.getTransportRoute = getTransportRoute;

function studentRoutesOfRoute(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StudentRoutesOfRoute', inputVars, inputOpts);
}
exports.studentRoutesOfRoute = studentRoutesOfRoute;

function studentRoutesOfStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StudentRoutesOfStudents', inputVars, inputOpts);
}
exports.studentRoutesOfStudents = studentRoutesOfStudents;

function staffWithAccounts(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StaffWithAccounts', inputVars, inputOpts);
}
exports.staffWithAccounts = staffWithAccounts;

function studentLeaveByClientId(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('StudentLeaveByClientId', inputVars, inputOpts);
}
exports.studentLeaveByClientId = studentLeaveByClientId;

function getStudentLeave(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetStudentLeave', inputVars, inputOpts);
}
exports.getStudentLeave = getStudentLeave;

function listStudentLeaves(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStudentLeaves', inputVars, inputOpts);
}
exports.listStudentLeaves = listStudentLeaves;

function listStudentLeavesOfStudents(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListStudentLeavesOfStudents', inputVars, inputOpts);
}
exports.listStudentLeavesOfStudents = listStudentLeavesOfStudents;

function approvedStudentLeaveOn(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ApprovedStudentLeaveOn', inputVars, inputOpts);
}
exports.approvedStudentLeaveOn = approvedStudentLeaveOn;

function listLearningResources(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListLearningResources', inputVars, inputOpts);
}
exports.listLearningResources = listLearningResources;

function listLearningResourcesOfClasses(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListLearningResourcesOfClasses', inputVars, inputOpts);
}
exports.listLearningResourcesOfClasses = listLearningResourcesOfClasses;

function getLearningResource(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetLearningResource', inputVars, inputOpts);
}
exports.getLearningResource = getLearningResource;

