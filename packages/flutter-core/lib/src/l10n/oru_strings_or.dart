// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Oriya (`or`).
class OruStringsOr extends OruStrings {
  OruStringsOr([String locale = 'or']) : super(locale);

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
}
