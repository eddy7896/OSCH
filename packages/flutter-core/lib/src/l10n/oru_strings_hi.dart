// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class OruStringsHi extends OruStrings {
  OruStringsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTeacher => 'OruSchools शिक्षक';

  @override
  String get appStaff => 'OruSchools स्टाफ़';

  @override
  String get appParent => 'OruSchools अभिभावक';

  @override
  String get appDriver => 'OruSchools ड्राइवर';

  @override
  String get appErp => 'OruSchools ERP';

  @override
  String get appPlatform => 'OruSchools प्लेटफ़ॉर्म';

  @override
  String get appWebsite => 'OruSchools. Schools. People. Progress.';

  @override
  String get scaffoldNotice =>
      'यह ऐप अभी तैयार हो रहा है और OruSchools थीम का उपयोग करता है। सुविधाएँ कार्ययोजना के अनुसार जुड़ेंगी।';

  @override
  String greetingMorning(String name) {
    return 'सुप्रभात, $name';
  }

  @override
  String greetingAfternoon(String name) {
    return 'शुभ दोपहर, $name';
  }

  @override
  String greetingEvening(String name) {
    return 'शुभ संध्या, $name';
  }

  @override
  String get actionRetry => 'फिर कोशिश करें';

  @override
  String get actionUploadNow => 'अभी अपलोड करें';

  @override
  String get actionTakeAttendance => 'उपस्थिति लें';

  @override
  String get actionMarkAllPresent => 'सभी को उपस्थित चिह्नित करें';

  @override
  String get actionSubmitAttendance => 'उपस्थिति जमा करें';

  @override
  String get actionSave => 'सहेजें';

  @override
  String get actionCancel => 'रद्द करें';

  @override
  String get syncSynced => 'सिंक हो गया';

  @override
  String get syncSavedOnDevice => 'फ़ोन में सहेजा गया';

  @override
  String syncChangesPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count बदलाव लंबित',
      one: '$count बदलाव लंबित',
    );
    return '$_temp0';
  }

  @override
  String get syncSyncing => 'सिंक हो रहा है…';

  @override
  String get syncOffline => 'आप ऑफ़लाइन हैं';

  @override
  String get syncFailed => 'सिंक विफल रहा';

  @override
  String get statusPresent => 'उपस्थित';

  @override
  String get statusAbsent => 'अनुपस्थित';

  @override
  String get statusLate => 'देर से';

  @override
  String get statusLeave => 'छुट्टी';

  @override
  String get statusMedical => 'चिकित्सा';

  @override
  String get statusHalfDay => 'आधा दिन';

  @override
  String get statusExcused => 'छूट प्राप्त';

  @override
  String get errorServerUnreachable =>
      'हम स्कूल सर्वर तक नहीं पहुँच सके। आपका काम इस फ़ोन में सहेजा गया है।';

  @override
  String get settingsLanguage => 'भाषा';
}
