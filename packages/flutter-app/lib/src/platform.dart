import 'package:flutter/foundation.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// The phone's Keychain (iOS) and Keystore-backed storage (Android) behind the session's storage port. Not readable by other
/// apps, not included in a backup that leaves the phone.
class PlatformSecureStorage implements SecureStorage {
  PlatformSecureStorage([FlutterSecureStorage? store])
      : _store = store ??
            const FlutterSecureStorage(
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
            );
  final FlutterSecureStorage _store;

  @override
  Future<String?> read(String key) => _store.read(key: key);

  @override
  Future<void> write(String key, String value) => _store.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _store.delete(key: key);
}

/// The phone's own fingerprint, face or screen-lock check behind the app lock's port.
class PlatformDeviceLock implements DeviceLockPort {
  PlatformDeviceLock({required this.reason, LocalAuthentication? auth}) : _auth = auth ?? LocalAuthentication();
  final LocalAuthentication _auth;

  /// The sentence the phone shows with its prompt, in the person's language (`OruStrings.mobLockBody`).
  final ValueGetter<String> reason;

  @override
  Future<bool> isAvailable() async {
    try {
      return await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(localizedReason: reason());
    } catch (_) {
      return false; // cancelled, locked out, or the phone could not ask: the person stays locked out of the app, not out of the phone
    }
  }
}
