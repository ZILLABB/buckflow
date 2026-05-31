import 'package:flutter/material.dart';

/// Lightweight connectivity awareness using Dio error detection.
/// Shows an offline banner when API calls fail due to network issues.
///
/// For full offline-first support, add `connectivity_plus` package
/// and implement local caching with `sqflite` or `hive`.
class ConnectivityService extends ChangeNotifier {
  bool _isOnline = true;

  bool get isOnline => _isOnline;

  void reportOnline() {
    if (!_isOnline) {
      _isOnline = true;
      notifyListeners();
    }
  }

  void reportOffline() {
    if (_isOnline) {
      _isOnline = false;
      notifyListeners();
    }
  }
}

/// A banner widget that shows when the app is offline.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      color: Colors.red.shade700,
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off, color: Colors.white, size: 16),
          SizedBox(width: 8),
          Text(
            'No internet connection',
            style: TextStyle(color: Colors.white, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
