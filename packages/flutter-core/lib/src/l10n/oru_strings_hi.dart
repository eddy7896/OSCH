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
}
