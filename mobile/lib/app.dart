import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_colors.dart';
import 'providers/auth_provider.dart';
import 'providers/business_provider.dart';
import 'models/conversation.dart';
import 'models/business.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/home/dashboard_screen.dart';
import 'screens/conversations/conversations_list_screen.dart';
import 'screens/conversations/chat_detail_screen.dart';
import 'screens/orders/orders_screen.dart';
import 'screens/appointments/appointments_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/analytics/analytics_screen.dart';
import 'screens/customers/customers_screen.dart';
import 'screens/billing/billing_screen.dart';
import 'screens/team/team_screen.dart';
import 'screens/templates/templates_screen.dart';
import 'screens/profile/profile_screen.dart';

class BuckFlowApp extends StatelessWidget {
  const BuckFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BuckFlow AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.light,
      home: const _AuthGate(),
      onGenerateRoute: _onGenerateRoute,
    );
  }

  Route<dynamic>? _onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());
      case '/register':
        return MaterialPageRoute(builder: (_) => const RegisterScreen());
      case '/home':
        return MaterialPageRoute(builder: (_) => const MainShell());
      case '/chat':
        final conversation = settings.arguments as Conversation;
        return MaterialPageRoute(
          builder: (_) => ChatDetailScreen(conversation: conversation),
        );
      case '/orders':
        return MaterialPageRoute(builder: (_) => const OrdersScreen());
      case '/appointments':
        return MaterialPageRoute(builder: (_) => const AppointmentsScreen());
      case '/settings':
        return MaterialPageRoute(builder: (_) => const SettingsScreen());
      case '/analytics':
        return MaterialPageRoute(builder: (_) => const AnalyticsScreen());
      case '/customers':
        return MaterialPageRoute(builder: (_) => const CustomersScreen());
      case '/billing':
        return MaterialPageRoute(builder: (_) => const BillingScreen());
      case '/team':
        return MaterialPageRoute(builder: (_) => const TeamScreen());
      case '/templates':
        return MaterialPageRoute(builder: (_) => const TemplatesScreen());
      case '/profile':
        return MaterialPageRoute(builder: (_) => const ProfileScreen());
      default:
        return MaterialPageRoute(builder: (_) => const MainShell());
    }
  }
}

/// Gate that shows login or main app based on auth state.
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    switch (auth.status) {
      case AuthStatus.initial:
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(color: AppColors.emerald),
          ),
        );
      case AuthStatus.authenticated:
        return const MainShell();
      case AuthStatus.unauthenticated:
      case AuthStatus.loading:
        return const LoginScreen();
    }
  }
}

/// Main app shell with business-type-aware bottom navigation.
///
/// Navigation tabs adjust based on business type:
///  - product  -> Home | Chats | Orders    | Settings
///  - service  -> Home | Chats | Bookings  | Settings
///  - hybrid   -> Home | Chats | Orders    | Bookings | Settings
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  @override
  void initState() {
    super.initState();
    // Fetch business info for dynamic nav
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final bizProvider = context.read<BusinessProvider>();
      if (bizProvider.business == null) {
        bizProvider.fetchBusiness();
      }
    });
  }

  List<Widget> _buildScreens(Business? biz) {
    final screens = <Widget>[
      const DashboardScreen(),
      const ConversationsListScreen(),
    ];
    if (biz == null || biz.isProduct) {
      screens.add(const OrdersScreen());
    }
    if (biz != null && biz.isService && biz.businessType != 'product') {
      screens.add(const AppointmentsScreen());
    }
    screens.add(const SettingsScreen());
    return screens;
  }

  List<NavigationDestination> _buildDestinations(Business? biz) {
    final destinations = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard, color: AppColors.emerald),
        label: 'Home',
      ),
      const NavigationDestination(
        icon: Icon(Icons.chat_bubble_outline),
        selectedIcon: Icon(Icons.chat_bubble, color: AppColors.emerald),
        label: 'Chats',
      ),
    ];

    if (biz == null || biz.isProduct) {
      destinations.add(const NavigationDestination(
        icon: Icon(Icons.shopping_bag_outlined),
        selectedIcon: Icon(Icons.shopping_bag, color: AppColors.emerald),
        label: 'Orders',
      ));
    }

    if (biz != null && biz.isService && biz.businessType != 'product') {
      destinations.add(const NavigationDestination(
        icon: Icon(Icons.calendar_today_outlined),
        selectedIcon: Icon(Icons.calendar_today, color: AppColors.emerald),
        label: 'Bookings',
      ));
    }

    destinations.add(const NavigationDestination(
      icon: Icon(Icons.settings_outlined),
      selectedIcon: Icon(Icons.settings, color: AppColors.emerald),
      label: 'Settings',
    ));

    return destinations;
  }

  @override
  Widget build(BuildContext context) {
    final biz = context.watch<BusinessProvider>().business;
    final screens = _buildScreens(biz);
    final destinations = _buildDestinations(biz);

    // Clamp index if business type changed and tabs shrank
    if (_currentIndex >= screens.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: AppColors.emeraldPale,
        destinations: destinations,
      ),
    );
  }
}
