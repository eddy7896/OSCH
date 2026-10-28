/// What differs between one build of an app and another, passed with `--dart-define` (never written in code, never a secret that
/// is not already public: a Firebase web API key identifies the project, it does not grant access).
///
///   flutter run --dart-define=ORU_GATEWAY_URL=https://api.example.com --dart-define=FIREBASE_API_KEY=...
///   (emulators: --dart-define=ORU_GATEWAY_URL=http://10.0.2.2:3200 --dart-define=ORU_AUTH_EMULATOR=10.0.2.2:9099)
class OruAppConfig {
  const OruAppConfig({required this.gatewayUrl, required this.firebaseApiKey, this.authEmulator, this.appCheckToken = ''});

  factory OruAppConfig.fromEnvironment() => const OruAppConfig(
        gatewayUrl: String.fromEnvironment('ORU_GATEWAY_URL'),
        firebaseApiKey: String.fromEnvironment('FIREBASE_API_KEY'),
        authEmulator: String.fromEnvironment('ORU_AUTH_EMULATOR') == '' ? null : String.fromEnvironment('ORU_AUTH_EMULATOR'),
        appCheckToken: String.fromEnvironment('ORU_APP_CHECK_TOKEN'),
      );

  final String gatewayUrl;
  final String firebaseApiKey;

  /// `host:port` of the Firebase Auth emulator, for development only.
  final String? authEmulator;

  /// Proof for the phone-code step that a real app asks. Only the emulator accepts an empty one; a real project needs the
  /// platform's app check wired in (not built, ADR-0014 addendum).
  final String appCheckToken;

  /// Problems that make the app unable to sign anyone in, in words for the developer. Empty when it can.
  List<String> get problems => [
        if (gatewayUrl.isEmpty) 'ORU_GATEWAY_URL is not set',
        if (authEmulator == null && firebaseApiKey.isEmpty) 'FIREBASE_API_KEY is not set',
      ];
}
