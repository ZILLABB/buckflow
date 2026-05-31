import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/customer.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_skeleton.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<Customer> _customers = [];
  bool _loading = true;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final query = _search.isNotEmpty ? '?search=$_search' : '';
      final data =
          await api.get<List<dynamic>>('${Endpoints.customers}$query');
      _customers =
          data.map((j) => Customer.fromJson(j as Map<String, dynamic>)).toList();
    } catch (e) {
      _error = 'Failed to load customers. Check your connection.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _toggleAi(Customer c) async {
    final api = context.read<ApiClient>();
    try {
      await api.patch(Endpoints.updateCustomer(c.id),
          data: {'ai_enabled': !c.aiEnabled});
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update AI setting: $e')),
        );
      }
    }
  }

  Future<void> _toggleFlag(Customer c) async {
    final api = context.read<ApiClient>();
    try {
      await api.patch(Endpoints.updateCustomer(c.id),
          data: {'is_flagged': !c.isFlagged});
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update flag: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search customers...',
                prefixIcon: const Icon(Icons.search),
                isDense: true,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onChanged: (v) {
                _search = v;
                _load();
              },
            ),
          ),
          Expanded(
            child: _loading
                ? const ListSkeleton()
                : _error != null && _customers.isEmpty
                    ? ErrorState(message: _error!, onRetry: _load)
                    : _customers.isEmpty
                        ? const EmptyState(
                            icon: Icons.people_outline,
                            title: 'No customers yet',
                            subtitle:
                                'Customers from WhatsApp conversations will appear here.',
                          )
                        : RefreshIndicator(
                            color: AppColors.emerald,
                            onRefresh: _load,
                            child: ListView.builder(
                              itemCount: _customers.length,
                              itemBuilder: (_, i) =>
                                  _buildCustomerTile(_customers[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerTile(Customer c) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor:
            c.isFlagged ? AppColors.error.withValues(alpha: 0.12) : AppColors.emeraldPale,
        child: Text(
          c.name.isNotEmpty ? c.name[0].toUpperCase() : '?',
          style: TextStyle(
            color: c.isFlagged ? AppColors.error : AppColors.emeraldDark,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(c.name,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          if (c.isFlagged)
            const Icon(Icons.flag, size: 16, color: AppColors.error),
        ],
      ),
      subtitle: Text(
        '${c.conversationCount} chats  |  ${c.orderCount} orders',
        style: TextStyle(fontSize: 12, color: AppColors.slate500),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: Icon(
              c.aiEnabled ? Icons.smart_toy : Icons.smart_toy_outlined,
              color: c.aiEnabled ? AppColors.emerald : AppColors.slate400,
              size: 20,
            ),
            tooltip: c.aiEnabled ? 'AI enabled' : 'AI disabled',
            onPressed: () => _toggleAi(c),
          ),
          IconButton(
            icon: Icon(
              c.isFlagged ? Icons.flag : Icons.flag_outlined,
              color: c.isFlagged ? AppColors.error : AppColors.slate400,
              size: 20,
            ),
            onPressed: () => _toggleFlag(c),
          ),
        ],
      ),
    );
  }
}
