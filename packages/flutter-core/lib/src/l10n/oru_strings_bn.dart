// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class OruStringsBn extends OruStrings {
  OruStringsBn([String locale = 'bn']) : super(locale);

  @override
  String get appTeacher => 'OruSchools Teacher';

  @override
  String get appStaff => 'OruSchools Staff';

  @override
  String get appParent => 'OruSchools Parent';

  @override
  String get appDriver => 'OruSchools Driver';

  @override
  String get appErp => 'OruSchools ERP';

  @override
  String get appPlatform => 'OruSchools Platform';

  @override
  String get appWebsite => 'OruSchools. Schools. People. Progress.';

  @override
  String get scaffoldNotice =>
      'This app is scaffolded and uses the OruSchools theme. Features arrive in the implementation plan.';

  @override
  String greetingMorning(String name) {
    return 'Good morning, $name';
  }

  @override
  String greetingAfternoon(String name) {
    return 'Good afternoon, $name';
  }

  @override
  String greetingEvening(String name) {
    return 'Good evening, $name';
  }

  @override
  String get actionRetry => 'Retry';

  @override
  String get actionUploadNow => 'Upload now';

  @override
  String get actionTakeAttendance => 'Take attendance';

  @override
  String get actionMarkAllPresent => 'Mark all present';

  @override
  String get actionSubmitAttendance => 'Submit attendance';

  @override
  String get actionSave => 'Save';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get syncSynced => 'Synced';

  @override
  String get syncSavedOnDevice => 'Saved on device';

  @override
  String syncChangesPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes pending',
      one: '$count change pending',
    );
    return '$_temp0';
  }

  @override
  String get syncSyncing => 'Syncing…';

  @override
  String get syncOffline => 'You’re offline';

  @override
  String get syncFailed => 'Sync failed';

  @override
  String get statusPresent => 'Present';

  @override
  String get statusAbsent => 'Absent';

  @override
  String get statusLate => 'Late';

  @override
  String get statusLeave => 'Leave';

  @override
  String get statusMedical => 'Medical';

  @override
  String get statusHalfDay => 'Half day';

  @override
  String get statusExcused => 'Excused';

  @override
  String get errorServerUnreachable =>
      'We could not reach the school server. Your work is saved on this phone.';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get saasSignInTitle => 'Sign in to the platform';

  @override
  String get saasSignInIntro =>
      'This area is for the OruSchools platform owner.';

  @override
  String get authEmailLabel => 'Email address';

  @override
  String get authPasswordLabel => 'Password';

  @override
  String get actionSignIn => 'Sign in';

  @override
  String get actionSignInGoogle => 'Continue with Google';

  @override
  String get actionSignInPhone => 'Use a mobile number instead';

  @override
  String get actionSignInEmail => 'Use email instead';

  @override
  String get authPhoneLabel => 'Mobile number';

  @override
  String get authPhoneHint =>
      'Include the country code, for example +91 98765 43210';

  @override
  String get actionSendCode => 'Send code';

  @override
  String get authCodeLabel => '6-digit code';

  @override
  String get actionVerifyCode => 'Verify code';

  @override
  String get authOr => 'or';

  @override
  String get actionSignOut => 'Sign out';

  @override
  String get authSigningIn => 'Signing in…';

  @override
  String get authErrorCredentials => 'The email or password is not correct.';

  @override
  String get authErrorTooMany =>
      'Too many attempts. Try again in a few minutes.';

  @override
  String get authErrorNetwork =>
      'We could not reach the sign-in service. Check your connection.';

  @override
  String get authErrorPopupClosed =>
      'The Google window was closed before sign-in finished.';

  @override
  String get authErrorCode => 'That code is not correct or has expired.';

  @override
  String get authErrorPhone => 'Enter the number with its country code.';

  @override
  String get authErrorGeneric => 'We could not sign you in. Try again.';

  @override
  String get saasNoAccessTitle => 'This account cannot use the platform area';

  @override
  String get saasNoAccessBody =>
      'Sign in with the platform owner account. Schools sign in at their own address.';

  @override
  String get saasNavLabel => 'Platform sections';

  @override
  String get saasNavSchools => 'Schools';

  @override
  String get saasSchoolsTitle => 'Schools';

  @override
  String saasSchoolsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count schools',
      one: '$count school',
    );
    return '$_temp0';
  }

  @override
  String get saasSchoolsEmptyTitle => 'No schools yet';

  @override
  String get saasSchoolsEmptyBody =>
      'Create the first school so its team can sign in.';

  @override
  String get actionCreateSchool => 'Create school';

  @override
  String get saasSchoolCreateTitle => 'Create a school';

  @override
  String get saasSchoolName => 'School name';

  @override
  String get saasSchoolSubdomain => 'Web address';

  @override
  String get saasSchoolSubdomainHint =>
      'Letters, numbers and hyphens, for example greenfield. It cannot be changed later.';

  @override
  String get saasSchoolLanguage => 'Default language';

  @override
  String get actionEdit => 'Edit';

  @override
  String get saasSchoolEditTitle => 'Edit school';

  @override
  String get actionSuspend => 'Suspend';

  @override
  String get actionReactivate => 'Reactivate';

  @override
  String saasSuspendTitle(String name) {
    return 'Suspend $name?';
  }

  @override
  String get saasSuspendBody =>
      'Nobody at this school can sign in until you reactivate it.';

  @override
  String get saasSuspendReason => 'Reason (optional)';

  @override
  String get statusActive => 'Active';

  @override
  String get statusSuspended => 'Suspended';

  @override
  String get saasCreated => 'School created';

  @override
  String get saasSaved => 'Changes saved';

  @override
  String get saasSuspendedDone => 'School suspended';

  @override
  String get saasReactivatedDone => 'School reactivated';

  @override
  String get saasLoadFailed => 'We could not load the schools';

  @override
  String get actionLoadMore => 'Show more';

  @override
  String get errorAuthRequired => 'Please sign in again.';

  @override
  String get errorForbidden => 'You do not have permission to do this.';

  @override
  String get errorNotFound => 'We could not find that.';

  @override
  String get errorInvalidRequest =>
      'Some details are not valid. Check the fields and try again.';

  @override
  String get errorConflict =>
      'That already exists. Choose a different name or address.';

  @override
  String get errorRateLimited =>
      'Too many requests. Wait a moment and try again.';

  @override
  String get errorUpstream => 'The server is busy. Try again shortly.';

  @override
  String get errorInternal => 'Something went wrong on our side. Try again.';

  @override
  String get errorNetwork =>
      'We could not reach the server. Check your connection.';

  @override
  String get errorTimeout => 'The server took too long to answer. Try again.';

  @override
  String get statusLoading => 'Loading…';

  @override
  String get actionAddAdmin => 'Add administrator';

  @override
  String saasAdminTitle(String name) {
    return 'Add the administrator of $name';
  }

  @override
  String get saasAdminIntro =>
      'They get an email to set their own password. You can add one administrator here; after that the school manages its own people.';

  @override
  String get saasAdminName => 'Full name';

  @override
  String saasAdminAdded(String email) {
    return 'Administrator added. An email to set their password was sent to $email.';
  }

  @override
  String get saasAdminAddedNoEmail =>
      'Administrator added. They can sign in with a code sent to their phone.';

  @override
  String get saasAdminEmailFailed =>
      'Administrator added, but the email could not be sent. Ask them to use “Forgot password” on the sign-in page.';

  @override
  String get saasAdminExists => 'This school already has an administrator.';

  @override
  String get errorAccountExists =>
      'An account with this email or number already exists.';

  @override
  String get authForgot => 'Forgot password?';

  @override
  String get authResetSent =>
      'If an account exists for that address, an email to set a new password is on its way.';

  @override
  String get authResetNeedsEmail => 'Enter your email address first.';

  @override
  String get saasHasAdmin => 'Administrator added';

  @override
  String get saasNoAdmin => 'No administrator yet';

  @override
  String webSignInTitle(String name) {
    return 'Sign in to $name';
  }

  @override
  String get webSignInIntro => 'Use the account your school gave you.';

  @override
  String get webSchoolNotFoundTitle => 'We could not find this school';

  @override
  String get webSchoolNotFoundBody =>
      'Check the address, or ask your school for its web address.';

  @override
  String get webNoSchoolTitle => 'Open your school\'s address';

  @override
  String get webNoSchoolBody =>
      'Each school has its own web address, for example greenfield.oruschools.com.';

  @override
  String webNoAccessTitle(String name) {
    return 'You do not have access to $name';
  }

  @override
  String get webNoAccessBody =>
      'Ask your school\'s administrator to add you, then sign in again.';

  @override
  String get webLoadFailed => 'We could not load your account';

  @override
  String get webNavLabel => 'School sections';

  @override
  String get webDashboardEmptyTitle => 'Nothing to show yet';

  @override
  String get webDashboardEmptyBody =>
      'Numbers and tasks will appear here as your school\'s modules are set up.';

  @override
  String get webComingTitle => 'This module is not ready yet';

  @override
  String get webComingBody => 'It will appear here when it is built.';

  @override
  String webYourRole(String role) {
    return 'Your role: $role';
  }

  @override
  String get errorPageTitle => 'Something went wrong on this page';

  @override
  String get actionTryAgain => 'Try again';

  @override
  String get sectionOverview => 'Overview';

  @override
  String get sectionAcademics => 'Academics';

  @override
  String get sectionPeople => 'People';

  @override
  String get sectionHr => 'HR';

  @override
  String get sectionFinance => 'Finance';

  @override
  String get sectionCommunication => 'Communication';

  @override
  String get sectionTransport => 'Transport';

  @override
  String get sectionOperations => 'Operations';

  @override
  String get sectionReports => 'Reports';

  @override
  String get sectionAdministration => 'Administration';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navStudents => 'Students';

  @override
  String get navClasses => 'Classes and subjects';

  @override
  String get navAttendance => 'Attendance';

  @override
  String get navGradebook => 'Gradebook';

  @override
  String get navSubstitution => 'Substitutions';

  @override
  String get navAdmissions => 'Admissions';

  @override
  String get navStaff => 'Staff';

  @override
  String get navStaffAttendance => 'Staff attendance';

  @override
  String get navLeave => 'Leave';

  @override
  String get navPayroll => 'Payroll';

  @override
  String get navRecruitment => 'Recruitment';

  @override
  String get navFees => 'Fees and payments';

  @override
  String get navAnnouncements => 'Announcements';

  @override
  String get navTransport => 'Transport';

  @override
  String get navOperations => 'Operations';

  @override
  String get navReportsAcademic => 'Academic reports';

  @override
  String get navReportsFinance => 'Financial reports';

  @override
  String get navReportsHr => 'HR reports';

  @override
  String get navSettings => 'School settings';

  @override
  String get navMemberships => 'Users and roles';

  @override
  String get navAudit => 'Audit log';

  @override
  String get rolePrincipal => 'Principal';

  @override
  String get roleManagement => 'Management';

  @override
  String get roleBursar => 'Bursar';

  @override
  String get roleAcademicAdmin => 'Academic administrator';

  @override
  String get roleSystemAdmin => 'System administrator';

  @override
  String get roleHrManager => 'HR manager';

  @override
  String get roleAccountant => 'Accountant';

  @override
  String get roleAdmissionsOfficer => 'Admissions officer';

  @override
  String get roleTransportManager => 'Transport manager';

  @override
  String get roleOperationsManager => 'Operations manager';

  @override
  String get roleTeacher => 'Teacher';

  @override
  String get roleStaff => 'Staff';

  @override
  String get roleDriver => 'Driver';

  @override
  String get roleParent => 'Parent';

  @override
  String get errorUploadInvalid =>
      'Choose a PNG, JPEG or WebP image up to 2 MB.';

  @override
  String get errorUploadFailed => 'The file could not be uploaded. Try again.';

  @override
  String get receiptTitle => 'Fee receipt';

  @override
  String get receiptNumber => 'Receipt no.';

  @override
  String get receiptDate => 'Date';

  @override
  String get receiptStudent => 'Student';

  @override
  String get receiptEnrollment => 'Enrolment no.';

  @override
  String get receiptClass => 'Class';

  @override
  String get receiptFor => 'Payment for';

  @override
  String get receiptAmountPaid => 'Amount paid';

  @override
  String get receiptMethod => 'Paid by';

  @override
  String get receiptReference => 'Reference';

  @override
  String get receiptBalance => 'Balance on this invoice';

  @override
  String get receiptReceivedBy => 'Received by';

  @override
  String get receiptCancelled => 'CANCELLED';

  @override
  String get receiptFooter => 'This is a computer-generated receipt.';

  @override
  String get paymentMethodCash => 'Cash';

  @override
  String get paymentMethodCheque => 'Cheque';

  @override
  String get paymentMethodBankTransfer => 'Bank transfer';

  @override
  String get paymentMethodUpi => 'UPI';

  @override
  String get paymentMethodOther => 'Other';

  @override
  String get payslipTitle => 'Payslip';

  @override
  String get payslipPeriod => 'Pay month';

  @override
  String get payslipEmployee => 'Employee';

  @override
  String get payslipEmployeeId => 'Employee no.';

  @override
  String get payslipDepartment => 'Department';

  @override
  String get payslipDesignation => 'Designation';

  @override
  String get payslipEarnings => 'Earnings';

  @override
  String get payslipDeductions => 'Deductions';

  @override
  String get payslipGross => 'Gross pay';

  @override
  String get payslipTotalDeductions => 'Total deductions';

  @override
  String get payslipNetPay => 'Net pay';

  @override
  String get payslipPaidOn => 'Paid on';

  @override
  String get payslipFooter => 'This is a computer-generated payslip.';

  @override
  String get reportCollectionsTitle => 'Fee collections';

  @override
  String get reportDuesTitle => 'Fees outstanding';

  @override
  String get reportPayrollTitle => 'Payroll summary';

  @override
  String get reportAsOf => 'As of';

  @override
  String get reportYear => 'Year';

  @override
  String get reportStatus => 'Status';

  @override
  String get reportReversed => 'Reversed';

  @override
  String get reportTotal => 'Total';

  @override
  String get gradesReportCardTitle => 'Report card';

  @override
  String get gradesTerm => 'Term';

  @override
  String get gradesSubject => 'Subject';

  @override
  String get gradesMarks => 'Marks';

  @override
  String get gradesOutOf => 'Out of';

  @override
  String get gradesPercent => 'Percent';

  @override
  String get gradesGrade => 'Grade';

  @override
  String get reportDueDate => 'Due date';

  @override
  String get reportAmountDue => 'Amount due';

  @override
  String get reportOutstanding => 'Outstanding';

  @override
  String get reportDaysOverdue => 'Days overdue';

  @override
  String get reportMonth => 'Month';

  @override
  String get reportHeadcount => 'Staff';

  @override
  String get reportApproved => 'Approved';

  @override
  String get reportPaid => 'Paid';

  @override
  String get webFrom => 'From';

  @override
  String get webTo => 'To';

  @override
  String get webDownloadCsv => 'Download CSV';

  @override
  String get webDownloadPdf => 'Download PDF';

  @override
  String get webDownloadFailed => 'The file could not be made. Try again.';

  @override
  String get webAtAGlance => 'At a glance';

  @override
  String get webCollectedThisMonth => 'Collected this month';

  @override
  String webPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count payments',
      one: '$count payment',
    );
    return '$_temp0';
  }

  @override
  String get webOutstandingFees => 'Outstanding fees';

  @override
  String webInvoicesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count invoices',
      one: '$count invoice',
    );
    return '$_temp0';
  }

  @override
  String get webByMethod => 'By payment method';

  @override
  String get webByAge => 'By how long overdue';

  @override
  String get webBandDueToday => 'Due today';

  @override
  String get webBand1To30 => '1 to 30 days overdue';

  @override
  String get webBand31To60 => '31 to 60 days overdue';

  @override
  String get webBand61To90 => '61 to 90 days overdue';

  @override
  String get webBandOver90 => 'More than 90 days overdue';

  @override
  String get webNoRowsTitle => 'Nothing in this range';

  @override
  String get webNoRowsBody => 'Try different dates.';

  @override
  String get webNoDuesTitle => 'No fees outstanding';

  @override
  String get webTotalsOnly =>
      'You can see the totals but not the individual payments.';

  @override
  String get webPrevious => 'Previous';

  @override
  String get webNext => 'Next';

  @override
  String webPageOf(String page, String pages) {
    return 'Page $page of $pages';
  }

  @override
  String get webCollected => 'Collected';

  @override
  String get peoSearch => 'Search by name or enrolment no.';

  @override
  String get peoAll => 'All';

  @override
  String get peoInactive => 'Inactive';

  @override
  String get peoLeft => 'Left';

  @override
  String get peoAddStudent => 'Add student';

  @override
  String get peoFirstName => 'First name';

  @override
  String get peoLastName => 'Last name';

  @override
  String get peoDateOfBirth => 'Date of birth';

  @override
  String get peoGender => 'Gender';

  @override
  String get peoFemale => 'Female';

  @override
  String get peoMale => 'Male';

  @override
  String get peoAddress => 'Address';

  @override
  String get peoClass => 'Class';

  @override
  String get peoNoStudentsTitle => 'No students yet';

  @override
  String get peoNoStudentsBody => 'Add the first student, or import a list.';

  @override
  String get peoNoMatch => 'No student matches this search.';

  @override
  String get peoStudentAdded => 'Student added';

  @override
  String get peoGuardians => 'Guardians';

  @override
  String get peoNoGuardians => 'No guardians recorded';

  @override
  String get peoRelationship => 'Relationship';

  @override
  String get peoMother => 'Mother';

  @override
  String get peoFather => 'Father';

  @override
  String get peoGuardianRel => 'Guardian';

  @override
  String get peoPrimary => 'Primary contact';

  @override
  String get peoClassHistory => 'Class history';

  @override
  String get peoAdmissionDate => 'Admission date';

  @override
  String get peoBackToList => 'Back to the list';

  @override
  String get peoCapacity => 'Capacity';

  @override
  String get peoSection => 'Section';

  @override
  String get peoLevel => 'Level';

  @override
  String get peoNoClassesTitle => 'No classes yet';

  @override
  String get peoApplications => 'Applications';

  @override
  String get peoNewApplication => 'New application';

  @override
  String get peoApplicationNo => 'Application no.';

  @override
  String get peoApplicant => 'Applicant';

  @override
  String get peoLevelApplied => 'Level applied for';

  @override
  String get peoGuardianName => 'Guardian name';

  @override
  String get peoGuardianPhone => 'Guardian phone';

  @override
  String get peoSubmitted => 'Submitted';

  @override
  String get peoUnderReview => 'Under review';

  @override
  String get peoAccepted => 'Accepted';

  @override
  String get peoRejected => 'Rejected';

  @override
  String get peoWithdrawn => 'Withdrawn';

  @override
  String get peoAdmitted => 'Admitted';

  @override
  String get peoStartReview => 'Start review';

  @override
  String get peoAccept => 'Accept';

  @override
  String get peoReject => 'Reject';

  @override
  String get peoWithdraw => 'Mark as withdrawn';

  @override
  String get peoNote => 'Note (optional)';

  @override
  String get peoAdmitStudent => 'Admit student';

  @override
  String peoStudentAdmitted(String id) {
    return 'Student admitted. Enrolment no. $id';
  }

  @override
  String get peoNoApplicationsTitle => 'No applications yet';

  @override
  String get peoApplicationSaved => 'Application saved';

  @override
  String get hrpAddStaff => 'Add staff member';

  @override
  String get hrpSearch => 'Search by name or employee no.';

  @override
  String get hrpAllDepartments => 'All departments';

  @override
  String get hrpJoined => 'Date of joining';

  @override
  String get hrpNoStaffTitle => 'No staff yet';

  @override
  String get hrpNoMatch => 'No staff member matches this search.';

  @override
  String get hrpStaffAdded => 'Staff member added';

  @override
  String get hrpSalary => 'Salary';

  @override
  String get hrpEarning => 'Earning';

  @override
  String get hrpDeduction => 'Deduction';

  @override
  String get hrpKind => 'Type';

  @override
  String get hrpComponent => 'Component';

  @override
  String get hrpAmount => 'Amount';

  @override
  String get hrpAmountHint => 'In rupees, for example 45,000.50';

  @override
  String get hrpAddLine => 'Add salary line';

  @override
  String get hrpNoLines => 'No salary set yet';

  @override
  String get hrpRemove => 'Remove';

  @override
  String get hrpNewRun => 'New pay run';

  @override
  String get hrpRunCreated => 'Pay run created';

  @override
  String get hrpDraft => 'Draft';

  @override
  String get hrpPreparedBy => 'Prepared by';

  @override
  String get hrpApprovedBy => 'Approved by';

  @override
  String get hrpApprove => 'Approve';

  @override
  String get hrpPay => 'Mark as paid';

  @override
  String get hrpDeleteRun => 'Delete draft';

  @override
  String get hrpConfirm => 'Confirm';

  @override
  String hrpConfirmApprove(String month, String count, String net) {
    return 'Approve payroll for $month? $count staff, net pay $net. This cannot be undone.';
  }

  @override
  String hrpConfirmPay(String net, String month) {
    return 'Record payment of $net for $month? This cannot be undone.';
  }

  @override
  String hrpConfirmDelete(String month) {
    return 'Delete the draft for $month? You can make it again.';
  }

  @override
  String hrpRunTitle(String month) {
    return 'Payroll $month';
  }

  @override
  String get hrpDetails => 'Details';

  @override
  String get hrpPayslipPdf => 'Payslip PDF';

  @override
  String get hrpNoRunsTitle => 'No pay runs yet';

  @override
  String get hrpNoRunsBody =>
      'Set up salaries on each staff member first, then create the month\'s run.';

  @override
  String get feeTabInvoices => 'Invoices';

  @override
  String get feeTabReceipts => 'Receipts';

  @override
  String get feeTabStructures => 'Fee structures';

  @override
  String get feeStatusOverdue => 'Overdue';

  @override
  String get feeStatusPartial => 'Part paid';

  @override
  String get feeStatusPending => 'Not paid';

  @override
  String get feeBilled => 'Billed';

  @override
  String get feeNewInvoice => 'New invoice';

  @override
  String get feeBillFees => 'Bill fees';

  @override
  String get feeDescription => 'Description';

  @override
  String get feeFindStudent => 'Find a student by name or enrolment no.';

  @override
  String get feeInvoiceCreated => 'Invoice created';

  @override
  String get feeRecordPayment => 'Record payment';

  @override
  String feePaymentRecorded(String number) {
    return 'Payment recorded. Receipt no. $number';
  }

  @override
  String get feePayments => 'Payments';

  @override
  String get feeNoPayments => 'No payments yet';

  @override
  String get feeMethod => 'Payment method';

  @override
  String get feeReverse => 'Reverse';

  @override
  String get feeReason => 'Reason';

  @override
  String feeConfirmReverse(String amount) {
    return 'Reverse this payment of $amount? The invoice becomes unpaid again and the receipt is cancelled. This cannot be undone.';
  }

  @override
  String get feeReceiptPdf => 'Receipt PDF';

  @override
  String get feeBillIntro =>
      'Makes an invoice for every instalment due on or before the date, for the students of the level you choose (or all). Instalments already billed are left alone.';

  @override
  String get feeBillUpTo => 'Instalments due up to';

  @override
  String get feePreview => 'Preview';

  @override
  String get feeCreateInvoices => 'Create invoices';

  @override
  String feePreviewResult(String created, String already, String without) {
    return '$created invoices would be created. Already billed: $already. Students without fees set up: $without.';
  }

  @override
  String feeCreatedResult(String created, String already) {
    return '$created invoices created. Already billed: $already.';
  }

  @override
  String get feeLevelAll => 'All levels';

  @override
  String get feeReceiptsTotal => 'Total received';

  @override
  String get feeNoReceiptsTitle => 'No receipts yet';

  @override
  String get feeNoInvoicesTitle => 'No invoices yet';

  @override
  String get feeNoInvoicesBody => 'Set up fees, then bill them.';

  @override
  String get feeNewStructure => 'New fee structure';

  @override
  String get feeStructureCreated => 'Fee structure created';

  @override
  String get feeAddFee => 'Add a fee';

  @override
  String get feeFeeName => 'Fee name';

  @override
  String get feeInstalments => 'Instalments';

  @override
  String get feeInstalmentLabel => 'Label';

  @override
  String get feeAddInstalment => 'Add instalment';

  @override
  String get feeNoStructuresTitle => 'No fee structures yet';

  @override
  String get feeStructureTotal => 'Total for the year';

  @override
  String get feeFeeAdded => 'Fee added';

  @override
  String get feeNoItems => 'No fees in this structure yet';

  @override
  String get setTabClasses => 'Classes';

  @override
  String get setTabSubjects => 'Subjects';

  @override
  String get setTabYears => 'Academic years';

  @override
  String get setAddClass => 'Add class';

  @override
  String get setClassAdded => 'Class added';

  @override
  String get setSectionHint => 'Section letter, for example A';

  @override
  String get setAddSubject => 'Add subject';

  @override
  String get setSubjectName => 'Subject name';

  @override
  String get setSubjectCode => 'Short code';

  @override
  String get setNoSubjects => 'No subjects yet';

  @override
  String get setSubjectAdded => 'Subject added';

  @override
  String get setNewYear => 'New academic year';

  @override
  String get setYearName => 'Name, for example 2027-2028';

  @override
  String get setStartDate => 'Start date';

  @override
  String get setEndDate => 'End date';

  @override
  String get setMakeActive => 'Make active';

  @override
  String setConfirmActivate(String name) {
    return 'Make $name the active academic year? New students, invoices and receipts will use it.';
  }

  @override
  String get setYearAdded => 'Academic year added';

  @override
  String get setProfileTitle => 'School profile';

  @override
  String get setBrandColour => 'Brand colour';

  @override
  String get setBrandHint =>
      'A dark colour written as # and six letters or digits, so white text on it is easy to read.';

  @override
  String get setProfileSaved => 'Settings saved';

  @override
  String get setImport => 'Import from CSV';

  @override
  String get setImportIntro =>
      'Choose a CSV file. It is checked first, and nothing is saved until you confirm.';

  @override
  String get setChooseFile => 'CSV file';

  @override
  String get setCheckFile => 'Check the file';

  @override
  String setCheckResult(String valid, String total, String errors) {
    return '$valid of $total rows are ready. $errors rows have problems.';
  }

  @override
  String setMissingColumns(String names) {
    return 'Missing columns: $names';
  }

  @override
  String setProblemLine(String row, String column, String rule) {
    return 'Row $row, $column: $rule';
  }

  @override
  String get setAlreadyImported => 'This file was already imported.';

  @override
  String setImportNow(String count) {
    return 'Import $count rows';
  }

  @override
  String setImportDone(String count) {
    return '$count records created.';
  }

  @override
  String setImportFailed(String count) {
    return '$count rows could not be created.';
  }

  @override
  String get hrrByDepartment => 'By department';

  @override
  String get hrrNoDepartment => 'No department';

  @override
  String get hrrNoRunsTitle => 'No approved or paid pay runs in this year';

  @override
  String get webApplicationsWaiting => 'Applications waiting for review';

  @override
  String get webRunsWaiting => 'Pay runs waiting for approval';

  @override
  String get webFieldRoleTitle => 'Your role works in the mobile app';

  @override
  String get webFieldRoleBody =>
      'This web area is for administrators. Open the OruSchools app on your phone.';

  @override
  String get usrTabMembers => 'Members';

  @override
  String get usrTabInvitations => 'Invitations';

  @override
  String get usrSince => 'Member since';

  @override
  String get usrYou => 'You';

  @override
  String get usrChangeRole => 'Change role';

  @override
  String get usrRole => 'Role';

  @override
  String usrConfirmRole(String name, String role) {
    return 'Change $name to $role? Their screens change at once.';
  }

  @override
  String usrConfirmSuspend(String name) {
    return 'Suspend $name? They cannot sign in until you reactivate them.';
  }

  @override
  String usrConfirmRemove(String name) {
    return 'Remove $name from this school? They lose their place here.';
  }

  @override
  String get usrNewAccount => 'Create an account';

  @override
  String get usrAccountIntro =>
      'For a person who works at the school and does not have an account yet. They sign in with email or a mobile number.';

  @override
  String get usrDisplayName => 'Full name';

  @override
  String usrAccountCreated(String name) {
    return 'Account created for $name.';
  }

  @override
  String usrLinkSent(String email) {
    return 'A link to set a password was sent to $email.';
  }

  @override
  String get usrLinkFailed =>
      'The account was created, but the link could not be sent.';

  @override
  String get usrSendLink => 'Send the link again';

  @override
  String get usrNewInvitation => 'Invite someone';

  @override
  String get usrInvitationIntro =>
      'Makes a one-time code. Give it to the person: after they sign in they enter it to join this school.';

  @override
  String get usrExpiresIn => 'Valid for (days)';

  @override
  String get usrInvitationCode =>
      'One-time code. Copy it now: it is shown only once.';

  @override
  String get usrRevoke => 'Cancel invitation';

  @override
  String get usrExpires => 'Expires';

  @override
  String get usrPending => 'Pending';

  @override
  String get usrCancelled => 'Cancelled';

  @override
  String get usrNoInvitations => 'No invitations yet';

  @override
  String get usrHaveCode => 'I have an invitation code';

  @override
  String get usrEnterCode => 'Invitation code';

  @override
  String get usrJoin => 'Join';

  @override
  String usrJoined(String role) {
    return 'You joined as $role. Loading your school…';
  }

  @override
  String get errorInvitationInvalid =>
      'This code is not valid, or it has expired. Ask the school for a new one.';

  @override
  String get errorEmailNotVerified =>
      'Verify your email address first, then try again.';

  @override
  String get errorOwnMembership =>
      'You cannot change your own role. Ask another system administrator.';
}
