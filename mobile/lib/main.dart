import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api/api_client.dart';
import 'core/constants/app_constants.dart';
import 'providers/auth_provider.dart';
import 'providers/business_provider.dart';
import 'providers/conversations_provider.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final apiClient = ApiClient(baseUrl: AppConstants.baseUrl);

  runApp(
    MultiProvider(
      providers: [
        // Core API client (accessible everywhere)
        Provider<ApiClient>.value(value: apiClient),

        // Auth state
        ChangeNotifierProvider(
          create: (_) => AuthProvider(api: apiClient),
        ),

        // Business profile
        ChangeNotifierProvider(
          create: (_) => BusinessProvider(api: apiClient),
        ),

        // Conversations
        ChangeNotifierProvider(
          create: (_) => ConversationsProvider(api: apiClient),
        ),
      ],
      child: const BuckFlowApp(),
    ),
  );
}
