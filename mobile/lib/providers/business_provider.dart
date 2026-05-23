import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/business.dart';

class BusinessProvider extends ChangeNotifier {
  final ApiClient api;

  Business? _business;
  bool _loading = false;
  String? _error;

  BusinessProvider({required this.api});

  Business? get business => _business;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> fetchBusiness() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await api.get<Map<String, dynamic>>(Endpoints.businessMe);
      _business = Business.fromJson(data);
    } catch (e) {
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  Future<bool> updateBusiness(Map<String, dynamic> updates) async {
    try {
      await api.patch(Endpoints.businessMe, data: updates);
      await fetchBusiness(); // refresh
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
