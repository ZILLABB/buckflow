import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Simple local cache backed by flutter_secure_storage.
/// Stores JSON data with TTL (time-to-live) for offline access.
///
/// Usage:
///   final cache = LocalCacheService();
///   await cache.put('orders', jsonEncode(orderList), ttl: Duration(hours: 1));
///   final cached = await cache.get('orders');
class LocalCacheService {
  static const _prefix = 'bf_cache_';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Store data with an optional TTL.
  Future<void> put(String key, String value,
      {Duration ttl = const Duration(hours: 1)}) async {
    final envelope = jsonEncode({
      'data': value,
      'expiry': DateTime.now().add(ttl).millisecondsSinceEpoch,
    });
    await _storage.write(key: '$_prefix$key', value: envelope);
  }

  /// Retrieve cached data. Returns null if expired or not found.
  Future<String?> get(String key) async {
    final raw = await _storage.read(key: '$_prefix$key');
    if (raw == null) return null;

    try {
      final envelope = jsonDecode(raw) as Map<String, dynamic>;
      final expiry = envelope['expiry'] as int;
      if (DateTime.now().millisecondsSinceEpoch > expiry) {
        // Expired — clean up
        await _storage.delete(key: '$_prefix$key');
        return null;
      }
      return envelope['data'] as String;
    } catch (_) {
      return null;
    }
  }

  /// Remove a specific cache entry.
  Future<void> remove(String key) async {
    await _storage.delete(key: '$_prefix$key');
  }

  /// Clear all cached data.
  Future<void> clearAll() async {
    final all = await _storage.readAll();
    for (final key in all.keys) {
      if (key.startsWith(_prefix)) {
        await _storage.delete(key: key);
      }
    }
  }
}
