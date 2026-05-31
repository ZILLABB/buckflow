class AppConstants {
  AppConstants._();

  static const String appName = 'BuckFlow AI';

  /// API base URLs.
  /// devBaseUrl works for Android emulator (10.0.2.2 maps to host localhost).
  /// For physical device testing, replace with your computer's local IP.
  /// prodBaseUrl is the deployed backend.
  static const String devBaseUrl = 'http://10.0.2.2:8000'; // Android emulator
  static const String physicalDeviceUrl = 'http://192.168.1.100:8000'; // Update with your local IP
  static const String prodBaseUrl = 'https://api.buckflow.ai';

  /// Toggle this to switch environments.
  static const bool isProduction = false;

  /// Active base URL — switches between dev and prod automatically.
  static String get baseUrl => isProduction ? prodBaseUrl : devBaseUrl;

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
