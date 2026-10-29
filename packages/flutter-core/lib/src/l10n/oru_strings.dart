import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'oru_strings_ar.dart';
import 'oru_strings_as.dart';
import 'oru_strings_bn.dart';
import 'oru_strings_doi.dart';
import 'oru_strings_en.dart';
import 'oru_strings_fa.dart';
import 'oru_strings_gu.dart';
import 'oru_strings_hi.dart';
import 'oru_strings_kn.dart';
import 'oru_strings_ks.dart';
import 'oru_strings_ml.dart';
import 'oru_strings_mr.dart';
import 'oru_strings_or.dart';
import 'oru_strings_pa.dart';
import 'oru_strings_ps.dart';
import 'oru_strings_sd.dart';
import 'oru_strings_ta.dart';
import 'oru_strings_te.dart';
import 'oru_strings_ur.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of OruStrings
/// returned by `OruStrings.of(context)`.
///
/// Applications need to include `OruStrings.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/oru_strings.dart';
///
/// return MaterialApp(
///   localizationsDelegates: OruStrings.localizationsDelegates,
///   supportedLocales: OruStrings.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the OruStrings.supportedLocales
/// property.
abstract class OruStrings {
  OruStrings(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static OruStrings of(BuildContext context) {
    return Localizations.of<OruStrings>(context, OruStrings)!;
  }

  static const LocalizationsDelegate<OruStrings> delegate =
      _OruStringsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('as'),
    Locale('bn'),
    Locale('doi'),
    Locale('en'),
    Locale('fa'),
    Locale('gu'),
    Locale('hi'),
    Locale('kn'),
    Locale('ks'),
    Locale('ml'),
    Locale('mr'),
    Locale('or'),
    Locale('pa'),
    Locale('ps'),
    Locale('sd'),
    Locale('ta'),
    Locale('te'),
    Locale('ur'),
  ];

  /// App name shown under the logo and on the home screen. Keep the brand name OruSchools in Latin letters.
  ///
  /// In en, this message translates to:
  /// **'OruSchools Teacher'**
  String get appTeacher;

  /// App name for non-teaching staff (office, lab assistants, support).
  ///
  /// In en, this message translates to:
  /// **'OruSchools Staff'**
  String get appStaff;

  /// App name for parents and students.
  ///
  /// In en, this message translates to:
  /// **'OruSchools Parent'**
  String get appParent;

  /// App name for transport drivers.
  ///
  /// In en, this message translates to:
  /// **'OruSchools Driver'**
  String get appDriver;

  /// Name of the web ERP.
  ///
  /// In en, this message translates to:
  /// **'OruSchools ERP'**
  String get appErp;

  /// Name of the platform administration site (for the SaaS owner).
  ///
  /// In en, this message translates to:
  /// **'OruSchools Platform'**
  String get appPlatform;

  /// Title of the public website (browser tab). The tagline 'Schools. People. Progress.' is fixed brand copy: translate it only with approval (brand guidelines).
  ///
  /// In en, this message translates to:
  /// **'OruSchools. Schools. People. Progress.'**
  String get appWebsite;

  /// Temporary placeholder text on unfinished screens. Not shown to schools in production.
  ///
  /// In en, this message translates to:
  /// **'This app is scaffolded and uses the OruSchools theme. Features arrive in the implementation plan.'**
  String get scaffoldNotice;

  /// Home screen greeting before 12:00. {name} is the person's first name.
  ///
  /// In en, this message translates to:
  /// **'Good morning, {name}'**
  String greetingMorning(String name);

  /// Home screen greeting 12:00-17:00. {name} is the person's first name.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon, {name}'**
  String greetingAfternoon(String name);

  /// Home screen greeting after 17:00. {name} is the person's first name.
  ///
  /// In en, this message translates to:
  /// **'Good evening, {name}'**
  String greetingEvening(String name);

  /// Button after a failed action.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// Button that sends saved offline work immediately.
  ///
  /// In en, this message translates to:
  /// **'Upload now'**
  String get actionUploadNow;

  /// Primary button on the teacher home screen.
  ///
  /// In en, this message translates to:
  /// **'Take attendance'**
  String get actionTakeAttendance;

  /// Button that marks every student present; the teacher then changes only the exceptions.
  ///
  /// In en, this message translates to:
  /// **'Mark all present'**
  String get actionMarkAllPresent;

  /// Primary button that submits the class attendance.
  ///
  /// In en, this message translates to:
  /// **'Submit attendance'**
  String get actionSubmitAttendance;

  /// Generic save button.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get actionSave;

  /// Generic cancel button.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// Sync status: all work is on the server.
  ///
  /// In en, this message translates to:
  /// **'Synced'**
  String get syncSynced;

  /// Sync status: work is saved on this phone and will upload when online.
  ///
  /// In en, this message translates to:
  /// **'Saved on device'**
  String get syncSavedOnDevice;

  /// Sync status: number of changes waiting to upload. Use the language's correct plural forms.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} change pending} other{{count} changes pending}}'**
  String syncChangesPending(int count);

  /// Sync status: upload in progress.
  ///
  /// In en, this message translates to:
  /// **'Syncing…'**
  String get syncSyncing;

  /// Sync status: no connection.
  ///
  /// In en, this message translates to:
  /// **'You’re offline'**
  String get syncOffline;

  /// Sync status: the upload did not work.
  ///
  /// In en, this message translates to:
  /// **'Sync failed'**
  String get syncFailed;

  /// Attendance status.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get statusPresent;

  /// Attendance status.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get statusAbsent;

  /// Attendance status: arrived after the bell.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get statusLate;

  /// Attendance status: on approved leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get statusLeave;

  /// Attendance status: absent for a medical reason.
  ///
  /// In en, this message translates to:
  /// **'Medical'**
  String get statusMedical;

  /// Attendance status: present for half the day.
  ///
  /// In en, this message translates to:
  /// **'Half day'**
  String get statusHalfDay;

  /// Attendance status: absent with permission.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get statusExcused;

  /// Error message. Reassures the user that nothing is lost; never blames them.
  ///
  /// In en, this message translates to:
  /// **'We could not reach the school server. Your work is saved on this phone.'**
  String get errorServerUnreachable;

  /// Label of the language picker.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// Heading of the platform owner's sign-in screen.
  ///
  /// In en, this message translates to:
  /// **'Sign in to the platform'**
  String get saasSignInTitle;

  /// One line under the sign-in heading. Schools sign in elsewhere.
  ///
  /// In en, this message translates to:
  /// **'This area is for the OruSchools platform owner.'**
  String get saasSignInIntro;

  /// Label of the email field on sign-in.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get authEmailLabel;

  /// Label of the password field on sign-in.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordLabel;

  /// Button that signs a person in.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get actionSignIn;

  /// Button for Google sign-in. Keep the word Google in Latin letters.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get actionSignInGoogle;

  /// Link that switches sign-in to a one-time code sent by SMS.
  ///
  /// In en, this message translates to:
  /// **'Use a mobile number instead'**
  String get actionSignInPhone;

  /// Link that switches sign-in back to email and password.
  ///
  /// In en, this message translates to:
  /// **'Use email instead'**
  String get actionSignInEmail;

  /// Label of the phone number field.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get authPhoneLabel;

  /// Hint under the phone field. Keep the example number as it is.
  ///
  /// In en, this message translates to:
  /// **'Include the country code, for example +91 98765 43210'**
  String get authPhoneHint;

  /// Button that sends a one-time code by SMS.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get actionSendCode;

  /// Label of the field where the SMS code is typed.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get authCodeLabel;

  /// Button that checks the SMS code.
  ///
  /// In en, this message translates to:
  /// **'Verify code'**
  String get actionVerifyCode;

  /// Small word between two sign-in options.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get authOr;

  /// Button that signs the person out.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get actionSignOut;

  /// Shown on the button while sign-in is in progress.
  ///
  /// In en, this message translates to:
  /// **'Signing in…'**
  String get authSigningIn;

  /// Error after a wrong email or password. Do not say which one is wrong.
  ///
  /// In en, this message translates to:
  /// **'The email or password is not correct.'**
  String get authErrorCredentials;

  /// Error when sign-in is temporarily blocked.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Try again in a few minutes.'**
  String get authErrorTooMany;

  /// Error when the device is offline during sign-in.
  ///
  /// In en, this message translates to:
  /// **'We could not reach the sign-in service. Check your connection.'**
  String get authErrorNetwork;

  /// Error when the person closes the Google sign-in window.
  ///
  /// In en, this message translates to:
  /// **'The Google window was closed before sign-in finished.'**
  String get authErrorPopupClosed;

  /// Error after a wrong or expired SMS code.
  ///
  /// In en, this message translates to:
  /// **'That code is not correct or has expired.'**
  String get authErrorCode;

  /// Error for a phone number that is not valid.
  ///
  /// In en, this message translates to:
  /// **'Enter the number with its country code.'**
  String get authErrorPhone;

  /// Fallback sign-in error.
  ///
  /// In en, this message translates to:
  /// **'We could not sign you in. Try again.'**
  String get authErrorGeneric;

  /// Heading shown to a signed-in person who is not the platform owner.
  ///
  /// In en, this message translates to:
  /// **'This account cannot use the platform area'**
  String get saasNoAccessTitle;

  /// Explains the previous heading and what to do.
  ///
  /// In en, this message translates to:
  /// **'Sign in with the platform owner account. Schools sign in at their own address.'**
  String get saasNoAccessBody;

  /// Screen reader name of the side navigation.
  ///
  /// In en, this message translates to:
  /// **'Platform sections'**
  String get saasNavLabel;

  /// Side navigation item for the list of schools.
  ///
  /// In en, this message translates to:
  /// **'Schools'**
  String get saasNavSchools;

  /// Heading of the schools screen.
  ///
  /// In en, this message translates to:
  /// **'Schools'**
  String get saasSchoolsTitle;

  /// Number of schools under the heading.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} school} other{{count} schools}}'**
  String saasSchoolsCount(int count);

  /// Empty state heading on the schools screen.
  ///
  /// In en, this message translates to:
  /// **'No schools yet'**
  String get saasSchoolsEmptyTitle;

  /// Empty state explanation.
  ///
  /// In en, this message translates to:
  /// **'Create the first school so its team can sign in.'**
  String get saasSchoolsEmptyBody;

  /// Button that opens the create school form and submits it.
  ///
  /// In en, this message translates to:
  /// **'Create school'**
  String get actionCreateSchool;

  /// Heading of the create school form.
  ///
  /// In en, this message translates to:
  /// **'Create a school'**
  String get saasSchoolCreateTitle;

  /// Label of the school name field.
  ///
  /// In en, this message translates to:
  /// **'School name'**
  String get saasSchoolName;

  /// Label of the school's web address field (its subdomain).
  ///
  /// In en, this message translates to:
  /// **'Web address'**
  String get saasSchoolSubdomain;

  /// Hint under the web address field. Keep the example as it is.
  ///
  /// In en, this message translates to:
  /// **'Letters, numbers and hyphens, for example greenfield. It cannot be changed later.'**
  String get saasSchoolSubdomainHint;

  /// Label of the school's default language choice.
  ///
  /// In en, this message translates to:
  /// **'Default language'**
  String get saasSchoolLanguage;

  /// Button that opens a form to change something.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get actionEdit;

  /// Heading of the edit school form.
  ///
  /// In en, this message translates to:
  /// **'Edit school'**
  String get saasSchoolEditTitle;

  /// Button that suspends a school.
  ///
  /// In en, this message translates to:
  /// **'Suspend'**
  String get actionSuspend;

  /// Button that reactivates a suspended school.
  ///
  /// In en, this message translates to:
  /// **'Reactivate'**
  String get actionReactivate;

  /// Heading of the suspend confirmation. {name} is the school name.
  ///
  /// In en, this message translates to:
  /// **'Suspend {name}?'**
  String saasSuspendTitle(String name);

  /// Explains what suspending does.
  ///
  /// In en, this message translates to:
  /// **'Nobody at this school can sign in until you reactivate it.'**
  String get saasSuspendBody;

  /// Label of the optional reason for suspending.
  ///
  /// In en, this message translates to:
  /// **'Reason (optional)'**
  String get saasSuspendReason;

  /// Status of a school that is running.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get statusActive;

  /// Status of a school that is suspended.
  ///
  /// In en, this message translates to:
  /// **'Suspended'**
  String get statusSuspended;

  /// Confirmation after creating a school.
  ///
  /// In en, this message translates to:
  /// **'School created'**
  String get saasCreated;

  /// Confirmation after editing a school.
  ///
  /// In en, this message translates to:
  /// **'Changes saved'**
  String get saasSaved;

  /// Confirmation after suspending.
  ///
  /// In en, this message translates to:
  /// **'School suspended'**
  String get saasSuspendedDone;

  /// Confirmation after reactivating.
  ///
  /// In en, this message translates to:
  /// **'School reactivated'**
  String get saasReactivatedDone;

  /// Heading of the error when the list fails to load.
  ///
  /// In en, this message translates to:
  /// **'We could not load the schools'**
  String get saasLoadFailed;

  /// Button that loads the next page of a list.
  ///
  /// In en, this message translates to:
  /// **'Show more'**
  String get actionLoadMore;

  /// Error when the session has ended.
  ///
  /// In en, this message translates to:
  /// **'Please sign in again.'**
  String get errorAuthRequired;

  /// Error when the action is not allowed.
  ///
  /// In en, this message translates to:
  /// **'You do not have permission to do this.'**
  String get errorForbidden;

  /// Error when something no longer exists.
  ///
  /// In en, this message translates to:
  /// **'We could not find that.'**
  String get errorNotFound;

  /// Error when the server rejects the form.
  ///
  /// In en, this message translates to:
  /// **'Some details are not valid. Check the fields and try again.'**
  String get errorInvalidRequest;

  /// Error when a name or web address is already taken.
  ///
  /// In en, this message translates to:
  /// **'That already exists. Choose a different name or address.'**
  String get errorConflict;

  /// Error when the person is sending requests too fast.
  ///
  /// In en, this message translates to:
  /// **'Too many requests. Wait a moment and try again.'**
  String get errorRateLimited;

  /// Error when a back-end service is unavailable.
  ///
  /// In en, this message translates to:
  /// **'The server is busy. Try again shortly.'**
  String get errorUpstream;

  /// Fallback server error.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong on our side. Try again.'**
  String get errorInternal;

  /// Error when the device is offline.
  ///
  /// In en, this message translates to:
  /// **'We could not reach the server. Check your connection.'**
  String get errorNetwork;

  /// Error when a request times out.
  ///
  /// In en, this message translates to:
  /// **'The server took too long to answer. Try again.'**
  String get errorTimeout;

  /// Shown while a screen or list is loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get statusLoading;

  /// Button that adds the first administrator of a school.
  ///
  /// In en, this message translates to:
  /// **'Add administrator'**
  String get actionAddAdmin;

  /// Heading of the form that adds a school's first administrator. {name} is the school name.
  ///
  /// In en, this message translates to:
  /// **'Add the administrator of {name}'**
  String saasAdminTitle(String name);

  /// Explains the add administrator form: the person sets their own password, and only the first administrator is added by the platform owner.
  ///
  /// In en, this message translates to:
  /// **'They get an email to set their own password. You can add one administrator here; after that the school manages its own people.'**
  String get saasAdminIntro;

  /// Label of the administrator's name field.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get saasAdminName;

  /// Confirmation after adding an administrator who signs in with email. {email} is their address.
  ///
  /// In en, this message translates to:
  /// **'Administrator added. An email to set their password was sent to {email}.'**
  String saasAdminAdded(String email);

  /// Confirmation after adding an administrator who signs in by phone code only.
  ///
  /// In en, this message translates to:
  /// **'Administrator added. They can sign in with a code sent to their phone.'**
  String get saasAdminAddedNoEmail;

  /// Warning when the account was created but the password email failed. Keep the quoted button name the same as the 'Forgot password?' text.
  ///
  /// In en, this message translates to:
  /// **'Administrator added, but the email could not be sent. Ask them to use “Forgot password” on the sign-in page.'**
  String get saasAdminEmailFailed;

