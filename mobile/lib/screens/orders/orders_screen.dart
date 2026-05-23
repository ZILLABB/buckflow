import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../models/order.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/empty_state.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();

    try {
      final params = _filter != 'all' ? '?status=$_filter' : '';
      final data = await api.get<List<dynamic>>('${Endpoints.orders}$params');
      _orders =
          data.map((j) => Order.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _updateStatus(String orderId, String status) async {
    final api = context.read<ApiClient>();
    try {
      await api.patch(
        Endpoints.orderStatus(orderId),
        data: {'status': status},
      );
      await _loadOrders();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order updated to $status'),
            backgroundColor: AppColors.emerald,
          ),
        );
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
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadOrders),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['all', 'pending', 'confirmed', 'shipped', 'delivered']
                  .map((f) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(f == 'all'
                              ? 'All'
                              : f[0].toUpperCase() + f.substring(1)),
                          selected: _filter == f,
                          onSelected: (_) {
                            setState(() => _filter = f);
                            _loadOrders();
                          },
                          selectedColor: AppColors.emeraldPale,
                          checkmarkColor: AppColors.emeraldDark,
                        ),
                      ))
                  .toList(),
            ),
          ),

          // Orders list
          Expanded(
            child: _loading
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.emerald))
                : _orders.isEmpty
                    ? const EmptyState(
                        icon: Icons.shopping_bag_outlined,
                        title: 'No orders found',
                        subtitle: 'Orders from WhatsApp conversations appear here.',
                      )
                    : RefreshIndicator(
                        color: AppColors.emerald,
                        onRefresh: _loadOrders,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          itemBuilder: (_, i) => _buildOrderCard(_orders[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    order.customerName ?? 'Unknown Customer',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                ),
                StatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  Formatters.naira(order.totalAmount),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.emeraldDark,
                  ),
                ),
                Text(
                  Formatters.timeAgo(order.createdAt),
                  style: TextStyle(fontSize: 12, color: AppColors.slate400),
                ),
              ],
            ),
            if (order.items != null && order.items!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                order.items!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: AppColors.slate500),
              ),
            ],
            if (order.status == 'pending' || order.status == 'confirmed') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (order.status == 'pending')
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _updateStatus(order.id, 'confirmed'),
                        child: const Text('Confirm'),
                      ),
                    ),
                  if (order.status == 'confirmed') ...[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _updateStatus(order.id, 'shipped'),
                        child: const Text('Ship'),
                      ),
                    ),
                  ],
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () => _updateStatus(order.id, 'cancelled'),
                    style: TextButton.styleFrom(foregroundColor: AppColors.error),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
