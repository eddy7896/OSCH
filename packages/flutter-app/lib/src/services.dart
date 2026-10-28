import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart' show QueryExecutor;
import 'package:flutter/foundation.dart' show ValueNotifier;
import 'package:drift_flutter/drift_flutter.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart' show oruRoleName;
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';
import 'package:http/http.dart' as http;

import 'config.dart';
import 'platform.dart';

/// Everything an app needs, made once and wired together: sign-in, the local database, the queue, the engine that sends it, the
/// coordinator that pulls, the optional lock. The sync engine runs while a school is open and stops when the person signs out.
class OruServices {
  OruServices._({
    required this.config,
    required this.session,
    required this.db,
    required this.store,
    required this.engine,
    required this.coordinator,
    required this.lock,
    required this.api,
    required this.lockReason,
  });

  final OruAppConfig config;
  final DeviceSession session;
  final OruLocalDatabase db;
  final OruLocalStore store;
  final SyncEngine engine;
  final SyncCoordinator coordinator;
  final AppLock lock;
  final OruApi api;

  /// Set by the app's first build, so the phone's prompt is in the person's language.
  final ValueNotifier<String> lockReason;

  StreamSubscription<SessionState>? _watch;

  /// [executor], [storage], [lockPort] and [online] are for tests; the app passes none and gets the real phone.
  static Future<OruServices> create(
    OruAppConfig config, {
    required Set<String> allowedRoles,
    QueryExecutor? executor,
    SecureStorage? storage,
    DeviceLockPort? lockPort,
    Stream<bool>? online,
    Future<bool> Function()? isOnline,
    IdentityPort? identity,
    AccountSource? accountSource,
    http.Client? httpClient,
  }) async {
    final secure = storage ?? PlatformSecureStorage();
    final db = OruLocalDatabase(executor ?? driftDatabase(name: 'oruschools'));
    final store = OruLocalStore(db);
    final base = Uri.parse(config.gatewayUrl);
    final reason = ValueNotifier<String>('');
    final session = DeviceSession(
      identity: identity ?? (config.authEmulator != null ? FirebaseRestIdentity.emulator(config.authEmulator!) : FirebaseRestIdentity(apiKey: config.firebaseApiKey)),
      storage: secure,
      allowedRoles: allowedRoles,
      accountSource: accountSource ?? gatewayAccountSource(base),
      wipeLocalData: store.wipe,
      owedChanges: () async => (await store.counts()).pending,
    );
    final transport = OruHttpTransport(baseUrl: base, getToken: session.tokenProvider, getSchoolId: () => session.schoolId, client: httpClient);
    final api = OruApi(transport);
    final connectivity = Connectivity();
    final engine = SyncEngine(
      store: store,
      sender: OruApiSender(api),
      onlineChanges: online ?? connectivity.onConnectivityChanged.map((r) => !r.contains(ConnectivityResult.none)),
      isOnline: isOnline ?? () async => !(await connectivity.checkConnectivity()).contains(ConnectivityResult.none),
    );
    final coordinator = SyncCoordinator(store: store, engine: engine, tombstones: OruApiTombstones(api));
    final lock = AppLock(port: lockPort ?? PlatformDeviceLock(reason: () => reason.value), storage: secure);
    final s = OruServices._(config: config, session: session, db: db, store: store, engine: engine, coordinator: coordinator, lock: lock, api: api, lockReason: reason);
    s._watch = session.changes.listen(s._onSession);
    return s;
  }

  /// The engine works while a school is open. Signing in again after the token ran out resumes it.
  void _onSession(SessionState st) {
    if (st is SessionActive) {
      unawaited(engine.start().then((_) => engine.signedIn()).then((_) => coordinator.syncNow()).catchError((Object _) {}));
    } else {
      engine.stop();
    }
  }

  /// Call once the session was restored with a school already open (the stream only reports changes).
  void startIfActive() {
    final st = session.state;
    if (st is SessionActive) _onSession(st);
  }

  Future<void> dispose() async {
    await _watch?.cancel();
    engine.stop();
    await engine.dispose();
    await db.close();
  }
}

/// The sync state a screen shows, from the coordinator's snapshot, mapped to the widget's states.
OruSyncState oruSyncStateOf(SyncState s) => switch (s) {
      SyncState.synced => OruSyncState.synced,
      SyncState.saved => OruSyncState.saved,
      SyncState.pending => OruSyncState.pending,
      SyncState.syncing => OruSyncState.syncing,
      SyncState.offline => OruSyncState.offline,
      SyncState.failed => OruSyncState.failed,
    };

/// For the home screen's subtitle, kept here so both apps name roles the same way.
String oruRoleLabel(OruStrings s, String role) => oruRoleName(s, role);
