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

  @override
  String get saasSignInTitle => 'प्लेटफ़ॉर्म में साइन इन करें';

  @override
  String get saasSignInIntro =>
      'यह क्षेत्र केवल OruSchools प्लेटफ़ॉर्म के स्वामी के लिए है।';

  @override
  String get authEmailLabel => 'ईमेल पता';

  @override
  String get authPasswordLabel => 'पासवर्ड';

  @override
  String get actionSignIn => 'साइन इन करें';

  @override
  String get actionSignInGoogle => 'Google से जारी रखें';

  @override
  String get actionSignInPhone => 'इसके बजाय मोबाइल नंबर का उपयोग करें';

  @override
  String get actionSignInEmail => 'इसके बजाय ईमेल का उपयोग करें';

  @override
  String get authPhoneLabel => 'मोबाइल नंबर';

  @override
  String get authPhoneHint => 'देश कोड के साथ लिखें, जैसे +91 98765 43210';

  @override
  String get actionSendCode => 'कोड भेजें';

  @override
  String get authCodeLabel => '6 अंकों का कोड';

  @override
  String get actionVerifyCode => 'कोड सत्यापित करें';

  @override
  String get authOr => 'या';

  @override
  String get actionSignOut => 'साइन आउट करें';

  @override
  String get authSigningIn => 'साइन इन हो रहा है…';

  @override
  String get authErrorCredentials => 'ईमेल या पासवर्ड सही नहीं है।';

  @override
  String get authErrorTooMany =>
      'बहुत अधिक प्रयास हुए। कुछ मिनट बाद फिर कोशिश करें।';

  @override
  String get authErrorNetwork =>
      'हम साइन-इन सेवा तक नहीं पहुँच सके। अपना कनेक्शन जाँचें।';

  @override
  String get authErrorPopupClosed =>
      'साइन इन पूरा होने से पहले Google की विंडो बंद हो गई।';

  @override
  String get authErrorCode => 'वह कोड सही नहीं है या समाप्त हो चुका है।';

  @override
  String get authErrorPhone => 'नंबर देश कोड के साथ लिखें।';

  @override
  String get authErrorGeneric => 'हम आपको साइन इन नहीं कर सके। फिर कोशिश करें।';

  @override
  String get saasNoAccessTitle =>
      'यह खाता प्लेटफ़ॉर्म क्षेत्र का उपयोग नहीं कर सकता';

  @override
  String get saasNoAccessBody =>
      'प्लेटफ़ॉर्म स्वामी के खाते से साइन इन करें। स्कूल अपने पते पर साइन इन करते हैं।';

  @override
  String get saasNavLabel => 'प्लेटफ़ॉर्म अनुभाग';

  @override
  String get saasNavSchools => 'स्कूल';

  @override
  String get saasSchoolsTitle => 'स्कूल';

  @override
  String saasSchoolsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count स्कूल',
      one: '$count स्कूल',
    );
    return '$_temp0';
  }

  @override
  String get saasSchoolsEmptyTitle => 'अभी कोई स्कूल नहीं';

  @override
  String get saasSchoolsEmptyBody =>
      'पहला स्कूल बनाएँ ताकि उसकी टीम साइन इन कर सके।';

  @override
  String get actionCreateSchool => 'स्कूल बनाएँ';

  @override
  String get saasSchoolCreateTitle => 'स्कूल बनाएँ';

  @override
  String get saasSchoolName => 'स्कूल का नाम';

  @override
  String get saasSchoolSubdomain => 'वेब पता';

  @override
  String get saasSchoolSubdomainHint =>
      'अक्षर, अंक और हाइफ़न, जैसे greenfield। इसे बाद में बदला नहीं जा सकता।';

  @override
  String get saasSchoolLanguage => 'डिफ़ॉल्ट भाषा';

  @override
  String get actionEdit => 'बदलें';

  @override
  String get saasSchoolEditTitle => 'स्कूल बदलें';

  @override
  String get actionSuspend => 'निलंबित करें';

  @override
  String get actionReactivate => 'फिर से चालू करें';

  @override
  String saasSuspendTitle(String name) {
    return '$name को निलंबित करें?';
  }

  @override
  String get saasSuspendBody =>
      'जब तक आप इसे फिर से चालू नहीं करते, इस स्कूल में कोई साइन इन नहीं कर सकेगा।';

  @override
  String get saasSuspendReason => 'कारण (वैकल्पिक)';

  @override
  String get statusActive => 'चालू';

  @override
  String get statusSuspended => 'निलंबित';

  @override
  String get saasCreated => 'स्कूल बन गया';

  @override
  String get saasSaved => 'बदलाव सहेजे गए';

  @override
  String get saasSuspendedDone => 'स्कूल निलंबित हुआ';

  @override
  String get saasReactivatedDone => 'स्कूल फिर से चालू हुआ';

  @override
  String get saasLoadFailed => 'हम स्कूल लोड नहीं कर सके';

  @override
  String get actionLoadMore => 'और दिखाएँ';

  @override
  String get errorAuthRequired => 'कृपया फिर से साइन इन करें।';

  @override
  String get errorForbidden => 'आपको यह करने की अनुमति नहीं है।';

  @override
  String get errorNotFound => 'हमें वह नहीं मिला।';

  @override
  String get errorInvalidRequest =>
      'कुछ विवरण सही नहीं हैं। खाने जाँचकर फिर कोशिश करें।';

  @override
  String get errorConflict =>
      'यह पहले से मौजूद है। कोई दूसरा नाम या पता चुनें।';

  @override
  String get errorRateLimited =>
      'बहुत अधिक अनुरोध। थोड़ा रुककर फिर कोशिश करें।';

  @override
  String get errorUpstream => 'सर्वर व्यस्त है। थोड़ी देर में फिर कोशिश करें।';

  @override
  String get errorInternal => 'हमारी ओर से कुछ गड़बड़ हुई। फिर कोशिश करें।';

  @override
  String get errorNetwork => 'हम सर्वर तक नहीं पहुँच सके। अपना कनेक्शन जाँचें।';

  @override
  String get errorTimeout =>
      'सर्वर ने जवाब देने में बहुत देर की। फिर कोशिश करें।';

  @override
  String get statusLoading => 'लोड हो रहा है…';

  @override
  String get actionAddAdmin => 'एडमिनिस्ट्रेटर जोड़ें';

  @override
  String saasAdminTitle(String name) {
    return '$name का एडमिनिस्ट्रेटर जोड़ें';
  }

  @override
  String get saasAdminIntro =>
      'उन्हें अपना पासवर्ड बनाने के लिए एक ईमेल मिलेगा। आप यहाँ एक एडमिनिस्ट्रेटर जोड़ सकते हैं; इसके बाद स्कूल अपने लोगों को खुद संभालता है।';

  @override
  String get saasAdminName => 'पूरा नाम';

  @override
  String saasAdminAdded(String email) {
    return 'एडमिनिस्ट्रेटर जोड़ा गया। पासवर्ड बनाने का ईमेल $email पर भेजा गया।';
  }

  @override
  String get saasAdminAddedNoEmail =>
      'एडमिनिस्ट्रेटर जोड़ा गया। वे अपने फ़ोन पर आए कोड से साइन इन कर सकते हैं।';

  @override
  String get saasAdminEmailFailed =>
      'एडमिनिस्ट्रेटर जोड़ा गया, लेकिन ईमेल भेजा नहीं जा सका। उनसे साइन-इन पेज पर “पासवर्ड भूल गए?” का उपयोग करने को कहें।';

  @override
  String get saasAdminExists => 'इस स्कूल में पहले से एक एडमिनिस्ट्रेटर है।';

  @override
  String get errorAccountExists => 'इस ईमेल या नंबर का खाता पहले से मौजूद है।';

  @override
  String get authForgot => 'पासवर्ड भूल गए?';

  @override
  String get authResetSent =>
      'यदि उस पते का कोई खाता है, तो नया पासवर्ड बनाने का ईमेल भेजा जा रहा है।';

  @override
  String get authResetNeedsEmail => 'पहले अपना ईमेल पता लिखें।';

  @override
  String get saasHasAdmin => 'एडमिनिस्ट्रेटर जोड़ा गया';

  @override
  String get saasNoAdmin => 'अभी कोई एडमिनिस्ट्रेटर नहीं';

  @override
  String webSignInTitle(String name) {
    return '$name में साइन इन करें';
  }

  @override
  String get webSignInIntro =>
      'वह खाता इस्तेमाल करें जो आपके स्कूल ने दिया है।';

  @override
  String get webSchoolNotFoundTitle => 'हमें यह स्कूल नहीं मिला';

  @override
  String get webSchoolNotFoundBody =>
      'पता जाँचें, या अपने स्कूल से उसका वेब पता पूछें।';

  @override
  String get webNoSchoolTitle => 'अपने स्कूल का पता खोलें';

  @override
  String get webNoSchoolBody =>
      'हर स्कूल का अपना वेब पता होता है, जैसे greenfield.oruschools.com।';

  @override
  String webNoAccessTitle(String name) {
    return 'आपको $name का उपयोग करने की अनुमति नहीं है';
  }

  @override
  String get webNoAccessBody =>
      'अपने स्कूल के एडमिनिस्ट्रेटर से आपको जोड़ने को कहें, फिर दोबारा साइन इन करें।';

  @override
  String get webLoadFailed => 'हम आपका खाता लोड नहीं कर सके';

  @override
  String get webNavLabel => 'स्कूल के अनुभाग';

  @override
  String get webDashboardEmptyTitle => 'अभी दिखाने के लिए कुछ नहीं';

  @override
  String get webDashboardEmptyBody =>
      'जैसे-जैसे आपके स्कूल के मॉड्यूल तैयार होंगे, आँकड़े और कार्य यहाँ दिखेंगे।';

  @override
  String get webComingTitle => 'यह मॉड्यूल अभी तैयार नहीं है';

  @override
  String get webComingBody => 'तैयार होते ही यह यहाँ दिखेगा।';

  @override
  String webYourRole(String role) {
    return 'आपकी भूमिका: $role';
  }

  @override
  String get errorPageTitle => 'इस पेज पर कुछ गड़बड़ हुई';

  @override
  String get actionTryAgain => 'फिर कोशिश करें';

  @override
  String get sectionOverview => 'जायज़ा';

  @override
  String get sectionAcademics => 'शिक्षा';

  @override
  String get sectionPeople => 'लोग';

  @override
  String get sectionHr => 'मानव संसाधन';

  @override
  String get sectionFinance => 'वित्त';

  @override
  String get sectionCommunication => 'संचार';

  @override
  String get sectionTransport => 'परिवहन';

  @override
  String get sectionOperations => 'संचालन';

  @override
  String get sectionReports => 'रिपोर्ट';

  @override
  String get sectionAdministration => 'प्रशासन';

  @override
  String get navDashboard => 'डैशबोर्ड';

  @override
  String get navStudents => 'छात्र';

  @override
  String get navClasses => 'कक्षाएँ और विषय';

  @override
  String get navAttendance => 'उपस्थिति';

  @override
  String get navGradebook => 'ग्रेडबुक';

  @override
  String get navSubstitution => 'स्थानापन्न शिक्षक';

  @override
  String get navAdmissions => 'प्रवेश';

  @override
  String get navStaff => 'स्टाफ़';

  @override
  String get navStaffAttendance => 'स्टाफ़ उपस्थिति';

  @override
  String get navLeave => 'छुट्टी';

  @override
  String get navPayroll => 'वेतन';

  @override
  String get navRecruitment => 'भर्ती';

  @override
  String get navFees => 'फ़ीस और भुगतान';

  @override
  String get navAnnouncements => 'घोषणाएँ';

  @override
  String get navTransport => 'परिवहन';

  @override
  String get navOperations => 'संचालन';

  @override
  String get navReportsAcademic => 'शैक्षणिक रिपोर्ट';

  @override
  String get navReportsFinance => 'वित्तीय रिपोर्ट';

  @override
  String get navReportsHr => 'एचआर रिपोर्ट';

  @override
  String get navSettings => 'स्कूल सेटिंग';

  @override
  String get navMemberships => 'उपयोगकर्ता और भूमिकाएँ';

  @override
  String get navAudit => 'ऑडिट लॉग';

  @override
  String get rolePrincipal => 'प्रिंसिपल';

  @override
  String get roleManagement => 'प्रबंधन';

  @override
  String get roleBursar => 'बर्सर';

  @override
  String get roleAcademicAdmin => 'शैक्षणिक प्रशासक';

  @override
  String get roleSystemAdmin => 'सिस्टम एडमिनिस्ट्रेटर';

  @override
  String get roleHrManager => 'एचआर प्रबंधक';

  @override
  String get roleAccountant => 'लेखाकार';

  @override
  String get roleAdmissionsOfficer => 'प्रवेश अधिकारी';

  @override
  String get roleTransportManager => 'परिवहन प्रबंधक';

  @override
  String get roleOperationsManager => 'संचालन प्रबंधक';

  @override
  String get roleTeacher => 'शिक्षक';

  @override
  String get roleStaff => 'स्टाफ़';

  @override
  String get roleDriver => 'ड्राइवर';

  @override
  String get roleParent => 'अभिभावक';

  @override
  String get errorUploadInvalid => 'PNG, JPEG या WebP छवि चुनें, अधिकतम 2 MB।';

  @override
  String get errorUploadFailed => 'फ़ाइल अपलोड नहीं हो सकी। फिर कोशिश करें।';

  @override
  String get receiptTitle => 'शुल्क रसीद';

  @override
  String get receiptNumber => 'रसीद संख्या';

  @override
  String get receiptDate => 'दिनांक';

  @override
  String get receiptStudent => 'विद्यार्थी';

  @override
  String get receiptEnrollment => 'नामांकन संख्या';

  @override
  String get receiptClass => 'कक्षा';

  @override
  String get receiptFor => 'भुगतान का विवरण';

  @override
  String get receiptAmountPaid => 'भुगतान की गई राशि';

  @override
  String get receiptMethod => 'भुगतान का तरीका';

  @override
  String get receiptReference => 'संदर्भ';

  @override
  String get receiptBalance => 'इस बिल पर शेष राशि';

  @override
  String get receiptReceivedBy => 'प्राप्तकर्ता';

  @override
  String get receiptCancelled => 'रद्द';

  @override
  String get receiptFooter => 'यह कंप्यूटर द्वारा बनाई गई रसीद है।';

  @override
  String get paymentMethodCash => 'नकद';

  @override
  String get paymentMethodCheque => 'चेक';

  @override
  String get paymentMethodBankTransfer => 'बैंक हस्तांतरण';

  @override
  String get paymentMethodUpi => 'यूपीआई';

  @override
  String get paymentMethodOther => 'अन्य';

  @override
  String get payslipTitle => 'वेतन पर्ची';

  @override
  String get payslipPeriod => 'वेतन माह';

  @override
  String get payslipEmployee => 'कर्मचारी';

  @override
  String get payslipEmployeeId => 'कर्मचारी संख्या';

  @override
  String get payslipDepartment => 'विभाग';

  @override
  String get payslipDesignation => 'पदनाम';

  @override
  String get payslipEarnings => 'आय';

  @override
  String get payslipDeductions => 'कटौती';

  @override
  String get payslipGross => 'कुल वेतन';

  @override
  String get payslipTotalDeductions => 'कुल कटौती';

  @override
  String get payslipNetPay => 'शुद्ध वेतन';

  @override
  String get payslipPaidOn => 'भुगतान की तिथि';

  @override
  String get payslipFooter => 'यह कंप्यूटर द्वारा बनाई गई वेतन पर्ची है।';

  @override
  String get reportCollectionsTitle => 'शुल्क संग्रह';

  @override
  String get reportDuesTitle => 'बकाया शुल्क';

  @override
  String get reportPayrollTitle => 'वेतन सारांश';

  @override
  String get reportAsOf => 'तिथि तक';

  @override
  String get reportYear => 'वर्ष';

  @override
  String get reportStatus => 'स्थिति';

  @override
  String get reportReversed => 'वापस किया गया';

  @override
  String get reportTotal => 'कुल';

  @override
  String get ntBell => 'सूचनाएँ';

  @override
  String ntBellUnread(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count अपठित सूचनाएँ',
      one: '$count अपठित सूचना',
    );
    return '$_temp0';
  }

  @override
  String get ntEmpty => 'आपके पास कोई सूचना नहीं है।';

  @override
  String get ntMarkAll => 'सभी को पढ़ा हुआ चिह्नित करें';

  @override
  String get ntClose => 'बंद करें';

  @override
  String get ntSettings => 'चुनें कि आप क्या देखें';

  @override
  String get ntSettingsHint => 'छिपाई गई किस्में हटती नहीं, सुरक्षित रहती हैं।';

  @override
  String get ntCatleave => 'छुट्टी';

  @override
  String get ntCatsubstitution => 'स्थानापन्न शिक्षक';

  @override
  String get ntCatpayroll => 'वेतन';

  @override
  String get ntCatannouncement => 'घोषणाएँ';

  @override
  String get notifAnnouncementPostedTitle => 'नई घोषणा';

  @override
  String notifAnnouncementPostedBody(String title) {
    return '$title';
  }

  @override
  String get ntUnread => 'अपठित';

  @override
  String get ntLoadFailed => 'सूचनाएँ लोड नहीं हो सकीं।';

  @override
  String get sbPeriod => 'कालांश';

  @override
  String get lvViewLabel => 'छुट्टी का दृश्य';

  @override
  String get lvTabRequests => 'अनुरोध';

  @override
  String get lvTabTypes => 'प्रकार और सीमाएँ';

  @override
  String get lvAll => 'सभी';

  @override
  String get lvStatus => 'स्थिति';

  @override
  String get lvStatusPENDING => 'लंबित';

  @override
  String get lvStatusAPPROVED => 'स्वीकृत';

  @override
  String get lvStatusREJECTED => 'अस्वीकृत';

  @override
  String get lvStatusCANCELLED => 'रद्द';

  @override
  String get lvPerson => 'व्यक्ति';

  @override
  String get lvType => 'प्रकार';

  @override
  String get lvDates => 'तिथियाँ';

  @override
  String get lvDays => 'दिन';

  @override
  String get lvDecision => 'निर्णय';

  @override
  String get lvHalfMORNING => 'सुबह';

  @override
  String get lvHalfAFTERNOON => 'दोपहर';

  @override
  String get lvNoRequests => 'कोई छुट्टी का अनुरोध नहीं है।';

  @override
  String get lvApprove => 'स्वीकृत करें';

  @override
  String get lvReject => 'अस्वीकार करें';

  @override
  String lvRejectQuestion(String name) {
    return '$name की छुट्टी अस्वीकार करें?';
  }

  @override
  String get lvRejectNote => 'व्यक्ति के लिए टिप्पणी (वैकल्पिक)';

  @override
  String get lvApproved => 'छुट्टी स्वीकृत की गई';

  @override
  String get lvRejected => 'छुट्टी अस्वीकृत की गई';

  @override
  String get lvNotPending => 'इस अनुरोध पर पहले ही निर्णय हो चुका है।';

  @override
  String get lvOverBalance => 'यह बची हुई सीमा से अधिक है।';

  @override
  String get lvOverlap => 'यह उसी व्यक्ति की किसी दूसरी छुट्टी से टकराती है।';

  @override
  String get lvTypeName => 'नाम';

  @override
  String get lvPaid => 'वेतन सहित';

  @override
  String get lvUnpaid => 'बिना वेतन';

  @override
  String get lvQuota => 'प्रति वर्ष दिन';

  @override
  String get lvAddType => 'छुट्टी का प्रकार जोड़ें';

  @override
  String get lvTypeAdded => 'छुट्टी का प्रकार जोड़ा गया';

  @override
  String get lvIsPaid => 'वेतन सहित छुट्टी (वार्षिक सीमा से दिन कटते हैं)';

  @override
  String get lvNoTypes => 'अभी कोई छुट्टी का प्रकार नहीं है।';

  @override
  String get lvTypeInUse =>
      'इस छुट्टी के प्रकार के अनुरोध हैं, इसे हटाया नहीं जा सकता।';

  @override
  String get lvPaidNeedsQuota =>
      'वेतन सहित प्रकार के लिए प्रति वर्ष दिनों की संख्या चाहिए, पूरी या आधी।';

  @override
  String get lvAllowances => 'सीमाएँ';

  @override
  String get lvPickPerson => 'व्यक्ति';

  @override
  String get lvAllowed => 'अनुमत';

  @override
  String get lvRemaining => 'शेष';

  @override
  String lvAllowedFor(String type) {
    return '$type के अनुमत दिन';
  }

  @override
  String get lvAllowanceSaved => 'सीमा को सहेजा गया';

  @override
  String get lvBelowTaken => 'यह पहले ही ली जा चुकी छुट्टियों से कम है।';

  @override
  String get lvStandardHint =>
      'प्रकार की वार्षिक सीमा, जब तक व्यक्ति उसे माँगता नहीं।';

  @override
  String get lvWholeOrHalf =>
      'पूरे या आधे दिनों की संख्या लिखें, जैसे 12 या 7.5।';

  @override
  String get sbFrom => 'से';

  @override
  String get sbTo => 'तक';

  @override
  String get sbAway => 'अनुपस्थित शिक्षक';

  @override
  String get sbCover => 'स्थानापन्न';

  @override
  String get sbNotChosen => 'अभी चुना नहीं गया';

  @override
  String get sbChoose => 'चुनें';

  @override
  String get sbChange => 'बदलें';

  @override
  String get sbRemoveCover => 'स्थानापन्न हटाएँ';

  @override
  String sbSuggestionsTitle(String slot) {
    return '$slot कौन संभाल सकता है';
  }

  @override
  String sbThisMonth(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'इस महीने $count बार',
      one: 'इस महीने $count बार',
    );
    return '$_temp0';
  }

  @override
  String sbAssign(String name) {
    return '$name को चुनें';
  }

  @override
  String get sbNoCandidates =>
      'इस पाठ के लिए कोई खाली और योग्य शिक्षक नहीं है।';

  @override
  String get sbAssigned => 'स्थानापन्न चुना गया';

  @override
  String get sbCleared => 'स्थानापन्न हटाया गया';

  @override
  String get sbNoNeeds =>
      'इस अवधि में किसी पाठ के लिए स्थानापन्न की प्रतीक्षा नहीं है।';

  @override
  String get sbHasOwnLesson => 'उस समय उस शिक्षक का अपना पाठ है।';

  @override
  String get sbOnLeave => 'उस समय वह शिक्षक छुट्टी पर है।';

  @override
  String get sbAlreadyCovering =>
      'उस समय वह शिक्षक पहले से दूसरी कक्षा संभाल रहा है।';

  @override
  String get sbSameAsAbsent =>
      'जो शिक्षक अनुपस्थित है वह अपना पाठ नहीं संभाल सकता।';

  @override
  String get sbNoLongerNeeded => 'उस पाठ को अब स्थानापन्न की ज़रूरत नहीं।';

  @override
  String get sbChanged => 'इस बीच कुछ बदल गया। सूची फिर देखें।';

  @override
  String get plTitle => 'इस महीने की बिना वेतन छुट्टी';

  @override
  String get plNote =>
      'बिना वेतन की स्वीकृत छुट्टी वाले हर व्यक्ति के लिए: मासिक वेतन गुणा दिन, भाग महीने के स्कूल के कार्य दिवस। जब तक एचआर लागू न करे, कुछ नहीं कटता।';

  @override
  String get plDays => 'बिना वेतन के दिन';

  @override
  String get plProposed => 'प्रस्तावित कटौती';

  @override
  String get plApply => 'लागू करें';

  @override
  String get plAmount => 'कटौती की राशि';

  @override
  String plApplied(String amount) {
    return 'लागू: $amount';
  }

  @override
  String get plDone => 'कटौती लागू की गई';

  @override
  String get plNone => 'इस महीने बिना वेतन की कोई स्वीकृत छुट्टी नहीं है।';

  @override
  String plWithout(String names) {
    return 'बिना वेतन की छुट्टी है पर इस रन में वेतन पर्ची नहीं: $names';
  }

  @override
  String get plAlready => 'यह कटौती पहले ही लागू हो चुकी है।';

  @override
  String get plAboveGross => 'यह महीने के वेतन से अधिक है।';

  @override
  String get plNotDraft => 'केवल मसौदा रन बदला जा सकता है।';

  @override
  String get gbViewLabel => 'ग्रेडबुक का दृश्य';

  @override
  String get gbTabMarks => 'अंक दर्ज करना';

  @override
  String get gbTabExams => 'परीक्षाएँ और सत्र';

  @override
  String get gbTabBands => 'ग्रेड श्रेणियाँ';

  @override
  String get gbTabCards => 'रिपोर्ट कार्ड';

  @override
  String get gbPickTerm => 'सत्र';

  @override
  String get gbPickExam => 'परीक्षा';

  @override
  String get gbNoTermsTitle => 'अभी कोई सत्र नहीं है';

  @override
  String get gbNoTermsBody => 'पहले परीक्षाएँ और सत्र में एक सत्र जोड़ें।';

  @override
  String get gbNoExams => 'इस सत्र में अभी कोई परीक्षा नहीं है।';

  @override
  String gbOutOf(String max) {
    return 'कुल $max';
  }

  @override
  String gbMarksFor(String name) {
    return 'अंक: $name';
  }

  @override
  String gbAbsentFor(String name) {
    return 'अनुपस्थित: $name';
  }

  @override
  String get gbSaveMarks => 'अंक सहेजें';

  @override
  String get gbMarksSaved => 'अंक सहेजे गए';

  @override
  String get gbAboveMax => 'किसी का अंक इस परीक्षा के अधिकतम अंक से ऊपर है।';

  @override
  String get gbNotAMark => 'अंक अधिकतम एक दशमलव वाली संख्या होना चाहिए।';

  @override
  String get gbAbsentNoMarks => 'अनुपस्थित छात्र के अंक नहीं हो सकते।';

  @override
  String get gbAddTerm => 'सत्र जोड़ें';

  @override
  String get gbTermName => 'सत्र का नाम';

  @override
  String get gbTermAdded => 'सत्र जोड़ा गया';

  @override
  String get gbNameTaken => 'यह नाम पहले से उपयोग में है।';

  @override
  String get gbTermHasExams => 'इस सत्र में अभी परीक्षाएँ हैं।';

  @override
  String get gbAddExam => 'परीक्षा जोड़ें';

  @override
  String get gbExamName => 'परीक्षा का नाम';

  @override
  String get gbExamAdded => 'परीक्षा जोड़ी गई';

  @override
  String get gbExamExists =>
      'इस कक्षा में इस विषय और सत्र के लिए इसी नाम की परीक्षा पहले से है।';

  @override
  String get gbExamHasMarks => 'इस परीक्षा के अंक पहले से दर्ज हैं।';

  @override
  String get gbBelowMark =>
      'अधिकतम अंक, पहले से दिए गए किसी अंक से कम नहीं हो सकते।';

  @override
  String get gbMarksField => 'कुल अंक';

  @override
  String get gbBandsNone =>
      'कोई ग्रेड श्रेणी तय नहीं है। अंक बिना ग्रेड के प्रतिशत के साथ दिखते हैं।';

  @override
  String get gbBandsHint =>
      'श्रेणियों को मिलाकर 0 से 100 तक बिना खाली जगह और बिना दोहराव के पूरा होना चाहिए। प्रतिशत को कभी ऊपर की श्रेणी में पूर्णांकित नहीं किया जाता।';

  @override
  String get gbFrom => 'से (%)';

  @override
  String get gbTo => 'तक (%)';

  @override
  String get gbAddBand => 'श्रेणी जोड़ें';

  @override
  String get gbUseStandard => 'मानक सेट अपनाएँ';

  @override
  String get gbSaveBands => 'ग्रेड श्रेणियाँ सहेजें';

  @override
  String get gbBandsSaved => 'ग्रेड श्रेणियों को सहेजा गया';

  @override
  String gbRemoveBand(String label) {
    return 'श्रेणी $label हटाएँ';
  }

  @override
  String get gbBandOverlap => 'दो श्रेणियाँ एक ही प्रतिशत को ढकती हैं।';

  @override
  String get gbBandGap => 'दो श्रेणियों के बीच खाली जगह है।';

  @override
  String get gbBandStart => 'सबसे निचली श्रेणी 0 से शुरू होनी चाहिए।';

  @override
  String get gbBandEnd => 'सबसे ऊँची श्रेणी 100 पर खत्म होनी चाहिए।';

  @override
  String get gbBandLabelTaken => 'दो श्रेणियों का ग्रेड एक ही है।';

  @override
  String get gbBandBad =>
      'हर श्रेणी में 0 से 100 तक पूर्ण संख्याएँ और एक ग्रेड का नाम चाहिए।';

  @override
  String get gbPickStudent => 'छात्र';

  @override
  String gbPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count परीक्षाओं के अंक अभी नहीं हैं और छोड़ी गई हैं',
      one: '$count परीक्षा का अंक अभी नहीं है और छोड़ी गई है',
    );
    return '$_temp0';
  }

  @override
  String get gbPdf => 'रिपोर्ट कार्ड डाउनलोड करें (PDF)';

  @override
  String get gbNoCard => 'इस छात्र का इस सत्र का कोई रिपोर्ट कार्ड नहीं है।';

  @override
  String get gbMarkAbsent => 'अनुपस्थित';

  @override
  String get attLockDone => 'दिन बंद किया गया';

  @override
  String get attViewLabel => 'उपस्थिति का दृश्य';

  @override
  String get attTabRegister => 'दैनिक उपस्थिति';

  @override
  String get attTabMissing => 'अभी तक नहीं ली गई';

  @override
  String get attTabNames => 'स्थिति के नाम';

  @override
  String get attDate => 'तिथि';

  @override
  String get attStatusPRESENT => 'उपस्थित';

  @override
  String get attStatusABSENT => 'अनुपस्थित';

  @override
  String get attStatusLATE => 'देर से';

  @override
  String get attStatusLEAVE => 'छुट्टी पर';

  @override
  String get attStatusMEDICAL => 'चिकित्सा';

  @override
  String get attStatusHALF_DAY => 'आधा दिन';

  @override
  String get attStatusEXCUSED => 'छूट प्राप्त';

  @override
  String attCount(String label, String count) {
    return '$label: $count';
  }

  @override
  String get attNotTaken =>
      'इस कक्षा की इस तिथि की उपस्थिति अभी नहीं ली गई है। जब तक नहीं ली जाती, सभी उपस्थित दिखाए जाते हैं।';

  @override
  String attTakenBy(String name) {
    return '$name द्वारा ली गई';
  }

  @override
  String get attLocked => 'बंद';

  @override
  String get attLockedNote =>
      'यह दिन बंद है। केवल सुधार से बदला जा सकता है, और पुराना व नया मान दर्ज होता है।';

  @override
  String get attStudent => 'छात्र';

  @override
  String get attStatus => 'स्थिति';

  @override
  String get attNote => 'टिप्पणी';

  @override
  String get attNoStudents => 'इस कक्षा में अभी कोई छात्र नहीं है।';

  @override
  String get attSave => 'उपस्थिति सहेजें';

  @override
  String get attSaveCorrection => 'सुधार सहेजें';

  @override
  String get attLock => 'दिन बंद करें';

  @override
  String get attSaved => 'उपस्थिति को सहेजा गया';

  @override
  String get attCorrected => 'सुधार सहेजा गया';

  @override
  String get attDayLocked => 'यह दिन बंद है। शैक्षणिक प्रशासक से सुधार करवाएँ।';

  @override
  String get attFutureDate => 'वह तिथि अभी आई नहीं है।';

  @override
  String get attMissingEmpty => 'इस तिथि के लिए कुछ बाकी नहीं है।';

  @override
  String attMissingTitle(String date) {
    return '$date को बिना उपस्थिति वाली कक्षाएँ';
  }

  @override
  String get attNamesHint =>
      'अपने स्कूल के लिए किसी स्थिति का नाम बदलें। उसका अर्थ और रंग वही रहते हैं।';

  @override
  String attNameFor(String status) {
    return '$status का नाम';
  }

  @override
  String get attNameSaved => 'नाम सहेजा गया';

  @override
  String get attNameDefault => 'मानक नाम';

  @override
  String get satTitleNote =>
      'किसी तिथि को कौन काम पर है। समय भारतीय मानक समय में हैं।';

  @override
  String get satIn => 'आगमन';

  @override
  String get satOut => 'प्रस्थान';

  @override
  String get satStateIN => 'काम पर';

  @override
  String get satStateOUT => 'आज के लिए जा चुके';

  @override
  String get satStateNONE => 'अभी नहीं आए';

  @override
  String get satCorrect => 'सुधारें';

  @override
  String satCorrectTitle(String name) {
    return '$name के समय सुधारें';
  }

  @override
  String get satTimeHint => 'समय इस तरह लिखें: 09:15।';

  @override
  String get satSaved => 'समय सहेजे गए';

  @override
  String get satNeedsIn => 'आगमन का समय भी लिखें।';

  @override
  String get satNone => 'स्टाफ़ सूची में अभी कोई नहीं है।';

  @override
  String ttRemoveQuestion(String name) {
    return '$name हटाएँ?';
  }

  @override
  String get navTimetable => 'समय-सारणी';

  @override
  String get ttViewLabel => 'समय-सारणी का दृश्य';

  @override
  String get ttTabClass => 'कक्षा के अनुसार';

  @override
  String get ttTabTeacher => 'शिक्षक के अनुसार';

  @override
  String get ttTabSchedule => 'घंटी का समय';

  @override
  String get ttPickTeacher => 'शिक्षक';

  @override
  String get ttSubject => 'विषय';

  @override
  String get ttNoYearTitle => 'कोई शैक्षणिक वर्ष चालू नहीं है';

  @override
  String get ttNoYearBody => 'पहले एक शैक्षणिक वर्ष चालू करें।';

  @override
  String get ttNoClasses => 'अभी कोई कक्षा नहीं है।';

  @override
  String get ttNoTeachers => 'अभी कोई शिक्षक नहीं है।';

  @override
  String get ttNoPeriodsTitle => 'अभी कोई कालांश नहीं है';

  @override
  String get ttNoPeriodsBody =>
      'मानक दिन या छोटे दिन से शुरू करें, या कालांश एक-एक करके जोड़ें।';

  @override
  String get ttEmptyCell => 'खाली';

  @override
  String get ttBreak => 'विराम';

  @override
  String ttEditorTitle(String slot) {
    return '$slot का पाठ';
  }

  @override
  String get ttSetLesson => 'पाठ तय करें';

  @override
  String get ttClearLesson => 'पाठ हटाएँ';

  @override
  String get ttSaved => 'पाठ सहेजा गया';

  @override
  String get ttCleared => 'पाठ हटाया गया';

  @override
  String get ttClassBusy => 'इस कक्षा में उस समय पहले से पाठ है।';

  @override
  String get ttTeacherBusy => 'ये शिक्षक उस समय दूसरी कक्षा में पढ़ा रहे हैं।';

  @override
  String get ttTeacherNotSubject => 'ये शिक्षक यह विषय नहीं पढ़ाते।';

  @override
  String get ttNotWorkingDay => 'स्कूल उस दिन काम नहीं करता।';

  @override
  String get ttPeriodInUse =>
      'जिस कालांश में पाठ हैं, उसे हटाया नहीं जा सकता और न ही विराम बनाया जा सकता है।';

  @override
  String get ttPeriodOverlaps => 'यह समय किसी दूसरे कालांश से टकराता है।';

  @override
  String get ttPeriodLabelTaken => 'किसी दूसरे कालांश का यही नाम है।';

  @override
  String get ttPeriodStartTaken => 'किसी दूसरे कालांश का यही आरंभ समय है।';

  @override
  String get ttPeriodEnd => 'अंत का समय आरंभ के बाद होना चाहिए।';

  @override
  String get ttPeriodTime => 'समय इस तरह लिखें: 08:30।';

  @override
  String get ttLoadTitle => 'प्रति सप्ताह पाठ';

  @override
  String ttLoadCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count पाठ',
      one: '$count पाठ',
    );
    return '$_temp0';
  }

  @override
  String get ttNoLoad => 'अभी कोई पाठ नहीं रखा गया है।';

  @override
  String get ttWorkingDays => 'कार्य दिवस';

  @override
  String get ttDaysSaved => 'कार्य दिवस सहेजे गए';

  @override
  String get ttPeriodName => 'नाम';

  @override
  String get ttStarts => 'आरंभ';

  @override
  String get ttEnds => 'अंत';

  @override
  String get ttNumber => 'क्र.';

  @override
  String get ttIsBreak => 'यह विराम है: इसमें कुछ नहीं पढ़ाया जाता';

  @override
  String get ttAddPeriod => 'कालांश जोड़ें';

  @override
  String get ttPeriodAdded => 'कालांश जोड़ा गया';

  @override
  String get ttStandard => 'मानक दिन से शुरू करें';

  @override
  String get ttShort => 'छोटे दिन से शुरू करें';

  @override
  String get ttTemplateApplied => 'घंटी का समय बन गया';

  @override
  String get ttDayMON => 'सोम';

  @override
  String get ttDayTUE => 'मंगल';

  @override
  String get ttDayWED => 'बुध';

  @override
  String get ttDayTHU => 'गुरु';

  @override
  String get ttDayFRI => 'शुक्र';

  @override
  String get ttDaySAT => 'शनि';

  @override
  String get ttDaySUN => 'रवि';

  @override
  String get notifLeaveRequestedTitle => 'निर्णय के लिए छुट्टी';

  @override
  String notifLeaveRequestedBody(
    String name,
    String days,
    String typeName,
    String startDate,
    String endDate,
  ) {
    return '$name ने $typeName की $days दिन की छुट्टी माँगी है, $startDate से $endDate तक।';
  }

  @override
  String get notifLeaveApprovedTitle => 'आपकी छुट्टी स्वीकृत हुई';

  @override
  String notifLeaveApprovedBody(
    String typeName,
    String startDate,
    String endDate,
    String days,
  ) {
    return '$typeName, $startDate से $endDate ($days दिन)।';
  }

  @override
  String get notifLeaveRejectedTitle => 'आपकी छुट्टी स्वीकृत नहीं हुई';

  @override
  String notifLeaveRejectedBody(
    String typeName,
    String startDate,
    String endDate,
    String note,
  ) {
    return '$typeName, $startDate से $endDate। $note';
  }

  @override
  String get notifLeaveSubstitutionTitle =>
      'कक्षाओं के लिए स्थानापन्न शिक्षक चाहिए';

  @override
  String notifLeaveSubstitutionBody(
    String name,
    String startDate,
    String endDate,
  ) {
    return '$name $startDate से $endDate तक छुट्टी पर हैं। स्थानापन्न शिक्षक चुनें।';
  }

  @override
  String get notifLeavePayrollTitle => 'कटौती के लिए बिना वेतन की छुट्टी';

  @override
  String notifLeavePayrollBody(String name, String startDate, String endDate) {
    return '$name की $startDate से $endDate तक बिना वेतन की छुट्टी स्वीकृत है। वेतन रन में प्रस्तावित कटौती देखें।';
  }

  @override
  String get notifSubstitutionAssignedTitle => 'आप एक कक्षा संभाल रहे हैं';

  @override
  String notifSubstitutionAssignedBody(
    String className,
    String subjectName,
    String periodLabel,
    String date,
    String name,
  ) {
    return '$className, $subjectName, $periodLabel, $date, $name की जगह।';
  }

  @override
  String get notifSubstitutionClearedTitle => 'कवर रद्द';

  @override
  String notifSubstitutionClearedBody(
    String className,
    String subjectName,
    String date,
  ) {
    return '$date को $className, $subjectName में अब आपकी ज़रूरत नहीं।';
  }

  @override
  String get gradesReportCardTitle => 'रिपोर्ट कार्ड';

  @override
  String get gradesTerm => 'सत्र';

  @override
  String get gradesSubject => 'विषय';

  @override
  String get gradesMarks => 'अंक';

  @override
  String get gradesOutOf => 'पूर्णांक';

  @override
  String get gradesPercent => 'प्रतिशत';

  @override
  String get gradesGrade => 'ग्रेड';

  @override
  String get reportDueDate => 'देय तिथि';

  @override
  String get reportAmountDue => 'देय राशि';

  @override
  String get reportOutstanding => 'बकाया';

  @override
  String get reportDaysOverdue => 'विलंब के दिन';

  @override
  String get reportMonth => 'माह';

  @override
  String get reportHeadcount => 'स्टाफ़';

  @override
  String get reportApproved => 'स्वीकृत';

  @override
  String get reportPaid => 'भुगतान किया गया';

  @override
  String get webFrom => 'से';

  @override
  String get webTo => 'तक';

  @override
  String get webDownloadCsv => 'CSV डाउनलोड करें';

  @override
  String get webDownloadPdf => 'PDF डाउनलोड करें';

  @override
  String get webDownloadFailed => 'फ़ाइल नहीं बन सकी। फिर कोशिश करें।';

  @override
  String get webAtAGlance => 'एक नज़र में';

  @override
  String get webCollectedThisMonth => 'इस माह का संग्रह';

  @override
  String webPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count भुगतान',
      one: '$count भुगतान',
    );
    return '$_temp0';
  }

  @override
  String get webOutstandingFees => 'बकाया शुल्क';

  @override
  String webInvoicesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count इनवॉइस',
      one: '$count इनवॉइस',
    );
    return '$_temp0';
  }

  @override
  String get webByMethod => 'भुगतान के तरीके से';

  @override
  String get webByAge => 'विलंब की अवधि के अनुसार';

  @override
  String get webBandDueToday => 'आज देय';

  @override
  String get webBand1To30 => '1 से 30 दिन विलंब';

  @override
  String get webBand31To60 => '31 से 60 दिन विलंब';

  @override
  String get webBand61To90 => '61 से 90 दिन विलंब';

  @override
  String get webBandOver90 => '90 दिन से अधिक विलंब';

  @override
  String get webNoRowsTitle => 'इस सीमा में कुछ नहीं';

  @override
  String get webNoRowsBody => 'दूसरी तिथियाँ चुनकर देखें।';

  @override
  String get webNoDuesTitle => 'कोई शुल्क बकाया नहीं';

  @override
  String get webTotalsOnly => 'आप कुल राशि देख सकते हैं, अलग-अलग भुगतान नहीं।';

  @override
  String get webPrevious => 'पिछला';

  @override
  String get webNext => 'अगला';

  @override
  String webPageOf(String page, String pages) {
    return 'पृष्ठ $page / $pages';
  }

  @override
  String get webCollected => 'संग्रहित';

  @override
  String get peoSearch => 'नाम या नामांकन संख्या से खोजें';

  @override
  String get peoAll => 'सभी';

  @override
  String get peoInactive => 'निष्क्रिय';

  @override
  String get peoLeft => 'छोड़ चुके';

  @override
  String get peoAddStudent => 'छात्र जोड़ें';

  @override
  String get peoFirstName => 'पहला नाम';

  @override
  String get peoLastName => 'उपनाम';

  @override
  String get peoDateOfBirth => 'जन्म तिथि';

  @override
  String get peoGender => 'लिंग';

  @override
  String get peoFemale => 'महिला';

  @override
  String get peoMale => 'पुरुष';

  @override
  String get peoAddress => 'पता';

  @override
  String get peoClass => 'कक्षा';

  @override
  String get peoNoStudentsTitle => 'अभी कोई छात्र नहीं';

  @override
  String get peoNoStudentsBody => 'पहला छात्र जोड़ें, या सूची आयात करें।';

  @override
  String get peoNoMatch => 'इस खोज से कोई छात्र नहीं मिला।';

  @override
  String get peoStudentAdded => 'छात्र जोड़ा गया';

  @override
  String get peoGuardians => 'अभिभावक';

  @override
  String get peoNoGuardians => 'कोई अभिभावक दर्ज नहीं';

  @override
  String get peoRelationship => 'संबंध';

  @override
  String get peoMother => 'माता';

  @override
  String get peoFather => 'पिता';

  @override
  String get peoGuardianRel => 'अभिभावक';

  @override
  String get peoPrimary => 'मुख्य संपर्क';

  @override
  String get peoClassHistory => 'कक्षा का इतिहास';

  @override
  String get peoAdmissionDate => 'प्रवेश की तिथि';

  @override
  String get peoBackToList => 'सूची पर वापस';

  @override
  String get peoCapacity => 'क्षमता';

  @override
  String get peoSection => 'सेक्शन';

  @override
  String get peoLevel => 'स्तर';

  @override
  String get peoNoClassesTitle => 'अभी कोई कक्षा नहीं';

  @override
  String get peoApplications => 'आवेदन';

  @override
  String get peoNewApplication => 'नया आवेदन';

  @override
  String get peoApplicationNo => 'आवेदन संख्या';

  @override
  String get peoApplicant => 'आवेदक';

  @override
  String get peoLevelApplied => 'आवेदित स्तर';

  @override
  String get peoGuardianName => 'अभिभावक का नाम';

  @override
  String get peoGuardianPhone => 'अभिभावक का फ़ोन';

  @override
  String get peoSubmitted => 'जमा किया गया';

  @override
  String get peoUnderReview => 'समीक्षा में';

  @override
  String get peoAccepted => 'स्वीकार किया गया';

  @override
  String get peoRejected => 'अस्वीकृत';

  @override
  String get peoWithdrawn => 'वापस लिया गया';

  @override
  String get peoAdmitted => 'प्रवेश दिया गया';

  @override
  String get peoStartReview => 'समीक्षा शुरू करें';

  @override
  String get peoAccept => 'स्वीकार करें';

  @override
  String get peoReject => 'अस्वीकार करें';

  @override
  String get peoWithdraw => 'वापस लिया गया चिह्नित करें';

  @override
  String get peoNote => 'टिप्पणी (वैकल्पिक)';

  @override
  String get peoAdmitStudent => 'छात्र को प्रवेश दें';

  @override
  String peoStudentAdmitted(String id) {
    return 'छात्र को प्रवेश मिला। नामांकन संख्या $id';
  }

  @override
  String get peoNoApplicationsTitle => 'अभी कोई आवेदन नहीं';

  @override
  String get peoApplicationSaved => 'आवेदन सहेजा गया';

  @override
  String get hrpAddStaff => 'स्टाफ़ सदस्य जोड़ें';

  @override
  String get hrpSearch => 'नाम या कर्मचारी संख्या से खोजें';

  @override
  String get hrpAllDepartments => 'सभी विभाग';

  @override
  String get hrpJoined => 'नियुक्ति की तिथि';

  @override
  String get hrpNoStaffTitle => 'अभी कोई स्टाफ़ नहीं';

  @override
  String get hrpNoMatch => 'इस खोज से कोई स्टाफ़ सदस्य नहीं मिला।';

  @override
  String get hrpStaffAdded => 'स्टाफ़ सदस्य जोड़ा गया';

  @override
  String get hrpSalary => 'वेतन';

  @override
  String get hrpEarning => 'आय';

  @override
  String get hrpDeduction => 'कटौती';

  @override
  String get hrpKind => 'प्रकार';

  @override
  String get hrpComponent => 'घटक';

  @override
  String get hrpAmount => 'राशि';

  @override
  String get hrpAmountHint => 'रुपये में, जैसे 45,000.50';

  @override
  String get hrpAddLine => 'वेतन मद जोड़ें';

  @override
  String get hrpNoLines => 'अभी वेतन तय नहीं';

  @override
  String get hrpRemove => 'हटाएँ';

  @override
  String get hrpNewRun => 'नया वेतन चक्र';

  @override
  String get hrpRunCreated => 'वेतन चक्र बना';

  @override
  String get hrpDraft => 'मसौदा';

  @override
  String get hrpPreparedBy => 'तैयार करने वाले';

  @override
  String get hrpApprovedBy => 'स्वीकृत करने वाले';

  @override
  String get hrpApprove => 'स्वीकृत करें';

  @override
  String get hrpPay => 'भुगतान किया गया चिह्नित करें';

  @override
  String get hrpDeleteRun => 'मसौदा हटाएँ';

  @override
  String get hrpConfirm => 'पुष्टि करें';

  @override
  String hrpConfirmApprove(String month, String count, String net) {
    return '$month का वेतन स्वीकृत करें? $count स्टाफ़, शुद्ध वेतन $net। इसे वापस नहीं किया जा सकता।';
  }

  @override
  String hrpConfirmPay(String net, String month) {
    return '$month के लिए $net का भुगतान दर्ज करें? इसे वापस नहीं किया जा सकता।';
  }

  @override
  String hrpConfirmDelete(String month) {
    return '$month का मसौदा हटाएँ? आप इसे फिर बना सकते हैं।';
  }

  @override
  String hrpRunTitle(String month) {
    return 'वेतन $month';
  }

  @override
  String get hrpDetails => 'विवरण';

  @override
  String get hrpPayslipPdf => 'वेतन पर्ची PDF';

  @override
  String get hrpNoRunsTitle => 'अभी कोई वेतन चक्र नहीं';

  @override
  String get hrpNoRunsBody =>
      'पहले हर स्टाफ़ सदस्य का वेतन तय करें, फिर माह का वेतन चक्र बनाएँ।';

  @override
  String get feeTabInvoices => 'इनवॉइस';

  @override
  String get feeTabReceipts => 'रसीदें';

  @override
  String get feeTabStructures => 'शुल्क संरचना';

  @override
  String get feeStatusOverdue => 'अतिदेय';

  @override
  String get feeStatusPartial => 'आंशिक भुगतान';

  @override
  String get feeStatusPending => 'अदत्त';

  @override
  String get feeBilled => 'बिल की गई राशि';

  @override
  String get feeNewInvoice => 'नया इनवॉइस';

  @override
  String get feeBillFees => 'शुल्क का बिल बनाएँ';

  @override
  String get feeDescription => 'विवरण';

  @override
  String get feeFindStudent => 'नाम या नामांकन संख्या से छात्र खोजें';

  @override
  String get feeInvoiceCreated => 'इनवॉइस बना';

  @override
  String get feeRecordPayment => 'भुगतान दर्ज करें';

  @override
  String feePaymentRecorded(String number) {
    return 'भुगतान दर्ज हुआ। रसीद संख्या $number';
  }

  @override
  String get feePayments => 'भुगतान';

  @override
  String get feeNoPayments => 'अभी कोई भुगतान नहीं';

  @override
  String get feeMethod => 'भुगतान का तरीका';

  @override
  String get feeReverse => 'उलटें';

  @override
  String get feeReason => 'कारण';

  @override
  String feeConfirmReverse(String amount) {
    return '$amount का यह भुगतान उलटें? इनवॉइस फिर से अदत्त हो जाएगा और रसीद रद्द हो जाएगी। इसे वापस नहीं किया जा सकता।';
  }

  @override
  String get feeReceiptPdf => 'रसीद PDF';

  @override
  String get feeBillIntro =>
      'चुनी गई तारीख तक देय हर किस्त का इनवॉइस बनाता है, चुने गए स्तर (या सभी) के छात्रों के लिए। जो किस्तें पहले बिल हो चुकी हैं उन्हें छोड़ दिया जाता है।';

  @override
  String get feeBillUpTo => 'इस तारीख तक देय किस्तें';

  @override
  String get feePreview => 'पूर्वावलोकन';

  @override
  String get feeCreateInvoices => 'इनवॉइस बनाएँ';

  @override
  String feePreviewResult(String created, String already, String without) {
    return '$created इनवॉइस बनेंगे। पहले से बिल: $already। जिन छात्रों के लिए शुल्क तय नहीं: $without।';
  }

  @override
  String feeCreatedResult(String created, String already) {
    return '$created इनवॉइस बने। पहले से बिल: $already।';
  }

  @override
  String get feeLevelAll => 'सभी स्तर';

  @override
  String get feeReceiptsTotal => 'कुल प्राप्त राशि';

  @override
  String get feeNoReceiptsTitle => 'अभी कोई रसीद नहीं';

  @override
  String get feeNoInvoicesTitle => 'अभी कोई इनवॉइस नहीं';

  @override
  String get feeNoInvoicesBody => 'पहले शुल्क तय करें, फिर बिल बनाएँ।';

  @override
  String get feeNewStructure => 'नई शुल्क संरचना';

  @override
  String get feeStructureCreated => 'शुल्क संरचना बनी';

  @override
  String get feeAddFee => 'शुल्क जोड़ें';

  @override
  String get feeFeeName => 'शुल्क का नाम';

  @override
  String get feeInstalments => 'किस्तें';

  @override
  String get feeInstalmentLabel => 'नाम';

  @override
  String get feeAddInstalment => 'किस्त जोड़ें';

  @override
  String get feeNoStructuresTitle => 'अभी कोई शुल्क संरचना नहीं';

  @override
  String get feeStructureTotal => 'वर्ष का कुल';

  @override
  String get feeFeeAdded => 'शुल्क जोड़ा गया';

  @override
  String get feeNoItems => 'इस संरचना में अभी कोई शुल्क नहीं';

  @override
  String get setTabClasses => 'कक्षाएँ';

  @override
  String get setTabSubjects => 'विषय';

  @override
  String get setTabYears => 'शैक्षणिक वर्ष';

  @override
  String get setAddClass => 'कक्षा जोड़ें';

  @override
  String get setClassAdded => 'कक्षा जोड़ी गई';

  @override
  String get setSectionHint => 'सेक्शन अक्षर, जैसे A';

  @override
  String get setAddSubject => 'विषय जोड़ें';

  @override
  String get setSubjectName => 'विषय का नाम';

  @override
  String get setSubjectCode => 'संक्षिप्त कोड';

  @override
  String get setNoSubjects => 'अभी कोई विषय नहीं';

  @override
  String get setSubjectAdded => 'विषय जोड़ा गया';

  @override
  String get setNewYear => 'नया शैक्षणिक वर्ष';

  @override
  String get setYearName => 'नाम, जैसे 2027-2028';

  @override
  String get setStartDate => 'आरंभ तिथि';

  @override
  String get setEndDate => 'समाप्ति तिथि';

  @override
  String get setMakeActive => 'चालू करें';

  @override
  String setConfirmActivate(String name) {
    return '$name को चालू शैक्षणिक वर्ष बनाएँ? नए छात्र, इनवॉइस और रसीदें इसी का उपयोग करेंगे।';
  }

  @override
  String get setYearAdded => 'शैक्षणिक वर्ष जोड़ा गया';

  @override
  String get setProfileTitle => 'स्कूल प्रोफ़ाइल';

  @override
  String get setBrandColour => 'ब्रांड रंग';

  @override
  String get setBrandHint =>
      'गहरा रंग, # और छह अक्षर या अंकों में लिखा हुआ, ताकि उस पर सफ़ेद अक्षर आसानी से पढ़े जा सकें।';

  @override
  String get setProfileSaved => 'सेटिंग्स सहेजे गए';

  @override
  String get setImport => 'CSV से आयात करें';

  @override
  String get setImportIntro =>
      'CSV फ़ाइल चुनें। पहले उसकी जाँच होती है, और आपकी पुष्टि तक कुछ सहेजा नहीं जाता।';

  @override
  String get setChooseFile => 'CSV फ़ाइल';

  @override
  String get setCheckFile => 'फ़ाइल जाँचें';

  @override
  String setCheckResult(String valid, String total, String errors) {
    return '$total में से $valid पंक्तियाँ तैयार हैं। $errors पंक्तियों में समस्या है।';
  }

  @override
  String setMissingColumns(String names) {
    return 'ज़रूरी कॉलम नहीं मिले: $names';
  }

  @override
  String setProblemLine(String row, String column, String rule) {
    return 'पंक्ति $row, $column: $rule';
  }

  @override
  String get setAlreadyImported => 'यह फ़ाइल पहले ही आयात हो चुकी है।';

  @override
  String setImportNow(String count) {
    return '$count पंक्तियाँ आयात करें';
  }

  @override
  String setImportDone(String count) {
    return '$count रिकॉर्ड बने।';
  }

  @override
  String setImportFailed(String count) {
    return '$count पंक्तियाँ नहीं बन सकीं।';
  }

  @override
  String get hrrByDepartment => 'विभाग के अनुसार';

  @override
  String get hrrNoDepartment => 'कोई विभाग नहीं';

  @override
  String get hrrNoRunsTitle =>
      'इस वर्ष कोई स्वीकृत या भुगतान किया गया वेतन चक्र नहीं';

  @override
  String get webApplicationsWaiting => 'समीक्षा की प्रतीक्षा में आवेदन';

  @override
  String get webRunsWaiting => 'स्वीकृति की प्रतीक्षा में वेतन चक्र';

  @override
  String get webFieldRoleTitle => 'आपकी भूमिका मोबाइल ऐप में काम करती है';

  @override
  String get webFieldRoleBody =>
      'यह वेब क्षेत्र प्रशासक के लिए है। अपने फ़ोन में OruSchools ऐप खोलें।';

  @override
  String get usrTabMembers => 'सदस्य';

  @override
  String get usrTabInvitations => 'आमंत्रण';

  @override
  String get usrSince => 'सदस्य बने';

  @override
  String get usrYou => 'आप';

  @override
  String get usrChangeRole => 'भूमिका बदलें';

  @override
  String get usrRole => 'भूमिका';

  @override
  String usrConfirmRole(String name, String role) {
    return '$name को $role बनाएँ? उनकी स्क्रीन तुरंत बदल जाएँगी।';
  }

  @override
  String usrConfirmSuspend(String name) {
    return '$name को निलंबित करें? जब तक आप उन्हें फिर से चालू नहीं करते, वे साइन इन नहीं कर पाएँगे।';
  }

  @override
  String usrConfirmRemove(String name) {
    return '$name को इस स्कूल से हटाएँ? यहाँ उनकी जगह समाप्त हो जाएगी।';
  }

  @override
  String get usrNewAccount => 'खाता बनाएँ';

  @override
  String get usrAccountIntro =>
      'उस व्यक्ति के लिए जो स्कूल में काम करता है और जिसका अभी खाता नहीं है। वे ईमेल या मोबाइल नंबर से साइन इन करते हैं।';

  @override
  String get usrDisplayName => 'पूरा नाम';

  @override
  String usrAccountCreated(String name) {
    return '$name का खाता बना।';
  }

  @override
  String usrLinkSent(String email) {
    return '$email पर पासवर्ड सेट करने का लिंक भेजा गया।';
  }

  @override
  String get usrLinkFailed => 'खाता बन गया, लेकिन लिंक भेजा नहीं जा सका।';

  @override
  String get usrSendLink => 'लिंक फिर भेजें';

  @override
  String get usrNewInvitation => 'किसी को आमंत्रित करें';

  @override
  String get usrInvitationIntro =>
      'एक बार चलने वाला कोड बनाता है। उसे व्यक्ति को दें: साइन इन करने के बाद वे उसे दर्ज करके इस स्कूल से जुड़ते हैं।';

  @override
  String get usrExpiresIn => 'वैध अवधि (दिन)';

  @override
  String get usrInvitationCode =>
      'एक बार का कोड। अभी कॉपी करें: यह केवल एक बार दिखता है।';

  @override
  String get usrRevoke => 'आमंत्रण रद्द करें';

  @override
  String get usrExpires => 'समाप्ति';

  @override
  String get usrPending => 'लंबित';

  @override
  String get usrCancelled => 'रद्द';

  @override
  String get usrNoInvitations => 'अभी कोई आमंत्रण नहीं';

  @override
  String get usrHaveCode => 'मेरे पास आमंत्रण कोड है';

  @override
  String get usrEnterCode => 'आमंत्रण कोड';

  @override
  String get usrJoin => 'जुड़ें';

  @override
  String usrJoined(String role) {
    return 'आप $role के रूप में जुड़ गए। आपका स्कूल लोड हो रहा है…';
  }

  @override
  String get errorInvitationInvalid =>
      'यह कोड मान्य नहीं है, या उसकी अवधि समाप्त हो गई है। स्कूल से नया कोड माँगें।';

  @override
  String get errorEmailNotVerified =>
      'पहले अपना ईमेल सत्यापित करें, फिर कोशिश करें।';

  @override
  String get errorOwnMembership =>
      'आप अपनी भूमिका नहीं बदल सकते। किसी दूसरे सिस्टम एडमिनिस्ट्रेटर से कहें।';

  @override
  String get mobSchoolChoiceTitle => 'अपना स्कूल चुनें';

  @override
  String get mobSchoolChoiceBody =>
      'आपका खाता एक से अधिक स्कूलों में चलता है। जिसे खोलना है उसे चुनें।';

  @override
  String get mobNoAccessTitle => 'यह खाता इस ऐप का उपयोग नहीं कर सकता';

  @override
  String get mobOpening => 'खुल रहा है…';

  @override
  String get mobLockTitle => 'बंद है';

  @override
  String get mobLockBody => 'OruSchools खोलने के लिए पुष्टि करें कि यह आप हैं।';

  @override
  String get mobActionUnlock => 'खोलें';

  @override
  String get mobUnlockFailed =>
      'हम पुष्टि नहीं कर सके कि यह आप हैं। फिर कोशिश करें।';

  @override
  String get mobSignOutTitle => 'इस फ़ोन से साइन आउट करें?';

  @override
  String get mobSignOutBody =>
      'इस स्कूल के लिए इस फ़ोन में सहेजा गया सब कुछ हटा दिया जाएगा।';

  @override
  String mobSignOutOwed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count बदलाव अभी स्कूल तक नहीं पहुँचे हैं और खो जाएँगे।',
      one: '$count बदलाव अभी स्कूल तक नहीं पहुँचा है और खो जाएगा।',
    );
    return '$_temp0';
  }

  @override
  String get mobActionStaySignedIn => 'साइन इन रहें';

  @override
  String get mobActionSignOutAnyway => 'फिर भी साइन आउट करें';

  @override
  String get mobAppLockTitle =>
      'मेरा फ़िंगरप्रिंट, चेहरा या स्क्रीन लॉक माँगें';

  @override
  String get mobAppLockBody =>
      'ऐप के एक मिनट पृष्ठभूमि में रहने के बाद फिर माँगा जाएगा।';

  @override
  String get mobAppLockUnavailable => 'इस फ़ोन में स्क्रीन लॉक सेट नहीं है।';

  @override
  String mobSignedInAs(String name) {
    return '$name के रूप में साइन इन';
  }

  @override
  String mobSchoolRole(String role, String school) {
    return '$school में $role';
  }

  @override
  String get mobHomeSoonTitle => 'आपका काम यहाँ दिखेगा';

  @override
  String get mobHomeSoonBody =>
      'कक्षाएँ, उपस्थिति और छुट्टी अगले अपडेट में आएँगी।';

  @override
  String mobCodeSentTo(String phone) {
    return 'हमने $phone पर कोड भेजा है।';
  }

  @override
  String get mobActionChangeNumber => 'दूसरा नंबर उपयोग करें';

  @override
  String get mobTodayTitle => 'आज';

  @override
  String get mobAccountLink => 'खाता';

  @override
  String get mobTodayNextLessons => 'अगले पाठ';

  @override
  String get mobTodayNoMoreLessons => 'आज और कोई पाठ नहीं';

  @override
  String get mobTodayNotSchoolDay => 'आज स्कूल का दिन नहीं है';

  @override
  String mobTodayLessonLine(String className, String start, String end) {
    return '$className, $start से $end तक';
  }

  @override
  String get mobTodayAttendanceTitle => 'उपस्थिति';

  @override
  String mobTodayAttendanceMissing(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count कक्षाओं की उपस्थिति अभी नहीं ली गई',
      one: '$count कक्षा की उपस्थिति अभी नहीं ली गई',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayAttendanceAllDone =>
      'आपकी सभी कक्षाओं की उपस्थिति ले ली गई है';

  @override
  String mobTodayAttendanceSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'इस फ़ोन में सहेजा गया, अभी भेजा नहीं गया: $count कक्षाएँ',
      one: 'इस फ़ोन में सहेजा गया, अभी भेजा नहीं गया: $count कक्षा',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveTitle => 'छुट्टी';

  @override
  String mobTodayLeaveWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count छुट्टी के अनुरोध प्रिंसिपल के इंतज़ार में',
      one: '$count छुट्टी का अनुरोध प्रिंसिपल के इंतज़ार में',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayLeaveNone => 'कोई छुट्टी का अनुरोध प्रतीक्षा में नहीं';

  @override
  String mobTodayLeaveSaved(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count छुट्टी के अनुरोध इस फ़ोन में सहेजे गए, अभी भेजे नहीं गए',
      one: '$count छुट्टी का अनुरोध इस फ़ोन में सहेजा गया, अभी भेजा नहीं गया',
    );
    return '$_temp0';
  }

  @override
  String get mobTodayFirstLoad =>
      'अपना दिन लोड करने के लिए एक बार कनेक्ट करें। उसके बाद यह बिना कनेक्शन के चलता है।';

  @override
  String get actionBack => 'वापस';
}
