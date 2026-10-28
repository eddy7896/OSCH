import 'dart:async';
import 'dart:math';

import 'local_store.dart';

/// What the gateway said about one queued change. The engine decides nothing from status codes itself: whoever knows the
/// API (see `api_sender.dart`) maps its answer to one of these, following offline-sync rule 5.
sealed class SendResult {
  const SendResult();

  /// The server has it (a first answer, or "I already had it": the same thing for a repeat).
  const factory SendResult.accepted() = SendAccepted;

  /// Not decided: try again later. [offline] is true when nothing reached the server (no network, a timeout).
  const factory SendResult.retry(String code, {String? message, int? retryAfterSeconds, bool offline}) = SendRetry;

  /// Refused for good (a 4xx): shown to the person, never retried.
  const factory SendResult.refused(String code, {String? message}) = SendRefused;

  /// The server does not know who this is (a 401 after a fresh token): nothing can be sent until the person signs in again.
  const factory SendResult.signInNeeded() = SendSignInNeeded;
}

class SendAccepted extends SendResult {
  const SendAccepted();
}

class SendRetry extends SendResult {
  const SendRetry(this.code, {this.message, this.retryAfterSeconds, this.offline = false});
  final String code;
  final String? message;
  final int? retryAfterSeconds;
  final bool offline;
}

class SendRefused extends SendResult {
  const SendRefused(this.code, {this.message});
  final String code;
  final String? message;
}

class SendSignInNeeded extends SendResult {
  const SendSignInNeeded();
}

/// Sends one queued change. [OutboxEntry.id] must reach the server as its idempotency key (rule 1) so that sending twice is safe.
abstract interface class OutboxSender {
  Future<SendResult> send(OutboxEntry entry);
}

/// What the engine is doing, for the sync indicator.
enum EngineActivity {
  /// Nothing to send, or waiting for a retry time.
  idle,

  /// A pass is sending changes.
  sending,

  /// The last attempts did not reach the server; the next try is on a timer or when the connection comes back.
  offline,

  /// The person must sign in again before anything more is sent.
  signedOut,
}

/// How long to wait before the next try: exponential, capped, with jitter so a classroom of phones that came back online
/// together do not all retry in the same second. "Equal jitter": half fixed, half random.
class Backoff {
  const Backoff({this.baseMs = 2000, this.maxMs = 300000});
  final int baseMs;
  final int maxMs;

  /// [attempts] is how many times the change has already been tried (0 for the first retry).
  int delayMs(int attempts, Random random, {int? retryAfterSeconds}) {
    final exp = attempts >= 20 ? maxMs : min(maxMs, baseMs * (1 << attempts));
    final jittered = exp ~/ 2 + random.nextInt(exp ~/ 2 + 1);
    // The server's own "try again in N seconds" is a floor, never shortened by jitter.
    final floor = (retryAfterSeconds ?? 0) * 1000;
    return max(jittered, floor);
  }
}

typedef Cancel = void Function();

/// Runs [fn] after [delay]; returns how to cancel it. Injected so tests control time.
typedef Schedule = Cancel Function(Duration delay, void Function() fn);

Cancel _timerSchedule(Duration delay, void Function() fn) {
  final t = Timer(delay, fn);
  return t.cancel;
}

/// The push side of sync (P4-2b). It takes changes from the outbox oldest first, one at a time (so the order the person made
/// them in is the order the server sees them), parents before children (the store withholds a child until its parent is
/// accepted), and:
///  - accepted: removes it;
///  - refused (4xx): marks it failed for the person to read, and fails what depended on it; the rest carry on;
///  - retry (5xx, rate limit): keeps it, schedules it after a backoff, and carries on with the others (one failing item never blocks the rest);
///  - no network or timeout: the same, but two in a row mean the device is offline and the pass stops until the timer or connectivity;
///  - sign-in needed: stops everything until [signedIn] is called.
/// It never reads the device clock to decide order (rule 4); the clock only times retries.
class SyncEngine {
  SyncEngine({
    required this.store,
    required this.sender,
    this.backoff = const Backoff(),
    Random? random,
    int Function()? nowMs,
    Schedule? schedule,
    this.onlineChanges,
    this.isOnline,
  })  : _random = random ?? Random(),
        _nowMs = nowMs ?? (() => DateTime.now().millisecondsSinceEpoch),
        _schedule = schedule ?? _timerSchedule;

  final OruLocalStore store;
  final OutboxSender sender;
  final Backoff backoff;
  final Random _random;
  final int Function() _nowMs;
  final Schedule _schedule;
  /// The connection coming and going, from the platform (an app wires `connectivity_plus` or similar to it); null in tests that do not need it.
  final Stream<bool>? onlineChanges;