  /// Error when the platform owner tries to add a second first-administrator.
  ///
  /// In en, this message translates to:
  /// **'This school already has an administrator.'**
  String get saasAdminExists;

  /// Error when an email or phone number already has an account.
  ///
  /// In en, this message translates to:
  /// **'An account with this email or number already exists.'**
  String get errorAccountExists;

  /// Link on sign-in that sends an email to set a new password.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get authForgot;

  /// Shown after asking for a password email. Does not reveal whether the address has an account.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for that address, an email to set a new password is on its way.'**
  String get authResetSent;

  /// Shown when 'Forgot password?' is pressed with the email field empty.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address first.'**
  String get authResetNeedsEmail;

  /// Badge on a school that already has an administrator.
  ///
  /// In en, this message translates to:
  /// **'Administrator added'**
  String get saasHasAdmin;

  /// Badge on a school that has no administrator yet, so nobody can sign in to it.
  ///
  /// In en, this message translates to:
  /// **'No administrator yet'**
  String get saasNoAdmin;

  /// Heading of a school's sign-in screen. {name} is the school's name.
  ///
  /// In en, this message translates to:
  /// **'Sign in to {name}'**
  String webSignInTitle(String name);

  /// One line under the school sign-in heading.
  ///
  /// In en, this message translates to:
  /// **'Use the account your school gave you.'**
  String get webSignInIntro;

  /// Heading when the web address does not belong to an active school.
  ///
  /// In en, this message translates to:
  /// **'We could not find this school'**
  String get webSchoolNotFoundTitle;

  /// Explains the previous heading.
  ///
  /// In en, this message translates to:
  /// **'Check the address, or ask your school for its web address.'**
  String get webSchoolNotFoundBody;

  /// Heading when the app is opened without a school's own web address.
  ///
  /// In en, this message translates to:
  /// **'Open your school\'s address'**
  String get webNoSchoolTitle;

  /// Explains that people reach the app at their school's own address. Keep the example as it is.
  ///
  /// In en, this message translates to:
  /// **'Each school has its own web address, for example greenfield.oruschools.com.'**
  String get webNoSchoolBody;

  /// Heading shown to a signed-in person who is not a member of this school. {name} is the school's name.
  ///
  /// In en, this message translates to:
  /// **'You do not have access to {name}'**
  String webNoAccessTitle(String name);

  /// Explains what to do about no access.
  ///
  /// In en, this message translates to:
  /// **'Ask your school\'s administrator to add you, then sign in again.'**
  String get webNoAccessBody;

  /// Heading of the error when the person's account details fail to load after sign-in.
  ///
  /// In en, this message translates to:
  /// **'We could not load your account'**
  String get webLoadFailed;

  /// Screen reader name of the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'School sections'**
  String get webNavLabel;

  /// Heading of the empty dashboard.
  ///
  /// In en, this message translates to:
  /// **'Nothing to show yet'**
  String get webDashboardEmptyTitle;

  /// Explains the empty dashboard.
  ///
  /// In en, this message translates to:
  /// **'Numbers and tasks will appear here as your school\'s modules are set up.'**
  String get webDashboardEmptyBody;

  /// Heading shown for a navigation item whose screen is not built yet.
  ///
  /// In en, this message translates to:
  /// **'This module is not ready yet'**
  String get webComingTitle;

  /// Explains the previous heading.
  ///
  /// In en, this message translates to:
  /// **'It will appear here when it is built.'**
  String get webComingBody;

  /// Line on the dashboard that names the person's role in the school. {role} is the role name.
  ///
  /// In en, this message translates to:
  /// **'Your role: {role}'**
  String webYourRole(String role);

  /// Heading of the page-level error screen.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong on this page'**
  String get errorPageTitle;

  /// Button that retries after an error.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get actionTryAgain;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Overview'**
  String get sectionOverview;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Academics'**
  String get sectionAcademics;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get sectionPeople;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'HR'**
  String get sectionHr;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get sectionFinance;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Communication'**
  String get sectionCommunication;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get sectionTransport;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Operations'**
  String get sectionOperations;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get sectionReports;

  /// Heading of a group in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Administration'**
  String get sectionAdministration;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get navStudents;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Classes and subjects'**
  String get navClasses;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get navAttendance;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Gradebook'**
  String get navGradebook;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Substitutions'**
  String get navSubstitution;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Admissions'**
  String get navAdmissions;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get navStaff;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Staff attendance'**
  String get navStaffAttendance;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get navLeave;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Payroll'**
  String get navPayroll;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Recruitment'**
  String get navRecruitment;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Fees and payments'**
  String get navFees;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get navAnnouncements;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Transport'**
  String get navTransport;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Operations'**
  String get navOperations;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Academic reports'**
  String get navReportsAcademic;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Financial reports'**
  String get navReportsFinance;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'HR reports'**
  String get navReportsHr;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'School settings'**
  String get navSettings;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Users and roles'**
  String get navMemberships;

  /// Item in the school's side navigation.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get navAudit;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Principal'**
  String get rolePrincipal;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Management'**
  String get roleManagement;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Bursar'**
  String get roleBursar;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Academic administrator'**
  String get roleAcademicAdmin;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'System administrator'**
  String get roleSystemAdmin;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'HR manager'**
  String get roleHrManager;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Accountant'**
  String get roleAccountant;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Admissions officer'**
  String get roleAdmissionsOfficer;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Transport manager'**
  String get roleTransportManager;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Operations manager'**
  String get roleOperationsManager;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get roleTeacher;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get roleStaff;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Driver'**
  String get roleDriver;

  /// Name of a role a person has in a school.
  ///
  /// In en, this message translates to:
  /// **'Parent'**
  String get roleParent;

  /// Error when the chosen picture is not an accepted type or is too big.
  ///
  /// In en, this message translates to:
  /// **'Choose a PNG, JPEG or WebP image up to 2 MB.'**
  String get errorUploadInvalid;

  /// Error when sending a file to storage failed.
  ///
  /// In en, this message translates to:
  /// **'The file could not be uploaded. Try again.'**
  String get errorUploadFailed;

  /// Title at the top of a printed fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Fee receipt'**
  String get receiptTitle;

  /// Label before the receipt number on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt no.'**
  String get receiptNumber;

  /// Label before the date the fee was paid, on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get receiptDate;

  /// Label before the student name on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get receiptStudent;

  /// Label before the student enrolment number on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Enrolment no.'**
  String get receiptEnrollment;

  /// Label before the class (for example 5 B) on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get receiptClass;

  /// Label before what the payment was for (for example Tuition - April) on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Payment for'**
  String get receiptFor;

  /// Label before the amount paid, on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Amount paid'**
  String get receiptAmountPaid;

  /// Label before how the fee was paid (cash, cheque, UPI), on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Paid by'**
  String get receiptMethod;

  /// Label before the cheque, bank or UPI reference, on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Reference'**
  String get receiptReference;

  /// Label before the amount still owed on the invoice after this payment, on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Balance on this invoice'**
  String get receiptBalance;

  /// Label before the name of the person who took the payment, on a fee receipt.
  ///
  /// In en, this message translates to:
  /// **'Received by'**
  String get receiptReceivedBy;

  /// Large stamp across a fee receipt whose payment was reversed. Keep it short.
  ///
  /// In en, this message translates to:
  /// **'CANCELLED'**
  String get receiptCancelled;

  /// Line at the bottom of a printed fee receipt.
  ///
  /// In en, this message translates to:
  /// **'This is a computer-generated receipt.'**
  String get receiptFooter;

  /// Way of paying a fee: cash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get paymentMethodCash;

  /// Way of paying a fee: by cheque.
  ///
  /// In en, this message translates to:
  /// **'Cheque'**
  String get paymentMethodCheque;

  /// Way of paying a fee: by bank transfer.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get paymentMethodBankTransfer;

  /// Way of paying a fee: by UPI (the Indian instant payment system).
  ///
  /// In en, this message translates to:
  /// **'UPI'**
  String get paymentMethodUpi;

  /// Way of paying a fee: any other way.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get paymentMethodOther;

  /// Title at the top of a printed payslip.
  ///
  /// In en, this message translates to:
  /// **'Payslip'**
  String get payslipTitle;

  /// Label before the month a payslip is for, for example 04/2027. (A month of pay, not a class period.)
  ///
  /// In en, this message translates to:
  /// **'Pay month'**
  String get payslipPeriod;

  /// Label before the name of the member of staff on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Employee'**
  String get payslipEmployee;

  /// Label before the employee number on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Employee no.'**
  String get payslipEmployeeId;

  /// Label before the department (for example Science) on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Department'**
  String get payslipDepartment;

  /// Label before the job title (for example Teacher) on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Designation'**
  String get payslipDesignation;

  /// Heading of the list of pay components (basic pay, allowances) on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Earnings'**
  String get payslipEarnings;

  /// Heading of the list of amounts taken off pay on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Deductions'**
  String get payslipDeductions;

  /// Label before pay before deductions, on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Gross pay'**
  String get payslipGross;

  /// Label before the sum of all deductions, on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Total deductions'**
  String get payslipTotalDeductions;

  /// Label before the amount actually paid out, on a payslip. Keep it short.
  ///
  /// In en, this message translates to:
  /// **'Net pay'**
  String get payslipNetPay;

  /// Label before the day the salary was paid, on a payslip.
  ///
  /// In en, this message translates to:
  /// **'Paid on'**
  String get payslipPaidOn;

  /// Line at the bottom of a printed payslip.
  ///
  /// In en, this message translates to:
  /// **'This is a computer-generated payslip.'**
  String get payslipFooter;

  /// Title of the printed fee collections report (money taken in a date range).
  ///
  /// In en, this message translates to:
  /// **'Fee collections'**
  String get reportCollectionsTitle;

  /// Title of the printed report of unpaid fee invoices that have fallen due.
  ///
  /// In en, this message translates to:
  /// **'Fees outstanding'**
  String get reportDuesTitle;

  /// Title of the printed report of a year's approved and paid pay runs.
  ///
  /// In en, this message translates to:
  /// **'Payroll summary'**
  String get reportPayrollTitle;

  /// Label before the date a report is calculated up to (for example As of 24-10-2026).
  ///
  /// In en, this message translates to:
  /// **'As of'**
  String get reportAsOf;

  /// Label before a calendar year on the payroll summary.
  ///
  /// In en, this message translates to:
  /// **'Year'**
  String get reportYear;

  /// Column heading: the state of a payment or a pay run.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get reportStatus;

  /// Status of a payment that was taken back.
  ///
  /// In en, this message translates to:
  /// **'Reversed'**
  String get reportReversed;

  /// Label of the last row, which adds up the columns above it.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get reportTotal;

  /// Name of the bell button in the top bar that opens the notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get ntBell;

  /// Said after the word Notifications on the bell button when some are unread: how many.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} unread notification} other{{count} unread notifications}}'**
  String ntBellUnread(int count);

  /// Shown when the inbox is empty.
  ///
  /// In en, this message translates to:
  /// **'You have no notifications.'**
  String get ntEmpty;

  /// Button: mark every notification as read.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get ntMarkAll;

  /// Button: close the notifications panel.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get ntClose;

  /// Heading of the choice of which kinds of notification to show.
  ///
  /// In en, this message translates to:
  /// **'Choose what you see'**
  String get ntSettings;

  /// Explains the choice of which kinds of notification to show.
  ///
  /// In en, this message translates to:
  /// **'Hidden kinds are kept, not deleted.'**
  String get ntSettingsHint;

  /// Kind of notification: about leave requests and decisions.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get ntCatleave;

  /// Kind of notification: about covering lessons.
  ///
  /// In en, this message translates to:
  /// **'Substitutions'**
  String get ntCatsubstitution;

  /// Kind of notification: about pay.
  ///
  /// In en, this message translates to:
  /// **'Payroll'**
  String get ntCatpayroll;

  /// Name of the notification category switch for announcements from the school.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get ntCatannouncement;

  /// Title of the notice sent to staff when the Principal or the Academic administrator posts an announcement.
  ///
  /// In en, this message translates to:
  /// **'New announcement'**
  String get notifAnnouncementPostedTitle;

  /// Body of that notice: the announcement's own title, written by its author in their language.
  ///
  /// In en, this message translates to:
  /// **'{title}'**
  String notifAnnouncementPostedBody(String title);

  /// Screen reader word before an unread notification.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get ntUnread;

  /// Shown in the panel when loading failed.
  ///
  /// In en, this message translates to:
  /// **'The notifications could not be loaded.'**
  String get ntLoadFailed;

  /// Column heading: the period of the school day.
  ///
  /// In en, this message translates to:
  /// **'Period'**
  String get sbPeriod;

  /// Screen reader label of the switch between leave requests and leave types.
  ///
  /// In en, this message translates to:
  /// **'Leave view'**
  String get lvViewLabel;

  /// Tab: leave requests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get lvTabRequests;

  /// Tab: the kinds of leave and what each person may take.
  ///
  /// In en, this message translates to:
  /// **'Types and allowances'**
  String get lvTabTypes;

  /// Filter choice: every status.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get lvAll;

  /// Label of the status filter and column.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get lvStatus;

  /// Leave request status: waiting for the Principal.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get lvStatusPENDING;

  /// Leave request status: the Principal agreed.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get lvStatusAPPROVED;

  /// Leave request status: the Principal did not agree.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get lvStatusREJECTED;

  /// Leave request status: the person withdrew it.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get lvStatusCANCELLED;

  /// Column heading: who asked for leave.
  ///
  /// In en, this message translates to:
  /// **'Person'**
  String get lvPerson;

  /// Column heading: the kind of leave.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get lvType;

  /// Column heading: the days of the leave.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get lvDates;

  /// Column heading: how many days.
  ///
  /// In en, this message translates to:
  /// **'Days'**
  String get lvDays;

  /// Column heading: who decided and when.
  ///
  /// In en, this message translates to:
  /// **'Decision'**
  String get lvDecision;

  /// A half day of leave: the morning.
  ///
  /// In en, this message translates to:
  /// **'morning'**
  String get lvHalfMORNING;

  /// A half day of leave: the afternoon.
  ///
  /// In en, this message translates to:
  /// **'afternoon'**
  String get lvHalfAFTERNOON;

  /// Shown when no leave request matches.
  ///
  /// In en, this message translates to:
  /// **'There are no leave requests.'**
  String get lvNoRequests;

  /// Button: the Principal agrees to a leave request.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get lvApprove;

  /// Button: the Principal does not agree to a leave request.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get lvReject;

  /// Question before a leave request is rejected.
  ///
  /// In en, this message translates to:
  /// **'Reject the leave of {name}?'**
  String lvRejectQuestion(String name);

  /// Label of the optional reason given when rejecting.
  ///
  /// In en, this message translates to:
  /// **'Note for the person (optional)'**
  String get lvRejectNote;

  /// Confirmation after a request was approved.
  ///
  /// In en, this message translates to:
  /// **'Leave approved'**
  String get lvApproved;

  /// Confirmation after a request was rejected.
  ///
  /// In en, this message translates to:
  /// **'Leave rejected'**
  String get lvRejected;

  /// Refusal: the request is no longer waiting.
  ///
  /// In en, this message translates to:
  /// **'This request was already decided.'**
  String get lvNotPending;

  /// Refusal: the leave is more than the person may still take.
  ///
  /// In en, this message translates to:
  /// **'That is more than the days left.'**
  String get lvOverBalance;

  /// Refusal: the leave overlaps another request.
  ///
  /// In en, this message translates to:
  /// **'That overlaps other leave of the same person.'**
  String get lvOverlap;

  /// Label of a leave type's name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get lvTypeName;

  /// Leave type: the person is paid and the days come from a yearly allowance.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get lvPaid;

  /// Leave type: no pay; it proposes a deduction in payroll.
  ///
  /// In en, this message translates to:
  /// **'Unpaid'**
  String get lvUnpaid;

  /// Column and field: the yearly allowance of a paid leave type.
  ///
  /// In en, this message translates to:
  /// **'Days a year'**
  String get lvQuota;

  /// Button and heading: add a kind of leave.
  ///
  /// In en, this message translates to:
  /// **'Add a leave type'**
  String get lvAddType;

