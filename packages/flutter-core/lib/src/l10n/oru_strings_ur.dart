// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Urdu (`ur`).
class OruStringsUr extends OruStrings {
  OruStringsUr([String locale = 'ur']) : super(locale);

  @override
  String get appTeacher => 'OruSchools اُستاد';

  @override
  String get appStaff => 'OruSchools عملہ';

  @override
  String get appParent => 'OruSchools والدین';

  @override
  String get appDriver => 'OruSchools ڈرائیور';

  @override
  String get appErp => 'OruSchools ERP';

  @override
  String get appPlatform => 'OruSchools پلیٹ فارم';

  @override
  String get appWebsite => 'OruSchools. Schools. People. Progress.';

  @override
  String get scaffoldNotice =>
      'یہ ایپ ابھی تیاری کے مرحلے میں ہے اور OruSchools تھیم استعمال کرتی ہے۔ خصوصیات منصوبے کے مطابق شامل ہوں گی۔';

  @override
  String greetingMorning(String name) {
    return 'صبح بخیر، $name';
  }

  @override
  String greetingAfternoon(String name) {
    return 'دوپہر بخیر، $name';
  }

  @override
  String greetingEvening(String name) {
    return 'شام بخیر، $name';
  }

  @override
  String get actionRetry => 'دوبارہ کوشش کریں';

  @override
  String get actionUploadNow => 'ابھی اپ لوڈ کریں';

  @override
  String get actionTakeAttendance => 'حاضری لیں';

  @override
  String get actionMarkAllPresent => 'سب کو حاضر لگائیں';

  @override
  String get actionSubmitAttendance => 'حاضری جمع کریں';

  @override
  String get actionSave => 'محفوظ کریں';

  @override
  String get actionCancel => 'منسوخ کریں';

  @override
  String get syncSynced => 'سنک ہو گیا';

  @override
  String get syncSavedOnDevice => 'فون میں محفوظ ہو گیا';

  @override
  String syncChangesPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تبدیلیاں باقی ہیں',
      one: '$count تبدیلی باقی ہے',
    );
    return '$_temp0';
  }

  @override
  String get syncSyncing => 'سنک ہو رہا ہے…';

  @override
  String get syncOffline => 'آپ آف لائن ہیں';

  @override
  String get syncFailed => 'سنک ناکام رہا';

  @override
  String get statusPresent => 'حاضر';

  @override
  String get statusAbsent => 'غیر حاضر';

  @override
  String get statusLate => 'دیر سے';

  @override
  String get statusLeave => 'رخصت';

  @override
  String get statusMedical => 'طبی';

  @override
  String get statusHalfDay => 'آدھا دن';

  @override
  String get statusExcused => 'معافی';

  @override
  String get errorServerUnreachable =>
      'ہم اسکول سرور تک نہیں پہنچ سکے۔ آپ کا کام اس فون میں محفوظ ہے۔';

  @override
  String get settingsLanguage => 'زبان';
}
