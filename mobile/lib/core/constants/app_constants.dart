class AppConstants {
  AppConstants._();

  static const String appName = 'BuckFlow AI';

  /// Default API base URL for development.
  /// In production this will point to the deployed backend.
  static const String devBaseUrl = 'http://10.0.2.2:8000'; // Android emulator
  static const String prodBaseUrl = 'https://api.buckflow.ai';

  // Pagination
  static const int pageSize = 30;

  // Business types
  static const String typeProduct = 'product';
  static const String typeService = 'service';
  static const String typeHybrid = 'hybrid';

  // User roles
  static const String roleOwner = 'OWNER';
  static const String roleAdmin = 'ADMIN';
  static const String roleAgent = 'AGENT';
  static const String roleViewer = 'VIEWER';

  // Conversation modes
  static const String modeAi = 'ai';
  static const String modeHuman = 'human';

  // Order statuses
  static const List<String> orderStatuses = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  // Appointment statuses
  static const List<String> appointmentStatuses = [
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
  ];
}