  /// Confirmation after a leave type was added.
  ///
  /// In en, this message translates to:
  /// **'Leave type added'**
  String get lvTypeAdded;

  /// Checkbox: the leave type is paid.
  ///
  /// In en, this message translates to:
  /// **'Paid leave (takes days from a yearly allowance)'**
  String get lvIsPaid;

  /// Shown when the school has no leave types.
  ///
  /// In en, this message translates to:
  /// **'There are no leave types yet.'**
  String get lvNoTypes;

  /// Refusal: a leave type with requests cannot be removed.
  ///
  /// In en, this message translates to:
  /// **'This leave type has requests and cannot be removed.'**
  String get lvTypeInUse;

  /// Refusal: a paid type was given no yearly days.
  ///
  /// In en, this message translates to:
  /// **'A paid type needs a number of days a year, whole or half.'**
  String get lvPaidNeedsQuota;

  /// Heading of what each person may take in a year.
  ///
  /// In en, this message translates to:
  /// **'Allowances'**
  String get lvAllowances;

  /// Label of the choice of person.
  ///
  /// In en, this message translates to:
  /// **'Person'**
  String get lvPickPerson;

  /// Column heading: the days a person may take in the year.
  ///
  /// In en, this message translates to:
  /// **'Allowed'**
  String get lvAllowed;

  /// Column heading: the days a person may still take.
  ///
  /// In en, this message translates to:
  /// **'Left'**
  String get lvRemaining;

  /// Label of the field where HR sets a person's yearly days for a type.
  ///
  /// In en, this message translates to:
  /// **'Allowed days for {type}'**
  String lvAllowedFor(String type);

  /// Confirmation after an allowance was changed.
  ///
  /// In en, this message translates to:
  /// **'Allowance saved'**
  String get lvAllowanceSaved;

  /// Refusal: the allowance is below what was taken.
  ///
  /// In en, this message translates to:
  /// **'That is less than the days already taken.'**
  String get lvBelowTaken;

  /// Shown beside an allowance the person has not used yet.
  ///
  /// In en, this message translates to:
  /// **'The yearly allowance of the type, until the person asks for it.'**
  String get lvStandardHint;

  /// Hint under the days field.
  ///
  /// In en, this message translates to:
  /// **'Use a whole or half number of days, like 12 or 7.5.'**
  String get lvWholeOrHalf;

  /// Label of the first date of the range.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get sbFrom;

  /// Label of the last date of the range.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get sbTo;

  /// Column heading: the teacher who is on leave.
  ///
  /// In en, this message translates to:
  /// **'Teacher away'**
  String get sbAway;

  /// Column heading: who covers the lesson.
  ///
  /// In en, this message translates to:
  /// **'Cover'**
  String get sbCover;

  /// Shown when nobody was chosen to cover a lesson.
  ///
  /// In en, this message translates to:
  /// **'Not chosen yet'**
  String get sbNotChosen;

  /// Button: choose who covers a lesson.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get sbChoose;

  /// Button: choose another cover.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get sbChange;

  /// Button: take the cover away from a lesson.
  ///
  /// In en, this message translates to:
  /// **'Remove cover'**
  String get sbRemoveCover;

  /// Heading of the list of teachers who are free and qualified for a lesson.
  ///
  /// In en, this message translates to:
  /// **'Who can cover {slot}'**
  String sbSuggestionsTitle(String slot);

  /// How many times a teacher covered lessons this month.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} cover this month} other{{count} covers this month}}'**
  String sbThisMonth(int count);

  /// Button: choose this teacher to cover the lesson.
  ///
  /// In en, this message translates to:
  /// **'Choose {name}'**
  String sbAssign(String name);

  /// Shown when no teacher can cover the lesson.
  ///
  /// In en, this message translates to:
  /// **'Nobody is free and qualified for this lesson.'**
  String get sbNoCandidates;

  /// Confirmation after a cover was chosen.
  ///
  /// In en, this message translates to:
  /// **'Cover chosen'**
  String get sbAssigned;

  /// Confirmation after a cover was removed.
  ///
  /// In en, this message translates to:
  /// **'Cover removed'**
  String get sbCleared;

  /// Shown when approved leave leaves no lesson uncovered in the range.
  ///
  /// In en, this message translates to:
  /// **'No lessons are waiting for cover in this range.'**
  String get sbNoNeeds;

  /// Refusal: the chosen teacher teaches another class then.
  ///
  /// In en, this message translates to:
  /// **'That teacher has a lesson of their own then.'**
  String get sbHasOwnLesson;

  /// Refusal: the chosen teacher is on leave.
  ///
  /// In en, this message translates to:
  /// **'That teacher is on leave then.'**
  String get sbOnLeave;

  /// Refusal: the chosen teacher covers another lesson then.
  ///
  /// In en, this message translates to:
  /// **'That teacher already covers another class then.'**
  String get sbAlreadyCovering;

  /// Refusal: the absent teacher was chosen.
  ///
  /// In en, this message translates to:
  /// **'The teacher who is away cannot cover their own lesson.'**
  String get sbSameAsAbsent;

  /// Refusal: the leave behind the need was changed.
  ///
  /// In en, this message translates to:
  /// **'That lesson no longer needs cover.'**
  String get sbNoLongerNeeded;

  /// Refusal: the lesson or the teacher changed while choosing.
  ///
  /// In en, this message translates to:
  /// **'Something changed meanwhile. Look at the list again.'**
  String get sbChanged;

  /// Heading of the proposals for unpaid leave in a pay run.
  ///
  /// In en, this message translates to:
  /// **'Unpaid leave in this month'**
  String get plTitle;

  /// Explains the proposals for unpaid leave in a pay run.
  ///
  /// In en, this message translates to:
  /// **'For each person with approved unpaid leave: the monthly pay times the days, divided by the school\'s working days in the month. Nothing is deducted until HR applies it.'**
  String get plNote;

  /// Column heading: unpaid days inside the month.
  ///
  /// In en, this message translates to:
  /// **'Unpaid days'**
  String get plDays;

  /// Column heading: the proposed pay deduction.
  ///
  /// In en, this message translates to:
  /// **'Proposed deduction'**
  String get plProposed;

  /// Button: put the proposal on the payslip as a deduction.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get plApply;

  /// Label of the field where HR may change the proposed amount.
  ///
  /// In en, this message translates to:
  /// **'Amount to deduct'**
  String get plAmount;

  /// Shown when the deduction is already on the payslip.
  ///
  /// In en, this message translates to:
  /// **'Applied: {amount}'**
  String plApplied(String amount);

  /// Confirmation after the deduction was put on the payslip.
  ///
  /// In en, this message translates to:
  /// **'Deduction applied'**
  String get plDone;

  /// Shown when there is nothing to propose.
  ///
  /// In en, this message translates to:
  /// **'There is no approved unpaid leave in this month.'**
  String get plNone;

  /// Lists people with unpaid leave who have no payslip in the pay run.
  ///
  /// In en, this message translates to:
  /// **'Unpaid leave but no payslip in this run: {names}'**
  String plWithout(String names);

  /// Refusal: the deduction is already on the payslip.
  ///
  /// In en, this message translates to:
  /// **'This deduction was already applied.'**
  String get plAlready;

  /// Refusal: the amount is above the monthly pay.
  ///
  /// In en, this message translates to:
  /// **'That is more than the month\'s pay.'**
  String get plAboveGross;

  /// Refusal: the run is no longer a draft.
  ///
  /// In en, this message translates to:
  /// **'Only a draft run can change.'**
  String get plNotDraft;

  /// Screen reader label of the switch between marks entry, exams and terms, grade bands and report cards.
  ///
  /// In en, this message translates to:
  /// **'Gradebook view'**
  String get gbViewLabel;

  /// Tab: enter the marks of one exam.
  ///
  /// In en, this message translates to:
  /// **'Marks entry'**
  String get gbTabMarks;

  /// Tab: the school's terms and exams.
  ///
  /// In en, this message translates to:
  /// **'Exams and terms'**
  String get gbTabExams;

  /// Tab: the school's own grade bands, for example 90 to 100 is A1.
  ///
  /// In en, this message translates to:
  /// **'Grade bands'**
  String get gbTabBands;

  /// Tab: a student's report card for a term.
  ///
  /// In en, this message translates to:
  /// **'Report cards'**
  String get gbTabCards;

  /// Label of the choice of term.
  ///
  /// In en, this message translates to:
  /// **'Term'**
  String get gbPickTerm;

  /// Label of the choice of exam.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get gbPickExam;

  /// Title shown when the school has no terms.
  ///
  /// In en, this message translates to:
  /// **'There are no terms yet'**
  String get gbNoTermsTitle;

  /// Body shown with the no-terms title.
  ///
  /// In en, this message translates to:
  /// **'Add a term under Exams and terms first.'**
  String get gbNoTermsBody;

  /// Shown when the chosen term has no exams.
  ///
  /// In en, this message translates to:
  /// **'There are no exams in this term yet.'**
  String get gbNoExams;

  /// Under the exam name: the most marks that can be got.
  ///
  /// In en, this message translates to:
  /// **'Out of {max}'**
  String gbOutOf(String max);

  /// Screen reader label of a student's marks field.
  ///
  /// In en, this message translates to:
  /// **'Marks: {name}'**
  String gbMarksFor(String name);

  /// Screen reader label of a student's absent checkbox.
  ///
  /// In en, this message translates to:
  /// **'Absent: {name}'**
  String gbAbsentFor(String name);

  /// Button: save the marks that were changed.
  ///
  /// In en, this message translates to:
  /// **'Save marks'**
  String get gbSaveMarks;

  /// Confirmation after marks were saved.
  ///
  /// In en, this message translates to:
  /// **'Marks saved'**
  String get gbMarksSaved;

  /// Refusal: a mark is higher than the exam's maximum.
  ///
  /// In en, this message translates to:
  /// **'A mark is above the most possible for this exam.'**
  String get gbAboveMax;

  /// Refusal: a mark was not a number with at most one decimal.
  ///
  /// In en, this message translates to:
  /// **'A mark must be a number with at most one decimal.'**
  String get gbNotAMark;

  /// Refusal: absent was ticked and marks were also typed.
  ///
  /// In en, this message translates to:
  /// **'A student who is absent cannot have marks.'**
  String get gbAbsentNoMarks;

  /// Button and heading: add a term to the academic year.
  ///
  /// In en, this message translates to:
  /// **'Add a term'**
  String get gbAddTerm;

  /// Label of the term name field.
  ///
  /// In en, this message translates to:
  /// **'Term name'**
  String get gbTermName;

  /// Confirmation after a term was added.
  ///
  /// In en, this message translates to:
  /// **'Term added'**
  String get gbTermAdded;

  /// Refusal: a term or exam name is taken.
  ///
  /// In en, this message translates to:
  /// **'That name is already used.'**
  String get gbNameTaken;

  /// Refusal: a term with exams cannot be removed.
  ///
  /// In en, this message translates to:
  /// **'This term still has exams.'**
  String get gbTermHasExams;

  /// Button and heading: add an exam.
  ///
  /// In en, this message translates to:
  /// **'Add an exam'**
  String get gbAddExam;

  /// Label of the exam name field.
  ///
  /// In en, this message translates to:
  /// **'Exam name'**
  String get gbExamName;

  /// Confirmation after an exam was added.
  ///
  /// In en, this message translates to:
  /// **'Exam added'**
  String get gbExamAdded;

  /// Refusal: the exam already exists.
  ///
  /// In en, this message translates to:
  /// **'This class already has an exam with that name for this subject and term.'**
  String get gbExamExists;

  /// Refusal: an exam with marks cannot be removed.
  ///
  /// In en, this message translates to:
  /// **'This exam already has marks.'**
  String get gbExamHasMarks;

  /// Refusal: the exam's maximum was lowered below a mark.
  ///
  /// In en, this message translates to:
  /// **'The most marks cannot be below a mark already given.'**
  String get gbBelowMark;

  /// Label of the field for the most marks of an exam.
  ///
  /// In en, this message translates to:
  /// **'Out of (marks)'**
  String get gbMarksField;

  /// Shown when the school has set no grade bands.
  ///
  /// In en, this message translates to:
  /// **'No grade bands are set. Marks show a percentage without a grade.'**
  String get gbBandsNone;

  /// Explains the grade bands editor.
  ///
  /// In en, this message translates to:
  /// **'Together the bands must cover 0 to 100 with no gap and no overlap. A percentage is never rounded up into a better band.'**
  String get gbBandsHint;

  /// Label of the lowest percentage of a band.
  ///
  /// In en, this message translates to:
  /// **'From (%)'**
  String get gbFrom;

  /// Label of the highest percentage of a band.
  ///
  /// In en, this message translates to:
  /// **'To (%)'**
  String get gbTo;

  /// Button: add a row to the grade bands.
  ///
  /// In en, this message translates to:
  /// **'Add a band'**
  String get gbAddBand;

  /// Button: fill the editor with the standard starting grade bands.
  ///
  /// In en, this message translates to:
  /// **'Use the standard set'**
  String get gbUseStandard;

  /// Button: save the grade bands.
  ///
  /// In en, this message translates to:
  /// **'Save grade bands'**
  String get gbSaveBands;

  /// Confirmation after the bands were saved.
  ///
  /// In en, this message translates to:
  /// **'Grade bands saved'**
  String get gbBandsSaved;

  /// Screen reader label of the remove button of a band.
  ///
  /// In en, this message translates to:
  /// **'Remove band {label}'**
  String gbRemoveBand(String label);

  /// Refusal: bands overlap.
  ///
  /// In en, this message translates to:
  /// **'Two bands cover the same percentages.'**
  String get gbBandOverlap;

  /// Refusal: bands leave a gap.
  ///
  /// In en, this message translates to:
  /// **'There is a gap between two bands.'**
  String get gbBandGap;

  /// Refusal: the lowest band does not start at 0.
  ///
  /// In en, this message translates to:
  /// **'The lowest band must start at 0.'**
  String get gbBandStart;

  /// Refusal: the highest band does not end at 100.
  ///
  /// In en, this message translates to:
  /// **'The highest band must end at 100.'**
  String get gbBandEnd;

  /// Refusal: two bands share a grade.
  ///
  /// In en, this message translates to:
  /// **'Two bands have the same grade.'**
  String get gbBandLabelTaken;

  /// Refusal: a band is not valid.
  ///
  /// In en, this message translates to:
  /// **'Each band needs whole numbers from 0 to 100, and a grade name.'**
  String get gbBandBad;

  /// Label of the choice of student.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get gbPickStudent;

  /// Under a report card: exams without a mark are not counted.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} exam has no mark yet and is left out} other{{count} exams have no mark yet and are left out}}'**
  String gbPending(int count);

  /// Button: download the report card as a PDF.
  ///
  /// In en, this message translates to:
  /// **'Download the report card (PDF)'**
  String get gbPdf;

  /// Shown when the student was in no class that term.
  ///
  /// In en, this message translates to:
  /// **'This student has no report card for this term.'**
  String get gbNoCard;

  /// Shown in a report card line for an exam the student missed.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get gbMarkAbsent;

  /// Confirmation after a day was locked.
  ///
  /// In en, this message translates to:
  /// **'Day locked'**
  String get attLockDone;

  /// Screen reader label of the switch between the daily register, the classes not taken yet and the status names.
  ///
  /// In en, this message translates to:
  /// **'Attendance view'**
  String get attViewLabel;

  /// Tab: one class's attendance on one date.
  ///
  /// In en, this message translates to:
  /// **'Daily register'**
  String get attTabRegister;

  /// Tab: the classes that have not taken attendance on a date.
  ///
  /// In en, this message translates to:
  /// **'Not taken yet'**
  String get attTabMissing;

  /// Tab: the school's own wording for the seven attendance statuses.
  ///
  /// In en, this message translates to:
  /// **'Status names'**
  String get attTabNames;

  /// Label of the date field.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get attDate;

  /// Attendance status: came to school.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get attStatusPRESENT;

  /// Attendance status: did not come.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get attStatusABSENT;

  /// Attendance status: came after the start.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get attStatusLATE;

