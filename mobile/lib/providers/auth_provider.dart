import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/user.dart';

enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthProvider extends ChangeNotifier {
  final ApiClient api;

  AuthStatus _status = AuthStatus.initial;
  User? _user;
  String? _error;

  AuthProvider({required this.api}) {
    _checkAuth();
  }

  AuthStatus get status => _status;
  User? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  /// Check if user has a stored token on app start.
  Future<void> _checkAuth() async {
    final token = await api.getToken();
    if (token != null) {
      try {
        // Validate token by fetching business info
        await api.get(Endpoints.businessMe);
        _status = AuthStatus.authenticated;
      } catch (_) {
        await api.clearAuth();
        _status = AuthStatus.unauthenticated;
      }
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();

    try {
      final data = await api.post<Map<String, dynamic>>(
        Endpoints.login,
        data: {'email': email, 'password': password},
      );

      final auth = AuthResponse.fromJson(data);
      _user = auth.user;
      await api.saveAuth(auth.accessToken, auth.user.toJson());
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _extractError(e);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String fullName,
    required String password,
    required String businessName,
    String businessType = 'product',
    String category = 'other',
  }) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();

    try {
      final data = await api.post<Map<String, dynamic>>(
        Endpoints.register,
        data: {
          'email': email,
          'full_name': fullName,
          'password': password,
          'business_name': businessName,
          'business_type': businessType,
          'category': category,
        },
      );

      final auth = AuthResponse.fromJson(data);
      _user = auth.user;
      await api.saveAuth(auth.accessToken, auth.user.toJson());
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _extractError(e);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await api.clearAuth();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  String _extractError(dynamic e) {
    if (e is Exception) {
      final msg = e.toString();
      // Dio errors contain the detail message
      if (msg.contains('detail')) {
        try {
          final match = RegExp(r'"detail"\s*:\s*"([^"]+)"').firstMatch(msg);
          if (match != null) return match.group(1)!;
        } catch (_) {}
      }
      return msg.replaceFirst('Exception: ', '');
    }
    return 'Something went wrong';
  }
}
