import 'dart:async';

import 'package:flutter_core/flutter_core.dart';

import 'account.dart';
import 'identity.dart';
import 'storage.dart';

sealed class SessionState {
  const SessionState();
}

/// Nobody is signed in.
class SessionSignedOut extends SessionState {
  const SessionSignedOut();
}

/// Signed in, and more than one school fits this app: the person picks one.
class SessionChoosingSchool extends SessionState {
  const SessionChoosingSchool(this.account, this.options);
  final Account account;
  final List<SchoolChoice> options;
}

/// Signed in to a school. [needsNetworkSignIn] is true while the phone could not refresh the token (offline since the app
/// opened): everything stored on the phone stays readable and queued changes stay queued, only new network work waits.
class SessionActive extends SessionState {
  const SessionActive(this.account, this.school, {this.needsNetworkSignIn = false});
  final Account account;
  final SchoolChoice school;
  final bool needsNetworkSignIn;
}

/// Signed in, but the person has no school in this app (a Teacher account in the staff app, or a membership that ended).
class NoAccessInThisApp implements Exception {
  const NoAccessInThisApp();
}

/// Signing out would lose changes not yet sent. The app asks the person first, then calls `signOut(force: true)`.
class SignOutBlocked implements Exception {
  const SignOutBlocked(this.owed);
  final int owed;
}

