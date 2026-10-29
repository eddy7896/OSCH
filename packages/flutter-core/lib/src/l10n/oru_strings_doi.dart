// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Dogri (`doi`).
class OruStringsDoi extends OruStrings {
  OruStringsDoi([String locale = 'doi']) : super(locale);

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
  String get ntBell => 'Notifications';

  @override
  String ntBellUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count unread notifications',
      one: '$count unread notification',
    );
    return '$_temp0';
  }

  @override
  String get ntEmpty => 'You have no notifications.';

  @override
  String get ntMarkAll => 'Mark all as read';

  @override
  String get ntClose => 'Close';

  @override
  String get ntSettings => 'Choose what you see';

  @override
  String get ntSettingsHint => 'Hidden kinds are kept, not deleted.';

  @override
  String get ntCatleave => 'Leave';

  @override
  String get ntCatsubstitution => 'Substitutions';

  @override
  String get ntCatpayroll => 'Payroll';

  @override
  String get ntCatannouncement => 'Announcements';

  @override
  String get notifAnnouncementPostedTitle => 'New announcement';

  @override
  String notifAnnouncementPostedBody(String title) {
    return '$title';
  }

  @override
  String get ntUnread => 'Unread';

  @override
  String get ntLoadFailed => 'The notifications could not be loaded.';

  @override
  String get sbPeriod => 'Period';

  @override
  String get lvViewLabel => 'Leave view';

  @override
  String get lvTabRequests => 'Requests';

  @override
  String get lvTabTypes => 'Types and allowances';

  @override
  String get lvAll => 'All';

  @override
  String get lvStatus => 'Status';

  @override
  String get lvStatusPENDING => 'Pending';

  @override
  String get lvStatusAPPROVED => 'Approved';

  @override
  String get lvStatusREJECTED => 'Rejected';

  @override
  String get lvStatusCANCELLED => 'Cancelled';

  @override
  String get lvPerson => 'Person';

  @override
  String get lvType => 'Type';

  @override
  String get lvDates => 'Dates';

  @override
  String get lvDays => 'Days';

  @override
  String get lvDecision => 'Decision';

  @override
  String get lvHalfMORNING => 'morning';

  @override
  String get lvHalfAFTERNOON => 'afternoon';

  @override
  String get lvNoRequests => 'There are no leave requests.';

  @override
  String get lvApprove => 'Approve';

  @override
  String get lvReject => 'Reject';

  @override
  String lvRejectQuestion(String name) {
    return 'Reject the leave of $name?';
  }

  @override
  String get lvRejectNote => 'Note for the person (optional)';

  @override
  String get lvApproved => 'Leave approved';

  @override
  String get lvRejected => 'Leave rejected';

  @override
  String get lvNotPending => 'This request was already decided.';

  @override
  String get lvOverBalance => 'That is more than the days left.';

  @override
  String get lvOverlap => 'That overlaps other leave of the same person.';

  @override
  String get lvTypeName => 'Name';

  @override
  String get lvPaid => 'Paid';

  @override
  String get lvUnpaid => 'Unpaid';

  @override
  String get lvQuota => 'Days a year';

  @override
  String get lvAddType => 'Add a leave type';

  @override
  String get lvTypeAdded => 'Leave type added';

  @override
  String get lvIsPaid => 'Paid leave (takes days from a yearly allowance)';

  @override
  String get lvNoTypes => 'There are no leave types yet.';

  @override
  String get lvTypeInUse =>
      'This leave type has requests and cannot be removed.';

  @override
  String get lvPaidNeedsQuota =>
      'A paid type needs a number of days a year, whole or half.';

  @override
  String get lvAllowances => 'Allowances';

  @override
  String get lvPickPerson => 'Person';

  @override
  String get lvAllowed => 'Allowed';

  @override
  String get lvRemaining => 'Left';

  @override
  String lvAllowedFor(String type) {
    return 'Allowed days for $type';
  }

  @override
  String get lvAllowanceSaved => 'Allowance saved';

  @override
  String get lvBelowTaken => 'That is less than the days already taken.';

  @override
  String get lvStandardHint =>
      'The yearly allowance of the type, until the person asks for it.';

  @override
  String get lvWholeOrHalf =>
      'Use a whole or half number of days, like 12 or 7.5.';

  @override
  String get sbFrom => 'From';

  @override
  String get sbTo => 'To';

  @override
  String get sbAway => 'Teacher away';

  @override
  String get sbCover => 'Cover';

  @override
  String get sbNotChosen => 'Not chosen yet';

  @override
  String get sbChoose => 'Choose';

  @override
  String get sbChange => 'Change';

  @override
  String get sbRemoveCover => 'Remove cover';

  @override
  String sbSuggestionsTitle(String slot) {
    return 'Who can cover $slot';
  }

  @override
  String sbThisMonth(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count covers this month',
      one: '$count cover this month',
    );
    return '$_temp0';
  }

  @override
  String sbAssign(String name) {
    return 'Choose $name';
  }

  @override
  String get sbNoCandidates => 'Nobody is free and qualified for this lesson.';

  @override
  String get sbAssigned => 'Cover chosen';

  @override
  String get sbCleared => 'Cover removed';

  @override
  String get sbNoNeeds => 'No lessons are waiting for cover in this range.';

  @override
  String get sbHasOwnLesson => 'That teacher has a lesson of their own then.';

  @override
  String get sbOnLeave => 'That teacher is on leave then.';

  @override
  String get sbAlreadyCovering =>
      'That teacher already covers another class then.';

  @override
  String get sbSameAsAbsent =>
      'The teacher who is away cannot cover their own lesson.';

  @override
  String get sbNoLongerNeeded => 'That lesson no longer needs cover.';

  @override
  String get sbChanged =>
      'Something changed meanwhile. Look at the list again.';

  @override
  String get plTitle => 'Unpaid leave in this month';

  @override
  String get plNote =>
      'For each person with approved unpaid leave: the monthly pay times the days, divided by the school\'s working days in the month. Nothing is deducted until HR applies it.';

  @override
  String get plDays => 'Unpaid days';

  @override
  String get plProposed => 'Proposed deduction';

  @override
  String get plApply => 'Apply';

  @override
  String get plAmount => 'Amount to deduct';

  @override
  String plApplied(String amount) {
    return 'Applied: $amount';
  }

  @override
  String get plDone => 'Deduction applied';

  @override
  String get plNone => 'There is no approved unpaid leave in this month.';

  @override
  String plWithout(String names) {
    return 'Unpaid leave but no payslip in this run: $names';
  }

  @override
  String get plAlready => 'This deduction was already applied.';

  @override
  String get plAboveGross => 'That is more than the month\'s pay.';

  @override
  String get plNotDraft => 'Only a draft run can change.';

  @override
  String get gbViewLabel => 'Gradebook view';

  @override
  String get gbTabMarks => 'Marks entry';

  @override
  String get gbTabExams => 'Exams and terms';

  @override
  String get gbTabBands => 'Grade bands';

  @override
  String get gbTabCards => 'Report cards';

  @override
  String get gbPickTerm => 'Term';

  @override
  String get gbPickExam => 'Exam';

  @override
  String get gbNoTermsTitle => 'There are no terms yet';

  @override
  String get gbNoTermsBody => 'Add a term under Exams and terms first.';

  @override
  String get gbNoExams => 'There are no exams in this term yet.';

  @override
  String gbOutOf(String max) {
    return 'Out of $max';
  }

  @override
  String gbMarksFor(String name) {
    return 'Marks: $name';
  }

  @override
  String gbAbsentFor(String name) {
    return 'Absent: $name';
  }

  @override
  String get gbSaveMarks => 'Save marks';

  @override
  String get gbMarksSaved => 'Marks saved';

  @override
  String get gbAboveMax => 'A mark is above the most possible for this exam.';

  @override
  String get gbNotAMark => 'A mark must be a number with at most one decimal.';

  @override
  String get gbAbsentNoMarks => 'A student who is absent cannot have marks.';

  @override
  String get gbAddTerm => 'Add a term';

  @override
  String get gbTermName => 'Term name';

  @override
  String get gbTermAdded => 'Term added';

  @override
  String get gbNameTaken => 'That name is already used.';

  @override
  String get gbTermHasExams => 'This term still has exams.';

  @override
  String get gbAddExam => 'Add an exam';

  @override
  String get gbExamName => 'Exam name';

  @override
  String get gbExamAdded => 'Exam added';

  @override
  String get gbExamExists =>
      'This class already has an exam with that name for this subject and term.';

  @override
  String get gbExamHasMarks => 'This exam already has marks.';

  @override
  String get gbBelowMark =>
      'The most marks cannot be below a mark already given.';

  @override
  String get gbMarksField => 'Out of (marks)';

  @override
  String get gbBandsNone =>
      'No grade bands are set. Marks show a percentage without a grade.';

  @override
  String get gbBandsHint =>
      'Together the bands must cover 0 to 100 with no gap and no overlap. A percentage is never rounded up into a better band.';

  @override
  String get gbFrom => 'From (%)';

  @override
  String get gbTo => 'To (%)';

  @override
  String get gbAddBand => 'Add a band';

  @override
  String get gbUseStandard => 'Use the standard set';

  @override
  String get gbSaveBands => 'Save grade bands';

  @override
  String get gbBandsSaved => 'Grade bands saved';

  @override
  String gbRemoveBand(String label) {
    return 'Remove band $label';
  }

  @override
  String get gbBandOverlap => 'Two bands cover the same percentages.';

  @override
  String get gbBandGap => 'There is a gap between two bands.';

  @override
  String get gbBandStart => 'The lowest band must start at 0.';

  @override
  String get gbBandEnd => 'The highest band must end at 100.';

  @override
  String get gbBandLabelTaken => 'Two bands have the same grade.';

  @override
  String get gbBandBad =>
      'Each band needs whole numbers from 0 to 100, and a grade name.';

  @override
  String get gbPickStudent => 'Student';

  @override
  String gbPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count exams have no mark yet and are left out',
      one: '$count exam has no mark yet and is left out',
    );
    return '$_temp0';
  }

  @override
  String get gbPdf => 'Download the report card (PDF)';

  @override
  String get gbNoCard => 'This student has no report card for this term.';

  @override
  String get gbMarkAbsent => 'Absent';

  @override
  String get attLockDone => 'Day locked';

  @override
  String get attViewLabel => 'Attendance view';

  @override
  String get attTabRegister => 'Daily register';

  @override
  String get attTabMissing => 'Not taken yet';

  @override
  String get attTabNames => 'Status names';

  @override
  String get attDate => 'Date';

  @override
  String get attStatusPRESENT => 'Present';

  @override
  String get attStatusABSENT => 'Absent';

  @override
  String get attStatusLATE => 'Late';

  @override
  String get attStatusLEAVE => 'On leave';

  @override
  String get attStatusMEDICAL => 'Medical';

  @override
  String get attStatusHALF_DAY => 'Half day';

  @override
  String get attStatusEXCUSED => 'Excused';

  @override
  String attCount(String label, String count) {
    return '$label: $count';
  }

  @override
  String get attNotTaken =>
      'Attendance has not been taken for this class on this date. Everyone is shown as present until it is.';

  @override
  String attTakenBy(String name) {
    return 'Taken by $name';
  }

  @override
  String get attLocked => 'Locked';

  @override
  String get attLockedNote =>
      'This day is locked. Only a correction can change it, and the old and new values are recorded.';

  @override
  String get attStudent => 'Student';

  @override
  String get attStatus => 'Status';

  @override
  String get attNote => 'Note';

  @override
  String get attNoStudents => 'This class has no students yet.';

  @override
  String get attSave => 'Save attendance';

  @override
  String get attSaveCorrection => 'Save correction';

  @override
  String get attLock => 'Lock the day';

  @override
  String get attSaved => 'Attendance saved';

  @override
  String get attCorrected => 'Correction saved';

  @override
  String get attDayLocked =>
      'This day is locked. Ask the Academic administrator for a correction.';

  @override
  String get attFutureDate => 'That date has not come yet.';

  @override
  String get attMissingEmpty => 'Nothing is waiting for this date.';

  @override
  String attMissingTitle(String date) {
    return 'Classes without attendance on $date';
  }

  @override
  String get attNamesHint =>
      'Rename a status for your school. What it means and its colour stay the same.';

  @override
  String attNameFor(String status) {
    return 'Name for $status';
  }

  @override
  String get attNameSaved => 'Name saved';

  @override
  String get attNameDefault => 'Standard name';

  @override
  String get satTitleNote =>
      'Who is at work on a date. Times are in Indian Standard Time.';

  @override
  String get satIn => 'In';

  @override
  String get satOut => 'Out';

  @override
  String get satStateIN => 'At work';

  @override
  String get satStateOUT => 'Left for the day';

  @override
  String get satStateNONE => 'Not in yet';

  @override
  String get satCorrect => 'Correct';

  @override
  String satCorrectTitle(String name) {
    return 'Correct the times for $name';
  }

  @override
  String get satTimeHint => 'Write times like 09:15.';

  @override
  String get satSaved => 'Times saved';

  @override
  String get satNeedsIn => 'Enter the time in as well.';

  @override
  String get satNone => 'Nobody is on the staff list yet.';

  @override
  String ttRemoveQuestion(String name) {
    return 'Remove $name?';
  }

  @override
  String get navTimetable => 'Timetable';

  @override
  String get ttViewLabel => 'Timetable view';

  @override
  String get ttTabClass => 'By class';

  @override
  String get ttTabTeacher => 'By teacher';

  @override
  String get ttTabSchedule => 'Bell schedule';

  @override
  String get ttPickTeacher => 'Teacher';

  @override
  String get ttSubject => 'Subject';

  @override
  String get ttNoYearTitle => 'There is no active academic year';

  @override
  String get ttNoYearBody => 'Make an academic year active first.';

  @override
  String get ttNoClasses => 'There are no classes yet.';

  @override
  String get ttNoTeachers => 'There are no teachers yet.';

  @override
  String get ttNoPeriodsTitle => 'There are no periods yet';

  @override
  String get ttNoPeriodsBody =>
      'Start from a standard day or a short day, or add periods one by one.';

  @override
  String get ttEmptyCell => 'Free';

  @override
  String get ttBreak => 'Break';

  @override
  String ttEditorTitle(String slot) {
    return 'Lesson on $slot';
  }

  @override
  String get ttSetLesson => 'Set lesson';

  @override
  String get ttClearLesson => 'Clear lesson';

  @override
  String get ttSaved => 'Lesson saved';

  @override
  String get ttCleared => 'Lesson cleared';

  @override
  String get ttClassBusy => 'This class already has a lesson then.';

  @override
  String get ttTeacherBusy =>
      'This teacher is already teaching another class then.';

  @override
  String get ttTeacherNotSubject => 'This teacher does not teach that subject.';

  @override
  String get ttNotWorkingDay => 'The school does not work on that day.';

  @override
  String get ttPeriodInUse =>
      'A period that has lessons in it cannot be removed or made a break.';

  @override
  String get ttPeriodOverlaps => 'That time overlaps another period.';

  @override
  String get ttPeriodLabelTaken => 'Another period already has that name.';

  @override
  String get ttPeriodStartTaken =>
      'Another period already starts at that time.';

  @override
  String get ttPeriodEnd => 'The end must be after the start.';

  @override
  String get ttPeriodTime => 'Write times like 08:30.';

  @override
  String get ttLoadTitle => 'Lessons per week';

  @override
  String ttLoadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count lessons',
      one: '$count lesson',
    );
    return '$_temp0';
  }

  @override
  String get ttNoLoad => 'No lessons have been placed yet.';

  @override
  String get ttWorkingDays => 'Working days';

  @override
  String get ttDaysSaved => 'Working days saved';

  @override
  String get ttPeriodName => 'Name';

  @override
  String get ttStarts => 'Starts';

  @override
  String get ttEnds => 'Ends';

  @override
  String get ttNumber => 'No.';

  @override
  String get ttIsBreak => 'This is a break: nothing is taught in it';

  @override
  String get ttAddPeriod => 'Add a period';

  @override
  String get ttPeriodAdded => 'Period added';

  @override
  String get ttStandard => 'Start with a standard day';

  @override
  String get ttShort => 'Start with a short day';

  @override
  String get ttTemplateApplied => 'Bell schedule created';

  @override
  String get ttDayMON => 'Mon';

  @override
  String get ttDayTUE => 'Tue';

  @override
  String get ttDayWED => 'Wed';

  @override
  String get ttDayTHU => 'Thu';

  @override
  String get ttDayFRI => 'Fri';

  @override
  String get ttDaySAT => 'Sat';

  @override
  String get ttDaySUN => 'Sun';

  @override
  String get notifLeaveRequestedTitle => 'Leave to decide';

  @override
  String notifLeaveRequestedBody(
    String name,
    String days,
    String typeName,
    String startDate,
    String endDate,
  ) {
    return '$name asked for $days day(s) of $typeName leave from $startDate to $endDate.';
  }

  @override
  String get notifLeaveApprovedTitle => 'Your leave was approved';

  @override
  String notifLeaveApprovedBody(
    String typeName,
    String startDate,
    String endDate,
    String days,
  ) {
    return '$typeName, $startDate to $endDate ($days day(s)).';
  }

  @override
  String get notifLeaveRejectedTitle => 'Your leave was not approved';

  @override
  String notifLeaveRejectedBody(
    String typeName,
    String startDate,
    String endDate,
    String note,
  ) {
    return '$typeName, $startDate to $endDate. $note';
  }

  @override
  String get notifLeaveSubstitutionTitle => 'Lessons need a substitute';

  @override
  String notifLeaveSubstitutionBody(
    String name,
    String startDate,
    String endDate,
  ) {
    return '$name is on leave from $startDate to $endDate. Choose substitutes on the substitution board.';
  }

  @override
  String get notifLeavePayrollTitle => 'Unpaid leave to deduct';

  @override
  String notifLeavePayrollBody(String name, String startDate, String endDate) {
    return '$name has approved unpaid leave from $startDate to $endDate. Review the proposed deduction in the payroll run.';
  }

  @override
  String get notifSubstitutionAssignedTitle => 'You are covering a class';

  @override
  String notifSubstitutionAssignedBody(
    String className,
    String subjectName,
    String periodLabel,
    String date,
    String name,
  ) {
    return '$className, $subjectName, $periodLabel on $date, covering for $name.';
  }

  @override
  String get notifSubstitutionClearedTitle => 'Cover cancelled';

  @override
  String notifSubstitutionClearedBody(
    String className,
    String subjectName,
    String date,
  ) {
    return '$className, $subjectName on $date no longer needs you.';
  }

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

  @override
  String get mobSchoolChoiceTitle => 'Choose your school';

  @override
  String get mobSchoolChoiceBody =>
      'Your account works at more than one school. Choose the one to open.';

  @override
  String get mobNoAccessTitle => 'This account cannot use this app';

  @override
  String get mobOpening => 'Opening…';

  @override
  String get mobLockTitle => 'Locked';

  @override
  String get mobLockBody => 'Confirm it is you to open OruSchools.';

  @override
  String get mobActionUnlock => 'Unlock';

  @override
  String get mobUnlockFailed => 'We could not confirm it is you. Try again.';

  @override
  String get mobSignOutTitle => 'Sign out of this phone?';

  @override
  String get mobSignOutBody =>
      'Everything saved on this phone for this school will be removed.';

  @override
  String mobSignOutOwed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes have not reached the school yet and will be lost.',
      one: '$count change has not reached the school yet and will be lost.',
    );
    return '$_temp0';
  }

  @override
  String get mobActionStaySignedIn => 'Stay signed in';

  @override
  String get mobActionSignOutAnyway => 'Sign out anyway';

  @override
  String get mobAppLockTitle => 'Ask for my fingerprint, face or screen lock';

  @override
  String get mobAppLockBody =>
      'Asked again after the app has been in the background for a minute.';

  @override
  String get mobAppLockUnavailable => 'This phone has no screen lock set up.';

  @override
  String mobSignedInAs(String name) {
    return 'Signed in as $name';
  }

  @override
  String mobSchoolRole(String role, String school) {
    return '$role at $school';
  }

  @override
  String get mobHomeSoonTitle => 'Your work will appear here';

  @override
  String get mobHomeSoonBody =>
      'Classes, attendance and leave arrive in the next updates.';

  @override
  String mobCodeSentTo(String phone) {
    return 'We sent a code to $phone.';
  }

  @override
  String get mobActionChangeNumber => 'Use a different number';

  @override
  String get mobTodayTitle => 'Today';

  @override
  String get mobAccountLink => 'Account';

  @override
  String get mobTodayNextLessons => 'Next lessons';

  @override
  String get mobTodayNoMoreLessons => 'No more lessons today';

  @override
  String get mobTodayNotSchoolDay => 'Today is not a school day';

  @override
  String mobTodayLessonLine(String className, String start, String end) {
    return '$className, $start to $end';
  }

  @override
  String get mobTodayAttendanceTitle => 'Attendance';

  @override
  String mobTodayAttendanceMissing(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count classes have no attendance yet',
      one: '$count class has no attendance yet',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayAttendanceAllDone =>
      'Attendance is taken for all your classes';

  @override
  String mobTodayAttendanceSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count classes saved on this phone, not sent yet',
      one: '$count class saved on this phone, not sent yet',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveTitle => 'Leave';

  @override
  String mobTodayLeaveWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count leave requests waiting for the Principal',
      one: '$count leave request waiting for the Principal',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveNone => 'No leave requests waiting';

  @override
  String mobTodayLeaveSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count leave requests saved on this phone, not sent yet',
      one: '$count leave request saved on this phone, not sent yet',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayFirstLoad =>
      'Connect once to load your day. After that it works without a connection.';

  @override
  String get actionBack => 'Back';

  @override
  String get mobTabAttendance => 'Attendance';

  @override
  String get mobTabMore => 'More';

  @override
  String get mobAttClassesTitle => 'Your classes';

  @override
  String get mobAttNoClasses =>
      'You are not the class teacher of any class, so you do not take attendance.';

  @override
  String get mobAttStateDone => 'Taken';

  @override
  String get mobAttStateSaved => 'Saved on this phone';

  @override
  String get mobAttStateTodo => 'Not taken yet';

  @override
  String get mobAttStateLocked => 'Locked';

  @override
  String get mobAttStateFailed => 'Not accepted';

  @override
  String get mobAttMarkAllPresent => 'Mark all present';

  @override
  String get mobAttSave => 'Save attendance';

  @override
  String get mobAttSavedNotSent =>
      'Saved on this phone. It reaches the school when you are connected.';

  @override
  String get mobAttLocked =>
      'This day is locked. Only the Academic administrator can change it.';

  @override
  String get mobAttRefused => 'The school did not accept this attendance.';

  @override
  String get mobAttRefusedLocked =>
      'The day was locked before it arrived. Ask the Academic administrator to correct it.';

  @override
  String get actionDismiss => 'Dismiss';

  @override
  String mobAttExceptions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count exceptions',
      one: '$count exception',
    );
    return '$_temp0';
  }

  @override
  String get mobAttEveryonePresent => 'Everyone is present';

  @override
  String mobAttPickStatus(String name) {
    return 'Mark $name';
  }

  @override
  String get mobAttNoStudents => 'There are no students in this class yet.';

  @override
  String get mobAttNotLoaded => 'Connect once to load this class.';

  @override
  String mobAttDateLine(String className, String date) {
    return '$className, $date';
  }

  @override
  String get mobTabMarks => 'Marks';

  @override
  String get mobMarksExamsTitle => 'Exams';

  @override
  String get mobMarksNoExams =>
      'There are no exams for you to enter marks for.';

  @override
  String mobMarksExamLine(String className, String subject) {
    return '$className, $subject';
  }

  @override
  String mobMarksOutOf(String max) {
    return 'out of $max';
  }

  @override
  String mobMarksProgress(String done, String total) {
    return '$done of $total marked';
  }

  @override
  String get mobMarksAbsent => 'Absent';

  @override
  String mobMarksFieldLabel(String name) {
    return 'Marks for $name';
  }

  @override
  String mobMarksErrAbove(String max) {
    return 'Marks cannot be more than $max.';
  }

  @override
  String get mobMarksErrFormat =>
      'Enter marks with at most one decimal, like 42 or 42.5.';

  @override
  String get mobMarksSave => 'Save marks';

  @override
  String get mobMarksRefused => 'The school did not accept these marks.';

  @override
  String get mobMarksRefusedAbove =>
      'A mark was above the maximum. Check the marks and save again.';

  @override
  String get mobMarksRefusedChanged =>
      'The exam or the class changed. Open the exam again and check the marks.';

  @override
  String get mobMarksNotLoaded => 'Connect once to load this exam.';

  @override
  String get mobMarksNoStudents => 'There are no students in this class yet.';

  @override
  String mobMarksErrors(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count marks need a correction',
      one: '$count mark needs a correction',
    );
    return '$_temp0';
  }

  @override
  String get mobTabLeave => 'Leave';

  @override
  String get mobLvBalances => 'Your leave';

  @override
  String mobLvBalanceLine(String type, String remaining, String allowed) {
    return '$type: $remaining of $allowed days left';
  }

  @override
  String mobLvBalanceUnset(String type) {
    return '$type: no limit set';
  }

  @override
  String get mobLvRequests => 'Your requests';

  @override
  String get mobLvNone => 'You have not asked for leave yet.';

  @override
  String get mobLvAsk => 'Ask for leave';

  @override
  String get mobLvStatusPending => 'Waiting for the Principal';

  @override
  String get mobLvStatusApproved => 'Approved';

  @override
  String get mobLvStatusRejected => 'Not approved';

  @override
  String get mobLvStatusCancelled => 'Cancelled';

  @override
  String get mobLvSavedNotSent => 'Saved on this phone, not sent yet';

  @override
  String get mobLvRefused => 'The school did not accept this request.';

  @override
  String get mobLvRefusedConflict =>
      'You already have leave on some of these days, or not enough days are left.';

  @override
  String mobLvDays(String days) {
    return '$days days';
  }

  @override
  String mobLvDates(String start, String end) {
    return '$start to $end';
  }

  @override
  String get mobLvFormTitle => 'Ask for leave';

  @override
  String get mobLvType => 'Type of leave';

  @override
  String get mobLvStart => 'First day';

  @override
  String get mobLvEnd => 'Last day';

  @override
  String get mobLvHalf => 'Half day only';

  @override
  String get mobLvMorning => 'Morning';

  @override
  String get mobLvAfternoon => 'Afternoon';

  @override
  String get mobLvReason => 'Reason (optional)';

  @override
  String get mobLvSend => 'Send request';

  @override
  String get mobLvErrEnd => 'The last day cannot be before the first day.';

  @override
  String get mobLvErrType => 'Choose a type of leave.';

  @override
  String get mobLvNoTypes => 'Connect once to load the types of leave.';

  @override
  String get mobMoreCover => 'Cover duties';

  @override
  String get mobCoverEmpty => 'You have no cover duties in the next two weeks.';

  @override
  String mobCoverLine(String className, String subject, String period) {
    return '$className, $subject, $period';
  }

  @override
  String mobCoverFor(String name) {
    return 'Covering for $name';
  }

  @override
  String get mobMoreClasses => 'My classes';

  @override
  String get mobClsEmpty => 'You do not teach any class yet.';

  @override
  String mobClsStudents(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count students',
      one: '$count student',
    );
    return '$_temp0';
  }

  @override
  String get mobClsReport => 'Report card';

  @override
  String get mobClsTerm => 'Term';

  @override
  String get mobClsNoCard => 'Report cards load when you are connected.';

  @override
  String mobClsMarksLine(String marks, String max) {
    return '$marks of $max';
  }

  @override
  String mobClsTotal(String marks, String percent) {
    return 'Total $marks, $percent%';
  }

  @override
  String mobClsGrade(String grade) {
    return 'Grade $grade';
  }

  @override
  String mobClsPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count exams not marked yet',
      one: '$count exam not marked yet',
    );
    return '$_temp0';
  }
}
