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

  @override
  String get receiptTitle => 'فیس کی رسید';

  @override
  String get receiptNumber => 'رسید نمبر';

  @override
  String get receiptDate => 'تاریخ';

  @override
  String get receiptStudent => 'طالب علم';

  @override
  String get receiptEnrollment => 'اندراج نمبر';

  @override
  String get receiptClass => 'جماعت';

  @override
  String get receiptFor => 'ادائیگی کی تفصیل';

  @override
  String get receiptAmountPaid => 'ادا کی گئی رقم';

  @override
  String get receiptMethod => 'ادائیگی کا طریقہ';

  @override
  String get receiptReference => 'حوالہ';

  @override
  String get receiptBalance => 'اس بل پر بقیہ رقم';

  @override
  String get receiptReceivedBy => 'وصول کنندہ';

  @override
  String get receiptCancelled => 'منسوخ';

  @override
  String get receiptFooter => 'یہ کمپیوٹر سے تیار کردہ رسید ہے۔';

  @override
  String get paymentMethodCash => 'نقد';

  @override
  String get paymentMethodCheque => 'چیک';

  @override
  String get paymentMethodBankTransfer => 'بینک ٹرانسفر';

  @override
  String get paymentMethodUpi => 'یو پی آئی';

  @override
  String get paymentMethodOther => 'دیگر';

  @override
  String get payslipTitle => 'تنخواہ کی پرچی';

  @override
  String get payslipPeriod => 'تنخواہ کا مہینہ';

  @override
  String get payslipEmployee => 'ملازم';

  @override
  String get payslipEmployeeId => 'ملازم نمبر';

  @override
  String get payslipDepartment => 'شعبہ';

  @override
  String get payslipDesignation => 'عہدہ';

  @override
  String get payslipEarnings => 'آمدنی';

  @override
  String get payslipDeductions => 'کٹوتی';

  @override
  String get payslipGross => 'کل تنخواہ';

  @override
  String get payslipTotalDeductions => 'کل کٹوتی';

  @override
  String get payslipNetPay => 'خالص تنخواہ';

  @override
  String get payslipPaidOn => 'ادائیگی کی تاریخ';

  @override
  String get payslipFooter => 'یہ کمپیوٹر سے تیار کردہ تنخواہ کی پرچی ہے۔';

  @override
  String get reportCollectionsTitle => 'فیس کی وصولی';

  @override
  String get reportDuesTitle => 'بقایا فیس';

  @override
  String get reportPayrollTitle => 'تنخواہ کا خلاصہ';

  @override
  String get reportAsOf => 'تاریخ تک';

  @override
  String get reportYear => 'سال';

  @override
  String get reportStatus => 'حالت';

  @override
  String get reportReversed => 'واپس کیا گیا';

  @override
  String get reportTotal => 'کل';

  @override
  String get ntBell => 'اطلاعات';

  @override
  String ntBellUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ناپڑھی اطلاعات',
      one: '$count ناپڑھی اطلاع',
    );
    return '$_temp0';
  }

  @override
  String get ntEmpty => 'آپ کے پاس کوئی اطلاع نہیں ہے۔';

  @override
  String get ntMarkAll => 'سب کو پڑھا ہوا نشان زد کریں';

  @override
  String get ntClose => 'بند کریں';

  @override
  String get ntSettings => 'منتخب کریں کہ آپ کیا دیکھیں';

  @override
  String get ntSettingsHint => 'چھپائی گئی اقسام ہٹتی نہیں، محفوظ رہتی ہیں۔';

  @override
  String get ntCatleave => 'رخصت';

  @override
  String get ntCatsubstitution => 'متبادل اساتذہ';

  @override
  String get ntCatpayroll => 'تنخواہ';

  @override
  String get ntCatannouncement => 'اعلانات';

  @override
  String get notifAnnouncementPostedTitle => 'نیا اعلان';

  @override
  String notifAnnouncementPostedBody(String title) {
    return '$title';
  }

  @override
  String get ntUnread => 'ناپڑھی';

  @override
  String get ntLoadFailed => 'اطلاعات لوڈ نہیں ہو سکیں۔';

  @override
  String get sbPeriod => 'پیریڈ';

  @override
  String get lvViewLabel => 'رخصت کا منظر';

  @override
  String get lvTabRequests => 'درخواستیں';

  @override
  String get lvTabTypes => 'اقسام اور حدیں';

  @override
  String get lvAll => 'سب';

  @override
  String get lvStatus => 'کیفیت';

  @override
  String get lvStatusPENDING => 'زیر التوا';

  @override
  String get lvStatusAPPROVED => 'منظور شدہ';

  @override
  String get lvStatusREJECTED => 'مسترد';

  @override
  String get lvStatusCANCELLED => 'منسوخ';

  @override
  String get lvPerson => 'فرد';

  @override
  String get lvType => 'قسم';

  @override
  String get lvDates => 'تاریخیں';

  @override
  String get lvDays => 'دن';

  @override
  String get lvDecision => 'فیصلہ';

  @override
  String get lvHalfMORNING => 'صبح';

  @override
  String get lvHalfAFTERNOON => 'دوپہر';

  @override
  String get lvNoRequests => 'رخصت کی کوئی درخواست نہیں ہے۔';

  @override
  String get lvApprove => 'منظور کریں';

  @override
  String get lvReject => 'مسترد کریں';

  @override
  String lvRejectQuestion(String name) {
    return '$name کی رخصت مسترد کریں؟';
  }

  @override
  String get lvRejectNote => 'فرد کے لیے نوٹ (اختیاری)';

  @override
  String get lvApproved => 'رخصت منظور کر دی گئی';

  @override
  String get lvRejected => 'رخصت مسترد کر دی گئی';

  @override
  String get lvNotPending => 'اس درخواست پر پہلے ہی فیصلہ ہو چکا ہے۔';

  @override
  String get lvOverBalance => 'یہ باقی حد سے زیادہ ہے۔';

  @override
  String get lvOverlap => 'یہ اسی فرد کی کسی دوسری رخصت سے ٹکراتی ہے۔';

  @override
  String get lvTypeName => 'نام';

  @override
  String get lvPaid => 'تنخواہ کے ساتھ';

  @override
  String get lvUnpaid => 'بلا تنخواہ';

  @override
  String get lvQuota => 'سالانہ دن';

  @override
  String get lvAddType => 'رخصت کی قسم شامل کریں';

  @override
  String get lvTypeAdded => 'رخصت کی قسم شامل ہو گئی';

  @override
  String get lvIsPaid => 'تنخواہ کے ساتھ رخصت (سالانہ حد سے دن کٹتے ہیں)';

  @override
  String get lvNoTypes => 'ابھی رخصت کی کوئی قسم نہیں ہے۔';

  @override
  String get lvTypeInUse =>
      'اس رخصت کی قسم کی درخواستیں ہیں، اسے ہٹایا نہیں جا سکتا۔';

  @override
  String get lvPaidNeedsQuota =>
      'تنخواہ والی قسم کے لیے سالانہ دنوں کی تعداد چاہیے، پوری یا آدھی۔';

  @override
  String get lvAllowances => 'حدیں';

  @override
  String get lvPickPerson => 'فرد';

  @override
  String get lvAllowed => 'مجاز';

  @override
  String get lvRemaining => 'باقی';

  @override
  String lvAllowedFor(String type) {
    return '$type کے مجاز دن';
  }

  @override
  String get lvAllowanceSaved => 'حد محفوظ ہو گئی';

  @override
  String get lvBelowTaken => 'یہ پہلے ہی لی جا چکی رخصتوں سے کم ہے۔';

  @override
  String get lvStandardHint => 'قسم کی سالانہ حد، جب تک فرد اسے نہ مانگے۔';

  @override
  String get lvWholeOrHalf =>
      'پورے یا آدھے دنوں کی تعداد لکھیں، جیسے 12 یا 7.5۔';

  @override
  String get sbFrom => 'سے';

  @override
  String get sbTo => 'تک';

  @override
  String get sbAway => 'غیر حاضر استاد';

  @override
  String get sbCover => 'متبادل';

  @override
  String get sbNotChosen => 'ابھی منتخب نہیں ہوا';

  @override
  String get sbChoose => 'منتخب کریں';

  @override
  String get sbChange => 'بدلیں';

  @override
  String get sbRemoveCover => 'متبادل ہٹائیں';

  @override
  String sbSuggestionsTitle(String slot) {
    return '$slot کون سنبھال سکتا ہے';
  }

  @override
  String sbThisMonth(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'اس مہینے $count بار',
      one: 'اس مہینے $count بار',
    );
    return '$_temp0';
  }

  @override
  String sbAssign(String name) {
    return '$name کو منتخب کریں';
  }

  @override
  String get sbNoCandidates => 'اس سبق کے لیے کوئی خالی اور اہل استاد نہیں ہے۔';

  @override
  String get sbAssigned => 'متبادل منتخب ہو گیا';

  @override
  String get sbCleared => 'متبادل ہٹا دیا گیا';

  @override
  String get sbNoNeeds => 'اس مدت میں کسی سبق کو متبادل کا انتظار نہیں۔';

  @override
  String get sbHasOwnLesson => 'اس وقت اس استاد کا اپنا سبق ہے۔';

  @override
  String get sbOnLeave => 'اس وقت وہ استاد رخصت پر ہے۔';

  @override
  String get sbAlreadyCovering =>
      'اس وقت وہ استاد پہلے سے دوسری جماعت سنبھال رہا ہے۔';

  @override
  String get sbSameAsAbsent =>
      'جو استاد غیر حاضر ہے وہ اپنا سبق نہیں سنبھال سکتا۔';

  @override
  String get sbNoLongerNeeded => 'اس سبق کو اب متبادل کی ضرورت نہیں۔';

  @override
  String get sbChanged => 'اس دوران کچھ بدل گیا۔ فہرست دوبارہ دیکھیں۔';

  @override
  String get plTitle => 'اس مہینے کی بلا تنخواہ رخصت';

  @override
  String get plNote =>
      'بلا تنخواہ منظور شدہ رخصت والے ہر فرد کے لیے: ماہانہ تنخواہ ضرب دن، تقسیم مہینے کے اسکول کے کام کے دن۔ جب تک ایچ آر لاگو نہ کرے، کچھ نہیں کٹتا۔';

  @override
  String get plDays => 'بلا تنخواہ دن';

  @override
  String get plProposed => 'مجوزہ کٹوتی';

  @override
  String get plApply => 'لاگو کریں';

  @override
  String get plAmount => 'کٹوتی کی رقم';

  @override
  String plApplied(String amount) {
    return 'لاگو: $amount';
  }

  @override
  String get plDone => 'کٹوتی لاگو کر دی گئی';

  @override
  String get plNone => 'اس مہینے بلا تنخواہ کوئی منظور شدہ رخصت نہیں ہے۔';

  @override
  String plWithout(String names) {
    return 'بلا تنخواہ رخصت ہے مگر اس رن میں تنخواہ کی پرچی نہیں: $names';
  }

  @override
  String get plAlready => 'یہ کٹوتی پہلے ہی لاگو ہو چکی ہے۔';

  @override
  String get plAboveGross => 'یہ مہینے کی تنخواہ سے زیادہ ہے۔';

  @override
  String get plNotDraft => 'صرف مسودہ رن بدلا جا سکتا ہے۔';

  @override
  String get gbViewLabel => 'گریڈ بک کا منظر';

  @override
  String get gbTabMarks => 'نمبر درج کرنا';

  @override
  String get gbTabExams => 'امتحانات اور ٹرم';

  @override
  String get gbTabBands => 'گریڈ کی حدیں';

  @override
  String get gbTabCards => 'رپورٹ کارڈ';

  @override
  String get gbPickTerm => 'ٹرم';

  @override
  String get gbPickExam => 'امتحان';

  @override
  String get gbNoTermsTitle => 'ابھی کوئی ٹرم نہیں ہے';

  @override
  String get gbNoTermsBody => 'پہلے امتحانات اور ٹرم میں ایک ٹرم شامل کریں۔';

  @override
  String get gbNoExams => 'اس ٹرم میں ابھی کوئی امتحان نہیں ہے۔';

  @override
  String gbOutOf(String max) {
    return 'کل $max';
  }

  @override
  String gbMarksFor(String name) {
    return 'نمبر: $name';
  }

  @override
  String gbAbsentFor(String name) {
    return 'غیر حاضر: $name';
  }

  @override
  String get gbSaveMarks => 'نمبر محفوظ کریں';

  @override
  String get gbMarksSaved => 'نمبر محفوظ ہو گئے';

  @override
  String get gbAboveMax =>
      'کسی کا نمبر اس امتحان کے زیادہ سے زیادہ نمبر سے اوپر ہے۔';

  @override
  String get gbNotAMark => 'نمبر ایک اعشاریہ تک کا عدد ہونا چاہیے۔';

  @override
  String get gbAbsentNoMarks => 'غیر حاضر طالب علم کے نمبر نہیں ہو سکتے۔';

  @override
  String get gbAddTerm => 'ٹرم شامل کریں';

  @override
  String get gbTermName => 'ٹرم کا نام';

  @override
  String get gbTermAdded => 'ٹرم شامل ہو گئی';

  @override
  String get gbNameTaken => 'یہ نام پہلے سے استعمال میں ہے۔';

  @override
  String get gbTermHasExams => 'اس ٹرم میں ابھی امتحانات ہیں۔';

  @override
  String get gbAddExam => 'امتحان شامل کریں';

  @override
  String get gbExamName => 'امتحان کا نام';

  @override
  String get gbExamAdded => 'امتحان شامل ہو گیا';

  @override
  String get gbExamExists =>
      'اس جماعت میں اس مضمون اور ٹرم کے لیے اسی نام کا امتحان پہلے سے ہے۔';

  @override
  String get gbExamHasMarks => 'اس امتحان کے نمبر پہلے سے درج ہیں۔';

  @override
  String get gbBelowMark =>
      'زیادہ سے زیادہ نمبر پہلے سے دیے گئے کسی نمبر سے کم نہیں ہو سکتے۔';

  @override
  String get gbMarksField => 'کل نمبر';

  @override
  String get gbBandsNone =>
      'کوئی گریڈ کی حد طے نہیں۔ نمبر بغیر گریڈ کے فیصد کے ساتھ دکھائے جاتے ہیں۔';

  @override
  String get gbBandsHint =>
      'حدوں کو مل کر 0 سے 100 تک بغیر خالی جگہ اور بغیر دہرائے پورا ہونا چاہیے۔ فیصد کو کبھی اوپر کی حد میں گول نہیں کیا جاتا۔';

  @override
  String get gbFrom => 'سے (%)';

  @override
  String get gbTo => 'تک (%)';

  @override
  String get gbAddBand => 'حد شامل کریں';

  @override
  String get gbUseStandard => 'معیاری سیٹ اپنائیں';

  @override
  String get gbSaveBands => 'گریڈ کی حدیں محفوظ کریں';

  @override
  String get gbBandsSaved => 'گریڈ کی حدیں محفوظ ہو گئیں';

  @override
  String gbRemoveBand(String label) {
    return 'حد $label ہٹائیں';
  }

  @override
  String get gbBandOverlap => 'دو حدیں ایک ہی فیصد کو ڈھانپتی ہیں۔';

  @override
  String get gbBandGap => 'دو حدوں کے درمیان خالی جگہ ہے۔';

  @override
  String get gbBandStart => 'سب سے نچلی حد 0 سے شروع ہونی چاہیے۔';

  @override
  String get gbBandEnd => 'سب سے اونچی حد 100 پر ختم ہونی چاہیے۔';

  @override
  String get gbBandLabelTaken => 'دو حدوں کا گریڈ ایک ہی ہے۔';

  @override
  String get gbBandBad =>
      'ہر حد میں 0 سے 100 تک پورے اعداد اور ایک گریڈ کا نام چاہیے۔';

  @override
  String get gbPickStudent => 'طالب علم';

  @override
  String gbPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count امتحانات کے نمبر ابھی نہیں ہیں اور چھوڑے گئے ہیں',
      one: '$count امتحان کا نمبر ابھی نہیں ہے اور چھوڑا گیا ہے',
    );
    return '$_temp0';
  }

  @override
  String get gbPdf => 'رپورٹ کارڈ ڈاؤن لوڈ کریں (PDF)';

  @override
  String get gbNoCard => 'اس طالب علم کا اس ٹرم کا کوئی رپورٹ کارڈ نہیں ہے۔';

  @override
  String get gbMarkAbsent => 'غیر حاضر';

  @override
  String get attLockDone => 'دن مقفل کر دیا گیا';

  @override
  String get attViewLabel => 'حاضری کا منظر';

  @override
  String get attTabRegister => 'روزانہ حاضری';

  @override
  String get attTabMissing => 'ابھی تک نہیں لی گئی';

  @override
  String get attTabNames => 'کیفیت کے نام';

  @override
  String get attDate => 'تاریخ';

  @override
  String get attStatusPRESENT => 'حاضر';

  @override
  String get attStatusABSENT => 'غیر حاضر';

  @override
  String get attStatusLATE => 'دیر سے';

  @override
  String get attStatusLEAVE => 'رخصت پر';

  @override
  String get attStatusMEDICAL => 'طبی';

  @override
  String get attStatusHALF_DAY => 'آدھا دن';

  @override
  String get attStatusEXCUSED => 'معافی';

  @override
  String attCount(String label, String count) {
    return '$label: $count';
  }

  @override
  String get attNotTaken =>
      'اس جماعت کی اس تاریخ کی حاضری ابھی نہیں لی گئی۔ جب تک نہ لی جائے، سب حاضر دکھائے جاتے ہیں۔';

  @override
  String attTakenBy(String name) {
    return '$name نے لی';
  }

  @override
  String get attLocked => 'مقفل';

  @override
  String get attLockedNote =>
      'یہ دن مقفل ہے۔ صرف اصلاح سے بدلا جا سکتا ہے، اور پرانی اور نئی قدر درج ہوتی ہے۔';

  @override
  String get attStudent => 'طالب علم';

  @override
  String get attStatus => 'کیفیت';

  @override
  String get attNote => 'نوٹ';

  @override
  String get attNoStudents => 'اس جماعت میں ابھی کوئی طالب علم نہیں ہے۔';

  @override
  String get attSave => 'حاضری محفوظ کریں';

  @override
  String get attSaveCorrection => 'اصلاح محفوظ کریں';

  @override
  String get attLock => 'دن مقفل کریں';

  @override
  String get attSaved => 'حاضری محفوظ ہو گئی';

  @override
  String get attCorrected => 'اصلاح محفوظ ہو گئی';

  @override
  String get attDayLocked => 'یہ دن مقفل ہے۔ تعلیمی منتظم سے اصلاح کروائیں۔';

  @override
  String get attFutureDate => 'وہ تاریخ ابھی نہیں آئی۔';

  @override
  String get attMissingEmpty => 'اس تاریخ کے لیے کچھ باقی نہیں۔';

  @override
  String attMissingTitle(String date) {
    return '$date کو بغیر حاضری والی جماعتیں';
  }

  @override
  String get attNamesHint =>
      'اپنے اسکول کے لیے کسی کیفیت کا نام بدلیں۔ اس کا مطلب اور رنگ وہی رہتے ہیں۔';

  @override
  String attNameFor(String status) {
    return '$status کا نام';
  }

  @override
  String get attNameSaved => 'نام محفوظ ہو گیا';

  @override
  String get attNameDefault => 'معیاری نام';

  @override
  String get satTitleNote =>
      'کسی تاریخ کو کون کام پر ہے۔ وقت بھارتی معیاری وقت میں ہیں۔';

  @override
  String get satIn => 'آمد';

  @override
  String get satOut => 'روانگی';

  @override
  String get satStateIN => 'کام پر';

  @override
  String get satStateOUT => 'آج کے لیے جا چکے';

  @override
  String get satStateNONE => 'ابھی نہیں آئے';

  @override
  String get satCorrect => 'درست کریں';

  @override
  String satCorrectTitle(String name) {
    return '$name کے وقت درست کریں';
  }

  @override
  String get satTimeHint => 'وقت اس طرح لکھیں: 09:15۔';

  @override
  String get satSaved => 'وقت محفوظ ہو گئے';

  @override
  String get satNeedsIn => 'آمد کا وقت بھی لکھیں۔';

  @override
  String get satNone => 'فہرست میں ابھی کوئی عملہ نہیں۔';

  @override
  String ttRemoveQuestion(String name) {
    return '$name ہٹائیں؟';
  }

  @override
  String get navTimetable => 'ٹائم ٹیبل';

  @override
  String get ttViewLabel => 'ٹائم ٹیبل کا منظر';

  @override
  String get ttTabClass => 'جماعت کے لحاظ سے';

  @override
  String get ttTabTeacher => 'استاد کے لحاظ سے';

  @override
  String get ttTabSchedule => 'گھنٹی کا نظام الاوقات';

  @override
  String get ttPickTeacher => 'استاد';

  @override
  String get ttSubject => 'مضمون';

  @override
  String get ttNoYearTitle => 'کوئی تعلیمی سال فعال نہیں';

  @override
  String get ttNoYearBody => 'پہلے ایک تعلیمی سال فعال کریں۔';

  @override
  String get ttNoClasses => 'ابھی کوئی جماعت نہیں ہے۔';

  @override
  String get ttNoTeachers => 'ابھی کوئی استاد نہیں ہے۔';

  @override
  String get ttNoPeriodsTitle => 'ابھی کوئی پیریڈ نہیں ہے';

  @override
  String get ttNoPeriodsBody =>
      'معیاری دن یا مختصر دن سے شروع کریں، یا پیریڈ ایک ایک کر کے شامل کریں۔';

  @override
  String get ttEmptyCell => 'خالی';

  @override
  String get ttBreak => 'وقفہ';

  @override
  String ttEditorTitle(String slot) {
    return '$slot کا سبق';
  }

  @override
  String get ttSetLesson => 'سبق طے کریں';

  @override
  String get ttClearLesson => 'سبق ہٹائیں';

  @override
  String get ttSaved => 'سبق محفوظ ہو گیا';

  @override
  String get ttCleared => 'سبق ہٹا دیا گیا';

  @override
  String get ttClassBusy => 'اس جماعت میں اس وقت پہلے سے سبق ہے۔';

  @override
  String get ttTeacherBusy => 'یہ استاد اس وقت دوسری جماعت میں پڑھا رہے ہیں۔';

  @override
  String get ttTeacherNotSubject => 'یہ استاد یہ مضمون نہیں پڑھاتے۔';

  @override
  String get ttNotWorkingDay => 'اسکول اس دن کام نہیں کرتا۔';

  @override
  String get ttPeriodInUse =>
      'جس پیریڈ میں سبق ہوں اسے ہٹایا نہیں جا سکتا اور نہ وقفہ بنایا جا سکتا ہے۔';

  @override
  String get ttPeriodOverlaps => 'یہ وقت کسی دوسرے پیریڈ سے ٹکراتا ہے۔';

  @override
  String get ttPeriodLabelTaken => 'کسی دوسرے پیریڈ کا یہی نام ہے۔';

  @override
  String get ttPeriodStartTaken => 'کسی دوسرے پیریڈ کا یہی آغاز کا وقت ہے۔';

  @override
  String get ttPeriodEnd => 'اختتام کا وقت آغاز کے بعد ہونا چاہیے۔';

  @override
  String get ttPeriodTime => 'وقت اس طرح لکھیں: 08:30۔';

  @override
  String get ttLoadTitle => 'فی ہفتہ اسباق';

  @override
  String ttLoadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count سبق',
      one: '$count سبق',
    );
    return '$_temp0';
  }

  @override
  String get ttNoLoad => 'ابھی کوئی سبق نہیں رکھا گیا۔';

  @override
  String get ttWorkingDays => 'کام کے دن';

  @override
  String get ttDaysSaved => 'کام کے دن محفوظ ہو گئے';

  @override
  String get ttPeriodName => 'نام';

  @override
  String get ttStarts => 'آغاز';

  @override
  String get ttEnds => 'اختتام';

  @override
  String get ttNumber => 'نمبر';

  @override
  String get ttIsBreak => 'یہ وقفہ ہے: اس میں کچھ نہیں پڑھایا جاتا';

  @override
  String get ttAddPeriod => 'پیریڈ شامل کریں';

  @override
  String get ttPeriodAdded => 'پیریڈ شامل ہو گیا';

  @override
  String get ttStandard => 'معیاری دن سے شروع کریں';

  @override
  String get ttShort => 'مختصر دن سے شروع کریں';

  @override
  String get ttTemplateApplied => 'گھنٹی کا نظام الاوقات بن گیا';

  @override
  String get ttDayMON => 'پیر';

  @override
  String get ttDayTUE => 'منگل';

  @override
  String get ttDayWED => 'بدھ';

  @override
  String get ttDayTHU => 'جمعرات';

  @override
  String get ttDayFRI => 'جمعہ';

  @override
  String get ttDaySAT => 'ہفتہ';

  @override
  String get ttDaySUN => 'اتوار';

  @override
  String get notifLeaveRequestedTitle => 'فیصلے کے لیے رخصت';

  @override
  String notifLeaveRequestedBody(
    String name,
    String days,
    String typeName,
    String startDate,
    String endDate,
  ) {
    return '$name نے $typeName کی $days دن کی رخصت مانگی ہے، $startDate سے $endDate تک۔';
  }

  @override
  String get notifLeaveApprovedTitle => 'آپ کی رخصت منظور ہو گئی';

  @override
  String notifLeaveApprovedBody(
    String typeName,
    String startDate,
    String endDate,
    String days,
  ) {
    return '$typeName، $startDate سے $endDate ($days دن)۔';
  }

  @override
  String get notifLeaveRejectedTitle => 'آپ کی رخصت منظور نہیں ہوئی';

  @override
  String notifLeaveRejectedBody(
    String typeName,
    String startDate,
    String endDate,
    String note,
  ) {
    return '$typeName، $startDate سے $endDate۔ $note';
  }

  @override
  String get notifLeaveSubstitutionTitle =>
      'جماعتوں کے لیے متبادل اساتذہ درکار ہیں';

  @override
  String notifLeaveSubstitutionBody(
    String name,
    String startDate,
    String endDate,
  ) {
    return '$name $startDate سے $endDate تک رخصت پر ہیں۔ متبادل اساتذہ منتخب کریں۔';
  }

  @override
  String get notifLeavePayrollTitle => 'کٹوتی کے لیے بلا تنخواہ رخصت';

  @override
  String notifLeavePayrollBody(String name, String startDate, String endDate) {
    return '$name کی $startDate سے $endDate تک بلا تنخواہ رخصت منظور ہے۔ تنخواہ کے رن میں مجوزہ کٹوتی دیکھیں۔';
  }

  @override
  String get notifSubstitutionAssignedTitle => 'آپ ایک جماعت سنبھال رہے ہیں';

  @override
  String notifSubstitutionAssignedBody(
    String className,
    String subjectName,
    String periodLabel,
    String date,
    String name,
  ) {
    return '$className، $subjectName، $periodLabel، $date، $name کی جگہ۔';
  }

  @override
  String get notifSubstitutionClearedTitle => 'متبادل ذمہ داری منسوخ';

  @override
  String notifSubstitutionClearedBody(
    String className,
    String subjectName,
    String date,
  ) {
    return '$date کو $className، $subjectName میں اب آپ کی ضرورت نہیں۔';
  }

  @override
  String get gradesReportCardTitle => 'رپورٹ کارڈ';

  @override
  String get gradesTerm => 'ٹرم';

  @override
  String get gradesSubject => 'مضمون';

  @override
  String get gradesMarks => 'نمبر';

  @override
  String get gradesOutOf => 'کل نمبر';

  @override
  String get gradesPercent => 'فیصد';

  @override
  String get gradesGrade => 'گریڈ';

  @override
  String get reportDueDate => 'آخری تاریخ';

  @override
  String get reportAmountDue => 'واجب الادا رقم';

  @override
  String get reportOutstanding => 'بقایا';

  @override
  String get reportDaysOverdue => 'تاخیر کے دن';

  @override
  String get reportMonth => 'مہینہ';

  @override
  String get reportHeadcount => 'عملہ';

  @override
  String get reportApproved => 'منظور شدہ';

  @override
  String get reportPaid => 'ادا کیا گیا';

  @override
  String get webFrom => 'از';

  @override
  String get webTo => 'تک';

  @override
  String get webDownloadCsv => 'CSV ڈاؤن لوڈ کریں';

  @override
  String get webDownloadPdf => 'PDF ڈاؤن لوڈ کریں';

  @override
  String get webDownloadFailed => 'فائل نہیں بن سکی۔ دوبارہ کوشش کریں۔';

  @override
  String get webAtAGlance => 'ایک نظر میں';

  @override
  String get webCollectedThisMonth => 'اس ماہ کی وصولی';

  @override
  String webPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ادائیگیاں',
      one: '$count ادائیگی',
    );
    return '$_temp0';
  }

  @override
  String get webOutstandingFees => 'بقایا فیس';

  @override
  String webInvoicesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count انوائسز',
      one: '$count انوائس',
    );
    return '$_temp0';
  }

  @override
  String get webByMethod => 'ادائیگی کے طریقے کے لحاظ سے';

  @override
  String get webByAge => 'تاخیر کی مدت کے لحاظ سے';

  @override
  String get webBandDueToday => 'آج واجب الادا';

  @override
  String get webBand1To30 => '1 سے 30 دن تاخیر';

  @override
  String get webBand31To60 => '31 سے 60 دن تاخیر';

  @override
  String get webBand61To90 => '61 سے 90 دن تاخیر';

  @override
  String get webBandOver90 => '90 دن سے زیادہ تاخیر';

  @override
  String get webNoRowsTitle => 'اس حد میں کچھ نہیں';

  @override
  String get webNoRowsBody => 'دوسری تاریخیں چن کر دیکھیں۔';

  @override
  String get webNoDuesTitle => 'کوئی فیس بقایا نہیں';

  @override
  String get webTotalsOnly =>
      'آپ کل رقم دیکھ سکتے ہیں، انفرادی ادائیگیاں نہیں۔';

  @override
  String get webPrevious => 'پچھلا';

  @override
  String get webNext => 'اگلا';

  @override
  String webPageOf(String page, String pages) {
    return 'صفحہ $page / $pages';
  }

  @override
  String get webCollected => 'وصول شدہ';

  @override
  String get peoSearch => 'نام یا اندراج نمبر سے تلاش کریں';

  @override
  String get peoAll => 'تمام';

  @override
  String get peoInactive => 'غیر فعال';

  @override
  String get peoLeft => 'چھوڑ چکے';

  @override
  String get peoAddStudent => 'طالب علم شامل کریں';

  @override
  String get peoFirstName => 'پہلا نام';

  @override
  String get peoLastName => 'آخری نام';

  @override
  String get peoDateOfBirth => 'تاریخ پیدائش';

  @override
  String get peoGender => 'جنس';

  @override
  String get peoFemale => 'خاتون';

  @override
  String get peoMale => 'مرد';

  @override
  String get peoAddress => 'پتہ';

  @override
  String get peoClass => 'جماعت';

  @override
  String get peoNoStudentsTitle => 'ابھی کوئی طالب علم نہیں';

  @override
  String get peoNoStudentsBody =>
      'پہلا طالب علم شامل کریں، یا فہرست درآمد کریں۔';

  @override
  String get peoNoMatch => 'اس تلاش سے کوئی طالب علم نہیں ملا۔';

  @override
  String get peoStudentAdded => 'طالب علم شامل کر دیا گیا';

  @override
  String get peoGuardians => 'سرپرست';

  @override
  String get peoNoGuardians => 'کوئی سرپرست درج نہیں';

  @override
  String get peoRelationship => 'رشتہ';

  @override
  String get peoMother => 'والدہ';

  @override
  String get peoFather => 'والد';

  @override
  String get peoGuardianRel => 'سرپرست';

  @override
  String get peoPrimary => 'بنیادی رابطہ';

  @override
  String get peoClassHistory => 'جماعت کی تاریخ';

  @override
  String get peoAdmissionDate => 'داخلے کی تاریخ';

  @override
  String get peoBackToList => 'فہرست پر واپس';

  @override
  String get peoCapacity => 'گنجائش';

  @override
  String get peoSection => 'سیکشن';

  @override
  String get peoLevel => 'درجہ';

  @override
  String get peoNoClassesTitle => 'ابھی کوئی جماعت نہیں';

  @override
  String get peoApplications => 'درخواست';

  @override
  String get peoNewApplication => 'نئی درخواست';

  @override
  String get peoApplicationNo => 'درخواست نمبر';

  @override
  String get peoApplicant => 'درخواست گزار';

  @override
  String get peoLevelApplied => 'مطلوبہ درجہ';

  @override
  String get peoGuardianName => 'سرپرست کا نام';

  @override
  String get peoGuardianPhone => 'سرپرست کا فون';

  @override
  String get peoSubmitted => 'جمع کرائی گئی';

  @override
  String get peoUnderReview => 'زیر جائزہ';

  @override
  String get peoAccepted => 'قبول کی گئی';

  @override
  String get peoRejected => 'مسترد شدہ';

  @override
  String get peoWithdrawn => 'واپس لی گئی';

  @override
  String get peoAdmitted => 'داخلہ دیا گیا';

  @override
  String get peoStartReview => 'جائزہ شروع کریں';

  @override
  String get peoAccept => 'قبول کریں';

  @override
  String get peoReject => 'مسترد کریں';

  @override
  String get peoWithdraw => 'واپس لی گئی نشان زد کریں';

  @override
  String get peoNote => 'نوٹ (اختیاری)';

  @override
  String get peoAdmitStudent => 'طالب علم کو داخلہ دیں';

  @override
  String peoStudentAdmitted(String id) {
    return 'طالب علم کو داخلہ مل گیا۔ اندراج نمبر $id';
  }

  @override
  String get peoNoApplicationsTitle => 'ابھی کوئی درخواست نہیں';

  @override
  String get peoApplicationSaved => 'درخواست محفوظ ہو گئی';

  @override
  String get hrpAddStaff => 'عملہ کا رکن شامل کریں';

  @override
  String get hrpSearch => 'نام یا ملازم نمبر سے تلاش کریں';

  @override
  String get hrpAllDepartments => 'تمام شعبے';

  @override
  String get hrpJoined => 'تاریخ تقرری';

  @override
  String get hrpNoStaffTitle => 'ابھی کوئی عملہ نہیں';

  @override
  String get hrpNoMatch => 'اس تلاش سے عملہ کا کوئی رکن نہیں ملا۔';

  @override
  String get hrpStaffAdded => 'عملہ کا رکن شامل کر دیا گیا';

  @override
  String get hrpSalary => 'تنخواہ';

  @override
  String get hrpEarning => 'آمدن';

  @override
  String get hrpDeduction => 'کٹوتی';

  @override
  String get hrpKind => 'قسم';

  @override
  String get hrpComponent => 'جزو';

  @override
  String get hrpAmount => 'رقم';

  @override
  String get hrpAmountHint => 'روپے میں، مثلاً 45,000.50';

  @override
  String get hrpAddLine => 'تنخواہ کی مد شامل کریں';

  @override
  String get hrpNoLines => 'ابھی تنخواہ طے نہیں';

  @override
  String get hrpRemove => 'ہٹائیں';

  @override
  String get hrpNewRun => 'نیا تنخواہ سائیکل';

  @override
  String get hrpRunCreated => 'تنخواہ سائیکل بن گیا';

  @override
  String get hrpDraft => 'مسودہ';

  @override
  String get hrpPreparedBy => 'تیار کنندہ';

  @override
  String get hrpApprovedBy => 'منظور کنندہ';

  @override
  String get hrpApprove => 'منظور کریں';

  @override
  String get hrpPay => 'ادا شدہ نشان زد کریں';

  @override
  String get hrpDeleteRun => 'مسودہ ہٹائیں';

  @override
  String get hrpConfirm => 'تصدیق کریں';

  @override
  String hrpConfirmApprove(String month, String count, String net) {
    return '$month کی تنخواہ منظور کریں؟ $count عملہ، خالص تنخواہ $net۔ اسے واپس نہیں کیا جا سکتا۔';
  }

  @override
  String hrpConfirmPay(String net, String month) {
    return '$month کے لیے $net کی ادائیگی درج کریں؟ اسے واپس نہیں کیا جا سکتا۔';
  }

  @override
  String hrpConfirmDelete(String month) {
    return '$month کا مسودہ ہٹائیں؟ آپ اسے دوبارہ بنا سکتے ہیں۔';
  }

  @override
  String hrpRunTitle(String month) {
    return 'تنخواہ $month';
  }

  @override
  String get hrpDetails => 'تفصیل';

  @override
  String get hrpPayslipPdf => 'تنخواہ کی پرچی PDF';

  @override
  String get hrpNoRunsTitle => 'ابھی کوئی تنخواہ سائیکل نہیں';

  @override
  String get hrpNoRunsBody =>
      'پہلے ہر عملہ کے رکن کی تنخواہ طے کریں، پھر مہینے کا تنخواہ سائیکل بنائیں۔';

  @override
  String get feeTabInvoices => 'انوائس';

  @override
  String get feeTabReceipts => 'رسیدیں';

  @override
  String get feeTabStructures => 'فیس کا ڈھانچہ';

  @override
  String get feeStatusOverdue => 'تاخیر شدہ';

  @override
  String get feeStatusPartial => 'جزوی ادا';

  @override
  String get feeStatusPending => 'غیر ادا شدہ';

  @override
  String get feeBilled => 'بل کی گئی رقم';

  @override
  String get feeNewInvoice => 'نیا انوائس';

  @override
  String get feeBillFees => 'فیس کا بل بنائیں';

  @override
  String get feeDescription => 'تفصیل';

  @override
  String get feeFindStudent => 'نام یا اندراج نمبر سے طالب علم تلاش کریں';

  @override
  String get feeInvoiceCreated => 'انوائس بن گیا';

  @override
  String get feeRecordPayment => 'ادائیگی درج کریں';

  @override
  String feePaymentRecorded(String number) {
    return 'ادائیگی درج ہو گئی۔ رسید نمبر $number';
  }

  @override
  String get feePayments => 'ادائیگیاں';

  @override
  String get feeNoPayments => 'ابھی کوئی ادائیگی نہیں';

  @override
  String get feeMethod => 'ادائیگی کا طریقہ';

  @override
  String get feeReverse => 'الٹ دیں';

  @override
  String get feeReason => 'وجہ';

  @override
  String feeConfirmReverse(String amount) {
    return '$amount کی یہ ادائیگی الٹ دیں؟ انوائس دوبارہ غیر ادا شدہ ہو جائے گا اور رسید منسوخ ہو جائے گی۔ اسے واپس نہیں کیا جا سکتا۔';
  }

  @override
  String get feeReceiptPdf => 'رسید PDF';

  @override
  String get feeBillIntro =>
      'منتخب تاریخ تک واجب الادا ہر قسط کا انوائس بناتا ہے، منتخب درجے (یا سب) کے طالب علموں کے لیے۔ جو اقساط پہلے بل ہو چکی ہیں انہیں چھوڑ دیا جاتا ہے۔';

  @override
  String get feeBillUpTo => 'اس تاریخ تک واجب الادا اقساط';

  @override
  String get feePreview => 'پیش نظارہ';

  @override
  String get feeCreateInvoices => 'انوائس بنائیں';

  @override
  String feePreviewResult(String created, String already, String without) {
    return '$created انوائس بنیں گے۔ پہلے سے بل شدہ: $already۔ جن طالب علموں کی فیس طے نہیں: $without۔';
  }

  @override
  String feeCreatedResult(String created, String already) {
    return '$created انوائس بن گئے۔ پہلے سے بل شدہ: $already۔';
  }

  @override
  String get feeLevelAll => 'تمام درجے';

  @override
  String get feeReceiptsTotal => 'کل وصول شدہ رقم';

  @override
  String get feeNoReceiptsTitle => 'ابھی کوئی رسید نہیں';

  @override
  String get feeNoInvoicesTitle => 'ابھی کوئی انوائس نہیں';

  @override
  String get feeNoInvoicesBody => 'پہلے فیس طے کریں، پھر بل بنائیں۔';

  @override
  String get feeNewStructure => 'نیا فیس کا ڈھانچہ';

  @override
  String get feeStructureCreated => 'فیس کا ڈھانچہ بن گیا';

  @override
  String get feeAddFee => 'فیس شامل کریں';

  @override
  String get feeFeeName => 'فیس کا نام';

  @override
  String get feeInstalments => 'اقساط';

  @override
  String get feeInstalmentLabel => 'نام';

  @override
  String get feeAddInstalment => 'قسط شامل کریں';

  @override
  String get feeNoStructuresTitle => 'ابھی کوئی فیس کا ڈھانچہ نہیں';

  @override
  String get feeStructureTotal => 'سال کا کل';

  @override
  String get feeFeeAdded => 'فیس شامل کر دی گئی';

  @override
  String get feeNoItems => 'اس ڈھانچے میں ابھی کوئی فیس نہیں';

  @override
  String get setTabClasses => 'جماعتیں';

  @override
  String get setTabSubjects => 'مضامین';

  @override
  String get setTabYears => 'تعلیمی سال';

  @override
  String get setAddClass => 'جماعت شامل کریں';

  @override
  String get setClassAdded => 'جماعت شامل ہو گئی';

  @override
  String get setSectionHint => 'سیکشن کا حرف، مثلاً A';

  @override
  String get setAddSubject => 'مضمون شامل کریں';

  @override
  String get setSubjectName => 'مضمون کا نام';

  @override
  String get setSubjectCode => 'مختصر کوڈ';

  @override
  String get setNoSubjects => 'ابھی کوئی مضمون نہیں';

  @override
  String get setSubjectAdded => 'مضمون شامل ہو گیا';

  @override
  String get setNewYear => 'نیا تعلیمی سال';

  @override
  String get setYearName => 'نام، مثلاً 2027-2028';

  @override
  String get setStartDate => 'آغاز کی تاریخ';

  @override
  String get setEndDate => 'اختتام کی تاریخ';

  @override
  String get setMakeActive => 'فعال کریں';

  @override
  String setConfirmActivate(String name) {
    return '$name کو فعال تعلیمی سال بنائیں؟ نئے طالب علم، انوائس اور رسیدیں اسی کو استعمال کریں گی۔';
  }

  @override
  String get setYearAdded => 'تعلیمی سال شامل ہو گیا';

  @override
  String get setProfileTitle => 'اسکول پروفائل';

  @override
  String get setBrandColour => 'برانڈ کا رنگ';

  @override
  String get setBrandHint =>
      'گہرا رنگ، # اور چھ حروف یا ہندسوں میں لکھا ہوا، تاکہ اس پر سفید حروف آسانی سے پڑھے جا سکیں۔';

  @override
  String get setProfileSaved => 'ترتیبات محفوظ ہو گئیں';

  @override
  String get setImport => 'CSV سے درآمد کریں';

  @override
  String get setImportIntro =>
      'CSV فائل منتخب کریں۔ پہلے اس کی جانچ ہوتی ہے، اور آپ کی تصدیق تک کچھ محفوظ نہیں ہوتا۔';

  @override
  String get setChooseFile => 'CSV فائل';

  @override
  String get setCheckFile => 'فائل کی جانچ کریں';

  @override
  String setCheckResult(String valid, String total, String errors) {
    return '$total میں سے $valid قطاریں تیار ہیں۔ $errors قطاروں میں مسئلہ ہے۔';
  }

  @override
  String setMissingColumns(String names) {
    return 'ضروری کالم نہیں ملے: $names';
  }

  @override
  String setProblemLine(String row, String column, String rule) {
    return 'قطار $row، $column: $rule';
  }

  @override
  String get setAlreadyImported => 'یہ فائل پہلے ہی درآمد ہو چکی ہے۔';

  @override
  String setImportNow(String count) {
    return '$count قطاریں درآمد کریں';
  }

  @override
  String setImportDone(String count) {
    return '$count ریکارڈ بن گئے۔';
  }

  @override
  String setImportFailed(String count) {
    return '$count قطاریں نہیں بن سکیں۔';
  }

  @override
  String get hrrByDepartment => 'شعبے کے لحاظ سے';

  @override
  String get hrrNoDepartment => 'کوئی شعبہ نہیں';

  @override
  String get hrrNoRunsTitle =>
      'اس سال کوئی منظور شدہ یا ادا شدہ تنخواہ سائیکل نہیں';

  @override
  String get webApplicationsWaiting => 'جائزے کے منتظر درخواستیں';

  @override
  String get webRunsWaiting => 'منظوری کے منتظر تنخواہ سائیکل';

  @override
  String get webFieldRoleTitle => 'آپ کا کردار موبائل ایپ میں کام کرتا ہے';

  @override
  String get webFieldRoleBody =>
      'یہ ویب حصہ منتظم کے لیے ہے۔ اپنے فون میں OruSchools ایپ کھولیں۔';

  @override
  String get usrTabMembers => 'اراکین';

  @override
  String get usrTabInvitations => 'دعوت نامہ';

  @override
  String get usrSince => 'رکن بننے کی تاریخ';

  @override
  String get usrYou => 'آپ';

  @override
  String get usrChangeRole => 'کردار تبدیل کریں';

  @override
  String get usrRole => 'کردار';

  @override
  String usrConfirmRole(String name, String role) {
    return '$name کو $role بنائیں؟ ان کی اسکرینیں فوراً بدل جائیں گی۔';
  }

  @override
  String usrConfirmSuspend(String name) {
    return '$name کو معطل کریں؟ جب تک آپ انہیں دوبارہ فعال نہیں کرتے، وہ سائن اِن نہیں کر سکیں گے۔';
  }

  @override
  String usrConfirmRemove(String name) {
    return '$name کو اس اسکول سے ہٹائیں؟ یہاں ان کی جگہ ختم ہو جائے گی۔';
  }

  @override
  String get usrNewAccount => 'اکاؤنٹ بنائیں';

  @override
  String get usrAccountIntro =>
      'اس شخص کے لیے جو اسکول میں کام کرتا ہے اور جس کا ابھی اکاؤنٹ نہیں ہے۔ وہ ای میل یا موبائل نمبر سے سائن اِن کرتے ہیں۔';

  @override
  String get usrDisplayName => 'پورا نام';

  @override
  String usrAccountCreated(String name) {
    return '$name کا اکاؤنٹ بن گیا۔';
  }

  @override
  String usrLinkSent(String email) {
    return '$email پر پاس ورڈ سیٹ کرنے کا لنک بھیجا گیا۔';
  }

  @override
  String get usrLinkFailed => 'اکاؤنٹ بن گیا، لیکن لنک بھیجا نہیں جا سکا۔';

  @override
  String get usrSendLink => 'لنک دوبارہ بھیجیں';

  @override
  String get usrNewInvitation => 'کسی کو مدعو کریں';

  @override
  String get usrInvitationIntro =>
      'ایک بار کا کوڈ بناتا ہے۔ اسے شخص کو دیں: سائن اِن کرنے کے بعد وہ اسے درج کر کے اس اسکول سے جڑتا ہے۔';

  @override
  String get usrExpiresIn => 'میعاد (دن)';

  @override
  String get usrInvitationCode =>
      'ایک بار کا کوڈ۔ ابھی کاپی کریں: یہ صرف ایک بار دکھایا جاتا ہے۔';

  @override
  String get usrRevoke => 'دعوت نامہ منسوخ کریں';

  @override
  String get usrExpires => 'میعاد ختم';

  @override
  String get usrPending => 'زیر التوا';

  @override
  String get usrCancelled => 'منسوخ';

  @override
  String get usrNoInvitations => 'ابھی کوئی دعوت نامہ نہیں';

  @override
  String get usrHaveCode => 'میرے پاس دعوت نامہ کوڈ ہے';

  @override
  String get usrEnterCode => 'دعوت نامہ کوڈ';

  @override
  String get usrJoin => 'شامل ہوں';

  @override
  String usrJoined(String role) {
    return 'آپ $role کے طور پر شامل ہو گئے۔ آپ کا اسکول لوڈ ہو رہا ہے…';
  }

  @override
  String get errorInvitationInvalid =>
      'یہ کوڈ درست نہیں، یا اس کی میعاد ختم ہو گئی ہے۔ اسکول سے نیا کوڈ مانگیں۔';

  @override
  String get errorEmailNotVerified =>
      'پہلے اپنا ای میل تصدیق کریں، پھر دوبارہ کوشش کریں۔';

  @override
  String get errorOwnMembership =>
      'آپ اپنا کردار نہیں بدل سکتے۔ کسی دوسرے سسٹم منتظم سے کہیں۔';

  @override
  String get mobSchoolChoiceTitle => 'اپنا اسکول منتخب کریں';

  @override
  String get mobSchoolChoiceBody =>
      'آپ کا اکاؤنٹ ایک سے زیادہ اسکولوں میں چلتا ہے۔ جسے کھولنا ہے اسے منتخب کریں۔';

  @override
  String get mobNoAccessTitle => 'یہ اکاؤنٹ اس ایپ کو استعمال نہیں کر سکتا';

  @override
  String get mobOpening => 'کھل رہا ہے…';

  @override
  String get mobLockTitle => 'مقفل ہے';

  @override
  String get mobLockBody => 'OruSchools کھولنے کے لیے تصدیق کریں کہ یہ آپ ہیں۔';

  @override
  String get mobActionUnlock => 'کھولیں';

  @override
  String get mobUnlockFailed =>
      'ہم تصدیق نہیں کر سکے کہ یہ آپ ہیں۔ دوبارہ کوشش کریں۔';

  @override
  String get mobSignOutTitle => 'اس فون سے سائن آؤٹ کریں؟';

  @override
  String get mobSignOutBody =>
      'اس اسکول کے لیے اس فون میں محفوظ سب کچھ ہٹا دیا جائے گا۔';

  @override
  String mobSignOutOwed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تبدیلیاں ابھی اسکول تک نہیں پہنچیں اور ضائع ہو جائیں گی۔',
      one: '$count تبدیلی ابھی اسکول تک نہیں پہنچی اور ضائع ہو جائے گی۔',
    );
    return '$_temp0';
  }

  @override
  String get mobActionStaySignedIn => 'سائن اِن رہیں';

  @override
  String get mobActionSignOutAnyway => 'پھر بھی سائن آؤٹ کریں';

  @override
  String get mobAppLockTitle => 'میرا فنگر پرنٹ، چہرہ یا اسکرین لاک مانگیں';

  @override
  String get mobAppLockBody =>
      'ایپ ایک منٹ پس منظر میں رہنے کے بعد دوبارہ مانگا جائے گا۔';

  @override
  String get mobAppLockUnavailable => 'اس فون میں اسکرین لاک سیٹ نہیں ہے۔';

  @override
  String mobSignedInAs(String name) {
    return '$name کے طور پر سائن اِن';
  }

  @override
  String mobSchoolRole(String role, String school) {
    return '$school میں $role';
  }

  @override
  String get mobHomeSoonTitle => 'آپ کا کام یہاں نظر آئے گا';

  @override
  String get mobHomeSoonBody =>
      'جماعتیں، حاضری اور رخصت اگلی اپ ڈیٹس میں آئیں گی۔';

  @override
  String mobCodeSentTo(String phone) {
    return 'ہم نے $phone پر کوڈ بھیجا ہے۔';
  }

  @override
  String get mobActionChangeNumber => 'دوسرا نمبر استعمال کریں';

  @override
  String get mobTodayTitle => 'آج';

  @override
  String get mobAccountLink => 'اکاؤنٹ';

  @override
  String get mobTodayNextLessons => 'اگلے اسباق';

  @override
  String get mobTodayNoMoreLessons => 'آج مزید کوئی سبق نہیں';

  @override
  String get mobTodayNotSchoolDay => 'آج اسکول کا دن نہیں ہے';

  @override
  String mobTodayLessonLine(String className, String start, String end) {
    return '$className، $start سے $end تک';
  }

  @override
  String get mobTodayAttendanceTitle => 'حاضری';

  @override
  String mobTodayAttendanceMissing(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count جماعتوں کی حاضری ابھی نہیں لی گئی',
      one: '$count جماعت کی حاضری ابھی نہیں لی گئی',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayAttendanceAllDone =>
      'آپ کی تمام جماعتوں کی حاضری لی جا چکی ہے';

  @override
  String mobTodayAttendanceSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count جماعتیں اس فون میں محفوظ ہیں، ابھی بھیجی نہیں گئیں',
      one: '$count جماعت اس فون میں محفوظ ہے، ابھی بھیجی نہیں گئی',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveTitle => 'رخصت';

  @override
  String mobTodayLeaveWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count رخصت کی درخواستیں پرنسپل کے انتظار میں',
      one: '$count رخصت کی درخواست پرنسپل کے انتظار میں',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveNone => 'کوئی رخصت کی درخواست انتظار میں نہیں';

  @override
  String mobTodayLeaveSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$count رخصت کی درخواستیں اس فون میں محفوظ ہیں، ابھی بھیجی نہیں گئیں',
      one: '$count رخصت کی درخواست اس فون میں محفوظ ہے، ابھی بھیجی نہیں گئی',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayFirstLoad =>
      'اپنا دن لوڈ کرنے کے لیے ایک بار کنیکٹ کریں۔ اس کے بعد یہ بغیر کنکشن کے چلتا ہے۔';

  @override
  String get actionBack => 'واپس';

  @override
  String get mobTabAttendance => 'حاضری';

  @override
  String get mobTabMore => 'مزید';

  @override
  String get mobAttClassesTitle => 'آپ کی جماعتیں';

  @override
  String get mobAttNoClasses =>
      'آپ کسی جماعت کے کلاس استاد نہیں ہیں، اس لیے آپ حاضری نہیں لیتے۔';

  @override
  String get mobAttStateDone => 'لی گئی';

  @override
  String get mobAttStateSaved => 'اس فون میں محفوظ';

  @override
  String get mobAttStateTodo => 'ابھی نہیں لی گئی';

  @override
  String get mobAttStateLocked => 'مقفل';

  @override
  String get mobAttStateFailed => 'قبول نہیں ہوئی';

  @override
  String get mobAttMarkAllPresent => 'سب کو حاضر کریں';

  @override
  String get mobAttSave => 'حاضری محفوظ کریں';

  @override
  String get mobAttSavedNotSent =>
      'اس فون میں محفوظ۔ کنکشن ہونے پر یہ اسکول تک پہنچ جائے گی۔';

  @override
  String get mobAttLocked =>
      'یہ دن مقفل ہے۔ اسے صرف تعلیمی منتظم تبدیل کر سکتا ہے۔';

  @override
  String get mobAttRefused => 'اسکول نے یہ حاضری قبول نہیں کی۔';

  @override
  String get mobAttRefusedLocked =>
      'پہنچنے سے پہلے دن مقفل ہو گیا تھا۔ تعلیمی منتظم سے اسے درست کرنے کو کہیں۔';

  @override
  String get actionDismiss => 'ہٹائیں';

  @override
  String mobAttExceptions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count استثنا',
      one: '$count استثنا',
    );
    return '$_temp0';
  }

  @override
  String get mobAttEveryonePresent => 'سب حاضر ہیں';

  @override
  String mobAttPickStatus(String name) {
    return '$name کو نشان زد کریں';
  }

  @override
  String get mobAttNoStudents => 'اس جماعت میں ابھی کوئی طالب علم نہیں ہے۔';

  @override
  String get mobAttNotLoaded =>
      'اس جماعت کو لوڈ کرنے کے لیے ایک بار کنیکٹ کریں۔';

  @override
  String mobAttDateLine(String className, String date) {
    return '$className، $date';
  }

  @override
  String get mobTabMarks => 'نمبر';

  @override
  String get mobMarksExamsTitle => 'امتحانات';

  @override
  String get mobMarksNoExams =>
      'آپ کے لیے نمبر درج کرنے والا کوئی امتحان نہیں ہے۔';

  @override
  String mobMarksExamLine(String className, String subject) {
    return '$className، $subject';
  }

  @override
  String mobMarksOutOf(String max) {
    return '$max میں سے';
  }

  @override
  String mobMarksProgress(String done, String total) {
    return '$total میں سے $done کے نمبر درج';
  }

  @override
  String get mobMarksAbsent => 'غیر حاضر';

  @override
  String mobMarksFieldLabel(String name) {
    return '$name کے نمبر';
  }

  @override
  String mobMarksErrAbove(String max) {
    return 'نمبر $max سے زیادہ نہیں ہو سکتے۔';
  }

  @override
  String get mobMarksErrFormat =>
      'نمبر زیادہ سے زیادہ ایک اعشاریہ کے ساتھ لکھیں، جیسے 42 یا 42.5۔';

  @override
  String get mobMarksSave => 'نمبر محفوظ کریں';

  @override
  String get mobMarksRefused => 'اسکول نے یہ نمبر قبول نہیں کیے۔';

  @override
  String get mobMarksRefusedAbove =>
      'ایک نمبر زیادہ سے زیادہ سے اوپر تھا۔ نمبر جانچیں اور دوبارہ محفوظ کریں۔';

  @override
  String get mobMarksRefusedChanged =>
      'امتحان یا جماعت بدل گئی۔ امتحان دوبارہ کھولیں اور نمبر جانچیں۔';

  @override
  String get mobMarksNotLoaded =>
      'اس امتحان کو لوڈ کرنے کے لیے ایک بار کنیکٹ کریں۔';

  @override
  String get mobMarksNoStudents => 'اس جماعت میں ابھی کوئی طالب علم نہیں ہے۔';

  @override
  String mobMarksErrors(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count نمبر درست کرنے ہیں',
      one: '$count نمبر درست کرنا ہے',
    );
    return '$_temp0';
  }

  @override
  String get mobTabLeave => 'رخصت';

  @override
  String get mobLvBalances => 'آپ کی رخصت';

  @override
  String mobLvBalanceLine(String type, String remaining, String allowed) {
    return '$type: $allowed میں سے $remaining دن باقی';
  }

  @override
  String mobLvBalanceUnset(String type) {
    return '$type: کوئی حد مقرر نہیں';
  }

  @override
  String get mobLvRequests => 'آپ کی درخواستیں';

  @override
  String get mobLvNone => 'آپ نے ابھی تک رخصت نہیں مانگی۔';

  @override
  String get mobLvAsk => 'رخصت مانگیں';

  @override
  String get mobLvStatusPending => 'پرنسپل کے انتظار میں';

  @override
  String get mobLvStatusApproved => 'منظور';

  @override
  String get mobLvStatusRejected => 'منظور نہیں';

  @override
  String get mobLvStatusCancelled => 'منسوخ';

  @override
  String get mobLvSavedNotSent => 'اس فون میں محفوظ، ابھی بھیجی نہیں گئی';

  @override
  String get mobLvRefused => 'اسکول نے یہ درخواست قبول نہیں کی۔';

  @override
  String get mobLvRefusedConflict =>
      'ان میں سے کچھ دنوں پر آپ کی رخصت پہلے سے ہے، یا کافی دن باقی نہیں۔';

  @override
  String mobLvDays(String days) {
    return '$days دن';
  }

  @override
  String mobLvDates(String start, String end) {
    return '$start سے $end تک';
  }

  @override
  String get mobLvFormTitle => 'رخصت مانگیں';

  @override
  String get mobLvType => 'رخصت کی قسم';

  @override
  String get mobLvStart => 'پہلا دن';

  @override
  String get mobLvEnd => 'آخری دن';

  @override
  String get mobLvHalf => 'صرف آدھا دن';

  @override
  String get mobLvMorning => 'صبح';

  @override
  String get mobLvAfternoon => 'دوپہر';

  @override
  String get mobLvReason => 'وجہ (اختیاری)';

  @override
  String get mobLvSend => 'درخواست بھیجیں';

  @override
  String get mobLvErrEnd => 'آخری دن پہلے دن سے پہلے نہیں ہو سکتا۔';

  @override
  String get mobLvErrType => 'رخصت کی قسم منتخب کریں۔';

  @override
  String get mobLvNoTypes =>
      'رخصت کی اقسام لوڈ کرنے کے لیے ایک بار کنیکٹ کریں۔';

  @override
  String get mobMoreCover => 'متبادل ڈیوٹی';

  @override
  String get mobCoverEmpty => 'اگلے دو ہفتوں میں آپ کی کوئی متبادل ڈیوٹی نہیں۔';

  @override
  String mobCoverLine(String className, String subject, String period) {
    return '$className، $subject، $period';
  }

  @override
  String mobCoverFor(String name) {
    return '$name کی جگہ';
  }

  @override
  String get mobMoreClasses => 'میری جماعتیں';

  @override
  String get mobClsEmpty => 'آپ ابھی کسی جماعت کو نہیں پڑھاتے۔';

  @override
  String mobClsStudents(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count طلبہ',
      one: '$count طالب علم',
    );
    return '$_temp0';
  }

  @override
  String get mobClsReport => 'رپورٹ کارڈ';

  @override
  String get mobClsTerm => 'ٹرم';

  @override
  String get mobClsNoCard => 'رپورٹ کارڈ کنکشن ہونے پر لوڈ ہوتے ہیں۔';

  @override
  String mobClsMarksLine(String marks, String max) {
    return '$max میں سے $marks';
  }

  @override
  String mobClsTotal(String marks, String percent) {
    return 'کل $marks، $percent%';
  }

  @override
  String mobClsGrade(String grade) {
    return 'گریڈ $grade';
  }

  @override
  String mobClsPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count امتحانات کے نمبر ابھی درج نہیں',
      one: '$count امتحان کے نمبر ابھی درج نہیں',
    );
    return '$_temp0';
  }

  @override
  String get mobTabHome => 'ہوم';

  @override
  String get mobAnnEmpty => 'ابھی کوئی اعلان نہیں ہے۔';

  @override
  String mobAnnBy(String name) {
    return '$name کی طرف سے';
  }

  @override
  String get mobAnnLatest => 'تازہ ترین اعلانات';

  @override
  String get mobTabApprovals => 'منظوریاں';

  @override
  String get mobApprEmpty => 'آپ کے لیے کوئی رخصت کی درخواست انتظار میں نہیں۔';

  @override
  String get mobApprApprove => 'منظور کریں';

  @override
  String get mobApprReject => 'مسترد کریں';

  @override
  String mobApprLine(String name, String type) {
    return '$name، $type';
  }

  @override
  String get mobApprNeedsNet => 'فیصلے کے لیے کنکشن چاہیے۔ کچھ تبدیل نہیں ہوا۔';

  @override
  String get mobApprRefused => 'اسکول نے یہ فیصلہ قبول نہیں کیا۔';

  @override
  String get mobCiNotIn => 'آپ نے آج چیک اِن نہیں کیا۔';

  @override
  String mobCiIn(String time) {
    return '$time پر چیک اِن کیا';
  }

  @override
  String mobCiOut(String time) {
    return '$time پر چیک آؤٹ کیا';
  }

  @override
  String get mobCiSavedIn => 'چیک اِن اس فون میں محفوظ، ابھی بھیجا نہیں گیا';

  @override
  String get mobCiSavedOut => 'چیک آؤٹ اس فون میں محفوظ، ابھی بھیجا نہیں گیا';

  @override
  String get mobCiCheckIn => 'چیک اِن کریں';

  @override
  String get mobCiCheckOut => 'چیک آؤٹ کریں';

  @override
  String get mobCiLocating => 'آپ کی جگہ تلاش کی جا رہی ہے...';

  @override
  String get mobCiReasonTitle => 'براہ کرم وجہ بتائیں';

  @override
  String mobCiReasonOutside(String distance) {
    return 'آپ اسکول سے تقریباً $distance میٹر دور لگتے ہیں۔';
  }

  @override
  String get mobCiReasonNoPosition => 'اس فون کو آپ کی جگہ نہیں مل سکی۔';

  @override
  String get mobCiReasonFar =>
      'یہ اسکول سے دور ہے، اس لیے ایچ آر اس کی تصدیق کرے گا۔';

  @override
  String get mobCiReasonLabel => 'وجہ';

  @override
  String get mobCiReasonSend => 'بھیجیں';

  @override
  String get mobCiReasonEmpty => 'آگے بڑھنے کے لیے وجہ لکھیں۔';

  @override
  String get mobCiWaitingHr => 'ایچ آر کی تصدیق کے انتظار میں';

  @override
  String get mobCiRefused => 'اسکول نے اسے قبول نہیں کیا۔';

  @override
  String get mobMoreAnnouncements => 'اعلانات';

  @override
  String get mobMoreInbox => 'اطلاعات';

  @override
  String get mobInboxEmpty => 'آپ کے پاس کوئی اطلاع نہیں ہے۔';

  @override
  String mobInboxUnread(String count) {
    return '$count نہ پڑھی گئی';
  }

  @override
  String get satPosition => 'کہاں';

  @override
  String get satStampINSIDE => 'اسکول میں';

  @override
  String get satStampOUTSIDE => 'اسکول سے دور';

  @override
  String get satStampUNKNOWN => 'معلوم نہیں';

  @override
  String satDistance(String metres) {
    return 'اسکول سے $metres میٹر';
  }

  @override
  String satReasonIs(String reason) {
    return 'وجہ: $reason';
  }

  @override
  String get satWaiting => 'ایچ آر کی تصدیق کے انتظار میں';

  @override
  String get satConfirm => 'تصدیق کریں';

  @override
  String get satConfirmedAt => 'تصدیق ہو گئی';

  @override
  String get satConfirmedOk => 'چیک اِن کی تصدیق ہو گئی۔';

  @override
  String get setGeoTitle => 'اسکول کی جگہ';

  @override
  String get setGeoNote =>
      'عملہ اپنے فون سے چیک اِن کرتے ہیں۔ اس علاقے سے باہر ان سے وجہ پوچھی جاتی ہے، اور 500 میٹر سے دور ہونے پر ایچ آر چیک اِن کی تصدیق کرتا ہے۔ جگہ بند کرنے پر کسی سے کچھ نہیں پوچھا جاتا۔';

  @override
  String get setGeoLat => 'عرض بلد';

  @override
  String get setGeoLng => 'طول بلد';

  @override
  String get setGeoRadius => 'احاطے کا رداس (میٹر)';

  @override
  String get setGeoMargin => 'مارجن (میٹر)';

  @override
  String get setGeoSave => 'جگہ محفوظ کریں';

  @override
  String get setGeoClear => 'جگہ بند کریں';

  @override
  String get setGeoSaved => 'جگہ محفوظ ہو گئی۔';

  @override
  String get setGeoCleared => 'جگہ بند کر دی گئی۔';

  @override
  String setGeoNow(String lat, String lng, String radius, String margin) {
    return 'اب: $lat، $lng، احاطہ $radius میٹر، مارجن $margin میٹر۔';
  }

  @override
  String get setGeoNone =>
      'کوئی جگہ مقرر نہیں، اس لیے کسی سے وجہ نہیں پوچھی جاتی۔';

  @override
  String get setGeoInvalid =>
      '-90 سے 90 کے درمیان عرض بلد، -180 سے 180 کے درمیان طول بلد، 10 سے 2000 میٹر کا رداس اور 0 سے 500 میٹر کا مارجن دیں۔';

  @override
  String get annNone => 'ابھی کوئی اعلان نہیں۔';

  @override
  String get annPostTitle => 'اعلان کریں';

  @override
  String get annPostNote =>
      'عملہ کا ہر رکن اسے اپنی ایپ میں دیکھتا ہے اور اسے اطلاع ملتی ہے۔';

  @override
  String get annFieldTitle => 'عنوان';

  @override
  String get annFieldBody => 'پیغام';

  @override
  String get annPost => 'پوسٹ کریں';

  @override
  String get annPosted => 'اعلان پوسٹ ہو گیا۔';

  @override
  String get annWithdraw => 'واپس لیں';

  @override
  String get annWithdrawn => 'واپس لیا گیا';

  @override
  String get annWithdrawnOk => 'اعلان واپس لے لیا گیا۔';

  @override
  String annFrom(String name, String date) {
    return '$name، $date';
  }

  @override
  String get mobCiCardTitle => 'آپ کا چیک اِن';

  @override
  String get mobCiOpen => 'چیک اِن یا چیک آؤٹ';

  @override
  String get trnViewLabel => 'ٹرانسپورٹ منظر';

  @override
  String get trnTabVehicles => 'گاڑی';

  @override
  String get trnTabRoutes => 'روٹ';

  @override
  String get trnAdd => 'شامل کریں';

  @override
  String get trnDelete => 'حذف کریں';

  @override
  String get trnRemove => 'نکالیں';

  @override
  String get trnPrint => 'فہرست پرنٹ کریں';

  @override
  String get trnNoVehicles => 'ابھی کوئی گاڑی نہیں۔';

  @override
  String get trnNoRoutes => 'ابھی کوئی روٹ نہیں۔';

  @override
  String get trnPlate => 'نمبر پلیٹ';

  @override
  String get trnVehicleName => 'نام (جیسے بس 3)';

  @override
  String get trnSeats => 'نشستیں';

  @override
  String get trnStatusACTIVE => 'چالو';

  @override
  String get trnStatusOUT_OF_SERVICE => 'سروس سے باہر';

  @override
  String get trnPlateInUse => 'یہ نمبر پلیٹ فہرست میں پہلے سے ہے۔';

  @override
  String get trnVehicleInUse =>
      'کوئی روٹ ابھی اس گاڑی کو استعمال کرتا ہے۔ پہلے اسے روٹ سے ہٹائیں۔';

  @override
  String get trnRouteName => 'روٹ کا نام';

  @override
  String get trnDirection => 'سمت';

  @override
  String get trnMORNING => 'صبح، اسکول کی طرف';

  @override
  String get trnAFTERNOON => 'دوپہر، گھر کی طرف';

  @override
  String get trnStartsAt => 'شروع ہونے کا وقت';

  @override
  String get trnVehicle => 'گاڑی';

  @override
  String get trnDriver => 'ڈرائیور';

  @override
  String get trnNoneChosen => 'کوئی نہیں';

  @override
  String get trnRouteNameInUse => 'اس نام کا روٹ پہلے سے ہے۔';

  @override
  String get trnNotADriver => 'یہ شخص اس اسکول کا ڈرائیور نہیں ہے۔';

  @override
  String get trnStops => 'اسٹاپ';

  @override
  String get trnStopName => 'اسٹاپ کا نام';

  @override
  String get trnStopTime => 'مقررہ وقت';

  @override
  String get trnMoveUp => 'اوپر لے جائیں';

  @override
  String get trnMoveDown => 'نیچے لے جائیں';

  @override
  String get trnSaveStops => 'اسٹاپ محفوظ کریں';

  @override
  String get trnStopsSaved => 'اسٹاپ محفوظ ہو گئے۔';

  @override
  String trnStopsDropped(String count) {
    return '$count طلبہ کی نشست ختم ہو گئی کیونکہ ان کا اسٹاپ اب فہرست میں نہیں ہے۔';
  }

  @override
  String get trnDuplicateStop => 'دو اسٹاپ کا نام ایک ہی ہے۔';

  @override
  String get trnSeatTitle => 'طالب علم کو نشست دیں';

  @override
  String get trnFindStudent => 'طالب علم تلاش کریں';

  @override
  String get trnFindHint => 'نام یا اندراج نمبر کے کم از کم دو حروف لکھیں۔';

  @override
  String get trnChooseStop => 'اسٹاپ';

  @override
  String get trnSeat => 'اس روٹ پر نشست دیں';

  @override
  String get trnSeated => 'طالب علم کو نشست مل گئی۔';

  @override
  String get trnUnseated => 'نشست ہٹا دی گئی۔';

  @override
  String get trnVehicleFull => 'گاڑی میں کوئی نشست خالی نہیں ہے۔';

  @override
  String get trnStudentNotFound => 'وہ طالب علم نہیں ملا۔';

  @override
  String get trnWhoRides => 'کون سوار ہوتا ہے';

  @override
  String get trnNobodyAtStop => 'ابھی کوئی نہیں۔';

  @override
  String trnSeatsTaken(String assigned, String capacity) {
    return '$capacity میں سے $assigned نشستیں بھری ہیں';
  }

  @override
  String trnRiding(String assigned) {
    return '$assigned طلبہ سوار ہوتے ہیں';
  }

  @override
  String mobParentHow(String name) {
    return 'آج $name کیسا ہے؟';
  }

  @override
  String get mobParentNoChildren =>
      'آپ کے اکاؤنٹ سے ابھی کوئی بچہ منسلک نہیں ہے۔ براہ کرم اسکول کے دفتر سے پوچھیں۔';

  @override
  String get mobParentChoose => 'بچہ منتخب کریں';

  @override
  String get mobParentNotTaken => 'آج کی حاضری ابھی نہیں لی گئی۔';

  @override
  String get mobParentLessons => 'آج کے اسباق';

  @override
  String get mobParentNoLessons => 'آج کوئی سبق نہیں ہے۔';

  @override
  String get mobParentRide => 'بس';

  @override
  String mobParentNoRide(String name) {
    return '$name کے لیے کوئی بس سفر مقرر نہیں ہے۔';
  }

  @override
  String mobParentRideMorning(String stop) {
    return 'اسکول کی طرف: $stop';
  }

  @override
  String mobParentRideAfternoon(String stop) {
    return 'گھر کی طرف: $stop';
  }

  @override
  String mobParentDriver(String name) {
    return 'ڈرائیور: $name';
  }

  @override
  String get mobParentFirstLoad =>
      'اپنے بچے کا دن لوڈ کرنے کے لیے ایک بار کنیکٹ کریں۔ اس کے بعد یہ کنکشن کے بغیر چلتا ہے۔';

  @override
  String get ntCatstudentleave => 'طالب علم کی رخصت';

  @override
  String get notifStudentleaveRequestedTitle =>
      'ایک طالب علم کے لیے رخصت مانگی گئی';

  @override
  String notifStudentleaveRequestedBody(
    String studentName,
    String startDate,
    String endDate,
    String reason,
  ) {
    return '$studentName: $startDate سے $endDate تک۔ $reason';
  }

  @override
  String get notifStudentleaveApprovedTitle => 'رخصت منظور';

  @override
  String notifStudentleaveApprovedBody(
    String studentName,
    String startDate,
    String endDate,
  ) {
    return '$studentName: $startDate سے $endDate تک۔';
  }

  @override
  String get notifStudentleaveDeclinedTitle => 'رخصت منظور نہیں';

  @override
  String notifStudentleaveDeclinedBody(
    String studentName,
    String startDate,
    String endDate,
    String note,
  ) {
    return '$studentName: $startDate سے $endDate تک۔ $note';
  }

  @override
  String get mobSlTitle => 'طالب علم کی رخصت';

  @override
  String get mobSlWaiting => 'انتظار میں';

  @override
  String get mobSlAll => 'سب';

  @override
  String get mobSlEmptyWaiting => 'آپ کے لیے کوئی درخواست انتظار میں نہیں ہے۔';

  @override
  String get mobSlEmptyAll =>
      'ابھی تک طالب علم کی رخصت کی کوئی درخواست نہیں ہے۔';

  @override
  String mobSlBy(String name) {
    return '$name کی طرف سے درخواست';
  }

  @override
  String get mobSlHalf => 'آدھا دن';

  @override
  String get mobSlSaved =>
      'آپ کا فیصلہ اس فون میں محفوظ ہے اور کنکشن ملنے پر بھیجا جائے گا۔';

  @override
  String get mobSlRefused =>
      'قبول نہیں ہوا۔ ہو سکتا ہے کسی اور نے پہلے فیصلہ کر دیا ہو۔';

  @override
  String get mobSlApproved => 'منظور';

  @override
  String get mobSlDeclined => 'مسترد';

  @override
  String get mobSlCancelled => 'منسوخ';

  @override
  String get navStudentLeave => 'طالب علم کی رخصت';

  @override
  String get slStudent => 'طالب علم';

  @override
  String get slClass => 'جماعت';

  @override
  String get slDates => 'تاریخیں';

  @override
  String get slBy => 'درخواست کنندہ';

  @override
  String get slReason => 'وجہ';

  @override
  String get slStatus => 'دکھائیں';

  @override
  String get slStatusPENDING => 'انتظار میں';

  @override
  String get slStatusAPPROVED => 'منظور';

  @override
  String get slStatusDECLINED => 'مسترد';

  @override
  String get slStatusCANCELLED => 'منسوخ';

  @override
  String get slAll => 'سب';

  @override
  String get slHalf => 'آدھا دن';

  @override
  String get slNoRequests => 'یہاں کوئی درخواست نہیں ہے۔';

  @override
  String get slApprove => 'منظور کریں';

  @override
  String get slDecline => 'مسترد کریں';

  @override
  String slDeclineQuestion(String name) {
    return '$name کی رخصت مسترد کریں؟';
  }

  @override
  String get slNote => 'والدین کے لیے نوٹ (اختیاری)';

  @override
  String get slApproved => 'منظور کر لی گئی۔ والدین کو بتا دیا گیا ہے۔';

  @override
  String get slDeclined => 'مسترد کر دی گئی۔ والدین کو بتا دیا گیا ہے۔';

  @override
  String get slAlreadyDecided =>
      'کسی اور نے یہ درخواست پہلے طے کر دی ہے۔ کچھ نہیں بدلا۔';
}