  /// Attendance status: away on approved leave.
  ///
  /// In en, this message translates to:
  /// **'On leave'**
  String get attStatusLEAVE;

  /// Attendance status: away for a medical reason.
  ///
  /// In en, this message translates to:
  /// **'Medical'**
  String get attStatusMEDICAL;

  /// Attendance status: came for half the day.
  ///
  /// In en, this message translates to:
  /// **'Half day'**
  String get attStatusHALF_DAY;

  /// Attendance status: away with the school's permission.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get attStatusEXCUSED;

  /// One count in the summary line above the register: the status word and how many students.
  ///
  /// In en, this message translates to:
  /// **'{label}: {count}'**
  String attCount(String label, String count);

  /// Shown when no attendance exists yet for the class and date.
  ///
  /// In en, this message translates to:
  /// **'Attendance has not been taken for this class on this date. Everyone is shown as present until it is.'**
  String get attNotTaken;

  /// Who took the attendance.
  ///
  /// In en, this message translates to:
  /// **'Taken by {name}'**
  String attTakenBy(String name);

  /// Badge: the day is locked, a teacher can no longer change it.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get attLocked;

  /// Shown on a locked day for the Academic administrator.
  ///
  /// In en, this message translates to:
  /// **'This day is locked. Only a correction can change it, and the old and new values are recorded.'**
  String get attLockedNote;

  /// Column heading.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get attStudent;

  /// Column heading: the attendance status.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get attStatus;

  /// Column heading and field: a short note on an exception.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get attNote;

  /// Shown when the class has no students.
  ///
  /// In en, this message translates to:
  /// **'This class has no students yet.'**
  String get attNoStudents;

  /// Button: save the register.
  ///
  /// In en, this message translates to:
  /// **'Save attendance'**
  String get attSave;

  /// Button: save a correction to a locked day.
  ///
  /// In en, this message translates to:
  /// **'Save correction'**
  String get attSaveCorrection;

  /// Button: lock the register so a teacher can no longer change it.
  ///
  /// In en, this message translates to:
  /// **'Lock the day'**
  String get attLock;

  /// Confirmation after the register was saved.
  ///
  /// In en, this message translates to:
  /// **'Attendance saved'**
  String get attSaved;

  /// Confirmation after a correction was saved.
  ///
  /// In en, this message translates to:
  /// **'Correction saved'**
  String get attCorrected;

  /// Refusal: a teacher tried to change a locked day.
  ///
  /// In en, this message translates to:
  /// **'This day is locked. Ask the Academic administrator for a correction.'**
  String get attDayLocked;

  /// Refusal: attendance cannot be taken for a future date.
  ///
  /// In en, this message translates to:
  /// **'That date has not come yet.'**
  String get attFutureDate;

  /// Shown when every class has taken attendance (or the school does not work on the date).
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting for this date.'**
  String get attMissingEmpty;

  /// Heading of the list of classes that have not taken attendance.
  ///
  /// In en, this message translates to:
  /// **'Classes without attendance on {date}'**
  String attMissingTitle(String date);

  /// Explains the status names tab.
  ///
  /// In en, this message translates to:
  /// **'Rename a status for your school. What it means and its colour stay the same.'**
  String get attNamesHint;

  /// Label of the field where a school types its own word for a status.
  ///
  /// In en, this message translates to:
  /// **'Name for {status}'**
  String attNameFor(String status);

  /// Confirmation after a status was renamed.
  ///
  /// In en, this message translates to:
  /// **'Name saved'**
  String get attNameSaved;

  /// Shown beside a status that still has its standard name.
  ///
  /// In en, this message translates to:
  /// **'Standard name'**
  String get attNameDefault;

  /// Explains the staff attendance screen.
  ///
  /// In en, this message translates to:
  /// **'Who is at work on a date. Times are in Indian Standard Time.'**
  String get satTitleNote;

  /// Column heading: when a member of staff checked in.
  ///
  /// In en, this message translates to:
  /// **'In'**
  String get satIn;

  /// Column heading: when a member of staff checked out.
  ///
  /// In en, this message translates to:
  /// **'Out'**
  String get satOut;

  /// Staff state: checked in, not yet out.
  ///
  /// In en, this message translates to:
  /// **'At work'**
  String get satStateIN;

  /// Staff state: checked in and out.
  ///
  /// In en, this message translates to:
  /// **'Left for the day'**
  String get satStateOUT;

  /// Staff state: no check-in.
  ///
  /// In en, this message translates to:
  /// **'Not in yet'**
  String get satStateNONE;

  /// Button: correct a member of staff's times.
  ///
  /// In en, this message translates to:
  /// **'Correct'**
  String get satCorrect;

  /// Heading of the correction form.
  ///
  /// In en, this message translates to:
  /// **'Correct the times for {name}'**
  String satCorrectTitle(String name);

  /// Hint under the time fields.
  ///
  /// In en, this message translates to:
  /// **'Write times like 09:15.'**
  String get satTimeHint;

  /// Confirmation after times were corrected.
  ///
  /// In en, this message translates to:
  /// **'Times saved'**
  String get satSaved;

  /// Refusal: a check-out time needs a check-in time.
  ///
  /// In en, this message translates to:
  /// **'Enter the time in as well.'**
  String get satNeedsIn;

  /// Shown when there is no member of staff.
  ///
  /// In en, this message translates to:
  /// **'Nobody is on the staff list yet.'**
  String get satNone;

  /// Question before a period is removed from the bell schedule.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}?'**
  String ttRemoveQuestion(String name);

  /// Sidebar item: the timetable and the bell schedule.
  ///
  /// In en, this message translates to:
  /// **'Timetable'**
  String get navTimetable;

  /// Screen reader label of the switch between the timetable by class, by teacher and the bell schedule.
  ///
  /// In en, this message translates to:
  /// **'Timetable view'**
  String get ttViewLabel;

  /// Tab: the timetable of one class.
  ///
  /// In en, this message translates to:
  /// **'By class'**
  String get ttTabClass;

  /// Tab: the timetable of one teacher.
  ///
  /// In en, this message translates to:
  /// **'By teacher'**
  String get ttTabTeacher;

  /// Tab: the school's periods and working days.
  ///
  /// In en, this message translates to:
  /// **'Bell schedule'**
  String get ttTabSchedule;

  /// Label of the choice of teacher.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get ttPickTeacher;

  /// Label of the choice of subject in the lesson editor.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get ttSubject;

  /// Title shown when the timetable cannot be shown because no academic year is active.
  ///
  /// In en, this message translates to:
  /// **'There is no active academic year'**
  String get ttNoYearTitle;

  /// Body shown with the no-year title.
  ///
  /// In en, this message translates to:
  /// **'Make an academic year active first.'**
  String get ttNoYearBody;

  /// Shown when the school has no classes to pick.
  ///
  /// In en, this message translates to:
  /// **'There are no classes yet.'**
  String get ttNoClasses;

  /// Shown when no member of staff teaches a subject yet.
  ///
  /// In en, this message translates to:
  /// **'There are no teachers yet.'**
  String get ttNoTeachers;

  /// Title shown when the bell schedule is empty.
  ///
  /// In en, this message translates to:
  /// **'There are no periods yet'**
  String get ttNoPeriodsTitle;

  /// Body shown with the no-periods title.
  ///
  /// In en, this message translates to:
  /// **'Start from a standard day or a short day, or add periods one by one.'**
  String get ttNoPeriodsBody;

  /// Shown in a timetable cell that has no lesson.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get ttEmptyCell;

  /// Shown in place of a period that is a break, nothing is taught in it.
  ///
  /// In en, this message translates to:
  /// **'Break'**
  String get ttBreak;

  /// Title of the lesson editor; slot is the day and the period, for example Mon, Period 1.
  ///
  /// In en, this message translates to:
  /// **'Lesson on {slot}'**
  String ttEditorTitle(String slot);

  /// Button: put the chosen subject and teacher in the cell.
  ///
  /// In en, this message translates to:
  /// **'Set lesson'**
  String get ttSetLesson;

  /// Button: empty the cell.
  ///
  /// In en, this message translates to:
  /// **'Clear lesson'**
  String get ttClearLesson;

  /// Confirmation after a lesson was set.
  ///
  /// In en, this message translates to:
  /// **'Lesson saved'**
  String get ttSaved;

  /// Confirmation after a lesson was cleared.
  ///
  /// In en, this message translates to:
  /// **'Lesson cleared'**
  String get ttCleared;

  /// Refusal: the class already has a lesson in that period.
  ///
  /// In en, this message translates to:
  /// **'This class already has a lesson then.'**
  String get ttClassBusy;

  /// Refusal: the teacher already teaches another class in that period.
  ///
  /// In en, this message translates to:
  /// **'This teacher is already teaching another class then.'**
  String get ttTeacherBusy;

  /// Refusal: the teacher is not linked to the subject.
  ///
  /// In en, this message translates to:
  /// **'This teacher does not teach that subject.'**
  String get ttTeacherNotSubject;

  /// Refusal: the day is not a working day.
  ///
  /// In en, this message translates to:
  /// **'The school does not work on that day.'**
  String get ttNotWorkingDay;

  /// Refusal: a period used by the timetable cannot be deleted or turned into a break.
  ///
  /// In en, this message translates to:
  /// **'A period that has lessons in it cannot be removed or made a break.'**
  String get ttPeriodInUse;

  /// Refusal: the new period overlaps another one.
  ///
  /// In en, this message translates to:
  /// **'That time overlaps another period.'**
  String get ttPeriodOverlaps;

  /// Refusal: the name is taken.
  ///
  /// In en, this message translates to:
  /// **'Another period already has that name.'**
  String get ttPeriodLabelTaken;

  /// Refusal: the start time is taken.
  ///
  /// In en, this message translates to:
  /// **'Another period already starts at that time.'**
  String get ttPeriodStartTaken;

  /// Refusal: the period ends before it starts.
  ///
  /// In en, this message translates to:
  /// **'The end must be after the start.'**
  String get ttPeriodEnd;

  /// Refusal: a time was not in the form HH:MM.
  ///
  /// In en, this message translates to:
  /// **'Write times like 08:30.'**
  String get ttPeriodTime;

  /// Heading of the list of how many lessons each teacher has in a week.
  ///
  /// In en, this message translates to:
  /// **'Lessons per week'**
  String get ttLoadTitle;

  /// The number of lessons a teacher has in a week.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} lesson} other{{count} lessons}}'**
  String ttLoadCount(int count);

  /// Shown when the timetable is empty.
  ///
  /// In en, this message translates to:
  /// **'No lessons have been placed yet.'**
  String get ttNoLoad;

  /// Heading of the choice of the days the school works.
  ///
  /// In en, this message translates to:
  /// **'Working days'**
  String get ttWorkingDays;

  /// Confirmation after the working days were changed.
  ///
  /// In en, this message translates to:
  /// **'Working days saved'**
  String get ttDaysSaved;

  /// Label of a period's name, for example Period 1.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get ttPeriodName;

  /// Column and field: when a period starts.
  ///
  /// In en, this message translates to:
  /// **'Starts'**
  String get ttStarts;

  /// Column and field: when a period ends.
  ///
  /// In en, this message translates to:
  /// **'Ends'**
  String get ttEnds;

  /// Column heading: the number of a teaching period in the day.
  ///
  /// In en, this message translates to:
  /// **'No.'**
  String get ttNumber;

  /// Checkbox: the period is a break or lunch.
  ///
  /// In en, this message translates to:
  /// **'This is a break: nothing is taught in it'**
  String get ttIsBreak;

  /// Button and heading: add one period to the bell schedule.
  ///
  /// In en, this message translates to:
  /// **'Add a period'**
  String get ttAddPeriod;

  /// Confirmation after a period was added.
  ///
  /// In en, this message translates to:
  /// **'Period added'**
  String get ttPeriodAdded;

  /// Button: fill an empty bell schedule with a standard school day.
  ///
  /// In en, this message translates to:
  /// **'Start with a standard day'**
  String get ttStandard;

  /// Button: fill an empty bell schedule with a short school day.
  ///
  /// In en, this message translates to:
  /// **'Start with a short day'**
  String get ttShort;

  /// Confirmation after a starting bell schedule was applied.
  ///
  /// In en, this message translates to:
  /// **'Bell schedule created'**
  String get ttTemplateApplied;

  /// Short name of Monday.
  ///
  /// In en, this message translates to:
  /// **'Mon'**
  String get ttDayMON;

  /// Short name of Tuesday.
  ///
  /// In en, this message translates to:
  /// **'Tue'**
  String get ttDayTUE;

  /// Short name of Wednesday.
  ///
  /// In en, this message translates to:
  /// **'Wed'**
  String get ttDayWED;

  /// Short name of Thursday.
  ///
  /// In en, this message translates to:
  /// **'Thu'**
  String get ttDayTHU;

  /// Short name of Friday.
  ///
  /// In en, this message translates to:
  /// **'Fri'**
  String get ttDayFRI;

  /// Short name of Saturday.
  ///
  /// In en, this message translates to:
  /// **'Sat'**
  String get ttDaySAT;

  /// Short name of Sunday.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get ttDaySUN;

  /// Title of the notice to the Principal that a leave request is waiting.
  ///
  /// In en, this message translates to:
  /// **'Leave to decide'**
  String get notifLeaveRequestedTitle;

  /// Body of the notice to the Principal: who asked for how many days of which kind of leave, and when.
  ///
  /// In en, this message translates to:
  /// **'{name} asked for {days} day(s) of {typeName} leave from {startDate} to {endDate}.'**
  String notifLeaveRequestedBody(
    String name,
    String days,
    String typeName,
    String startDate,
    String endDate,
  );

  /// Title of the notice to a member of staff that the Principal approved their leave.
  ///
  /// In en, this message translates to:
  /// **'Your leave was approved'**
  String get notifLeaveApprovedTitle;

  /// Body of the approval notice: the kind of leave, the dates and the number of days.
  ///
  /// In en, this message translates to:
  /// **'{typeName}, {startDate} to {endDate} ({days} day(s)).'**
  String notifLeaveApprovedBody(
    String typeName,
    String startDate,
    String endDate,
    String days,
  );

  /// Title of the notice to a member of staff that the Principal did not approve their leave.
  ///
  /// In en, this message translates to:
  /// **'Your leave was not approved'**
  String get notifLeaveRejectedTitle;

  /// Body of the notice that leave was not approved: the kind, the dates and the Principal's note, if any.
  ///
  /// In en, this message translates to:
  /// **'{typeName}, {startDate} to {endDate}. {note}'**
  String notifLeaveRejectedBody(
    String typeName,
    String startDate,
    String endDate,
    String note,
  );

  /// Title of the notice to the Academic administrator that approved leave leaves lessons uncovered.
  ///
  /// In en, this message translates to:
  /// **'Lessons need a substitute'**
  String get notifLeaveSubstitutionTitle;

  /// Body of that notice: who is away, when, and where to choose who covers.
  ///
  /// In en, this message translates to:
  /// **'{name} is on leave from {startDate} to {endDate}. Choose substitutes on the substitution board.'**
  String notifLeaveSubstitutionBody(
    String name,
    String startDate,
    String endDate,
  );

  /// Title of the notice to HR that approved unpaid leave proposes a pay deduction.
  ///
  /// In en, this message translates to:
  /// **'Unpaid leave to deduct'**
  String get notifLeavePayrollTitle;

  /// Body of that notice: who, when, and where to review the proposed deduction.
  ///
  /// In en, this message translates to:
  /// **'{name} has approved unpaid leave from {startDate} to {endDate}. Review the proposed deduction in the payroll run.'**
  String notifLeavePayrollBody(String name, String startDate, String endDate);

  /// Title of the notice to a teacher that they were chosen to cover another teacher's lesson.
  ///
  /// In en, this message translates to:
  /// **'You are covering a class'**
  String get notifSubstitutionAssignedTitle;

  /// Body of that notice: which lesson, when, and for whom.
  ///
  /// In en, this message translates to:
  /// **'{className}, {subjectName}, {periodLabel} on {date}, covering for {name}.'**
  String notifSubstitutionAssignedBody(
    String className,
    String subjectName,
    String periodLabel,
    String date,
    String name,
  );

