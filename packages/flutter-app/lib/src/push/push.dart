import 'dart:async';

import 'package:flutter_core/flutter_core.dart';

/// What the phone's push service gives the app. A port, so the registration and the "open the inbox from a push" rules are tested without a
/// phone. The real one (Firebase Cloud Messaging on Android, APNs through it on iOS) needs a Firebase project and a phone (ADR-0014
/// decision 12) and is not part of this package yet: until it is, [NoPush] is used and the inbox is pulled instead.
abstract class PushPort {
  /// This phone's push address, or null when it has none (no permission, no service, a simulator).
  Future<String?> token();

  /// The address changed (the service rotates it now and then).
  Stream<String> get tokenChanges;

  /// A push arrived while the app was open.
  Stream<void> get received;

  /// The person opened the app by tapping a push.
  Stream<void> get opened;

  /// `IOS` or `ANDROID`: what the gateway wants beside the token.
  String get platform;
}

/// No push service on this phone: nothing is registered and nothing arrives. The inbox still fills from the pull.
class NoPush implements PushPort {
  const NoPush();
  @override
  Future<String?> token() async => null;
  @override
  Stream<String> get tokenChanges => const Stream.empty();
  @override
  Stream<void> get received => const Stream.empty();
  @override
  Stream<void> get opened => const Stream.empty();
  @override
  String get platform => 'ANDROID';
}

/// Keeps this phone's push address on the signed-in account: registers after sign-in and whenever the address changes, and removes it
/// at sign-out so the next person on this phone does not get the last person's notices. Never throws: a push address is a convenience and
/// the inbox is the truth (a lost push is covered by the pull).
class PushRegistrar {
  PushRegistrar(this.api, this.port);
  final OruApi api;
  final PushPort port;
  StreamSubscription<String>? _changes;
  String? _registered;

  Future<void> start() async {
    await stop(remove: false);
    _changes = port.tokenChanges.listen((t) => unawaited(_register(t)));
    final t = await port.token();
    if (t != null) await _register(t);
  }

  Future<void> _register(String token) async {
    if (token == _registered) return;
    try {
      await api.devicesRegister(body: RegisterDeviceDto(token: token, platform: port.platform));
      _registered = token;
    } catch (_) {
      // Offline or refused: tried again at the next start.
    }
  }

  /// [remove] false only when the person stays signed in (restarting).
  Future<void> stop({bool remove = true}) async {
    await _changes?.cancel();
    _changes = null;
    final t = _registered;
    _registered = null;
    if (remove && t != null) {
      try {
        await api.devicesRemove(body: RemoveDeviceDto(token: t));
      } catch (_) {}
    }
  }
}
