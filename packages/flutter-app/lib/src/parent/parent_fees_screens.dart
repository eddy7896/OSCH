import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/flutter_sync.dart';

import '../announcements/announcements_screens.dart' show dateWords;
import '../services.dart';
import '../sync_pill.dart';
import 'parent_fees.dart';

String _firstName(String full) => full.split(' ').first;

/// Money with Indian digit grouping, kept in order inside right-to-left text.
String money(BigInt minor) => '\u2066${OruFormat.formatMoney(minor)}\u2069';

OruTone _toneOf(String status) => switch (status) {
      'PAID' => OruTone.success,
      'OVERDUE' => OruTone.danger,
      'PARTIAL' => OruTone.warning,
      _ => OruTone.neutral,
    };

String _statusWord(OruStrings s, String status) => switch (status) {
      'PAID' => s.mobPfPaid,
      'OVERDUE' => s.mobPfOverdue,
      'PARTIAL' => s.mobPfPartial,
      _ => s.mobPfPending,
    };

/// Keeps one child's fees current from the phone's copy.
class ChildFeesController extends ChangeNotifier {
  ChildFeesController(this.store, this.child) {
    for (final t in const [kChildInvoice, kChildReceipt]) {
      _subs.add(store.watchRecords(t).listen((_) => _refresh()));
    }
    _refresh();
  }

  final OruLocalStore store;
  final Map<String, dynamic> child;
  final _subs = <StreamSubscription<Object?>>[];
  FeesView? view;
  bool _disposed = false;

  Future<void> _refresh() async {
    final id = child['id'] as String;
    final v = buildFees(invoices: await store.records(kChildInvoice, parentId: id), receipts: await store.records(kChildReceipt, parentId: id));
    if (_disposed) return;
    view = v;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final s in _subs) {
      s.cancel();
    }
    super.dispose();
  }
}

/// The child's fees: what is still to pay, each invoice with its status in words, and the receipts. Reads only the phone. Paying is not offered yet, and the screen says so.
class OruChildFeesScreen extends StatefulWidget {
  const OruChildFeesScreen({super.key, required this.services, required this.child});
  final OruServices services;
  final Map<String, dynamic> child;

  @override
  State<OruChildFeesScreen> createState() => _OruChildFeesScreenState();
}

