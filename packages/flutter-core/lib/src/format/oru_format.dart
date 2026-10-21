/// Money, date and time formatting and arithmetic: the Dart twin of `packages/format` (TypeScript). Both are run against the
/// same `packages/format/vectors.json`, so a figure prints and rounds identically in the apps, the web and the gateway.
///
/// Money is a whole number of MINOR units (paise) held as a [BigInt], never a double (ADR-0004).
library;

/// Minor digits per currency (INR has 2). Unknown currencies use 2.
const Map<String, int> kMinorDigits = {
  'INR': 2,
  'USD': 2,
  'EUR': 2,
  'GBP': 2,
  'AED': 2,
  'PKR': 2,
  'BDT': 2,
  'NPR': 2,
  'LKR': 2,
  'JPY': 0,
  'KWD': 3,
  'BHD': 3,
  'OMR': 3,
};
const Map<String, String> _symbols = {
  'INR': '₹',
  'USD': r'$',
  'EUR': '€',
  'GBP': '£',
};
const Set<String> _indianLanguages = {
  'hi',
  'bn',
  'as',
  'mr',
  'doi',
  'gu',
  'pa',
  'or',
  'ta',
  'te',
  'kn',
  'ml',
  'ks',
  'ur',
  'sd',
};
const Set<String> _indianRegions = {'IN', 'PK', 'BD', 'NP', 'LK'};

enum Grouping { indian, western }

abstract final class OruFormat {
  static int minorDigitsOf(String currency) =>
      kMinorDigits[currency.toUpperCase()] ?? 2;

  /// Lakh and crore (12,34,567) for the Indian subcontinent, thousands (1,234,567) elsewhere.
  static Grouping groupingFor(String locale) {
    final parts = locale.replaceAll('_', '-').split('-');
    String? region;
    for (var i = 1; i < parts.length; i++) {
      if (RegExp(r'^[A-Za-z]{2}$').hasMatch(parts[i])) {
        region = parts[i].toUpperCase();
        break;
      }
    }
    if (region != null) {
      return _indianRegions.contains(region)
          ? Grouping.indian
          : Grouping.western;
    }
    return _indianLanguages.contains(parts.first.toLowerCase())
        ? Grouping.indian
        : Grouping.western;
  }

  static String groupDigits(String digits, Grouping grouping) {
    if (digits.length <= 3) {
      return digits;
    }
    final last3 = digits.substring(digits.length - 3);
    var head = digits.substring(0, digits.length - 3);
    final size = grouping == Grouping.western ? 3 : 2;
    final groups = <String>[];
    while (head.length > size) {
      groups.insert(0, head.substring(head.length - size));
      head = head.substring(0, head.length - size);
    }
    if (head.isNotEmpty) {
      groups.insert(0, head);
    }
    return [...groups, last3].join(',');
  }

  /// `₹1,82,40,000`, `-₹500`, `₹1,250.50`. [decimals] is `auto` (fraction only when not zero) or `always`.
  static String formatMoney(
    BigInt minor, {
    String currency = 'INR',
    String locale = 'en-IN',
    String decimals = 'auto',
  }) {
    final neg = minor < BigInt.zero;
    final digits = minorDigitsOf(currency);
    final abs = (neg ? -minor : minor).toString().padLeft(digits + 1, '0');
    final whole = abs.substring(0, abs.length - digits);
    final fraction = abs.substring(abs.length - digits);
    final showFraction =
        digits > 0 &&
        (decimals == 'always' || RegExp(r'[1-9]').hasMatch(fraction));
    final code = currency.toUpperCase();
    final symbol = _symbols[code] ?? '$code ';
    return '${neg ? '-' : ''}$symbol${groupDigits(whole, groupingFor(locale))}${showFraction ? '.$fraction' : ''}';
  }

  /// Reads typed text into minor units; throws [RangeError] for anything that is not an amount (never rounds).
  static BigInt parseMoney(String text, {String currency = 'INR'}) {
    final digits = minorDigitsOf(currency);
    var s = text.trim();
    final neg = s.startsWith('-');
    if (neg) {
      s = s.substring(1).trim();
    }
    final symbol = _symbols[currency.toUpperCase()];
    if (symbol != null && s.startsWith(symbol)) {
      s = s.substring(symbol.length).trim();
    }
    s = s.replaceAll(',', '');
    final m = RegExp(r'^(\d+)(?:\.(\d+))?$').firstMatch(s);
    if (m == null) {
      throw RangeError('not an amount');
    }
    final fraction = m.group(2) ?? '';
    if (fraction.length > digits) {
      throw RangeError('more than $digits decimal places');
    }
    final value = BigInt.parse(m.group(1)! + fraction.padRight(digits, '0'));
    return neg ? -value : value;
  }

  /// amount x numerator / denominator rounded half away from zero.
  static BigInt mulDivRound(
    BigInt amount,
    BigInt numerator,
    BigInt denominator,
  ) {
    if (denominator == BigInt.zero) {
      throw RangeError('division by zero');
    }
    var num = amount * numerator;
    var den = denominator;
    if (den < BigInt.zero) {
      num = -num;
      den = -den;
    }
    final neg = num < BigInt.zero;
    final abs = neg ? -num : num;
    final q = abs ~/ den;
    final r = abs % den;
    final rounded = r * BigInt.two >= den ? q + BigInt.one : q;
    return neg ? -rounded : rounded;
  }

  /// A percentage in basis points (1% = 100).
  static BigInt percentOf(BigInt minor, int basisPoints) =>
      mulDivRound(minor, BigInt.from(basisPoints), BigInt.from(10000));

  /// Splits an amount into [parts] pieces adding up to it exactly; the extra minor units go to the first pieces.
  static List<BigInt> splitEvenly(BigInt total, int parts) {
    if (parts < 1) {
      throw RangeError('parts must be a whole number of at least 1');
    }
    final n = BigInt.from(parts);
    final neg = total < BigInt.zero;
    final abs = neg ? -total : total;
    final base = abs ~/ n;
    final extra = (abs % n).toInt();
    return List.generate(parts, (i) {
      final v = base + (i < extra ? BigInt.one : BigInt.zero);
      return neg ? -v : v;
    });
  }

  static const _days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  /// `Tue, 24 Jun`, or `Tue, 24 Jun 2026` with [withYear]. A calendar date is shown as written, never moved by a time zone.
  /// English only here; other languages are shown through the app's own locale data (see `DateFormat` in package:intl).
  static String formatDate(String date, {bool withYear = false}) {
    final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(date);
    if (m == null) {
      throw RangeError('a date is written YYYY-MM-DD');
    }
    final y = int.parse(m.group(1)!),
        mo = int.parse(m.group(2)!),
        d = int.parse(m.group(3)!);
    final utc = DateTime.utc(y, mo, d);
    if (utc.year != y || utc.month != mo || utc.day != d) {
      throw RangeError('not a real date');
    }
    return '${_days[utc.weekday % 7]}, $d ${_months[mo - 1]}${withYear ? ' $y' : ''}';
  }

  /// `8:45 AM` from `08:45` (24-hour text).
  static String formatTime(String time) {
    final m = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$').firstMatch(time);
    if (m == null) {
      throw RangeError('a time is written HH:mm (24-hour)');
    }
    final hour = int.parse(m.group(1)!);
    return '${hour % 12 == 0 ? 12 : hour % 12}:${m.group(2)} ${hour < 12 ? 'AM' : 'PM'}';
  }
}
