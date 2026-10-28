import 'dart:async';

import 'storage.dart';

/// The phone's own check that the person holding it is the owner: a fingerprint, a face or the screen lock. The apps fill this
/// with the platform's local authentication; it never replaces the Firebase sign-in (ADR-0014 decision 6).
abstract interface class DeviceLockPort {
  Future<bool> isAvailable();

  /// Asks the phone to check the person. True only if they passed; cancelling or failing is false.
  Future<bool> authenticate();
}

/// Optional re-entry after the app has been in the background. Off by default. Locking hides the screens; it never signs out,
/// never wipes data, and sending queued changes carries on while locked.
class AppLock {
  AppLock({required this.port, required this.storage, this.graceMs = 60000, int Function()? nowMs})
      : _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch);

  final DeviceLockPort port;
  final SecureStorage storage;

  /// How long the app may be in the background before it asks again.
  final int graceMs;
  final int Function() _nowMs;

  static const _kEnabled = 'appLockEnabled';

  final _changes = StreamController<bool>.broadcast(sync: true);
  bool _enabled = false;
  bool _locked = false;
  int? _backgroundedAtMs;

  bool get enabled => _enabled;
  bool get locked => _locked;
  Stream<bool> get lockedChanges => _changes.stream;

  /// Reads the saved choice. An app that was closed with the lock on starts locked.
  Future<void> restore() async {
    _enabled = await storage.read(_kEnabled) == 'true';
    if (_enabled && !await port.isAvailable()) {
      // The person removed their screen lock from the phone: the lock cannot work, and must not lock them out of their own work.
      await _turnOff();
    }
    _setLocked(_enabled);
  }

  /// Turns the lock on, but only after the person passes the phone's check once, so it cannot be switched on by someone who
  /// could not open it. False if the phone has no lock or the check failed.
  Future<bool> enable() async {
    if (!await port.isAvailable()) return false;
    if (!await port.authenticate()) return false;
    _enabled = true;
    await storage.write(_kEnabled, 'true');
    return true;
  }

  Future<void> disable() => _turnOff().then((_) => _setLocked(false));

  Future<void> _turnOff() async {
    _enabled = false;
    await storage.delete(_kEnabled);
  }

  void onBackgrounded() => _backgroundedAtMs = _nowMs();

  /// The app came back to the front: lock if it was away longer than the grace period. The clock is the phone's; a changed
  /// clock can only make the lock come sooner or later, never open it.
  void onResumed() {
    final at = _backgroundedAtMs;
    _backgroundedAtMs = null;
    if (!_enabled || _locked || at == null) return;
    final away = _nowMs() - at;
    if (away >= graceMs || away < 0) _setLocked(true);
  }

  /// Asks the phone to check the person; unlocks if they pass.
  Future<bool> unlock() async {
    if (!_locked) return true;
    if (!await port.authenticate()) return false;
    _setLocked(false);
    return true;
  }

  void _setLocked(bool v) {
    if (_locked == v) return;
    _locked = v;
    _changes.add(v);
  }

  Future<void> dispose() => _changes.close();
}
