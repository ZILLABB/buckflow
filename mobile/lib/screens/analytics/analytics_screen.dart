import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/analytics.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_skeleton.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  bool _loading = true;
  String? _error;
  AnalyticsOverview? _overview;
  Map<String, dynamic>? _usage;
  Map<String, dynamic>? _breakdown;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([
        api.get<Map<String, dynamic>>(Endpoints.analyticsOverview),
        api.get<Map<String, dynamic>>(Endpoints.analyticsUsage),
        api.get<Map<String, dynamic>>(Endpoints.analyticsBreakdown),
      ]);
      _overview =
          AnalyticsOverview.fromJson(results[0]);
      _usage = results[1];
      _breakdown = results[2];
    } catch (e) {
      _error = 'Failed to load analytics data';
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: _loading
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                CardGridSkeleton(),
                SizedBox(height: 24),
                CardSkeleton(height: 200),
                SizedBox(height: 16),
                CardSkeleton(height: 150),
              ],
            )
          : _error != null && _overview == null
              ? ErrorState(message: _error!, onRetry: _loadData)
              : RefreshIndicator(
              color: AppColors.emerald,
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stat grid
                  if (_overview != null) ...[
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
                          value: '${_overview!.totalConversations}',
                          icon: Icons.chat_bubble_outline,
                          color: AppColors.emerald,
                        ),
                        StatCard(
                          title: 'Messages',
                          value: '${_overview!.totalMessages}',
                          icon: Icons.message_outlined,
                          color: AppColors.info,
                        ),
                        StatCard(
                          title: 'Customers',
                          value: '${_overview!.totalCustomers}',
                          icon: Icons.people_outline,
                          color: AppColors.gold,
                        ),
                        StatCard(
                          title: 'Orders',
                          value: '${_overview!.totalOrders}',
                          icon: Icons.shopping_bag_outlined,
                          color: AppColors.emeraldDark,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Response breakdown pie
                  if (_breakdown != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Response Sources',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 16),
                            SizedBox(
                              height: 180,
                              child: _buildPieChart(),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Usage info
                  if (_usage != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Usage This Month',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700)),
                            const SizedBox(height: 12),
                            _buildUsageInfo(),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildPieChart() {
    final data = _breakdown ?? {};
    final ai = (data['ai'] as num?)?.toDouble() ?? 0;
    final rule = (data['rule'] as num?)?.toDouble() ?? 0;
    final human = (data['human'] as num?)?.toDouble() ?? 0;
    final total = ai + rule + human;

    if (total == 0) {
      return const Center(child: Text('No data yet'));
    }

    return Row(
      children: [
        SizedBox(
          width: 140,
          height: 140,
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 30,
              sections: [
                PieChartSectionData(
                    value: ai,
                    color: AppColors.emerald,
                    radius: 35,
                    showTitle: false),
                PieChartSectionData(
                    value: rule,
                    color: AppColors.info,
                    radius: 35,
                    showTitle: false),
                PieChartSectionData(
                    value: human,
                    color: AppColors.gold,
                    radius: 35,
                    showTitle: false),
              ],
            ),
          ),
        ),
        const SizedBox(width: 24),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _legendItem('AI', ai.toInt(), AppColors.emerald),
            const SizedBox(height: 8),
            _legendItem('Rules', rule.toInt(), AppColors.info),
            const SizedBox(height: 8),
            _legendItem('Human', human.toInt(), AppColors.gold),
          ],
        ),
      ],
    );
  }

  Widget _legendItem(String label, int value, Color color) {
    return Row(
      children: [
        Container(
            width: 12, height: 12,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text('$label: $value',
            style:
                TextStyle(fontSize: 13, color: AppColors.slate600)),
      ],
    );
  }

  Widget _buildUsageInfo() {
    final limits = _usage?['limits'] as Map<String, dynamic>? ?? {};
    final convUsed = limits['conversations_used'] as int? ?? 0;
    final convLimit = limits['monthly_conversation_limit'] as int? ?? 50;
    final aiUsed = limits['ai_messages_used'] as int? ?? 0;
    final aiLimit = limits['monthly_ai_limit'] as int? ?? 200;

    return Column(
      children: [
        _usageRow('Conversations', convUsed, convLimit, AppColors.emerald),
        const SizedBox(height: 12),
        _usageRow('AI Messages', aiUsed, aiLimit, AppColors.info),
      ],
    );
  }

  Widget _usageRow(String label, int used, int limit, Color color) {
    final pct = limit > 0 ? (used / limit).clamp(0.0, 1.0) : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: AppColors.slate600, fontSize: 13)),
            Text('$used / $limit',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
        const SizedBox(height: 4),
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