  /// Whether the device is online right now, asked once at [start].
  final Future<bool> Function()? isOnline;

  final _activity = StreamController<EngineActivity>.broadcast(sync: true);
  EngineActivity _current = EngineActivity.idle;
  bool _running = false;
  bool _again = false;
  bool _signedOut = false;
  bool _deviceOffline = false; // from the connectivity signal
  bool _stopped = true;
  StreamSubscription<bool>? _sub;
  Cancel? _cancelWake;

  EngineActivity get activity => _current;
  Stream<EngineActivity> get activityChanges => _activity.stream;

  void _set(EngineActivity a) {
    if (a == _current) return;
    _current = a;
    _activity.add(a);
  }

  /// Starts listening to connectivity and waking on timers. Asks [isOnline] (if given) for the state to begin with, then runs a
  /// pass unless the device is offline.
  Future<void> start() async {
    if (!_stopped) return;
    _stopped = false;
    if (isOnline != null) {
      _deviceOffline = !await isOnline!();
      if (_deviceOffline) _set(EngineActivity.offline);
    }
    _sub = onlineChanges?.listen((online) {
      _deviceOffline = !online;
      if (online) {
        if (_current == EngineActivity.offline) _set(EngineActivity.idle);
        unawaited(pass());
      } else if (_current != EngineActivity.signedOut) {
        _cancelWake?.call();
        _set(EngineActivity.offline);
      }
    });
    await pass();
  }

  void stop() {
    _stopped = true;
    _sub?.cancel();
    _sub = null;
    _cancelWake?.call();
    _cancelWake = null;
  }

  Future<void> dispose() async {
    stop();
    await _activity.close();
  }

  /// A change was just saved: send it if we can.
  Future<void> kick() => pass();

  /// The person signed in again: resume.
  Future<void> signedIn() {
    _signedOut = false;
    if (_current == EngineActivity.signedOut) _set(EngineActivity.idle);
    return pass();
  }

  /// Sends everything that is due now, then arranges to wake when the next retry is due. Calls that arrive while a pass is
  /// running are folded into it (nothing sends twice at once, so the order is exact). Completes when nothing more is due.
  Future<void> pass() async {
    if (_running) {
      _again = true;
      return;
    }
    _running = true;
    try {
      do {
        _again = false;
        await _drain();
      } while (_again && !_signedOut);
    } finally {
      _running = false;
    }
    await _arrangeWake();
  }

  Future<void> _drain() async {
    if (_signedOut || _deviceOffline) return;
    var networkFailures = 0;
    while (!_signedOut) {
      final e = await store.nextDue();
      if (_deviceOffline) return; // the connection went while we were reading the queue
      if (e == null) {
        if (_current == EngineActivity.sending) _set(EngineActivity.idle);
        return;
      }
      _set(EngineActivity.sending);
      await store.markSending(e.id);
      SendResult r;
      try {
        r = await sender.send(e);
      } catch (err) {
        // A sender that throws is a bug in this app, not a verdict by the server: it is surfaced, not retried for ever.
        r = SendResult.refused('UNSENDABLE', message: err.toString());
      }
      switch (r) {
        case SendAccepted():
          networkFailures = 0;
          await store.markDone(e.id);
        case SendRefused(:final code, :final message):
          networkFailures = 0;
          await store.markRefused(e.id, code: code, message: message);
        case SendRetry(:final code, :final message, :final retryAfterSeconds, :final offline):
          await store.markRetry(e.id, code: code, message: message, backoffMs: backoff.delayMs(e.attempts, _random, retryAfterSeconds: retryAfterSeconds));
          if (offline) {
            networkFailures++;
            if (networkFailures >= 2) {
              _set(EngineActivity.offline);
              return;
            }
          } else {
            networkFailures = 0;
          }
        case SendSignInNeeded():
          await store.release(e.id);
          _signedOut = true;
          _set(EngineActivity.signedOut);
          return;
      }
    }
  }

  Future<void> _arrangeWake() async {
    _cancelWake?.call();
    _cancelWake = null;
    if (_stopped || _signedOut || _deviceOffline) return;
    final at = await store.nextRetryAtMs();
    if (at == null) {
      if (_current == EngineActivity.sending) _set(EngineActivity.idle);
      return;
    }
    if (_current == EngineActivity.sending) _set(EngineActivity.idle);
    final wait = max(0, at - _nowMs());
    _cancelWake = _schedule(Duration(milliseconds: wait), () => unawaited(pass()));
  }
}
