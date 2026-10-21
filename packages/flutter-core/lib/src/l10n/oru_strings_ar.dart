// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class OruStringsAr extends OruStrings {
  OruStringsAr([String locale = 'ar']) : super(locale);

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
}
