import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../models/plan.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  List<Plan> _plans = [];
  SubscriptionStatus? _subscription;
  bool _loading = true;

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
        api.get<List<dynamic>>(Endpoints.billingPlans),
        api.get<Map<String, dynamic>>(Endpoints.billingSubscription),
      ]);
      _plans = (results[0] as List<dynamic>)
          .map((j) => Plan.fromJson(j as Map<String, dynamic>))
          .toList();
      _subscription = SubscriptionStatus.fromJson(
          results[1] as Map<String, dynamic>);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _subscribe(String planId) async {
    final api = context.read<ApiClient>();
    try {
      final data = await api.post<Map<String, dynamic>>(
        Endpoints.billingSubscribe,
        data: {'plan_id': planId},
      );
      final url = data['authorization_url'] as String?;
      if (url != null) {
        await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Billing & Plans')),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.emerald))
          : RefreshIndicator(
              color: AppColors.emerald,
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Current plan
                  if (_subscription != null) ...[
                    Card(
                      color: AppColors.emerald,
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Current Plan',
                                style: TextStyle(
                                    color: Colors.white70, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              _subscription!.planName ?? 'Free',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _subscription!.isActive
                                  ? 'Active'
                                  : 'Inactive',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Plans
                  const Text('Available Plans',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  ..._plans.map((plan) => _buildPlanCard(plan)),
                ],
              ),
            ),
    );
  }

  Widget _buildPlanCard(Plan plan) {
    final isCurrent = _subscription?.planId == plan.id;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isCurrent ? AppColors.emerald : AppColors.slate200,
          width: isCurrent ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(plan.name,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700)),
                if (isCurrent)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.emeraldPale,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('Current',
                        style: TextStyle(
                            color: AppColors.emeraldDark,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              plan.price > 0 ? '${Formatters.naira(plan.price)}/month' : 'Free',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.emeraldDark),
            ),
            const SizedBox(height: 12),
            _featureRow(
                '${plan.conversationLimit} conversations/month'),
            _featureRow('${plan.aiMessagesLimit} AI messages/month'),
            _featureRow('Model: ${plan.aiModel}'),
            ...plan.features.map((f) => _featureRow(f)),
            if (!isCurrent) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => _subscribe(plan.id),
                  child: Text(
                      plan.price > 0 ? 'Subscribe' : 'Downgrade'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _featureRow(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            const Icon(Icons.check_circle, size: 16, color: AppColors.emerald),
            const SizedBox(width: 8),
            Expanded(
                child:
                    Text(text, style: TextStyle(color: AppColors.slate600, fontSize: 13))),
          ],
        ),
      );
}
