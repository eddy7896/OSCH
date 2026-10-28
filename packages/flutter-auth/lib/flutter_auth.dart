/// OruSchools device sign-in for the phone apps (P4-3, ADR-0014 decisions 5 and 6, ADR-0009 for the token rules).
///
/// Firebase Auth over its REST interface (no native plugin, the same code against the Auth emulator), the session that keeps the
/// person signed in across app restarts and offline periods, the school choice, sign-out that deletes local data, and the
/// optional app lock. The platform pieces are ports ([SecureStorage], [DeviceLockPort]) that the apps implement.
library;

export 'src/account.dart';
export 'src/app_lock.dart';
export 'src/identity.dart';
export 'src/session.dart';
export 'src/storage.dart';
