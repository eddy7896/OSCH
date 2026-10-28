import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'services.dart';

/// How sync is doing, in the six fixed wordings: a small pill when all is well, a banner with Retry when it is not (design system SyncStatus).
class OruSyncPill extends StatelessWidget {
  const OruSyncPill({super.key, required this.services});
  final OruServices services;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    return StreamBuilder<SyncSnapshot>(
      stream: services.coordinator.watch(),
      builder: (context, snap) {
        final shot = snap.data;
        final state = shot == null ? OruSyncState.synced : oruSyncStateOf(shot.state);
        final troubled = shot != null && shot.state != SyncState.synced && shot.state != SyncState.saved;
        return Align(
          alignment: AlignmentDirectional.centerStart,
          child: OruSyncStatus(
            state: state,
            pendingCount: shot?.owed ?? 0,
            banner: troubled,
            actionLabel: state == OruSyncState.failed ? s.actionRetry : null,
            onAction: state == OruSyncState.failed ? () => services.coordinator.syncNow() : null,
          ),
        );
      },
    );
  }
}
