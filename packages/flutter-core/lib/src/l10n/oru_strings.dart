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
