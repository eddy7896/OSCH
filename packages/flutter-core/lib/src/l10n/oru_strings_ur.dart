// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'oru_strings.dart';

// ignore_for_file: type=lint

/// The translations for Urdu (`ur`).
class OruStringsUr extends OruStrings {
  OruStringsUr([String locale = 'ur']) : super(locale);

  @override
  String get appTeacher => 'OruSchools استاد';

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
      other: '$count تبدیلیاں زیر التوا ہیں',
      one: '$count تبدیلی زیر التوا ہے',
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

  @override
  String get saasSignInTitle => 'پلیٹ فارم میں سائن اِن کریں';

  @override
  String get saasSignInIntro =>
      'یہ حصہ صرف OruSchools پلیٹ فارم کے مالک کے لیے ہے۔';

  @override
  String get authEmailLabel => 'ای میل پتہ';

  @override
  String get authPasswordLabel => 'پاس ورڈ';

  @override
  String get actionSignIn => 'سائن اِن کریں';

  @override
  String get actionSignInGoogle => 'Google کے ساتھ جاری رکھیں';

  @override
  String get actionSignInPhone => 'اس کے بجائے موبائل نمبر استعمال کریں';

  @override
  String get actionSignInEmail => 'اس کے بجائے ای میل استعمال کریں';

  @override
  String get authPhoneLabel => 'موبائل نمبر';

  @override
  String get authPhoneHint => 'ملک کے کوڈ کے ساتھ لکھیں، مثلاً +91 98765 43210';

  @override
  String get actionSendCode => 'کوڈ بھیجیں';

  @override
  String get authCodeLabel => '6 ہندسوں کا کوڈ';

  @override
  String get actionVerifyCode => 'کوڈ کی تصدیق کریں';

  @override
  String get authOr => 'یا';

  @override
  String get actionSignOut => 'سائن آؤٹ کریں';

  @override
  String get authSigningIn => 'سائن اِن ہو رہا ہے…';

  @override
  String get authErrorCredentials => 'ای میل یا پاس ورڈ درست نہیں ہے۔';

  @override
  String get authErrorTooMany =>
      'بہت زیادہ کوششیں ہوئیں۔ چند منٹ بعد دوبارہ کوشش کریں۔';

  @override
  String get authErrorNetwork =>
      'ہم سائن اِن سروس تک نہیں پہنچ سکے۔ اپنا کنکشن چیک کریں۔';

  @override
  String get authErrorPopupClosed =>
      'سائن اِن مکمل ہونے سے پہلے Google کی ونڈو بند ہو گئی۔';

  @override
  String get authErrorCode => 'وہ کوڈ درست نہیں یا اس کی میعاد ختم ہو گئی ہے۔';

  @override
  String get authErrorPhone => 'نمبر ملک کے کوڈ کے ساتھ لکھیں۔';

  @override
  String get authErrorGeneric =>
      'ہم آپ کو سائن اِن نہیں کر سکے۔ دوبارہ کوشش کریں۔';

  @override
  String get saasNoAccessTitle =>
      'یہ اکاؤنٹ پلیٹ فارم کا حصہ استعمال نہیں کر سکتا';

  @override
  String get saasNoAccessBody =>
      'پلیٹ فارم کے مالک کے اکاؤنٹ سے سائن اِن کریں۔ اسکول اپنے پتے پر سائن اِن کرتے ہیں۔';

  @override
  String get saasNavLabel => 'پلیٹ فارم کے حصے';

  @override
  String get saasNavSchools => 'اسکول';

  @override
  String get saasSchoolsTitle => 'اسکول';

