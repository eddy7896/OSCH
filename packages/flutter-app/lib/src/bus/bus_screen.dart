import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../services.dart';
import '../sync_pill.dart';
import 'bus_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

/// "Where is the bus?" for one child: the bus that carries them while it runs, how long until it reaches their stop, and the stops it has passed. Reads the phone's copy, asks the school again
/// every 30 seconds while open, and says plainly when the news is old or the bus has gone quiet. Only a bus in progress on a route this child rides is ever shown.
class OruBusScreen extends StatefulWidget {
  const OruBusScreen({super.key, required this.services, required this.child, this.every = const Duration(seconds: 30), this.now});
  final OruServices services;
  final Map<String, dynamic> child;
  final Duration every;
  final DateTime Function()? now;

  @override
  State<OruBusScreen> createState() => _OruBusScreenState();
}

class _OruBusScreenState extends State<OruBusScreen> {
  Timer? _timer;
  bool _refreshing = false;
  bool _disposed = false;

  DateTime _now() => (widget.now ?? DateTime.now)();

  Future<void> _refresh() async {
    if (_refreshing || _disposed) return;
    _refreshing = true;
    try {
      await refreshBus(widget.services, now: widget.now);
    } catch (_) {
      // no connection: the phone's copy stays, and the screen says how old it is
    } finally {
      _refreshing = false;
    }
  }

  @override
  void initState() {
    super.initState();
    unawaited(_refresh());
    _timer = Timer.periodic(widget.every, (_) => unawaited(_refresh()));
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }

  String _time(DateTime t) => DateFormat.jm(Localizations.localeOf(context).toString()).format(t);

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final first = (widget.child['name'] as String).split(' ').first;
    return Scaffold(
      appBar: AppBar(title: Text(s.mobBusRow)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: widget.services.store.watchRecords(kParentTrip),
            builder: (context, snap) {
              final views = buildBusViews([...?snap.data], widget.child['id'] as String? ?? '', _now());
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (snap.hasData && views.isEmpty) OruEmptyState(title: s.mobBusRow, description: s.mobBusNone, icon: OruIconName.bus),
                for (final v in views) ..._bus(context, s, text, v, first),
              ]);
            },
          ),
        ),
      ),
    );
  }

  List<Widget> _bus(BuildContext context, OruStrings s, TextTheme text, BusView v, String first) {
    final route = v.trip['route'] as Map<String, dynamic>;
    final stopName = v.childStop?['name'] as String?;
    final String when = v.etaMinutes != null ? s.mobBusEta(v.etaMinutes!) : s.mobBusNoEstimate;
    return [
      Semantics(header: true, child: Text(_isolate(route['name'] as String), style: text.titleLarge)),
      Text(s.mobBusWho(_isolate(route['name'] as String), v.trip['driver'] as String), style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
      const SizedBox(height: OruSpacing.space3),
      if (v.copyFrom != null) ...[OruBanner(title: s.mobBusOldCopy(_time(v.copyFrom!)), tone: OruTone.warning, icon: OruIconName.cloudOff), const SizedBox(height: OruSpacing.space3)],
      if (v.noPosition)
        OruBanner(title: s.mobBusNoPosition, tone: OruTone.info, icon: OruIconName.bus)
      else if (v.quiet)
        OruBanner(title: s.mobBusStale, tone: OruTone.warning, icon: OruIconName.alert)
      else if (v.lastAt != null)
        Text(s.mobBusLastSeen(_time(v.lastAt!)), style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
      const SizedBox(height: OruSpacing.space3),
      if (stopName != null)
        OruCard(
          child: Padding(
            padding: const EdgeInsets.all(OruSpacing.space4),
            child: Text(v.passed ? s.mobBusPassed(first, _isolate(stopName)) : s.mobBusComing(first, _isolate(stopName), when), style: text.titleMedium),
          ),
        ),
      const SizedBox(height: OruSpacing.space4),
      Semantics(header: true, child: Text(s.mobBusStopsTitle, style: text.titleMedium)),
      const SizedBox(height: OruSpacing.space2),
      for (final st in v.stops)
        Padding(
          padding: const EdgeInsets.only(bottom: OruSpacing.space2),
          child: OruCard(
            child: OruListRow(
              title: _isolate(st['name'] as String),
              subtitle: [
                if (st['plannedTime'] != null) _isolate(st['plannedTime'] as String),
                if (st['reached'] == true) s.mobBusReached else if (st['etaMinutes'] != null) s.mobBusEta((st['etaMinutes'] as num).toInt()),
                if (st['id'] == v.child['stopId']) s.mobBusBoardsHere(first),
              ].join(' · '),
              leading: OruIcon(st['reached'] == true ? OruIconName.checkCircle : OruIconName.mapPin, color: OruColors.primaryText),
            ),
          ),
        ),
      const SizedBox(height: OruSpacing.space2),
      Text(s.mobBusRough, style: text.bodySmall?.copyWith(color: OruColors.textMuted)),
      const SizedBox(height: OruSpacing.space6),
    ];
  }
}
