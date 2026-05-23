import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Central HTTP client mirroring the dashboard's api.ts.
/// Handles JWT injection, 401 auto-logout, and base URL config.
class ApiClient {
  static const _tokenKey = 'bf_token';
  static const _userKey = 'bf_user';

  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  /// Callback invoked on 401 so the app can navigate to login.
  VoidCallback? onUnauthorized;

  ApiClient({required String baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: '$baseUrl/api/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    // ── Auth interceptor: inject Bearer token ──
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: _tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await clearAuth();
          onUnauthorized?.call();
        }
        return handler.next(error);
      },
    ));

    // ── Logging in debug mode ──
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (o) => debugPrint(o.toString()),
      ));
    }
  }

  // ── Token management ──

  Future<void> saveAuth(String token, Map<String, dynamic> user) async {
    await _storage.write(key: _tokenKey, value: token);
    // Store user as JSON string
    await _storage.write(
      key: _userKey,
      value: user.toString(),
    );
  }

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<bool> get isAuthenticated async =>
      (await _storage.read(key: _tokenKey)) != null;

  Future<void> clearAuth() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }

  // ── HTTP methods (mirror dashboard api.ts) ──

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.get(path, queryParameters: queryParams);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.post(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.patch(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.put(path, data: data);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }

  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    final response = await _dio.delete(path);
    return fromJson != null ? fromJson(response.data) : response.data as T;
  }
}
