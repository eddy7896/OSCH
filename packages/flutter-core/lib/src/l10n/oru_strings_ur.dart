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
}
