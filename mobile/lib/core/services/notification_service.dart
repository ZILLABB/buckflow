// Push notification service placeholder.
//
// To enable Firebase Cloud Messaging:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Add Android app with package name: com.buckflow.mobile
// 3. Download google-services.json to android/app/
// 4. Add firebase_core and firebase_messaging to pubspec.yaml
// 5. Uncomment the implementation below
//
// The backend already has a notification_service.py that can
// send push notifications via FCM — just needs the device token.

// TODO: Uncomment when Firebase is configured
//
// import 'package:firebase_core/firebase_core.dart';
// import 'package:firebase_messaging/firebase_messaging.dart';
// import 'package:flutter/foundation.dart';
//
// class NotificationService {
//   static final FirebaseMessaging _fcm = FirebaseMessaging.instance;
//
//   static Future<void> initialize() async {
//     await Firebase.initializeApp();
//
//     // Request permission (iOS)
//     await _fcm.requestPermission(
//       alert: true,
//       badge: true,
//       sound: true,
//     );
//
//     // Get FCM token
//     final token = await _fcm.getToken();
//     debugPrint('FCM Token: $token');
//
//     // Listen for token refresh
//     _fcm.onTokenRefresh.listen((newToken) {
//       debugPrint('FCM Token refreshed: $newToken');
//       // TODO: Send new token to backend
//     });
//
//     // Handle foreground messages
//     FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
//
//     // Handle background messages
//     FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
//
//     // Handle notification taps (app opened from notification)
//     FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
//   }
//
//   static void _handleForegroundMessage(RemoteMessage message) {
//     debugPrint('Foreground message: ${message.notification?.title}');
//     // Show local notification or in-app banner
//   }
//
//   static Future<void> _handleBackgroundMessage(RemoteMessage message) async {
//     debugPrint('Background message: ${message.notification?.title}');
//   }
//
//   static void _handleNotificationTap(RemoteMessage message) {
//     debugPrint('Notification tapped: ${message.data}');
//     // Navigate to relevant screen based on message.data
//   }
// }

/// Stub service that does nothing until Firebase is configured.
class NotificationService {
  static Future<void> initialize() async {
    // Firebase not yet configured.
    // See instructions above to enable push notifications.
  }
}
