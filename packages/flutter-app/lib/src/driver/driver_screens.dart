import 'package:flutter/material.dart';
import 'package:flutter_auth/flutter_auth.dart';
import 'package:flutter_auth/flutter_auth_ui.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../checkin/checkin_data.dart' show GeolocatorLocation, LocationPort;
import '../inbox/inbox_data.dart';
import '../inbox/inbox_screen.dart';
import '../services.dart';
import '../sync_pill.dart';
import 'driver_data.dart';

String _isolate(String text) => '\u2066$text\u2069';

String directionLabel(OruStrings s, String d) => d == 'AFTERNOON' ? s.drvDirAFTERNOON : s.drvDirMORNING;

int _studentsOn(Map<String, dynamic>? manifest) => manifest == null ? 0 : (manifest['assigned'] as num?)?.toInt() ?? 0;

/// The pull for the Driver app: the routes with who rides, and the notifications.
List<PullTask> driverAppPullTasks(OruApi api) => [...driverPullTasks(api), ...inboxPullTasks(api)];

/// The Driver app once signed in: Routes, Notifications and More. Big targets throughout (the Driver density, 64 px). Everything reads the phone's copy, so it works with no connection after one sync.
class OruDriverHome extends StatefulWidget {
  const OruDriverHome({super.key, required this.services, required this.state, this.location = const GeolocatorLocation(), this.every = kPingEvery});
  final OruServices services;
  final SessionActive state;
  final LocationPort location;
  final Duration every;

  @override
  State<OruDriverHome> createState() => _OruDriverHomeState();
}

class _OruDriverHomeState extends State<OruDriverHome> {
  String _tab = 'routes';
  late final TripController _trip = TripController(widget.services.store, location: widget.location, every: widget.every);
  late final InboxController _inbox = InboxController(widget.services.store);

  @override
  void initState() {
    super.initState();
    widget.services.startIfActive();
  }

  @override
  void dispose() {
    _trip.dispose();
    _inbox.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final svc = widget.services;
    final pages = <String, Widget>{
      'routes': OruDriverRoutesScreen(services: svc, trip: _trip),
      'inbox': OruInboxScreen(services: svc),
      'more': _MorePage(services: svc, state: widget.state),
    };
    return Scaffold(
      body: IndexedStack(sizing: StackFit.expand, index: pages.keys.toList().indexOf(_tab), children: pages.values.toList()),
      bottomNavigationBar: ListenableBuilder(
        listenable: _inbox,
        builder: (context, _) => OruBottomNav(
          label: s.appDriver,
          active: _tab,
          onChanged: (k) => setState(() => _tab = k),
          items: [
            OruNavItem(key: 'routes', label: s.drvTabRoutes, icon: OruIconName.bus),
            OruNavItem(key: 'inbox', label: s.mobMoreInbox, icon: OruIconName.bell, badge: _inbox.unread, badgeLabel: _inbox.unread > 0 ? s.mobInboxUnread('${_inbox.unread}') : null),
            OruNavItem(key: 'more', label: s.mobTabMore, icon: OruIconName.more),
          ],
        ),
      ),
    );
  }
}

class _MorePage extends StatelessWidget {
  const _MorePage({required this.services, required this.state});
  final OruServices services;
  final SessionActive state;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            OruAccountPanel(session: services.session, state: state, lock: services.lock, syncStatus: OruSyncPill(services: services)),
          ]),
        ),
      );
}

/// The routes the driver drives, and the trip in progress if there is one.
class OruDriverRoutesScreen extends StatelessWidget {
  const OruDriverRoutesScreen({super.key, required this.services, required this.trip});
  final OruServices services;
  final TripController trip;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: services.coordinator.syncNow,
          child: StreamBuilder<List<Map<String, dynamic>>>(
            stream: services.store.watchRecords(kDriverRoute),
            builder: (context, routes) => StreamBuilder<List<Map<String, dynamic>>>(
              stream: services.store.watchRecords(kDriverManifest),
              builder: (context, mans) => ListenableBuilder(
                listenable: trip,
                builder: (context, _) {
                  final rows = [...?routes.data]..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
                  final manifests = {for (final m in mans.data ?? const <Map<String, dynamic>>[]) (m['route'] as Map<String, dynamic>)['id'] as String: m};
                  return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                    Semantics(header: true, child: Text(s.drvTitle, style: text.headlineSmall)),
                    const SizedBox(height: OruSpacing.space3),
                    OruSyncPill(services: services),
                    const SizedBox(height: OruSpacing.space4),
                    if (trip.running) ...[
                      OruBanner(
                        title: s.drvRunningOn(_isolate(trip.current!['routeName'] as String)),
                        tone: OruTone.success,
                        icon: OruIconName.bus,
                        action: OruButton(label: s.drvOpenTrip, density: OruDensity.driver, onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruTripScreen(services: services, trip: trip, route: rows.firstWhere((r) => r['id'] == trip.current!['routeId'], orElse: () => {'id': trip.current!['routeId'], 'name': trip.current!['routeName'], 'direction': trip.current!['direction'], 'stops': const []}), manifest: manifests[trip.current!['routeId']])))),
                      ),
                      const SizedBox(height: OruSpacing.space4),
                    ],
                    if (routes.hasData && rows.isEmpty) OruEmptyState(title: s.drvTitle, description: s.drvEmpty, icon: OruIconName.bus),
                    for (final r in rows)
                      Padding(
                        padding: const EdgeInsets.only(bottom: OruSpacing.space3),
                        child: OruCard(
                          child: OruListRow(
                            title: r['name'] as String,
                            subtitle: '${directionLabel(s, r['direction'] as String)} · ${s.drvRouteMeta('${((r['stops'] as List?) ?? const []).length}', '${_studentsOn(manifests[r['id']])}')}',
                            leading: const OruIcon(OruIconName.bus, color: OruColors.primaryText),
                            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruDriverRouteScreen(services: services, trip: trip, route: r, manifest: manifests[r['id']]))),
                          ),
                        ),
                      ),
                  ]);
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Stops extends StatelessWidget {
  const _Stops({required this.manifest});
  final Map<String, dynamic>? manifest;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final stops = ((manifest?['stops'] as List?) ?? const []).cast<Map<String, dynamic>>();
    if (stops.isEmpty) return Text(s.drvNoStudents, style: text.bodyLarge);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final st in stops)
        Padding(
          padding: const EdgeInsets.only(bottom: OruSpacing.space3),
          child: OruCard(
            title: _isolate(st['name'] as String),
            subtitle: [if (st['arrivalTime'] != null) _isolate(st['arrivalTime'] as String), s.drvStudentCount(((st['students'] as List?) ?? const []).length)].join(' · '),
            icon: OruIconName.mapPin,
            child: Padding(
              padding: const EdgeInsets.all(OruSpacing.space3),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final p in ((st['students'] as List?) ?? const []).cast<Map<String, dynamic>>())
                  Padding(padding: const EdgeInsets.only(bottom: OruSpacing.space1), child: Text(_isolate(p['name'] as String), style: text.bodyLarge)),
              ]),
            ),
          ),
        ),
    ]);
  }
}