  /// Title of the notice to a teacher that a cover duty they were given was taken away.
  ///
  /// In en, this message translates to:
  /// **'Cover cancelled'**
  String get notifSubstitutionClearedTitle;

  /// Body of that notice: which lesson and when.
  ///
  /// In en, this message translates to:
  /// **'{className}, {subjectName} on {date} no longer needs you.'**
  String notifSubstitutionClearedBody(
    String className,
    String subjectName,
    String date,
  );

  /// Title of the printed report card of one student for one term.
  ///
  /// In en, this message translates to:
  /// **'Report card'**
  String get gradesReportCardTitle;

  /// Label before the name of the school term on a printed report card.
  ///
  /// In en, this message translates to:
  /// **'Term'**
  String get gradesTerm;

  /// Column heading: the subject on a report card.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get gradesSubject;

  /// Column heading: the marks a student got.
  ///
  /// In en, this message translates to:
  /// **'Marks'**
  String get gradesMarks;

  /// Column heading: the most marks that could be got.
  ///
  /// In en, this message translates to:
  /// **'Out of'**
  String get gradesOutOf;

  /// Column heading: marks as a percentage of the most possible.
  ///
  /// In en, this message translates to:
  /// **'Percent'**
  String get gradesPercent;

  /// Column heading: the grade band the percentage falls in.
  ///
  /// In en, this message translates to:
  /// **'Grade'**
  String get gradesGrade;

  /// Column heading: the date an invoice has to be paid by.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get reportDueDate;

  /// Column heading: the amount an invoice asks for.
  ///
  /// In en, this message translates to:
  /// **'Amount due'**
  String get reportAmountDue;

  /// Column heading: money still owed on an invoice.
  ///
  /// In en, this message translates to:
  /// **'Outstanding'**
  String get reportOutstanding;

  /// Column heading: how many days past its due date an invoice is.
  ///
  /// In en, this message translates to:
  /// **'Days overdue'**
  String get reportDaysOverdue;

  /// Column heading: the month a pay run is for.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get reportMonth;

  /// Column heading: how many staff members were paid.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get reportHeadcount;

  /// Status of a pay run the Principal has approved and the Bursar has not yet paid.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get reportApproved;

  /// Status of a pay run that has been paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get reportPaid;

  /// Label of the first date of a date range on a report screen.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get webFrom;

  /// Label of the last date of a date range on a report screen.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get webTo;

  /// Button that saves the report as a spreadsheet file (CSV).
  ///
  /// In en, this message translates to:
  /// **'Download CSV'**
  String get webDownloadCsv;

  /// Button that saves the report as a printable PDF file.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get webDownloadPdf;

  /// Shown when saving a report file fails.
  ///
  /// In en, this message translates to:
  /// **'The file could not be made. Try again.'**
  String get webDownloadFailed;

  /// Heading of the row of key numbers on the dashboard.
  ///
  /// In en, this message translates to:
  /// **'At a glance'**
  String get webAtAGlance;

  /// Dashboard number: fee money taken since the first of the month.
  ///
  /// In en, this message translates to:
  /// **'Collected this month'**
  String get webCollectedThisMonth;

  /// How many payments make up a total.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} payment} other{{count} payments}}'**
  String webPaymentsCount(int count);

  /// Dashboard number: fee money that has fallen due and is not paid.
  ///
  /// In en, this message translates to:
  /// **'Outstanding fees'**
  String get webOutstandingFees;

  /// How many fee invoices make up a total.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} invoice} other{{count} invoices}}'**
  String webInvoicesCount(int count);

  /// Heading of the totals split by cash, cheque, UPI and so on.
  ///
  /// In en, this message translates to:
  /// **'By payment method'**
  String get webByMethod;

  /// Heading of the outstanding totals split by how late they are.
  ///
  /// In en, this message translates to:
  /// **'By how long overdue'**
  String get webByAge;

  /// Age group: falls due on the report date.
  ///
  /// In en, this message translates to:
  /// **'Due today'**
  String get webBandDueToday;

  /// Age group of unpaid fees.
  ///
  /// In en, this message translates to:
  /// **'1 to 30 days overdue'**
  String get webBand1To30;

  /// Age group of unpaid fees.
  ///
  /// In en, this message translates to:
  /// **'31 to 60 days overdue'**
  String get webBand31To60;

  /// Age group of unpaid fees.
  ///
  /// In en, this message translates to:
  /// **'61 to 90 days overdue'**
  String get webBand61To90;

  /// Age group of unpaid fees.
  ///
  /// In en, this message translates to:
  /// **'More than 90 days overdue'**
  String get webBandOver90;

  /// Empty state of a report for the chosen dates.
  ///
  /// In en, this message translates to:
  /// **'Nothing in this range'**
  String get webNoRowsTitle;

  /// Hint under the empty state of a report.
  ///
  /// In en, this message translates to:
  /// **'Try different dates.'**
  String get webNoRowsBody;

  /// Empty state of the outstanding fees report: everything due is paid.
  ///
  /// In en, this message translates to:
  /// **'No fees outstanding'**
  String get webNoDuesTitle;

  /// Note shown to a role that may see report totals but not the people in them.
  ///
  /// In en, this message translates to:
  /// **'You can see the totals but not the individual payments.'**
  String get webTotalsOnly;

  /// Button: go to the previous page of a table.
  ///
  /// In en, this message translates to:
  /// **'Previous'**
  String get webPrevious;

  /// Button: go to the next page of a table.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get webNext;

  /// Where you are in a table that has several pages.
  ///
  /// In en, this message translates to:
  /// **'Page {page} of {pages}'**
  String webPageOf(String page, String pages);

  /// Label of the total of fee money taken in the chosen dates.
  ///
  /// In en, this message translates to:
  /// **'Collected'**
  String get webCollected;

  /// Placeholder-style label of the search box above a list of students.
  ///
  /// In en, this message translates to:
  /// **'Search by name or enrolment no.'**
  String get peoSearch;

  /// Choice that shows every status in a list.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get peoAll;

  /// Status of a student who is not attending at the moment.
  ///
  /// In en, this message translates to:
  /// **'Inactive'**
  String get peoInactive;

  /// Status of a student who has left the school.
  ///
  /// In en, this message translates to:
  /// **'Left'**
  String get peoLeft;

  /// Button that opens the form to add a student.
  ///
  /// In en, this message translates to:
  /// **'Add student'**
  String get peoAddStudent;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get peoFirstName;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get peoLastName;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Date of birth'**
  String get peoDateOfBirth;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get peoGender;

  /// Choice for gender.
  ///
  /// In en, this message translates to:
  /// **'Female'**
  String get peoFemale;

  /// Choice for gender.
  ///
  /// In en, this message translates to:
  /// **'Male'**
  String get peoMale;

  /// Form label for a home address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get peoAddress;

  /// Heading of a column or form field: the class a student is in.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get peoClass;

  /// Empty state of the students list.
  ///
  /// In en, this message translates to:
  /// **'No students yet'**
  String get peoNoStudentsTitle;

  /// Hint under the empty state of the students list.
  ///
  /// In en, this message translates to:
  /// **'Add the first student, or import a list.'**
  String get peoNoStudentsBody;

  /// Shown when a search finds nothing.
  ///
  /// In en, this message translates to:
  /// **'No student matches this search.'**
  String get peoNoMatch;

  /// Confirmation after adding a student.
  ///
  /// In en, this message translates to:
  /// **'Student added'**
  String get peoStudentAdded;

  /// Heading of the list of a student's guardians.
  ///
  /// In en, this message translates to:
  /// **'Guardians'**
  String get peoGuardians;

  /// Shown when a student has no guardian on record.
  ///
  /// In en, this message translates to:
  /// **'No guardians recorded'**
  String get peoNoGuardians;

  /// Form label: how a guardian is related to the child.
  ///
  /// In en, this message translates to:
  /// **'Relationship'**
  String get peoRelationship;

  /// Relationship choice.
  ///
  /// In en, this message translates to:
  /// **'Mother'**
  String get peoMother;

  /// Relationship choice.
  ///
  /// In en, this message translates to:
  /// **'Father'**
  String get peoFather;

  /// Relationship choice: a guardian who is not a parent.
  ///
  /// In en, this message translates to:
  /// **'Guardian'**
  String get peoGuardianRel;

  /// Marks the guardian the school calls first.
  ///
  /// In en, this message translates to:
  /// **'Primary contact'**
  String get peoPrimary;

  /// Heading of the list of classes a student has been in.
  ///
  /// In en, this message translates to:
  /// **'Class history'**
  String get peoClassHistory;

  /// Label of the day a student was admitted.
  ///
  /// In en, this message translates to:
  /// **'Admission date'**
  String get peoAdmissionDate;

  /// Link back from a detail page to its list.
  ///
  /// In en, this message translates to:
  /// **'Back to the list'**
  String get peoBackToList;

  /// Column heading: how many students a class can hold.
  ///
  /// In en, this message translates to:
  /// **'Capacity'**
  String get peoCapacity;

  /// Column heading: the section letter of a class.
  ///
  /// In en, this message translates to:
  /// **'Section'**
  String get peoSection;

  /// Column heading: the class level, for example 5 or Nursery.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get peoLevel;

  /// Empty state of the classes list.
  ///
  /// In en, this message translates to:
  /// **'No classes yet'**
  String get peoNoClassesTitle;

  /// Title of the admissions applications screen.
  ///
  /// In en, this message translates to:
  /// **'Applications'**
  String get peoApplications;

  /// Button that opens the form for a new admission application.
  ///
  /// In en, this message translates to:
  /// **'New application'**
  String get peoNewApplication;

  /// Column heading: the number given to an application.
  ///
  /// In en, this message translates to:
  /// **'Application no.'**
  String get peoApplicationNo;

  /// Column heading: the child applying.
  ///
  /// In en, this message translates to:
  /// **'Applicant'**
  String get peoApplicant;

  /// Form label: the class level the child is applying to.
  ///
  /// In en, this message translates to:
  /// **'Level applied for'**
  String get peoLevelApplied;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Guardian name'**
  String get peoGuardianName;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Guardian phone'**
  String get peoGuardianPhone;

  /// Status of an application that has just come in.
  ///
  /// In en, this message translates to:
  /// **'Submitted'**
  String get peoSubmitted;

  /// Status of an application being looked at.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get peoUnderReview;

  /// Status of an application the school has accepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get peoAccepted;

  /// Status of an application the school has turned down.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get peoRejected;

  /// Status of an application the family took back.
  ///
  /// In en, this message translates to:
  /// **'Withdrawn'**
  String get peoWithdrawn;

  /// Status of an application whose child is now a student.
  ///
  /// In en, this message translates to:
  /// **'Admitted'**
  String get peoAdmitted;

  /// Button: move an application to under review.
  ///
  /// In en, this message translates to:
  /// **'Start review'**
  String get peoStartReview;

  /// Button: accept an application.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get peoAccept;

  /// Button: turn an application down.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get peoReject;

  /// Button: record that the family withdrew the application.
  ///
  /// In en, this message translates to:
  /// **'Mark as withdrawn'**
  String get peoWithdraw;

  /// Form label for a note that goes with a decision.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get peoNote;

  /// Button: turn an accepted application into a student.
  ///
  /// In en, this message translates to:
  /// **'Admit student'**
  String get peoAdmitStudent;

  /// Confirmation after admitting a student; {id} is the new enrolment number.
  ///
  /// In en, this message translates to:
  /// **'Student admitted. Enrolment no. {id}'**
  String peoStudentAdmitted(String id);

  /// Empty state of the applications list.
  ///
  /// In en, this message translates to:
  /// **'No applications yet'**
  String get peoNoApplicationsTitle;

  /// Confirmation after saving an application.
  ///
  /// In en, this message translates to:
  /// **'Application saved'**
  String get peoApplicationSaved;

  /// Button that opens the form to add a staff member.
  ///
  /// In en, this message translates to:
  /// **'Add staff member'**
  String get hrpAddStaff;

  /// Label of the search box above the staff list.
  ///
  /// In en, this message translates to:
  /// **'Search by name or employee no.'**
  String get hrpSearch;

  /// Choice that shows staff of every department.
  ///
  /// In en, this message translates to:
  /// **'All departments'**
  String get hrpAllDepartments;

  /// Label of the day a staff member joined.
  ///
  /// In en, this message translates to:
  /// **'Date of joining'**
  String get hrpJoined;

  /// Empty state of the staff list.
  ///
  /// In en, this message translates to:
  /// **'No staff yet'**
  String get hrpNoStaffTitle;

  /// Shown when a search finds nothing.
  ///
  /// In en, this message translates to:
  /// **'No staff member matches this search.'**
  String get hrpNoMatch;

  /// Confirmation after adding a staff member.
  ///
  /// In en, this message translates to:
  /// **'Staff member added'**
  String get hrpStaffAdded;

  /// Heading of the salary section on a staff member's page.
  ///
  /// In en, this message translates to:
  /// **'Salary'**
  String get hrpSalary;

  /// Kind of salary line: money the person is paid.
  ///
  /// In en, this message translates to:
  /// **'Earning'**
  String get hrpEarning;

  /// Kind of salary line: money taken off pay.
  ///
  /// In en, this message translates to:
  /// **'Deduction'**
  String get hrpDeduction;

  /// Form label: earning or deduction.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get hrpKind;

  /// Form label: the name of a salary line, for example Basic pay.
  ///
  /// In en, this message translates to:
  /// **'Component'**
  String get hrpComponent;

  /// Column heading and form label for an amount of money.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get hrpAmount;

  /// Hint under an amount field.
  ///
  /// In en, this message translates to:
  /// **'In rupees, for example 45,000.50'**
  String get hrpAmountHint;

  /// Button that adds a line to a salary.
  ///
  /// In en, this message translates to:
  /// **'Add salary line'**
  String get hrpAddLine;

  /// Shown when a staff member has no salary lines.
  ///
  /// In en, this message translates to:
  /// **'No salary set yet'**
  String get hrpNoLines;

  /// Button that removes a salary line.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get hrpRemove;

  /// Button that starts the monthly pay run.
  ///
  /// In en, this message translates to:
  /// **'New pay run'**
  String get hrpNewRun;

  /// Confirmation after creating a pay run.
  ///
  /// In en, this message translates to:
  /// **'Pay run created'**
  String get hrpRunCreated;

  /// Status of a pay run that can still change.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get hrpDraft;

  /// Label: who made the pay run.
  ///
  /// In en, this message translates to:
  /// **'Prepared by'**
  String get hrpPreparedBy;

  /// Label: who approved the pay run.
  ///
  /// In en, this message translates to:
  /// **'Approved by'**
  String get hrpApprovedBy;

  /// Button: the Principal approves a pay run.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get hrpApprove;

  /// Button: the Bursar records that a pay run was paid.
  ///
  /// In en, this message translates to:
  /// **'Mark as paid'**
  String get hrpPay;

  /// Button that deletes a draft pay run.
  ///
  /// In en, this message translates to:
  /// **'Delete draft'**
  String get hrpDeleteRun;

  /// Button that confirms an action that cannot be undone.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get hrpConfirm;

  /// Question before a pay run is approved.
  ///
  /// In en, this message translates to:
  /// **'Approve payroll for {month}? {count} staff, net pay {net}. This cannot be undone.'**
  String hrpConfirmApprove(String month, String count, String net);

  /// Question before a pay run is marked as paid.
  ///
  /// In en, this message translates to:
  /// **'Record payment of {net} for {month}? This cannot be undone.'**
  String hrpConfirmPay(String net, String month);

  /// Question before a draft pay run is deleted.
  ///
  /// In en, this message translates to:
  /// **'Delete the draft for {month}? You can make it again.'**
  String hrpConfirmDelete(String month);

  /// Title of one month's pay run page.
  ///
  /// In en, this message translates to:
  /// **'Payroll {month}'**
  String hrpRunTitle(String month);

  /// Opens the lines of one payslip.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get hrpDetails;

  /// Button that saves one payslip as a PDF.
  ///
  /// In en, this message translates to:
  /// **'Payslip PDF'**
  String get hrpPayslipPdf;