class _OruChildFeesScreenState extends State<OruChildFeesScreen> {
  late final ChildFeesController _c = ChildFeesController(widget.services.store, widget.child);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    final first = _firstName(widget.child['name'] as String);
    return Scaffold(
      appBar: AppBar(title: Text(s.mobPfTitle)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: widget.services.coordinator.syncNow,
          child: ListenableBuilder(
            listenable: _c,
            builder: (context, _) {
              final v = _c.view;
              return ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
                Semantics(header: true, child: Text(s.mobPfOf(first), style: text.titleLarge)),
                const SizedBox(height: OruSpacing.space3),
                OruSyncPill(services: widget.services),
                const SizedBox(height: OruSpacing.space4),
                if (v != null && v.lines.isEmpty)
                  OruEmptyState(title: s.mobPfTitle, description: s.mobPfNone(first), icon: OruIconName.payments)
                else if (v != null) ...[
                  OruCard(
                    title: v.outstanding > BigInt.zero ? s.mobPfOwe : s.mobPfAllPaid,
                    icon: v.outstanding > BigInt.zero ? OruIconName.payments : OruIconName.checkCircle,
                    child: Padding(
                      padding: const EdgeInsets.all(OruSpacing.space3),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if (v.outstanding > BigInt.zero) Text(money(v.outstanding), style: text.headlineSmall),
                        if (v.overdue > BigInt.zero) Padding(padding: const EdgeInsets.only(top: OruSpacing.space1), child: Text(s.mobPfOverdueAmount(money(v.overdue)), style: text.bodyMedium?.copyWith(color: OruColors.dangerFg))),
                        Padding(padding: const EdgeInsets.only(top: OruSpacing.space1), child: Text(s.mobPfPaidSoFar(money(v.paid)), style: text.bodyMedium)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: OruSpacing.space3),
                  OruBanner(title: s.mobPfPayNote, tone: OruTone.info, icon: OruIconName.payments),
                  const SizedBox(height: OruSpacing.space4),
                  for (final l in v.lines)
                    Padding(
                      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
                      child: OruCard(
                        child: OruListRow(
                          title: l.title,
                          subtitle: [s.mobPfDue(dateWords(context, l.dueDate)), s.mobPfOfTotal(money(l.paid), money(l.amount))].join(' · '),
                          leading: const OruIcon(OruIconName.payments, color: OruColors.primaryText),
                          trailing: OruBadge(label: _statusWord(s, l.status), tone: _toneOf(l.status), dot: true),
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OruFeeDetailScreen(line: l))),
                        ),
                      ),
                    ),
                  if (v.receipts.isNotEmpty) ...[
                    const SizedBox(height: OruSpacing.space3),
                    Text(s.mobPfReceipts, style: text.titleMedium),
                    const SizedBox(height: OruSpacing.space2),
                    for (final r in v.receipts) _ReceiptRow(receipt: r),
                  ],
                ],
              ]);
            },
          ),
        ),
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  const _ReceiptRow({required this.receipt});
  final Map<String, dynamic> receipt;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final cancelled = receipt['cancelled'] == true;
    return Padding(
      padding: const EdgeInsets.only(bottom: OruSpacing.space2),
      child: OruCard(
        child: OruListRow(
          title: s.mobPfReceiptNo(receipt['number'] as String),
          subtitle: [(receipt['invoice'] as Map<String, dynamic>)['title'] as String, dateWords(context, receipt['paidOn'] as String), money(BigInt.parse(receipt['amountMinor'] as String))].join(' · '),
          leading: const OruIcon(OruIconName.checkCircle, color: OruColors.primaryText),
          trailing: cancelled ? OruBadge(label: s.mobPfCancelled, tone: OruTone.neutral) : null,
        ),
      ),
    );
  }
}

/// One invoice: the amounts, and the receipts that paid it.
class OruFeeDetailScreen extends StatelessWidget {
  const OruFeeDetailScreen({super.key, required this.line});
  final FeeLine line;

  @override
  Widget build(BuildContext context) {
    final s = OruStrings.of(context);
    final text = Theme.of(context).textTheme;
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: OruSpacing.space1),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Flexible(child: Text(label, style: text.bodyMedium)), Text(value, style: text.titleSmall)]),
        );
    return Scaffold(
      appBar: AppBar(title: Text(s.mobPfDetail)),
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(OruSpacing.space4), children: [
          Semantics(header: true, child: Text(line.title, style: text.titleLarge)),
          const SizedBox(height: OruSpacing.space2),
          OruBadge(label: _statusWord(s, line.status), tone: _toneOf(line.status), dot: true),
          const SizedBox(height: OruSpacing.space3),
          OruCard(
            child: Padding(
              padding: const EdgeInsets.all(OruSpacing.space3),
              child: Column(children: [
                row(s.mobPfDueOn, dateWords(context, line.dueDate)),
                if (line.gross != null && line.discount != null && line.discount! > BigInt.zero) ...[row(s.mobPfFee, money(line.gross!)), row(s.mobPfConcession, money(-line.discount!))],
                row(s.mobPfAmount, money(line.amount)),
                row(s.mobPfPaidLabel, money(line.paid)),
                row(s.mobPfLeft, money(line.outstanding)),
              ]),
            ),
          ),
          const SizedBox(height: OruSpacing.space4),
          Text(s.mobPfReceipts, style: text.titleMedium),
          const SizedBox(height: OruSpacing.space2),
          if (line.receipts.isEmpty) Text(s.mobPfNoReceipts, style: text.bodyMedium) else for (final r in line.receipts) _ReceiptRow(receipt: r),
        ]),
      ),
    );
  }
}