/// One route: its stops with who rides, and the big Start trip button.
class OruDriverRouteScreen extends StatelessWidget {
  const OruDriverRouteScreen({super.key, required this.services, required this.trip, required this.route, required this.manifest});
  final OruServices services;
  final TripController trip;
  final Map<String, dynamic> route;
  final Map<String, dynamic>? manifest;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(route['name'] as String)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: trip,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            Text(directionLabel(s, route['direction'] as String), style: text.titleMedium),
            const SizedBox(height: OruSpacing.space3),
            if (!trip.running)
              OruButton(
                label: s.drvStart,
                variant: OruButtonVariant.primary,
                density: OruDensity.driver,
                block: true,
                icon: OruIconName.bus,
                onPressed: () async {
                  await trip.start(route);
                  if (context.mounted) {
                    await Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => OruTripScreen(services: services, trip: trip, route: route, manifest: manifest)));
                  }
                },
              )
            else
              OruButton(label: s.drvOpenTrip, density: OruDensity.driver, block: true, onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => OruTripScreen(services: services, trip: trip, route: route, manifest: manifest)))),
            const SizedBox(height: OruSpacing.space4),
            Semantics(header: true, child: Text(s.drvStopsTitle, style: text.titleMedium)),
            const SizedBox(height: OruSpacing.space2),
            _Stops(manifest: manifest),
          ]),
        ),
      ),
    );
  }
}

/// The trip in progress: that the bus is being shared, whether anything is waiting to be sent, the stops, and the big End trip button.
class OruTripScreen extends StatelessWidget {
  const OruTripScreen({super.key, required this.services, required this.trip, required this.route, required this.manifest});
  final OruServices services;
  final TripController trip;
  final Map<String, dynamic> route;
  final Map<String, dynamic>? manifest;

  Future<void> _end(BuildContext context, OruStrings s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.drvEnd),
        content: Text(s.drvEndAsk),
        actions: [
          OruButton(label: s.drvKeep, density: OruDensity.driver, onPressed: () => Navigator.pop(ctx, false)),
          OruButton(label: s.drvEnd, variant: OruButtonVariant.danger, density: OruDensity.driver, onPressed: () => Navigator.pop(ctx, true)),
        ],
      ),
    );
    if (ok != true) return;
    await trip.end();
    if (context.mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(route['name'] as String)),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: trip,
          builder: (context, _) => ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
            OruBanner(title: s.drvRunning, message: s.drvSharing, tone: OruTone.success, icon: OruIconName.bus),
            if (trip.locationOff) ...[const SizedBox(height: OruSpacing.space3), OruBanner(title: s.drvLocationOff, tone: OruTone.warning, icon: OruIconName.alert)],
            if (trip.refusedReason != null) ...[const SizedBox(height: OruSpacing.space3), OruBanner(title: s.drvStartRefused(trip.refusedReason!), tone: OruTone.danger, icon: OruIconName.alert)],
            const SizedBox(height: OruSpacing.space3),
            OruSyncPill(services: services),
            const SizedBox(height: OruSpacing.space1),
            Text(trip.waiting > 0 ? s.drvWaiting(trip.waiting) : s.drvAllSent, style: text.bodyMedium?.copyWith(color: OruColors.textMuted)),
            const SizedBox(height: OruSpacing.space4),
            OruButton(label: s.drvEnd, variant: OruButtonVariant.danger, density: OruDensity.driver, block: true, onPressed: trip.running ? () => _end(context, s) : null),
            const SizedBox(height: OruSpacing.space4),
            Semantics(header: true, child: Text(s.drvStopsTitle, style: text.titleMedium)),
            const SizedBox(height: OruSpacing.space2),
            _Stops(manifest: manifest),
          ]),
        ),
      ),
    );
  }
}
