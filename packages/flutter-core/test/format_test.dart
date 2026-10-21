import 'dart:convert';
import 'dart:io';

import 'package:flutter_core/flutter_core.dart';
import 'package:flutter_test/flutter_test.dart';

/// The same vectors the TypeScript package runs (packages/format/vectors.json): identical results on both sides.
void main() {
  final file = File('../format/vectors.json');
  final v = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  final money = v['money'] as Map<String, dynamic>;
  List<Map<String, dynamic>> list(dynamic x) =>
      (x as List).cast<Map<String, dynamic>>();

  test('the vectors file is found and not empty (guards against silently testing nothing)', () {
    expect(list(money['format']).length, greaterThan(20));
    expect(list(v['dates']['format']).length, greaterThan(5));
  });

  test('formatMoney', () {
    for (final c in list(money['format'])) {
      expect(
        OruFormat.formatMoney(
          BigInt.parse(c['minor'] as String),
          currency: c['currency'] as String,
          locale: c['locale'] as String,
          decimals: c['decimals'] as String,
        ),
        c['expected'],
        reason: '${c['minor']} ${c['currency']} ${c['locale']}',
      );
    }
  });

  test('parseMoney reads what people type and refuses the rest', () {
    for (final c in list(money['parse'])) {
      expect(
        OruFormat.parseMoney(c['text'] as String),
        BigInt.parse(c['minor'] as String),
        reason: c['text'] as String,
      );
    }
    for (final bad in (money['parseInvalid'] as List).cast<String>()) {
      expect(() => OruFormat.parseMoney(bad), throwsRangeError, reason: bad);
    }
  });

  test('mulDivRound and percentOf round half away from zero', () {
    for (final c in list(money['mulDivRound'])) {
      expect(
        OruFormat.mulDivRound(
          BigInt.parse(c['amount'] as String),
          BigInt.parse(c['num'] as String),
          BigInt.parse(c['den'] as String),
        ),
        BigInt.parse(c['expected'] as String),
        reason: '$c',
      );
    }
    for (final c in list(money['percentOf'])) {
      expect(
        OruFormat.percentOf(BigInt.parse(c['minor'] as String), c['bp'] as int),
        BigInt.parse(c['expected'] as String),
        reason: '$c',
      );
    }
    expect(
      () => OruFormat.mulDivRound(BigInt.one, BigInt.one, BigInt.zero),
      throwsRangeError,
    );
  });

  test('splitEvenly adds up exactly', () {
    for (final c in list(money['splitEvenly'])) {
      final out = OruFormat.splitEvenly(
        BigInt.parse(c['total'] as String),
        c['parts'] as int,
      );
      expect(
        out.map((e) => e.toString()).toList(),
        (c['expected'] as List).cast<String>(),
        reason: '$c',
      );
      expect(
        out.fold(BigInt.zero, (a, b) => a + b),
        BigInt.parse(c['total'] as String),
      );
    }
    for (final parts in (money['splitInvalid'] as List).cast<int>()) {
      expect(
        () => OruFormat.splitEvenly(BigInt.from(10), parts),
        throwsRangeError,
      );
    }
  });

  test('formatDate and formatTime', () {
    for (final c in list(v['dates']['format'])) {
      if (!(c['locale'] as String).toLowerCase().startsWith('en')) continue;
      expect(
        OruFormat.formatDate(
          c['date'] as String,
          withYear: c['withYear'] as bool,
        ),
        c['expected'],
        reason: '$c',
      );
    }
    for (final bad in (v['dates']['invalid'] as List).cast<String>()) {
      expect(() => OruFormat.formatDate(bad), throwsRangeError, reason: bad);
    }
    for (final c in list(v['times']['format'])) {
      expect(
        OruFormat.formatTime(c['time'] as String),
        c['expected'],
        reason: '$c',
      );
    }
    for (final bad in (v['times']['invalid'] as List).cast<String>()) {
      expect(() => OruFormat.formatTime(bad), throwsRangeError, reason: bad);
    }
  });
}
