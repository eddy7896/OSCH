import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_sync/api_sender.dart';
import 'package:flutter_sync/flutter_sync.dart';

import 'parent_data.dart' show kChild;

/// A child's invoices and receipts, kept per child (the parent id is the child's id).
const kChildInvoice = 'ChildInvoice';
const kChildReceipt = 'ChildReceipt';

Future<T> _guard<T>(Future<T> Function() f) async {
  try {
    return await f();
  } on OruApiError catch (e) {
    throw failureOf(e);
  }
}

/// After the children are pulled: each child's invoices and receipts (the school serves a parent only their own children's, and paying is not offered to a parent yet).
List<PullTask> parentFeesPullTasks(OruApi api) => [
      PullTask(kChildInvoice, (store) async {
        for (final k in await store.records(kChild)) {
          final id = k['id'] as String;
          final r = await _guard(() => api.invoicesList(studentId: id, pageSize: 100));
          await store.replaceRecords(kChildInvoice, parentId: id, records: [for (final i in r.items) (id: i.id, json: i.toJson())]);
        }
      }),
      PullTask(kChildReceipt, (store) async {
        for (final k in await store.records(kChild)) {
          final id = k['id'] as String;
          final r = await _guard(() => api.receiptsList(studentId: id, pageSize: 100));
          await store.replaceRecords(kChildReceipt, parentId: id, records: [for (final x in r.items) (id: x.id, json: x.toJson())]);
        }
      }),
    ];

/// One invoice with the receipts that paid it.
class FeeLine {
  const FeeLine({required this.id, required this.title, required this.dueDate, required this.amount, required this.paid, required this.outstanding, required this.status, required this.gross, required this.discount, required this.receipts});
  final String id;
  final String title;
  final String dueDate;
  final BigInt amount;
  final BigInt paid;
  final BigInt outstanding;

  /// PAID, OVERDUE, PARTIAL or PENDING, as the school computes it.
  final String status;
  final BigInt? gross;
  final BigInt? discount;
  final List<Map<String, dynamic>> receipts;

  bool get isOpen => outstanding > BigInt.zero;
}

class FeesView {
  const FeesView({required this.lines, required this.outstanding, required this.overdue, required this.paid, required this.receipts});
  final List<FeeLine> lines;

  /// Still to pay over every invoice.
  final BigInt outstanding;

  /// The part of that which is past its due date.
  final BigInt overdue;
  final BigInt paid;

  /// All receipts, newest first (cancelled ones included, marked).
  final List<Map<String, dynamic>> receipts;
}

BigInt _big(Object? v) => v == null ? BigInt.zero : BigInt.parse('$v');

/// Pure: money owed first (overdue before the rest, soonest due first), then the paid ones, newest due date first. Amounts are exact (bigint minor units).
FeesView buildFees({required List<Map<String, dynamic>> invoices, required List<Map<String, dynamic>> receipts}) {
  final byInvoice = <String, List<Map<String, dynamic>>>{};
  for (final r in receipts) {
    byInvoice.putIfAbsent((r['invoice'] as Map<String, dynamic>)['id'] as String, () => []).add(r);
  }
  final lines = [
    for (final i in invoices)
      FeeLine(
        id: i['id'] as String,
        title: i['title'] as String,
        dueDate: i['dueDate'] as String,
        amount: _big(i['amountMinor']),
        paid: _big(i['paidMinor']),
        outstanding: _big(i['outstandingMinor']),
        status: i['status'] as String,
        gross: i['grossMinor'] == null ? null : _big(i['grossMinor']),
        discount: i['discountMinor'] == null ? null : _big(i['discountMinor']),
        receipts: [...?byInvoice[i['id']]]..sort((a, b) => (b['issuedAt'] as String).compareTo(a['issuedAt'] as String)),
      ),
  ];
  lines.sort((a, b) {
    final open = (b.isOpen ? 1 : 0).compareTo(a.isOpen ? 1 : 0);
    if (open != 0) return open;
    return a.isOpen ? a.dueDate.compareTo(b.dueDate) : b.dueDate.compareTo(a.dueDate);
  });
  final sorted = [...receipts]..sort((a, b) => (b['issuedAt'] as String).compareTo(a['issuedAt'] as String));
  return FeesView(
    lines: lines,
    outstanding: lines.fold(BigInt.zero, (s, l) => s + l.outstanding),
    overdue: lines.where((l) => l.status == 'OVERDUE').fold(BigInt.zero, (s, l) => s + l.outstanding),
    paid: lines.fold(BigInt.zero, (s, l) => s + l.paid),
    receipts: sorted,
  );
}
