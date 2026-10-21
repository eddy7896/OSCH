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
