import 'local_store.dart';
import 'sync_engine.dart';

/// The six things a person can be told about their work (design system SyncStatus). The apps map each to the widget's
/// `OruSyncState` of the same name; the wording is the widget's, from the language catalogue.
enum SyncState { synced, saved, pending, syncing, offline, failed }

/// How the last pull (fresh data from the gateway) went.
sealed class PullStatus {
  const PullStatus();

  /// No pull has been attempted yet in this run of the app.
  const factory PullStatus.never() = PullNever;

  /// The last pull completed; [atMs] is the device clock, used only to say "2 minutes ago".
  const factory PullStatus.ok(int atMs) = PullOk;

  /// Nothing reached the server.
  const factory PullStatus.offline() = PullOffline;

  /// The server answered with an error the person cannot fix by waiting.
  const factory PullStatus.failed(String code) = PullFailed;
}

class PullNever extends PullStatus {
  const PullNever();
}

class PullOk extends PullStatus {
  const PullOk(this.atMs);
  final int atMs;
}

class PullOffline extends PullStatus {
  const PullOffline();
}

class PullFailed extends PullStatus {
  const PullFailed(this.code);
  final String code;
}

/// What a screen shows: the one state, how many changes are owed, and when we last heard from the server.
class SyncSnapshot {
  const SyncSnapshot({required this.state, required this.owed, required this.failed, required this.lastSyncedAtMs});
  final SyncState state;

  /// Changes not yet safe on the server (the "N changes pending" number).
  final int owed;

  /// Changes the server refused, waiting for the person to read them.
  final int failed;
  final int? lastSyncedAtMs;

  @override
  bool operator ==(Object other) => other is SyncSnapshot && other.state == state && other.owed == owed && other.failed == failed && other.lastSyncedAtMs == lastSyncedAtMs;

  @override
  int get hashCode => Object.hash(state, owed, failed, lastSyncedAtMs);

  @override
  String toString() => 'SyncSnapshot($state, owed: $owed, failed: $failed)';
}

/// The one rule that turns the queue, the engine and the last pull into the state shown. In order:
///  1. a refused change, or a sign-in that has run out, or a pull the server answered with an error: **failed** (the person must act);
///  2. a change is going to the server right now: **syncing**;
///  3. the engine or the last pull could not reach the server: **offline**;
///  4. changes are owed: **pending** if any has been tried and is waiting for its next attempt, otherwise **saved** (on the device,
///     not yet tried);
///  5. otherwise **synced**.
/// Because it is a function of those inputs only, the state shown can never disagree with the queue: **synced** is possible only
/// when nothing is owed and nothing failed.
SyncState deriveSyncState({required OutboxCounts counts, required EngineActivity activity, required PullStatus pull}) {
  if (counts.failed > 0 || activity == EngineActivity.signedOut || pull is PullFailed) return SyncState.failed;
  if (counts.sending > 0 || activity == EngineActivity.sending) return SyncState.syncing;
  if (activity == EngineActivity.offline || pull is PullOffline) return SyncState.offline;
  if (counts.pending > 0) return counts.retrying > 0 ? SyncState.pending : SyncState.saved;
  return SyncState.synced;
}