  /// Empty state of the pay runs list.
  ///
  /// In en, this message translates to:
  /// **'No pay runs yet'**
  String get hrpNoRunsTitle;

  /// Hint under the empty state of the pay runs list.
  ///
  /// In en, this message translates to:
  /// **'Set up salaries on each staff member first, then create the month\'s run.'**
  String get hrpNoRunsBody;

  /// Tab: the list of fee invoices.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get feeTabInvoices;

  /// Tab: the list of fee receipts.
  ///
  /// In en, this message translates to:
  /// **'Receipts'**
  String get feeTabReceipts;

  /// Tab: what each class level pays.
  ///
  /// In en, this message translates to:
  /// **'Fee structures'**
  String get feeTabStructures;

  /// Status of an invoice past its due date and not paid.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get feeStatusOverdue;

  /// Status of an invoice that has been paid in part.
  ///
  /// In en, this message translates to:
  /// **'Part paid'**
  String get feeStatusPartial;

  /// Status of an invoice that has no payment yet.
  ///
  /// In en, this message translates to:
  /// **'Not paid'**
  String get feeStatusPending;

  /// Total of the invoices in a list.
  ///
  /// In en, this message translates to:
  /// **'Billed'**
  String get feeBilled;

  /// Button that opens the form for a one-off invoice.
  ///
  /// In en, this message translates to:
  /// **'New invoice'**
  String get feeNewInvoice;

  /// Button that opens the form that makes invoices from the fee structures.
  ///
  /// In en, this message translates to:
  /// **'Bill fees'**
  String get feeBillFees;

  /// Form label: what an invoice is for.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get feeDescription;

  /// Label of the box that finds the student an invoice is for.
  ///
  /// In en, this message translates to:
  /// **'Find a student by name or enrolment no.'**
  String get feeFindStudent;

  /// Confirmation after creating an invoice.
  ///
  /// In en, this message translates to:
  /// **'Invoice created'**
  String get feeInvoiceCreated;

  /// Button that records money received for an invoice.
  ///
  /// In en, this message translates to:
  /// **'Record payment'**
  String get feeRecordPayment;

  /// Confirmation after a payment; {number} is the receipt number.
  ///
  /// In en, this message translates to:
  /// **'Payment recorded. Receipt no. {number}'**
  String feePaymentRecorded(String number);

  /// Heading of the payments made against an invoice.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get feePayments;

  /// Shown when an invoice has no payment.
  ///
  /// In en, this message translates to:
  /// **'No payments yet'**
  String get feeNoPayments;

  /// Form label: cash, cheque, UPI and so on.
  ///
  /// In en, this message translates to:
  /// **'Payment method'**
  String get feeMethod;

  /// Button that takes a payment back.
  ///
  /// In en, this message translates to:
  /// **'Reverse'**
  String get feeReverse;

  /// Form label: why a payment is being reversed.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get feeReason;

  /// Question before a payment is reversed.
  ///
  /// In en, this message translates to:
  /// **'Reverse this payment of {amount}? The invoice becomes unpaid again and the receipt is cancelled. This cannot be undone.'**
  String feeConfirmReverse(String amount);

  /// Button that saves a receipt as a PDF.
  ///
  /// In en, this message translates to:
  /// **'Receipt PDF'**
  String get feeReceiptPdf;

  /// Explains what billing fees does.
  ///
  /// In en, this message translates to:
  /// **'Makes an invoice for every instalment due on or before the date, for the students of the level you choose (or all). Instalments already billed are left alone.'**
  String get feeBillIntro;

  /// Form label: the last due date to bill.
  ///
  /// In en, this message translates to:
  /// **'Instalments due up to'**
  String get feeBillUpTo;

  /// Button that counts what would be billed without saving anything.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get feePreview;

  /// Button that makes the invoices after a preview.
  ///
  /// In en, this message translates to:
  /// **'Create invoices'**
  String get feeCreateInvoices;

  /// Result of a preview of billing.
  ///
  /// In en, this message translates to:
  /// **'{created} invoices would be created. Already billed: {already}. Students without fees set up: {without}.'**
  String feePreviewResult(String created, String already, String without);

  /// Result after billing.
  ///
  /// In en, this message translates to:
  /// **'{created} invoices created. Already billed: {already}.'**
  String feeCreatedResult(String created, String already);

  /// Choice that bills every class level.
  ///
  /// In en, this message translates to:
  /// **'All levels'**
  String get feeLevelAll;

  /// Total of the receipts in a list.
  ///
  /// In en, this message translates to:
  /// **'Total received'**
  String get feeReceiptsTotal;

  /// Empty state of the receipts list.
  ///
  /// In en, this message translates to:
  /// **'No receipts yet'**
  String get feeNoReceiptsTitle;

  /// Empty state of the invoices list.
  ///
  /// In en, this message translates to:
  /// **'No invoices yet'**
  String get feeNoInvoicesTitle;

  /// Hint under the empty state of the invoices list.
  ///
  /// In en, this message translates to:
  /// **'Set up fees, then bill them.'**
  String get feeNoInvoicesBody;

  /// Button that starts the fee structure of a class level.
  ///
  /// In en, this message translates to:
  /// **'New fee structure'**
  String get feeNewStructure;

  /// Confirmation after creating a fee structure.
  ///
  /// In en, this message translates to:
  /// **'Fee structure created'**
  String get feeStructureCreated;

  /// Button that adds a fee, for example Tuition, to a structure.
  ///
  /// In en, this message translates to:
  /// **'Add a fee'**
  String get feeAddFee;

  /// Form label: the name of a fee, for example Tuition.
  ///
  /// In en, this message translates to:
  /// **'Fee name'**
  String get feeFeeName;

  /// Heading of the parts a fee is paid in.
  ///
  /// In en, this message translates to:
  /// **'Instalments'**
  String get feeInstalments;

  /// Form label: the name of an instalment, for example Term 1.
  ///
  /// In en, this message translates to:
  /// **'Label'**
  String get feeInstalmentLabel;

  /// Button that adds a row for another instalment.
  ///
  /// In en, this message translates to:
  /// **'Add instalment'**
  String get feeAddInstalment;

  /// Empty state of the fee structures list.
  ///
  /// In en, this message translates to:
  /// **'No fee structures yet'**
  String get feeNoStructuresTitle;

  /// Total of all the fees of a structure.
  ///
  /// In en, this message translates to:
  /// **'Total for the year'**
  String get feeStructureTotal;

  /// Confirmation after adding a fee.
  ///
  /// In en, this message translates to:
  /// **'Fee added'**
  String get feeFeeAdded;

  /// Shown when a structure has no fees.
  ///
  /// In en, this message translates to:
  /// **'No fees in this structure yet'**
  String get feeNoItems;

  /// Tab: the classes of the school.
  ///
  /// In en, this message translates to:
  /// **'Classes'**
  String get setTabClasses;

  /// Tab: the subjects taught.
  ///
  /// In en, this message translates to:
  /// **'Subjects'**
  String get setTabSubjects;

  /// Tab: the academic years.
  ///
  /// In en, this message translates to:
  /// **'Academic years'**
  String get setTabYears;

  /// Button that opens the form for a new class.
  ///
  /// In en, this message translates to:
  /// **'Add class'**
  String get setAddClass;

  /// Confirmation after adding a class.
  ///
  /// In en, this message translates to:
  /// **'Class added'**
  String get setClassAdded;

  /// Hint under the section field.
  ///
  /// In en, this message translates to:
  /// **'Section letter, for example A'**
  String get setSectionHint;

  /// Button that adds a subject.
  ///
  /// In en, this message translates to:
  /// **'Add subject'**
  String get setAddSubject;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Subject name'**
  String get setSubjectName;

  /// Form label: a short unique code of a subject, for example MATH.
  ///
  /// In en, this message translates to:
  /// **'Short code'**
  String get setSubjectCode;

  /// Empty state of the subjects list.
  ///
  /// In en, this message translates to:
  /// **'No subjects yet'**
  String get setNoSubjects;

  /// Confirmation after adding a subject.
  ///
  /// In en, this message translates to:
  /// **'Subject added'**
  String get setSubjectAdded;

  /// Button that opens the form for a new academic year.
  ///
  /// In en, this message translates to:
  /// **'New academic year'**
  String get setNewYear;

  /// Hint for the name of an academic year.
  ///
  /// In en, this message translates to:
  /// **'Name, for example 2027-2028'**
  String get setYearName;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get setStartDate;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'End date'**
  String get setEndDate;

  /// Button that makes an academic year the active one.
  ///
  /// In en, this message translates to:
  /// **'Make active'**
  String get setMakeActive;

  /// Question before an academic year becomes the active one.
  ///
  /// In en, this message translates to:
  /// **'Make {name} the active academic year? New students, invoices and receipts will use it.'**
  String setConfirmActivate(String name);

  /// Confirmation after adding an academic year.
  ///
  /// In en, this message translates to:
  /// **'Academic year added'**
  String get setYearAdded;

  /// Heading of the school profile form.
  ///
  /// In en, this message translates to:
  /// **'School profile'**
  String get setProfileTitle;

  /// Form label: the school's main colour.
  ///
  /// In en, this message translates to:
  /// **'Brand colour'**
  String get setBrandColour;

  /// Hint under the brand colour field.
  ///
  /// In en, this message translates to:
  /// **'A dark colour written as # and six letters or digits, so white text on it is easy to read.'**
  String get setBrandHint;

  /// Confirmation after saving the school profile.
  ///
  /// In en, this message translates to:
  /// **'Settings saved'**
  String get setProfileSaved;

  /// Button that opens the CSV import.
  ///
  /// In en, this message translates to:
  /// **'Import from CSV'**
  String get setImport;

  /// Explains the CSV import.
  ///
  /// In en, this message translates to:
  /// **'Choose a CSV file. It is checked first, and nothing is saved until you confirm.'**
  String get setImportIntro;

  /// Label of the file chooser.
  ///
  /// In en, this message translates to:
  /// **'CSV file'**
  String get setChooseFile;

  /// Button that checks a CSV file without saving anything.
  ///
  /// In en, this message translates to:
  /// **'Check the file'**
  String get setCheckFile;

  /// Result of checking a CSV file.
  ///
  /// In en, this message translates to:
  /// **'{valid} of {total} rows are ready. {errors} rows have problems.'**
  String setCheckResult(String valid, String total, String errors);

  /// Lists the columns a CSV file must have and does not.
  ///
  /// In en, this message translates to:
  /// **'Missing columns: {names}'**
  String setMissingColumns(String names);

  /// One problem found in a CSV file.
  ///
  /// In en, this message translates to:
  /// **'Row {row}, {column}: {rule}'**
  String setProblemLine(String row, String column, String rule);

  /// Shown when the same CSV file is chosen again.
  ///
  /// In en, this message translates to:
  /// **'This file was already imported.'**
  String get setAlreadyImported;

  /// Button that imports a checked CSV file.
  ///
  /// In en, this message translates to:
  /// **'Import {count} rows'**
  String setImportNow(String count);

  /// Result after a CSV import.
  ///
  /// In en, this message translates to:
  /// **'{count} records created.'**
  String setImportDone(String count);

  /// Result after a CSV import when some rows failed.
  ///
  /// In en, this message translates to:
  /// **'{count} rows could not be created.'**
  String setImportFailed(String count);

  /// Heading of the payroll totals split by department.
  ///
  /// In en, this message translates to:
  /// **'By department'**
  String get hrrByDepartment;

  /// Label for staff who have no department.
  ///
  /// In en, this message translates to:
  /// **'No department'**
  String get hrrNoDepartment;

  /// Empty state of the payroll summary.
  ///
  /// In en, this message translates to:
  /// **'No approved or paid pay runs in this year'**
  String get hrrNoRunsTitle;

  /// Dashboard number: admission applications that have come in and nobody has started to review.
  ///
  /// In en, this message translates to:
  /// **'Applications waiting for review'**
  String get webApplicationsWaiting;

  /// Dashboard number: draft pay runs the Principal has not approved yet.
  ///
  /// In en, this message translates to:
  /// **'Pay runs waiting for approval'**
  String get webRunsWaiting;

  /// Heading shown on the web ERP to a person whose role is for the mobile apps (teacher, staff, driver, parent).
  ///
  /// In en, this message translates to:
  /// **'Your role works in the mobile app'**
  String get webFieldRoleTitle;

  /// Explains where a mobile-app role should go. Keep the brand name OruSchools in Latin letters.
  ///
  /// In en, this message translates to:
  /// **'This web area is for administrators. Open the OruSchools app on your phone.'**
  String get webFieldRoleBody;

  /// Tab: the people who can sign in to this school.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get usrTabMembers;

  /// Tab: the invitations that have been made.
  ///
  /// In en, this message translates to:
  /// **'Invitations'**
  String get usrTabInvitations;

  /// Column heading: when a person joined the school.
  ///
  /// In en, this message translates to:
  /// **'Member since'**
  String get usrSince;

  /// Marks the row that is the signed-in person.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get usrYou;

  /// Button that changes the role of a member.
  ///
  /// In en, this message translates to:
  /// **'Change role'**
  String get usrChangeRole;

  /// Column heading and form label: the role a person has.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get usrRole;

  /// Question before a member's role is changed.
  ///
  /// In en, this message translates to:
  /// **'Change {name} to {role}? Their screens change at once.'**
  String usrConfirmRole(String name, String role);

  /// Question before a member is suspended.
  ///
  /// In en, this message translates to:
  /// **'Suspend {name}? They cannot sign in until you reactivate them.'**
  String usrConfirmSuspend(String name);

  /// Question before a member is removed.
  ///
  /// In en, this message translates to:
  /// **'Remove {name} from this school? They lose their place here.'**
  String usrConfirmRemove(String name);

  /// Button that opens the form that creates an account for a staff member.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get usrNewAccount;

  /// Explains who an account is for.
  ///
  /// In en, this message translates to:
  /// **'For a person who works at the school and does not have an account yet. They sign in with email or a mobile number.'**
  String get usrAccountIntro;

  /// Form label.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get usrDisplayName;

  /// Confirmation after creating an account.
  ///
  /// In en, this message translates to:
  /// **'Account created for {name}.'**
  String usrAccountCreated(String name);

  /// Shown after the set-password email was sent.
  ///
  /// In en, this message translates to:
  /// **'A link to set a password was sent to {email}.'**
  String usrLinkSent(String email);

  /// Shown when the set-password email could not be sent.
  ///
  /// In en, this message translates to:
  /// **'The account was created, but the link could not be sent.'**
  String get usrLinkFailed;

  /// Button that sends the set-password email again.
  ///
  /// In en, this message translates to:
  /// **'Send the link again'**
  String get usrSendLink;

  /// Button that opens the form for an invitation.
  ///
  /// In en, this message translates to:
  /// **'Invite someone'**
  String get usrNewInvitation;

  /// Explains how an invitation works.
  ///
  /// In en, this message translates to:
  /// **'Makes a one-time code. Give it to the person: after they sign in they enter it to join this school.'**
  String get usrInvitationIntro;

  /// Form label: how many days an invitation can be used.
  ///
  /// In en, this message translates to:
  /// **'Valid for (days)'**
  String get usrExpiresIn;

  /// Shown with a new invitation's secret code.
  ///
  /// In en, this message translates to:
  /// **'One-time code. Copy it now: it is shown only once.'**
  String get usrInvitationCode;

  /// Button that cancels an invitation that has not been used.
  ///
  /// In en, this message translates to:
  /// **'Cancel invitation'**
  String get usrRevoke;

  /// Column heading: when an invitation stops working.
  ///
  /// In en, this message translates to:
  /// **'Expires'**
  String get usrExpires;

  /// Status of an invitation nobody has used yet.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get usrPending;

  /// Status of an invitation that was cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get usrCancelled;

  /// Empty state of the invitations list.
  ///
  /// In en, this message translates to:
  /// **'No invitations yet'**
  String get usrNoInvitations;

  /// Opens the box where a person enters the invitation code they were given.
  ///
  /// In en, this message translates to:
  /// **'I have an invitation code'**
  String get usrHaveCode;

