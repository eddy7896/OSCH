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