  @override
  String saasSchoolsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count اسکول',
      one: '$count اسکول',
    );
    return '$_temp0';
  }

  @override
  String get saasSchoolsEmptyTitle => 'ابھی کوئی اسکول نہیں';

  @override
  String get saasSchoolsEmptyBody =>
      'پہلا اسکول بنائیں تاکہ اس کی ٹیم سائن اِن کر سکے۔';

  @override
  String get actionCreateSchool => 'اسکول بنائیں';

  @override
  String get saasSchoolCreateTitle => 'اسکول بنائیں';

  @override
  String get saasSchoolName => 'اسکول کا نام';

  @override
  String get saasSchoolSubdomain => 'ویب پتہ';

  @override
  String get saasSchoolSubdomainHint =>
      'حروف، ہندسے اور ہائفن، مثلاً greenfield۔ اسے بعد میں بدلا نہیں جا سکتا۔';

  @override
  String get saasSchoolLanguage => 'طے شدہ زبان';

  @override
  String get actionEdit => 'ترمیم کریں';

  @override
  String get saasSchoolEditTitle => 'اسکول میں ترمیم کریں';

  @override
  String get actionSuspend => 'معطل کریں';

  @override
  String get actionReactivate => 'دوبارہ فعال کریں';

  @override
  String saasSuspendTitle(String name) {
    return 'کیا $name کو معطل کریں؟';
  }

  @override
  String get saasSuspendBody =>
      'جب تک آپ اسے دوبارہ فعال نہیں کرتے، اس اسکول میں کوئی سائن اِن نہیں کر سکے گا۔';

  @override
  String get saasSuspendReason => 'وجہ (اختیاری)';

  @override
  String get statusActive => 'فعال';

  @override
  String get statusSuspended => 'معطل';

  @override
  String get saasCreated => 'اسکول بن گیا';

  @override
  String get saasSaved => 'تبدیلیاں محفوظ ہو گئیں';

  @override
  String get saasSuspendedDone => 'اسکول معطل ہو گیا';

  @override
  String get saasReactivatedDone => 'اسکول دوبارہ فعال ہو گیا';

  @override
  String get saasLoadFailed => 'ہم اسکول لوڈ نہیں کر سکے';

  @override
  String get actionLoadMore => 'مزید دکھائیں';

  @override
  String get errorAuthRequired => 'براہ کرم دوبارہ سائن اِن کریں۔';

  @override
  String get errorForbidden => 'آپ کو یہ کرنے کی اجازت نہیں ہے۔';

  @override
  String get errorNotFound => 'ہمیں وہ نہیں ملا۔';

  @override
  String get errorInvalidRequest =>
      'کچھ تفصیلات درست نہیں ہیں۔ خانے چیک کر کے دوبارہ کوشش کریں۔';

  @override
  String get errorConflict =>
      'یہ پہلے سے موجود ہے۔ کوئی دوسرا نام یا پتہ منتخب کریں۔';

  @override
  String get errorRateLimited =>
      'بہت زیادہ درخواستیں۔ ذرا رک کر دوبارہ کوشش کریں۔';

  @override
  String get errorUpstream => 'سرور مصروف ہے۔ تھوڑی دیر میں دوبارہ کوشش کریں۔';

  @override
  String get errorInternal => 'ہماری طرف سے کچھ خرابی ہوئی۔ دوبارہ کوشش کریں۔';

  @override
  String get errorNetwork => 'ہم سرور تک نہیں پہنچ سکے۔ اپنا کنکشن چیک کریں۔';

  @override
  String get errorTimeout =>
      'سرور نے جواب دینے میں بہت دیر کی۔ دوبارہ کوشش کریں۔';

  @override
  String get statusLoading => 'لوڈ ہو رہا ہے…';

  @override
  String get actionAddAdmin => 'منتظم شامل کریں';

  @override
  String saasAdminTitle(String name) {
    return '$name کا منتظم شامل کریں';
  }

  @override
  String get saasAdminIntro =>
      'انہیں اپنا پاس ورڈ بنانے کے لیے ای میل ملے گی۔ آپ یہاں ایک منتظم شامل کر سکتے ہیں؛ اس کے بعد اسکول اپنے لوگوں کو خود سنبھالتا ہے۔';

  @override
  String get saasAdminName => 'پورا نام';

  @override
  String saasAdminAdded(String email) {
    return 'منتظم شامل ہو گیا۔ پاس ورڈ بنانے کی ای میل $email پر بھیجی گئی۔';
  }

  @override
  String get saasAdminAddedNoEmail =>
      'منتظم شامل ہو گیا۔ وہ اپنے فون پر آنے والے کوڈ سے سائن اِن کر سکتے ہیں۔';

  @override
  String get saasAdminEmailFailed =>
      'منتظم شامل ہو گیا، لیکن ای میل بھیجی نہیں جا سکی۔ ان سے سائن اِن صفحے پر “پاس ورڈ بھول گئے؟” استعمال کرنے کو کہیں۔';

  @override
  String get saasAdminExists => 'اس اسکول میں پہلے سے ایک منتظم ہے۔';

  @override
  String get errorAccountExists =>
      'اس ای میل یا نمبر کا اکاؤنٹ پہلے سے موجود ہے۔';

  @override
  String get authForgot => 'پاس ورڈ بھول گئے؟';

  @override
  String get authResetSent =>
      'اگر اس پتے کا کوئی اکاؤنٹ ہے تو نیا پاس ورڈ بنانے کی ای میل بھیجی جا رہی ہے۔';

  @override
  String get authResetNeedsEmail => 'پہلے اپنا ای میل پتہ لکھیں۔';

  @override
  String get saasHasAdmin => 'منتظم شامل ہو چکا';

  @override
  String get saasNoAdmin => 'ابھی کوئی منتظم نہیں';

  @override
  String webSignInTitle(String name) {
    return '$name میں سائن اِن کریں';
  }

  @override
  String get webSignInIntro =>
      'وہ اکاؤنٹ استعمال کریں جو آپ کے اسکول نے دیا ہے۔';

  @override
  String get webSchoolNotFoundTitle => 'ہمیں یہ اسکول نہیں ملا';

  @override
  String get webSchoolNotFoundBody =>
      'پتہ چیک کریں، یا اپنے اسکول سے اس کا ویب پتہ پوچھیں۔';

  @override
  String get webNoSchoolTitle => 'اپنے اسکول کا پتہ کھولیں';

  @override
  String get webNoSchoolBody =>
      'ہر اسکول کا اپنا ویب پتہ ہوتا ہے، مثلاً greenfield.oruschools.com۔';

  @override
  String webNoAccessTitle(String name) {
    return 'آپ کو $name استعمال کرنے کی اجازت نہیں ہے';
  }

  @override
  String get webNoAccessBody =>
      'اپنے اسکول کے منتظم سے آپ کو شامل کرنے کو کہیں، پھر دوبارہ سائن اِن کریں۔';

  @override
  String get webLoadFailed => 'ہم آپ کا اکاؤنٹ لوڈ نہیں کر سکے';

  @override
  String get webNavLabel => 'اسکول کے حصے';

  @override
  String get webDashboardEmptyTitle => 'ابھی دکھانے کے لیے کچھ نہیں';

  @override
  String get webDashboardEmptyBody =>
      'جیسے جیسے آپ کے اسکول کے ماڈیول تیار ہوں گے، اعداد و شمار اور کام یہاں نظر آئیں گے۔';

  @override
  String get webComingTitle => 'یہ ماڈیول ابھی تیار نہیں ہے';

  @override
  String get webComingBody => 'تیار ہوتے ہی یہ یہاں نظر آئے گا۔';

  @override
  String webYourRole(String role) {
    return 'آپ کا کردار: $role';
  }

  @override
  String get errorPageTitle => 'اس صفحے پر کچھ خرابی ہوئی';

  @override
  String get actionTryAgain => 'دوبارہ کوشش کریں';

  @override
  String get sectionOverview => 'جائزہ';

  @override
  String get sectionAcademics => 'تعلیمات';

  @override
  String get sectionPeople => 'افراد';

  @override
  String get sectionHr => 'انسانی وسائل';

  @override
  String get sectionFinance => 'مالیات';

  @override
  String get sectionCommunication => 'رابطہ';

  @override
  String get sectionTransport => 'ٹرانسپورٹ';

  @override
  String get sectionOperations => 'آپریشنز';

  @override
  String get sectionReports => 'رپورٹس';

  @override
  String get sectionAdministration => 'نظم و نسق';

  @override
  String get navDashboard => 'ڈیش بورڈ';

  @override
  String get navStudents => 'طلبہ';

  @override
  String get navClasses => 'جماعتیں اور مضامین';

  @override
  String get navAttendance => 'حاضری';

  @override
  String get navGradebook => 'گریڈ بک';

  @override
  String get navSubstitution => 'متبادل اساتذہ';

  @override
  String get navAdmissions => 'داخلے';

  @override
  String get navStaff => 'عملہ';

  @override
  String get navStaffAttendance => 'عملے کی حاضری';

  @override
  String get navLeave => 'رخصت';

  @override
  String get navPayroll => 'تنخواہ';

  @override
  String get navRecruitment => 'بھرتی';

  @override
  String get navFees => 'فیس اور ادائیگیاں';

  @override
  String get navAnnouncements => 'اعلانات';

  @override
  String get navTransport => 'ٹرانسپورٹ';

  @override
  String get navOperations => 'آپریشنز';

  @override
  String get navReportsAcademic => 'تعلیمی رپورٹس';

  @override
  String get navReportsFinance => 'مالی رپورٹس';

  @override
  String get navReportsHr => 'ایچ آر رپورٹس';

  @override
  String get navSettings => 'اسکول کی ترتیبات';

  @override
  String get navMemberships => 'صارفین اور کردار';

  @override
  String get navAudit => 'آڈٹ لاگ';

  @override
  String get rolePrincipal => 'پرنسپل';

  @override
  String get roleManagement => 'انتظامیہ';

  @override
  String get roleBursar => 'برسر';

  @override
  String get roleAcademicAdmin => 'تعلیمی منتظم';

  @override
  String get roleSystemAdmin => 'سسٹم منتظم';

  @override
  String get roleHrManager => 'ایچ آر مینیجر';

  @override
  String get roleAccountant => 'اکاؤنٹنٹ';

  @override
  String get roleAdmissionsOfficer => 'داخلہ افسر';

  @override
  String get roleTransportManager => 'ٹرانسپورٹ مینیجر';

  @override
  String get roleOperationsManager => 'آپریشنز مینیجر';

  @override
  String get roleTeacher => 'استاد';

  @override
  String get roleStaff => 'عملہ';

  @override
  String get roleDriver => 'ڈرائیور';

  @override
  String get roleParent => 'والدین';

  @override
  String get errorUploadInvalid =>
      'PNG، JPEG یا WebP تصویر منتخب کریں، زیادہ سے زیادہ 2 MB۔';

  @override
  String get errorUploadFailed => 'فائل اپ لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔';
}