  /// Label of the invitation code field.
  ///
  /// In en, this message translates to:
  /// **'Invitation code'**
  String get usrEnterCode;

  /// Button that uses an invitation code.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get usrJoin;

  /// Confirmation after a person used an invitation code.
  ///
  /// In en, this message translates to:
  /// **'You joined as {role}. Loading your school…'**
  String usrJoined(String role);

  /// Error: an invitation code was refused.
  ///
  /// In en, this message translates to:
  /// **'This code is not valid, or it has expired. Ask the school for a new one.'**
  String get errorInvitationInvalid;

  /// Error: the person has not verified their email address.
  ///
  /// In en, this message translates to:
  /// **'Verify your email address first, then try again.'**
  String get errorEmailNotVerified;

  /// Error: someone tried to change their own role.
  ///
  /// In en, this message translates to:
  /// **'You cannot change your own role. Ask another system administrator.'**
  String get errorOwnMembership;

  /// Title of the screen where a person with accounts at several schools picks one.
  ///
  /// In en, this message translates to:
  /// **'Choose your school'**
  String get mobSchoolChoiceTitle;

  /// Explains why the school list appears.
  ///
  /// In en, this message translates to:
  /// **'Your account works at more than one school. Choose the one to open.'**
  String get mobSchoolChoiceBody;

  /// Shown when sign-in worked but the person has no school with a role this app is for (for example a driver in the teacher app).
  ///
  /// In en, this message translates to:
  /// **'This account cannot use this app'**
  String get mobNoAccessTitle;

  /// Shown briefly while the app restores a saved sign-in.
  ///
  /// In en, this message translates to:
  /// **'Opening…'**
  String get mobOpening;

  /// Title of the screen shown when the optional app lock asks the person to confirm.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get mobLockTitle;

  /// Explains the lock screen. The person uses the phone's own fingerprint, face or screen lock.
  ///
  /// In en, this message translates to:
  /// **'Confirm it is you to open OruSchools.'**
  String get mobLockBody;

  /// Button on the lock screen; asks the phone to check the person.
  ///
  /// In en, this message translates to:
  /// **'Unlock'**
  String get mobActionUnlock;

  /// Shown after the phone's check failed or was cancelled.
  ///
  /// In en, this message translates to:
  /// **'We could not confirm it is you. Try again.'**
  String get mobUnlockFailed;

  /// Title of the confirmation before signing out.
  ///
  /// In en, this message translates to:
  /// **'Sign out of this phone?'**
  String get mobSignOutTitle;

  /// Explains that signing out deletes the local data.
  ///
  /// In en, this message translates to:
  /// **'Everything saved on this phone for this school will be removed.'**
  String get mobSignOutBody;

  /// Warning in the sign-out confirmation when the phone still owes the server some changes. {count} is that number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} change has not reached the school yet and will be lost.} other{{count} changes have not reached the school yet and will be lost.}}'**
  String mobSignOutOwed(int count);

  /// Safe choice in the sign-out confirmation.
  ///
  /// In en, this message translates to:
  /// **'Stay signed in'**
  String get mobActionStaySignedIn;

  /// Destructive choice in the sign-out confirmation when changes would be lost.
  ///
  /// In en, this message translates to:
  /// **'Sign out anyway'**
  String get mobActionSignOutAnyway;

  /// Setting label for the optional app lock.
  ///
  /// In en, this message translates to:
  /// **'Ask for my fingerprint, face or screen lock'**
  String get mobAppLockTitle;

  /// Explains when the app lock asks again.
  ///
  /// In en, this message translates to:
  /// **'Asked again after the app has been in the background for a minute.'**
  String get mobAppLockBody;

  /// Shown when the app lock cannot be switched on because the phone has no lock.
  ///
  /// In en, this message translates to:
  /// **'This phone has no screen lock set up.'**
  String get mobAppLockUnavailable;

  /// Shows who is signed in. {name} is the person's name or email.
  ///
  /// In en, this message translates to:
  /// **'Signed in as {name}'**
  String mobSignedInAs(String name);

  /// Role and school of the open session. {role} is a role name, {school} a school name.
  ///
  /// In en, this message translates to:
  /// **'{role} at {school}'**
  String mobSchoolRole(String role, String school);

  /// Placeholder on the first home screen until the feature screens ship.
  ///
  /// In en, this message translates to:
  /// **'Your work will appear here'**
  String get mobHomeSoonTitle;

  /// Placeholder text; replaced when the feature screens ship.
  ///
  /// In en, this message translates to:
  /// **'Classes, attendance and leave arrive in the next updates.'**
  String get mobHomeSoonBody;

  /// Shown after a one-time code was requested. {phone} is the number.
  ///
  /// In en, this message translates to:
  /// **'We sent a code to {phone}.'**
  String mobCodeSentTo(String phone);

  /// Goes back from the code box to the number box.
  ///
  /// In en, this message translates to:
  /// **'Use a different number'**
  String get mobActionChangeNumber;

  /// Title of the Teacher app's first screen: what the teacher has to do today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get mobTodayTitle;

  /// Link at the top of the home screen that opens the person's account, the app lock switch and sign out.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get mobAccountLink;

  /// Heading of the list of the teacher's remaining lessons today.
  ///
  /// In en, this message translates to:
  /// **'Next lessons'**
  String get mobTodayNextLessons;

  /// Shown when the teacher has no lessons left today.
  ///
  /// In en, this message translates to:
  /// **'No more lessons today'**
  String get mobTodayNoMoreLessons;

  /// Shown on a day the school does not work, such as a Sunday.
  ///
  /// In en, this message translates to:
  /// **'Today is not a school day'**
  String get mobTodayNotSchoolDay;

  /// One lesson in the list: the class, and when it starts and ends. {className} is a class name; {start} and {end} are times.
  ///
  /// In en, this message translates to:
  /// **'{className}, {start} to {end}'**
  String mobTodayLessonLine(String className, String start, String end);

  /// Heading of the card about taking student attendance today.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get mobTodayAttendanceTitle;

  /// How many of the teacher's classes still have no attendance today. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} class has no attendance yet} other{{count} classes have no attendance yet}}'**
  String mobTodayAttendanceMissing(int count);

  /// Shown when every class of the teacher has its attendance today.
  ///
  /// In en, this message translates to:
  /// **'Attendance is taken for all your classes'**
  String get mobTodayAttendanceAllDone;

  /// How many classes have attendance saved on the phone that has not reached the school yet. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} class saved on this phone, not sent yet} other{{count} classes saved on this phone, not sent yet}}'**
  String mobTodayAttendanceSaved(int count);

  /// Heading of the card about the teacher's own leave requests.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get mobTodayLeaveTitle;

  /// How many of the teacher's leave requests the Principal has not decided yet. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} leave request waiting for the Principal} other{{count} leave requests waiting for the Principal}}'**
  String mobTodayLeaveWaiting(int count);

  /// Shown when the teacher has no leave request waiting for a decision.
  ///
  /// In en, this message translates to:
  /// **'No leave requests waiting'**
  String get mobTodayLeaveNone;

  /// How many leave requests are saved on the phone and have not reached the school yet. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} leave request saved on this phone, not sent yet} other{{count} leave requests saved on this phone, not sent yet}}'**
  String mobTodayLeaveSaved(int count);

  /// Shown on the first day, before any data has been loaded from the school.
  ///
  /// In en, this message translates to:
  /// **'Connect once to load your day. After that it works without a connection.'**
  String get mobTodayFirstLoad;

  /// Button that goes back to the previous screen.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get actionBack;

  /// Name of the Attendance tab in the Teacher app's bottom navigation.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get mobTabAttendance;

  /// Name of the tab with the account, the app lock and sign out.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get mobTabMore;

  /// Heading of the list of classes the teacher takes attendance for.
  ///
  /// In en, this message translates to:
  /// **'Your classes'**
  String get mobAttClassesTitle;

  /// Shown when the teacher is not class teacher of any class.
  ///
  /// In en, this message translates to:
  /// **'You are not the class teacher of any class, so you do not take attendance.'**
  String get mobAttNoClasses;

  /// State of a class today: attendance has been taken and the school has it.
  ///
  /// In en, this message translates to:
  /// **'Taken'**
  String get mobAttStateDone;

  /// State of a class today: attendance is saved on the phone and not yet sent.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone'**
  String get mobAttStateSaved;

  /// State of a class today: no attendance yet.
  ///
  /// In en, this message translates to:
  /// **'Not taken yet'**
  String get mobAttStateTodo;

  /// State of a class today: the day is locked and only the Academic administrator can change it.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get mobAttStateLocked;

  /// State of a class today: the school refused the attendance sent from this phone.
  ///
  /// In en, this message translates to:
  /// **'Not accepted'**
  String get mobAttStateFailed;

  /// Button that sets every student to present before the teacher marks the exceptions.
  ///
  /// In en, this message translates to:
  /// **'Mark all present'**
  String get mobAttMarkAllPresent;

  /// Primary button of the attendance screen. It saves on the phone at once and sends when there is a connection.
  ///
  /// In en, this message translates to:
  /// **'Save attendance'**
  String get mobAttSave;

  /// Banner shown after saving attendance that has not reached the school yet.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone. It reaches the school when you are connected.'**
  String get mobAttSavedNotSent;

  /// Banner on a day that is locked.
  ///
  /// In en, this message translates to:
  /// **'This day is locked. Only the Academic administrator can change it.'**
  String get mobAttLocked;

  /// Banner when the school refused attendance sent from the phone.
  ///
  /// In en, this message translates to:
  /// **'The school did not accept this attendance.'**
  String get mobAttRefused;

  /// Explains a refusal because the day was locked.
  ///
  /// In en, this message translates to:
  /// **'The day was locked before it arrived. Ask the Academic administrator to correct it.'**
  String get mobAttRefusedLocked;

  /// Button that removes a message the person has read.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get actionDismiss;

  /// How many students are marked as something other than present. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} exception} other{{count} exceptions}}'**
  String mobAttExceptions(int count);

  /// Shown when no student is marked as an exception.
  ///
  /// In en, this message translates to:
  /// **'Everyone is present'**
  String get mobAttEveryonePresent;

  /// Title of the list of statuses for one student. {name} is the student.
  ///
  /// In en, this message translates to:
  /// **'Mark {name}'**
  String mobAttPickStatus(String name);

  /// Shown when a class has no students.
  ///
  /// In en, this message translates to:
  /// **'There are no students in this class yet.'**
  String get mobAttNoStudents;

  /// Shown when the class list has not been loaded onto the phone yet.
  ///
  /// In en, this message translates to:
  /// **'Connect once to load this class.'**
  String get mobAttNotLoaded;

  /// Title of the attendance screen: the class and the date. {className} is the class name, {date} the date.
  ///
  /// In en, this message translates to:
  /// **'{className}, {date}'**
  String mobAttDateLine(String className, String date);

  /// Name of the Marks tab in the Teacher app's bottom navigation.
  ///
  /// In en, this message translates to:
  /// **'Marks'**
  String get mobTabMarks;

  /// Heading of the list of exams the teacher can enter marks for.
  ///
  /// In en, this message translates to:
  /// **'Exams'**
  String get mobMarksExamsTitle;

  /// Shown when the teacher has no exam to enter marks for.
  ///
  /// In en, this message translates to:
  /// **'There are no exams for you to enter marks for.'**
  String get mobMarksNoExams;

  /// Second line of an exam in the list: the class and the subject. {className} is the class name, {subject} the subject.
  ///
  /// In en, this message translates to:
  /// **'{className}, {subject}'**
  String mobMarksExamLine(String className, String subject);

  /// How many marks an exam is out of. {max} is the number.
  ///
  /// In en, this message translates to:
  /// **'out of {max}'**
  String mobMarksOutOf(String max);

  /// How many students have marks entered. {done} and {total} are numbers.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} marked'**
  String mobMarksProgress(String done, String total);

  /// Switch next to a student's marks: the student did not sit the exam.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get mobMarksAbsent;

  /// Spoken label of the marks box of one student. {name} is the student.
  ///
  /// In en, this message translates to:
  /// **'Marks for {name}'**
  String mobMarksFieldLabel(String name);

  /// Error under a marks box when the number is above the exam's maximum. {max} is the maximum.
  ///
  /// In en, this message translates to:
  /// **'Marks cannot be more than {max}.'**
  String mobMarksErrAbove(String max);

  /// Error under a marks box when the text is not a number with at most one decimal.
  ///
  /// In en, this message translates to:
  /// **'Enter marks with at most one decimal, like 42 or 42.5.'**
  String get mobMarksErrFormat;

  /// Primary button of the marks screen. It saves on the phone at once and sends when there is a connection.
  ///
  /// In en, this message translates to:
  /// **'Save marks'**
  String get mobMarksSave;

  /// Banner when the school refused marks sent from the phone.
  ///
  /// In en, this message translates to:
  /// **'The school did not accept these marks.'**
  String get mobMarksRefused;

  /// Explains a refusal because a mark was above the exam's maximum.
  ///
  /// In en, this message translates to:
  /// **'A mark was above the maximum. Check the marks and save again.'**
  String get mobMarksRefusedAbove;

  /// Explains a refusal because the exam or the class changed after the marks were typed.
  ///
  /// In en, this message translates to:
  /// **'The exam or the class changed. Open the exam again and check the marks.'**
  String get mobMarksRefusedChanged;

  /// Shown when the exam's student list has not been loaded onto the phone yet.
  ///
  /// In en, this message translates to:
  /// **'Connect once to load this exam.'**
  String get mobMarksNotLoaded;

  /// Shown when the exam's class has no students.
  ///
  /// In en, this message translates to:
  /// **'There are no students in this class yet.'**
  String get mobMarksNoStudents;

  /// Shown above the list when some marks are not valid yet and so cannot be saved. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} mark needs a correction} other{{count} marks need a correction}}'**
  String mobMarksErrors(int count);

  /// Name of the Leave tab in the Teacher app's bottom navigation.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get mobTabLeave;

  /// Heading of the card showing how much leave of each type the teacher has left.
  ///
  /// In en, this message translates to:
  /// **'Your leave'**
  String get mobLvBalances;

  /// One type of leave and how much is left. {type} is the leave type, {remaining} and {allowed} are numbers of days.
  ///
  /// In en, this message translates to:
  /// **'{type}: {remaining} of {allowed} days left'**
  String mobLvBalanceLine(String type, String remaining, String allowed);

  /// A type of leave that has no allowance set. {type} is the leave type.
  ///
  /// In en, this message translates to:
  /// **'{type}: no limit set'**
  String mobLvBalanceUnset(String type);

  /// Heading of the list of the teacher's own leave requests.
  ///
  /// In en, this message translates to:
  /// **'Your requests'**
  String get mobLvRequests;

  /// Shown when the teacher has no leave requests.
  ///
  /// In en, this message translates to:
  /// **'You have not asked for leave yet.'**
  String get mobLvNone;

  /// Button that opens the leave request form.
  ///
  /// In en, this message translates to:
  /// **'Ask for leave'**
  String get mobLvAsk;

  /// Status of a leave request that has not been decided.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the Principal'**
  String get mobLvStatusPending;

  /// Status of a leave request the Principal approved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get mobLvStatusApproved;

  /// Status of a leave request the Principal did not approve.
  ///
  /// In en, this message translates to:
  /// **'Not approved'**
  String get mobLvStatusRejected;

  /// Status of a leave request that was cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get mobLvStatusCancelled;

  /// Status of a leave request that is waiting on the phone for a connection.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone, not sent yet'**
  String get mobLvSavedNotSent;

  /// Banner when the school refused a leave request sent from the phone.
  ///
  /// In en, this message translates to:
  /// **'The school did not accept this request.'**
  String get mobLvRefused;

  /// Explains a refusal of a leave request: it overlaps another one, or the allowance is used up.
  ///
  /// In en, this message translates to:
  /// **'You already have leave on some of these days, or not enough days are left.'**
  String get mobLvRefusedConflict;

  /// How long a leave request is. {days} is a number such as 1 or 1.5.
  ///
  /// In en, this message translates to:
  /// **'{days} days'**
  String mobLvDays(String days);

