import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/analytics.dart';
import '../../models/business.dart';
import '../../models/conversation.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_skeleton.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  String? _error;
  AnalyticsOverview? _overview;
  Business? _business;
  List<Conversation> _recent = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = context.read<ApiClient>();

    try {
      final results = await Future.wait([
        api.get<Map<String, dynamic>>(Endpoints.analyticsOverview),
        api.get<Map<String, dynamic>>(Endpoints.businessMe),
        api.get<List<dynamic>>('${Endpoints.conversations}?limit=5'),
      ]);

      _overview =
          AnalyticsOverview.fromJson(results[0] as Map<String, dynamic>);
      _business = Business.fromJson(results[1] as Map<String, dynamic>);
      _recent = (results[2] as List<dynamic>)
          .map((j) => Conversation.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (e) {
      _error = 'Failed to load dashboard data';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load: $e')),
        );
      }
    }

    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            CardGridSkeleton(),
            SizedBox(height: 24),
            CardSkeleton(height: 100),
            SizedBox(height: 24),
            ListSkeleton(itemCount: 3),
          ],
        ),
      );
    }

    if (_error != null && _overview == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard')),
        body: ErrorState(message: _error!, onRetry: _loadData),
      );
    }

    final stats = _overview ?? AnalyticsOverview();
    final biz = _business;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(biz?.name ?? 'Dashboard',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (biz != null)
              Text(
                biz.isWhatsAppConnected ? 'WhatsApp Connected' : 'Not Connected',
                style: TextStyle(
                  fontSize: 12,
                  color: biz.isWhatsAppConnected
                      ? AppColors.success
                      : AppColors.slate400,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.emerald,
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Stat cards ──
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                StatCard(
                  title: 'Conversations',
                  value: '${stats.totalConversations}',
                  icon: Icons.chat_bubble_outline,
                  color: AppColors.emerald,
                ),
                StatCard(
                  title: 'Messages',
                  value: '${stats.totalMessages}',
                  icon: Icons.message_outlined,
                  color: AppColors.info,
                ),
                StatCard(
                  title: 'Customers',
                  value: '${stats.totalCustomers}',
                  icon: Icons.people_outline,
                  color: AppColors.gold,
                ),
                StatCard(
                  title: 'Orders',
                  value: '${stats.totalOrders}',
                  icon: Icons.shopping_bag_outlined,
                  color: AppColors.emeraldDark,
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ── Usage bar ──
            if (biz != null) ...[
              _buildUsageSection(biz),
              const SizedBox(height: 24),
            ],

            // ── Recent conversations ──
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Recent Conversations',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                TextButton(
                  onPressed: () {
                    // Navigate to conversations tab
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_recent.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.chat_bubble_outline,
                          size: 48, color: AppColors.slate300),
                      const SizedBox(height: 12),
                      Text('No conversations yet',
                          style: TextStyle(color: AppColors.slate500)),
                    ],
                  ),
                ),
              )
            else
              ...List.generate(_recent.length, (i) {
                final c = _recent[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppColors.emeraldPale,
                      child: Text(
                        c.customerName.isNotEmpty
                            ? c.customerName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                            color: AppColors.emeraldDark,
                            fontWeight: FontWeight.w700),
                      ),
                    ),
                    title: Text(c.customerName,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      c.lastMessage ?? 'No messages',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: AppColors.slate500, fontSize: 13),
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: c.mode == 'ai'
                            ? AppColors.emeraldPale
                            : AppColors.goldLight.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        c.mode == 'ai' ? 'AI' : 'Human',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: c.mode == 'ai'
                              ? AppColors.emeraldDark
                              : AppColors.goldDark,
                        ),
                      ),
                    ),
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/chat',
                      arguments: c,
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageSection(Business biz) {
    final convPct = biz.monthlyConversationLimit > 0
        ? (biz.conversationsUsed / biz.monthlyConversationLimit)
            .clamp(0.0, 1.0)
        : 0.0;
    final aiPct = biz.monthlyAiLimit > 0
        ? (biz.aiMessagesUsed / biz.monthlyAiLimit).clamp(0.0, 1.0)
        : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Monthly Usage',
                style: Theme.of(context)
                    .textTheme
                    .titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            _usageBar(
              'Conversations',
              biz.conversationsUsed,
              biz.monthlyConversationLimit,
              convPct,
              AppColors.emerald,
            ),
            const SizedBox(height: 12),
            _usageBar(
              'AI Messages',
              biz.aiMessagesUsed,
              biz.monthlyAiLimit,
              aiPct,
              AppColors.info,
            ),
          ],
        ),
      ),
    );
  }

  Widget _usageBar(
      String label, int used, int limit, double pct, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: AppColors.slate600)),
            Text('$used / $limit',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate700)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: AppColors.slate200,
            color: pct > 0.9 ? AppColors.error : color,
            minHeight: 8,
          ),
        ),
      ],
    );
  }
}
