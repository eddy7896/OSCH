import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:flutter_app/flutter_app.dart';
import 'package:flutter_sync/flutter_sync.dart' show PulledRecord;
import 'package:flutter_test/flutter_test.dart';

import 'marks_screen_test.dart' show services, pumpFor, host, phone;

const kid = {'id': 'k1', 'name': 'Asha Rao', 'enrollmentId': 'S-1', 'relationship': 'MOTHER', 'class': {'id': 'c5', 'name': '5 B'}};
PulledRecord rec(String id, Map<String, dynamic> json) => (id: id, parentId: null, json: json);

Map<String, dynamic> inv(String id, String title, String due, String amount, String paid, String status, {String? gross, String? discount}) => {
      'id': id, 'title': title, 'dueDate': due, 'amountMinor': amount, 'paidMinor': paid, 'outstandingMinor': '${BigInt.parse(amount) - BigInt.parse(paid)}', 'status': status, 'grossMinor': gross, 'discountMinor': discount,
      'student': {'id': 'k1', 'enrollmentId': 'S-1', 'name': 'Asha Rao'}, 'academicYear': null,
    };
Map<String, dynamic> rc(String id, String number, String invoice, String title, String amount, {bool cancelled = false, String at = '2026-10-20T10:00:00Z'}) =>
    {'id': id, 'number': number, 'paidOn': '2026-10-20', 'issuedAt': at, 'cancelled': cancelled, 'amountMinor': amount, 'student': {'id': 'k1', 'enrollmentId': 'S-1', 'name': 'Asha Rao'}, 'invoice': {'id': invoice, 'title': title}};

final invoices = [
  inv('a', 'Tuition Term 2', '2027-01-10', '1250000', '500000', 'PARTIAL', gross: '1500000', discount: '250000'),
  inv('b', 'Bus fee', '2026-09-01', '300000', '0', 'OVERDUE'),
  inv('c', 'Annual charges', '2026-04-10', '200000', '200000', 'PAID'),
];
final receipts = [rc('r1', 'R-2026-27-00001', 'a', 'Tuition Term 2', '500000'), rc('r2', 'R-2026-27-00002', 'c', 'Annual charges', '200000', at: '2026-04-12T10:00:00Z')];

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('what is owed comes first (overdue before the rest, soonest due first), then the paid ones; the totals are exact', () {
    final v = buildFees(invoices: invoices, receipts: receipts);
    expect(v.lines.map((l) => l.id), ['b', 'a', 'c']);
    expect(v.outstanding, BigInt.from(1050000));
    expect(v.overdue, BigInt.from(300000));
    expect(v.paid, BigInt.from(700000));
    expect(v.lines.first.isOpen, isTrue);
    expect(v.lines.last.isOpen, isFalse);
    expect(v.lines[1].receipts.map((r) => r['id']), ['r1'], reason: 'each invoice carries only its own receipts');
    expect(v.receipts.map((r) => r['id']), ['r1', 'r2'], reason: 'newest first');
    expect(buildFees(invoices: const [], receipts: const []).outstanding, BigInt.zero);
  });

  testWidgets('the fees screen reads from the phone: what is still to pay, each fee with a word for its status, receipts, and a plain note that paying is not here yet', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await svc.store.replaceRecords(kChildInvoice, parentId: 'k1', records: [for (final i in invoices) (id: i['id'] as String, json: i)]);
      await svc.store.replaceRecords(kChildReceipt, parentId: 'k1', records: [for (final r in receipts) (id: r['id'] as String, json: r)]);
      await tester.pumpWidget(host(OruChildFeesScreen(services: svc, child: Map<String, dynamic>.from(kid))));
      await pumpFor(tester);
      expect(find.text('Asha\'s fees'), findsOneWidget);
      expect(find.text('Still to pay'), findsOneWidget);
      expect(find.textContaining('10,500'), findsOneWidget);
      expect(find.textContaining('Overdue: '), findsOneWidget);
      expect(find.text('Overdue'), findsOneWidget, reason: 'the word is on the fee, not only a colour');
      expect(find.text('Part paid'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
      expect(find.text('Paying online is not available yet. Please pay at the school office.'), findsOneWidget);
      await tester.tap(find.text('Tuition Term 2').first);
      await pumpFor(tester);
      expect(find.text('Fee details'), findsOneWidget);
      expect(find.textContaining('15,000'), findsOneWidget, reason: 'the fee before the concession');
      expect(find.text('Receipt R-2026-27-00001'), findsOneWidget);
      expect(find.text('Receipt R-2026-27-00002'), findsNothing, reason: 'that one belongs to another fee');
      expect(tester.takeException(), isNull);
      await svc.dispose();
    });
  });

  testWidgets('nothing billed says so; all paid says so', (tester) async {
    phone(tester);
    await tester.runAsync(() async {
      final svc = await services();
      await tester.pumpWidget(host(OruChildFeesScreen(services: svc, child: Map<String, dynamic>.from(kid))));
      await pumpFor(tester);
      expect(find.text('No fees have been billed for Asha yet.'), findsOneWidget);
      await svc.store.replaceRecords(kChildInvoice, parentId: 'k1', records: [(id: 'c', json: invoices[2])]);
      await pumpFor(tester);
      expect(find.text('All fees are paid.'), findsOneWidget);
      await svc.dispose();
    });
  });
}