  /// The dates of a leave request. {start} and {end} are dates.
  ///
  /// In en, this message translates to:
  /// **'{start} to {end}'**
  String mobLvDates(String start, String end);

  /// Title of the leave request form.
  ///
  /// In en, this message translates to:
  /// **'Ask for leave'**
  String get mobLvFormTitle;

  /// Label of the leave type choice.
  ///
  /// In en, this message translates to:
  /// **'Type of leave'**
  String get mobLvType;

  /// Label of the first day of leave.
  ///
  /// In en, this message translates to:
  /// **'First day'**
  String get mobLvStart;

  /// Label of the last day of leave.
  ///
  /// In en, this message translates to:
  /// **'Last day'**
  String get mobLvEnd;

  /// Switch for asking for half a day of leave.
  ///
  /// In en, this message translates to:
  /// **'Half day only'**
  String get mobLvHalf;

  /// Choice for a half day of leave: the morning.
  ///
  /// In en, this message translates to:
  /// **'Morning'**
  String get mobLvMorning;

  /// Choice for a half day of leave: the afternoon.
  ///
  /// In en, this message translates to:
  /// **'Afternoon'**
  String get mobLvAfternoon;

  /// Label of the optional reason for a leave request.
  ///
  /// In en, this message translates to:
  /// **'Reason (optional)'**
  String get mobLvReason;

  /// Primary button of the leave form. It saves on the phone at once and sends when there is a connection.
  ///
  /// In en, this message translates to:
  /// **'Send request'**
  String get mobLvSend;

  /// Error when the leave dates are the wrong way round.
  ///
  /// In en, this message translates to:
  /// **'The last day cannot be before the first day.'**
  String get mobLvErrEnd;

  /// Error when no leave type was chosen.
  ///
  /// In en, this message translates to:
  /// **'Choose a type of leave.'**
  String get mobLvErrType;

  /// Shown in the leave form before the leave types have been loaded onto the phone.
  ///
  /// In en, this message translates to:
  /// **'Connect once to load the types of leave.'**
  String get mobLvNoTypes;

  /// Name of the list of lessons the teacher covers for colleagues on leave.
  ///
  /// In en, this message translates to:
  /// **'Cover duties'**
  String get mobMoreCover;

  /// Shown when the teacher has no cover duty coming up.
  ///
  /// In en, this message translates to:
  /// **'You have no cover duties in the next two weeks.'**
  String get mobCoverEmpty;

  /// One cover duty: the class, the subject and the period. {className}, {subject} and {period} are names.
  ///
  /// In en, this message translates to:
  /// **'{className}, {subject}, {period}'**
  String mobCoverLine(String className, String subject, String period);

  /// Who the teacher covers for. {name} is the colleague.
  ///
  /// In en, this message translates to:
  /// **'Covering for {name}'**
  String mobCoverFor(String name);

  /// Name of the list of classes the teacher teaches.
  ///
  /// In en, this message translates to:
  /// **'My classes'**
  String get mobMoreClasses;

  /// Shown when the teacher has no class.
  ///
  /// In en, this message translates to:
  /// **'You do not teach any class yet.'**
  String get mobClsEmpty;

  /// How many students a class has. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} student} other{{count} students}}'**
  String mobClsStudents(int count);

  /// Title of a student's report card.
  ///
  /// In en, this message translates to:
  /// **'Report card'**
  String get mobClsReport;

  /// Label of the term choice on a report card.
  ///
  /// In en, this message translates to:
  /// **'Term'**
  String get mobClsTerm;

  /// Shown when a report card has not been loaded and the phone has no connection.
  ///
  /// In en, this message translates to:
  /// **'Report cards load when you are connected.'**
  String get mobClsNoCard;

  /// A subject's marks on a report card. {marks} and {max} are marks.
  ///
  /// In en, this message translates to:
  /// **'{marks} of {max}'**
  String mobClsMarksLine(String marks, String max);

  /// The total on a report card. {marks} is the total marks, {percent} the percentage.
  ///
  /// In en, this message translates to:
  /// **'Total {marks}, {percent}%'**
  String mobClsTotal(String marks, String percent);

  /// The grade on a report card. {grade} is the grade.
  ///
  /// In en, this message translates to:
  /// **'Grade {grade}'**
  String mobClsGrade(String grade);

  /// How many exams of a report card have no marks yet. {count} is the number.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one{{count} exam not marked yet} other{{count} exams not marked yet}}'**
  String mobClsPending(int count);

  /// Name of the Home tab in the Staff app's bottom navigation.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get mobTabHome;

  /// Shown when the school has posted no announcement.
  ///
  /// In en, this message translates to:
  /// **'There are no announcements yet.'**
  String get mobAnnEmpty;

  /// Who posted an announcement. {name} is the person.
  ///
  /// In en, this message translates to:
  /// **'From {name}'**
  String mobAnnBy(String name);

  /// Heading of the card on Home that shows the newest announcements.
  ///
  /// In en, this message translates to:
  /// **'Latest announcements'**
  String get mobAnnLatest;

  /// Name of the Principal's tab in the Staff app where leave requests are decided.
  ///
  /// In en, this message translates to:
  /// **'Approvals'**
  String get mobTabApprovals;

  /// Shown to the Principal when no leave request is waiting for a decision.
  ///
  /// In en, this message translates to:
  /// **'No leave requests are waiting for you.'**
  String get mobApprEmpty;

  /// Button that approves a leave request.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get mobApprApprove;

  /// Button that turns down a leave request.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get mobApprReject;

  /// One leave request waiting for a decision. {name} is the staff member and {type} the kind of leave.
  ///
  /// In en, this message translates to:
  /// **'{name}, {type}'**
  String mobApprLine(String name, String type);

  /// Shown when the Principal tried to approve or turn down leave with no connection.
  ///
  /// In en, this message translates to:
  /// **'Deciding needs a connection. Nothing was changed.'**
  String get mobApprNeedsNet;

  /// Shown when the school refused the Principal's decision on a leave request.
  ///
  /// In en, this message translates to:
  /// **'The school did not accept this decision.'**
  String get mobApprRefused;

  /// Shown when the person has not checked in at work today.
  ///
  /// In en, this message translates to:
  /// **'You have not checked in today.'**
  String get mobCiNotIn;

  /// When the person checked in. {time} is a time of day.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}'**
  String mobCiIn(String time);

  /// When the person checked out. {time} is a time of day.
  ///
  /// In en, this message translates to:
  /// **'Checked out at {time}'**
  String mobCiOut(String time);

  /// A check-in waiting on the phone for a connection.
  ///
  /// In en, this message translates to:
  /// **'Check-in saved on this phone, not sent yet'**
  String get mobCiSavedIn;

  /// A check-out waiting on the phone for a connection.
  ///
  /// In en, this message translates to:
  /// **'Check-out saved on this phone, not sent yet'**
  String get mobCiSavedOut;

  /// Button that records that the person has arrived at work.
  ///
  /// In en, this message translates to:
  /// **'Check in'**
  String get mobCiCheckIn;

  /// Button that records that the person is leaving work.
  ///
  /// In en, this message translates to:
  /// **'Check out'**
  String get mobCiCheckOut;

  /// Shown for a few seconds while the phone finds where it is.
  ///
  /// In en, this message translates to:
  /// **'Finding your position...'**
  String get mobCiLocating;

  /// Title of the box that asks for a reason when the person is not at the school.
  ///
  /// In en, this message translates to:
  /// **'Please say why'**
  String get mobCiReasonTitle;

  /// Explains why a reason is asked. {distance} is a number of metres.
  ///
  /// In en, this message translates to:
  /// **'You seem to be {distance} m from the school.'**
  String mobCiReasonOutside(String distance);

  /// Explains why a reason is asked when the phone had no position.
  ///
  /// In en, this message translates to:
  /// **'This phone could not find where you are.'**
  String get mobCiReasonNoPosition;

  /// Warns that a check-in far from the school waits for HR to confirm it.
  ///
  /// In en, this message translates to:
  /// **'This is far from the school, so HR will confirm it.'**
  String get mobCiReasonFar;

  /// Label of the reason box.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get mobCiReasonLabel;

  /// Button that records the check-in or check-out with the reason.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get mobCiReasonSend;

  /// Error when the reason box is empty.
  ///
  /// In en, this message translates to:
  /// **'Write a reason to go on.'**
  String get mobCiReasonEmpty;

  /// Shown beside a check-in made far from the school that HR has not confirmed yet.
  ///
  /// In en, this message translates to:
  /// **'Waiting for HR to confirm'**
  String get mobCiWaitingHr;

  /// Banner when the school refused a check-in or check-out sent from the phone.
  ///
  /// In en, this message translates to:
  /// **'The school did not accept this.'**
  String get mobCiRefused;

  /// Row in the More tab that opens the list of announcements.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get mobMoreAnnouncements;

  /// Row in the More tab that opens the list of notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get mobMoreInbox;

  /// Shown when the person has no notifications.
  ///
  /// In en, this message translates to:
  /// **'You have no notifications.'**
  String get mobInboxEmpty;

  /// How many notifications have not been read. {count} is a number.
  ///
  /// In en, this message translates to:
  /// **'{count} unread'**
  String mobInboxUnread(String count);

  /// Column in the staff attendance table: where the check-in happened (at school, away, unknown).
  ///
  /// In en, this message translates to:
  /// **'Where'**
  String get satPosition;

  /// The check-in was made inside the school's area.
  ///
  /// In en, this message translates to:
  /// **'At school'**
  String get satStampINSIDE;

  /// The check-in was made outside the school's area.
  ///
  /// In en, this message translates to:
  /// **'Away from school'**
  String get satStampOUTSIDE;

  /// The phone sent no position, or the school has set no area.
  ///
  /// In en, this message translates to:
  /// **'Not known'**
  String get satStampUNKNOWN;

  /// How far from the school a check-in was made. {metres} is a number.
  ///
  /// In en, this message translates to:
  /// **'{metres} m from the school'**
  String satDistance(String metres);

  /// The reason a person gave for a check-in away from the school. {reason} is what they wrote.
  ///
  /// In en, this message translates to:
  /// **'Reason: {reason}'**
  String satReasonIs(String reason);

  /// A check-in far from the school that HR has not confirmed yet.
  ///
  /// In en, this message translates to:
  /// **'Waiting for HR to confirm'**
  String get satWaiting;

  /// Button with which HR confirms a check-in made far from the school.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get satConfirm;

  /// A check-in far from the school that HR has confirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get satConfirmedAt;

  /// Shown after HR confirmed a check-in.
  ///
  /// In en, this message translates to:
  /// **'Check-in confirmed.'**
  String get satConfirmedOk;

  /// Title of the settings card where the school's point on the map is set.
  ///
  /// In en, this message translates to:
  /// **'School location'**
  String get setGeoTitle;

  /// Explains what the school location does.
  ///
  /// In en, this message translates to:
  /// **'Staff check in from their phones. Away from this area they are asked for a reason, and beyond 500 metres HR confirms the check-in. Switch the location off and nobody is asked.'**
  String get setGeoNote;

  /// Field: the school's latitude in degrees, for example 12.9716.
  ///
  /// In en, this message translates to:
  /// **'Latitude'**
  String get setGeoLat;

  /// Field: the school's longitude in degrees, for example 77.5946.
  ///
  /// In en, this message translates to:
  /// **'Longitude'**
  String get setGeoLng;

  /// Field: how far from the point the school's grounds reach, in metres.
  ///
  /// In en, this message translates to:
  /// **'Grounds radius (metres)'**
  String get setGeoRadius;

  /// Field: extra metres around the grounds in which nobody is asked for a reason.
  ///
  /// In en, this message translates to:
  /// **'Margin (metres)'**
  String get setGeoMargin;

  /// Button that saves the school location.
  ///
  /// In en, this message translates to:
  /// **'Save location'**
  String get setGeoSave;

  /// Button that switches the school location off.
  ///
  /// In en, this message translates to:
  /// **'Switch location off'**
  String get setGeoClear;

  /// Shown after the school location was saved.
  ///
  /// In en, this message translates to:
  /// **'Location saved.'**
  String get setGeoSaved;

  /// Shown after the school location was switched off.
  ///
  /// In en, this message translates to:
  /// **'Location switched off.'**
  String get setGeoCleared;

  /// The school location as it is now.
  ///
  /// In en, this message translates to:
  /// **'Now: {lat}, {lng}, grounds {radius} m, margin {margin} m.'**
  String setGeoNow(String lat, String lng, String radius, String margin);

  /// Shown when the school has no location set.
  ///
  /// In en, this message translates to:
  /// **'No location is set, so nobody is asked for a reason.'**
  String get setGeoNone;

  /// Error when the school location values are not valid.
  ///
  /// In en, this message translates to:
  /// **'Give a latitude between -90 and 90, a longitude between -180 and 180, a radius from 10 to 2000 metres and a margin from 0 to 500 metres.'**
  String get setGeoInvalid;

  /// Shown when no announcement has been posted.
  ///
  /// In en, this message translates to:
  /// **'No announcements yet.'**
  String get annNone;

  /// Title of the card where an announcement is written.
  ///
  /// In en, this message translates to:
  /// **'Post an announcement'**
  String get annPostTitle;

  /// Explains who sees an announcement.
  ///
  /// In en, this message translates to:
  /// **'Every member of staff sees it in their app and gets a notification.'**
  String get annPostNote;

  /// Field: the announcement's title.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get annFieldTitle;

  /// Field: the announcement's text.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get annFieldBody;

  /// Button that posts the announcement.
  ///
  /// In en, this message translates to:
  /// **'Post'**
  String get annPost;

  /// Shown after an announcement was posted.
  ///
  /// In en, this message translates to:
  /// **'Announcement posted.'**
  String get annPosted;

  /// Button that withdraws an announcement so nobody sees it any more.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get annWithdraw;

  /// Tag on an announcement that was withdrawn.
  ///
  /// In en, this message translates to:
  /// **'Withdrawn'**
  String get annWithdrawn;

  /// Shown after an announcement was withdrawn.
  ///
  /// In en, this message translates to:
  /// **'Announcement withdrawn.'**
  String get annWithdrawnOk;

  /// Who posted an announcement and when. {name} is the person, {date} the day.
  ///
  /// In en, this message translates to:
  /// **'{name}, {date}'**
  String annFrom(String name, String date);

  /// Title of the card that shows whether the person has checked in at work today.
  ///
  /// In en, this message translates to:
  /// **'Your check-in'**
  String get mobCiCardTitle;

  /// Link that opens the screen where the person checks in and out of work.
  ///
  /// In en, this message translates to:
  /// **'Check in or out'**
  String get mobCiOpen;
}

class _OruStringsDelegate extends LocalizationsDelegate<OruStrings> {
  const _OruStringsDelegate();

  @override
  Future<OruStrings> load(Locale locale) {
    return SynchronousFuture<OruStrings>(lookupOruStrings(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'ar',
    'as',
    'bn',
    'doi',
    'en',
    'fa',
    'gu',
    'hi',
    'kn',
    'ks',
    'ml',
    'mr',
    'or',
    'pa',
    'ps',
    'sd',
    'ta',
    'te',
    'ur',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_OruStringsDelegate old) => false;
}

OruStrings lookupOruStrings(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return OruStringsAr();
    case 'as':
      return OruStringsAs();
    case 'bn':
      return OruStringsBn();
    case 'doi':
      return OruStringsDoi();
    case 'en':
      return OruStringsEn();
    case 'fa':
      return OruStringsFa();
    case 'gu':
      return OruStringsGu();
    case 'hi':
      return OruStringsHi();
    case 'kn':
      return OruStringsKn();
    case 'ks':
      return OruStringsKs();
    case 'ml':
      return OruStringsMl();
    case 'mr':
      return OruStringsMr();
    case 'or':
      return OruStringsOr();
    case 'pa':
      return OruStringsPa();
    case 'ps':
      return OruStringsPs();
    case 'sd':
      return OruStringsSd();
    case 'ta':
      return OruStringsTa();
    case 'te':
      return OruStringsTe();
    case 'ur':
      return OruStringsUr();
  }

  throw FlutterError(
    'OruStrings.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
