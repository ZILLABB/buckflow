import 'package:intl/intl.dart';

class Formatters {
  Formatters._();

  /// Format amount in Nigerian Naira: ₦1,234.56
  static String naira(double amount) {
    final fmt = NumberFormat.currency(
      locale: 'en_NG',
      symbol: '₦',
      decimalDigits: amount == amount.roundToDouble() ? 0 : 2,
    );
    return fmt.format(amount);
  }

  /// Format date: "May 23, 2026"
  static String date(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return DateFormat('MMM d, y').format(dt);
    } catch (_) {
      return isoDate;
    }
  }

  /// Format date + time: "May 23, 3:14 AM"
  static String dateTime(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return DateFormat('MMM d, h:mm a').format(dt);
    } catch (_) {
      return isoDate;
    }
  }

  /// Relative time: "2h ago", "just now"
  static String timeAgo(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      final diff = DateTime.now().difference(dt);

      if (diff.inSeconds < 60) return 'just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return DateFormat('MMM d').format(dt);
    } catch (_) {
      return '';
    }
  }

  /// Compact number: 1234 → "1.2K"
  static String compact(int number) {
    return NumberFormat.compact().format(number);
  }
}