/// The phone's sign-in, for one app. It owns: the Firebase tokens (the refresh token in secure storage, the short-lived id
/// token in memory only), which school is open, the account as the gateway last described it, and the rules for going offline,
/// being revoked and signing out. ADR-0014 decisions 5 and 6; P4-3.
class DeviceSession {
  DeviceSession({
    required this.identity,
    required this.storage,
    required this.accountSource,
    required this.allowedRoles,
    required this.wipeLocalData,
    this.owedChanges,
    int Function()? nowMs,
    this.refreshMarginMs = 60000,
  }) : _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch);

  final IdentityPort identity;
  final SecureStorage storage;
  final AccountSource accountSource;

  /// The roles this app is for.
  final Set<String> allowedRoles;

  /// Deletes the local database (outbox, records, drafts, cursors). Called on sign-out, on a revoked session, and when the
  /// account or the school changes (local data is per school and per account).
  final Future<void> Function() wipeLocalData;

  /// How many changes the phone still owes the gateway, so sign-out can warn.
  final Future<int> Function()? owedChanges;
  final int Function() _nowMs;

  /// A token is refreshed this long before it runs out.
  final int refreshMarginMs;

  static const _kRefresh = 'refreshToken';
  static const _kUid = 'uid';
  static const _kAccount = 'account';
  static const _kSchool = 'schoolId';
  static const keys = [_kRefresh, _kUid, _kAccount, _kSchool];

  final _changes = StreamController<SessionState>.broadcast(sync: true);
  SessionState _state = const SessionSignedOut();
  AuthTokens? _tokens;
  Future<AuthTokens>? _refreshing;

  SessionState get state => _state;
  Stream<SessionState> get changes => _changes.stream;

  /// The school open now, for `X-School-Id`.
  String? get schoolId => switch (_state) {
        SessionActive(:final school) => school.id,
        _ => null,
      };

  void _set(SessionState s) {
    _state = s;
    _changes.add(s);
  }

  // ---- opening the app --------------------------------------------------------------------------------------------------

  /// Picks the session up where it was left. The screens can show at once from what is stored; then the token is refreshed.
  /// With no connection the session stays (offline survival); with a refusal from Firebase it ends and the data is wiped.
  Future<void> restore() async {
    final refresh = await storage.read(_kRefresh);
    final accountJson = await storage.read(_kAccount);
    final uid = await storage.read(_kUid);
    if (refresh == null || accountJson == null || uid == null) {
      if (refresh != null || accountJson != null || uid != null) await _forgetSecrets();
      _set(const SessionSignedOut());
      return;
    }
    final account = Account.decode(accountJson);
    final schoolId = await storage.read(_kSchool);
    final school = schoolId == null ? null : account.school(schoolId);
    _tokens = AuthTokens(idToken: '', refreshToken: refresh, expiresAtMs: 0, uid: uid);
    if (school == null || !allowedRoles.contains(school.role)) {
      final options = account.schoolsFor(allowedRoles);
      _set(options.isEmpty ? const SessionSignedOut() : SessionChoosingSchool(account, options));
      if (options.isEmpty) await _endSession(wipe: true);
      return;
    }
    _set(SessionActive(account, school, needsNetworkSignIn: true));
    await _refreshAccountQuietly();
  }

  /// Refreshes the token and the account. Safe to call whenever the connection returns.
  Future<void> _refreshAccountQuietly() async {
    try {
      final t = await _freshTokens(force: true);
      final active = _state;
      if (active is! SessionActive) return;
      final account = await accountSource(t.idToken);
      await storage.write(_kAccount, account.encode());
      final school = account.school(active.school.id);
      if (school == null || !allowedRoles.contains(school.role)) {
        // Their membership here ended, or the role changed to one this app is not for.
        final options = account.schoolsFor(allowedRoles);
        if (options.isEmpty) {
          await _endSession(wipe: true);
        } else {
          await wipeLocalData();
          await storage.delete(_kSchool);
          _set(SessionChoosingSchool(account, options));
        }
        return;
      }
      _set(SessionActive(account, school));
    } on AuthFailure {
      // _freshTokens already ended the session if it was revoked; offline keeps it.
    } on OruApiError catch (e) {
      if (e.needsSignIn) await _endSession(wipe: true);
    }
  }

  // ---- signing in -------------------------------------------------------------------------------------------------------

  Future<void> signInWithPassword(String email, String password) async => _afterSignIn(await identity.signInWithPassword(email, password));

  Future<String> sendPhoneCode(String phoneNumber, String appVerificationToken) => identity.sendPhoneCode(phoneNumber, appVerificationToken);

  Future<void> confirmPhoneCode(String sessionInfo, String code) async => _afterSignIn(await identity.confirmPhoneCode(sessionInfo, code));

  Future<void> sendPasswordReset(String email) => identity.sendPasswordReset(email);

  Future<void> _afterSignIn(AuthTokens t) async {
    final Account account;
    try {
      account = await accountSource(t.idToken);
    } catch (_) {
      _tokens = null;
      rethrow; // nothing is stored until we know who this is
    }
    // A different person on this phone: nothing of the last person's stays.
    final previous = await storage.read(_kUid);
    if (previous != null && previous != t.uid) await wipeLocalData();
    final options = account.schoolsFor(allowedRoles);
    if (options.isEmpty) {
      _tokens = null;
      throw const NoAccessInThisApp();
    }
    _tokens = t;
    await storage.write(_kRefresh, t.refreshToken);
    await storage.write(_kUid, t.uid);
    await storage.write(_kAccount, account.encode());
    final lastSchool = await storage.read(_kSchool);
    if (options.length == 1) {
      await _openSchool(account, options.single);
    } else if (lastSchool != null && options.any((s) => s.id == lastSchool)) {
      await _openSchool(account, options.firstWhere((s) => s.id == lastSchool));
    } else {
      await storage.delete(_kSchool);
      _set(SessionChoosingSchool(account, options));
    }
  }

  /// The person picked a school (or switched). Changing school deletes the local data of the other one.
  Future<void> chooseSchool(String id) async {
    final s = _state;
    final Account account;
    final List<SchoolChoice> options;
    if (s is SessionChoosingSchool) {
      account = s.account;
      options = s.options;
    } else if (s is SessionActive) {
      account = s.account;
      options = s.account.schoolsFor(allowedRoles);
    } else {
      throw StateError('Sign in first.');
    }
    final choice = options.where((o) => o.id == id).firstOrNull;
    if (choice == null) throw ArgumentError('That school is not one of this person\'s.');
    await _openSchool(account, choice);
  }

  Future<void> _openSchool(Account account, SchoolChoice school) async {
    final last = await storage.read(_kSchool);
    if (last != null && last != school.id) await wipeLocalData();
    await storage.write(_kSchool, school.id);
    _set(SessionActive(account, school));
  }

  // ---- tokens for the transport ------------------------------------------------------------------------------------------

  /// Give this to `OruHttpTransport(getToken: session.tokenProvider)`. It hands out a valid token, refreshing a little before
  /// it runs out or at once when the transport asks after a 401. With no connection it throws `NETWORK_ERROR` (the queue keeps
  /// the change and tries again); if Firebase refuses the refresh it throws `AUTH_REQUIRED` and the session ends.
  Future<String?> tokenProvider(OruTokenRequest request) async {
    if (_tokens == null) return null;
    try {
      return (await _freshTokens(force: request.forceRefresh)).idToken;
    } on AuthFailure catch (e) {
      throw switch (e.code) {
        AuthFailureCode.sessionRevoked => const OruApiError('AUTH_REQUIRED', 401, 'Please sign in again.'),
        AuthFailureCode.network => const OruApiError('NETWORK_ERROR', 0, 'Could not reach the server.'),
        _ => OruApiError('UNEXPECTED_RESPONSE', 0, 'Sign-in could not be refreshed (${e.code.name}).'),
      };
    }
  }

  Future<AuthTokens> _freshTokens({required bool force}) {
    final t = _tokens;
    if (t == null) throw const AuthFailure(AuthFailureCode.sessionRevoked, 'no session');
    if (!force && t.idToken.isNotEmpty && t.expiresAtMs - _nowMs() > refreshMarginMs) return Future.value(t);
    // Many requests ask at once when the app wakes: one refresh serves them all.
    return _refreshing ??= _refresh(t.refreshToken).whenComplete(() => _refreshing = null);
  }

  Future<AuthTokens> _refresh(String refreshToken) async {
    try {
      final t = await identity.refresh(refreshToken);
      _tokens = t;
      await storage.write(_kRefresh, t.refreshToken);
      final s = _state;
      if (s is SessionActive && s.needsNetworkSignIn) _set(SessionActive(s.account, s.school));
      return t;
    } on AuthFailure catch (e) {
      if (e.code == AuthFailureCode.sessionRevoked) await _endSession(wipe: true);
      rethrow;
    }
  }

  // ---- signing out -------------------------------------------------------------------------------------------------------

  /// Signs out and deletes everything stored for this person. If changes are still owed, throws [SignOutBlocked] unless
  /// [force]: the person is asked first, because those changes are lost with the phone's data.
  Future<void> signOut({bool force = false}) async {
    final owed = await owedChanges?.call() ?? 0;
    if (owed > 0 && !force) throw SignOutBlocked(owed);
    await _endSession(wipe: true);
  }

  Future<void> _endSession({required bool wipe}) async {
    _tokens = null;
    _refreshing = null;
    await _forgetSecrets();
    if (wipe) await wipeLocalData();
    _set(const SessionSignedOut());
  }

  Future<void> _forgetSecrets() async {
    for (final k in keys) {
      await storage.delete(k);
    }
  }

  Future<void> dispose() => _changes.close();
}
