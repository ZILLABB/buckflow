import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/template.dart';
import '../../widgets/empty_state.dart';

class TemplatesScreen extends StatefulWidget {
  const TemplatesScreen({super.key});

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  List<MessageTemplate> _templates = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final data = await api.get<List<dynamic>>(Endpoints.templates);
      _templates = data
          .map((j) => MessageTemplate.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _addTemplate() async {
    final nameCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    String? category;

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('New Template'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: contentCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Message Content',
                    hintText:
                        'Use {customer_name} for personalization...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: const [
                    DropdownMenuItem(
                        value: 'greeting', child: Text('Greeting')),
                    DropdownMenuItem(
                        value: 'follow_up', child: Text('Follow Up')),
                    DropdownMenuItem(
                        value: 'order_update', child: Text('Order Update')),
                    DropdownMenuItem(
                        value: 'promotion', child: Text('Promotion')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (v) =>
                      setDialogState(() => category = v),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, {
                'name': nameCtrl.text.trim(),
                'content': contentCtrl.text.trim(),
                if (category != null) 'category': category!,
              }),
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );

    if (result == null ||
        result['name']!.isEmpty ||
        result['content']!.isEmpty) {
      return;
    }

    if (!mounted) return;
    final api = context.read<ApiClient>();
    try {
      await api.post(Endpoints.templates, data: result);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Template created'),
            backgroundColor: AppColors.emerald));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  Future<void> _deleteTemplate(MessageTemplate t) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Template'),
        content: Text('Delete "${t.name}"?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    if (!mounted) return;
    final api = context.read<ApiClient>();
    try {
      await api.delete(Endpoints.deleteTemplate(t.id));
      _load();
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
      appBar: AppBar(title: const Text('Templates')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addTemplate,
        backgroundColor: AppColors.emerald,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Template'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.emerald))
          : _templates.isEmpty
              ? const EmptyState(
                  icon: Icons.description_outlined,
                  title: 'No templates yet',
                  subtitle:
                      'Create message templates for quick replies and automation.',
                )
              : RefreshIndicator(
                  color: AppColors.emerald,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _templates.length,
                    itemBuilder: (_, i) => _buildTemplateCard(_templates[i]),
                  ),
                ),
    );
  }

  Widget _buildTemplateCard(MessageTemplate t) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(t.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 15)),
                ),
                if (t.category != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.emeraldPale,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      t.category!,
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.emeraldDark,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                const SizedBox(width: 4),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      size: 20, color: AppColors.error),
                  onPressed: () => _deleteTemplate(t),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.slate100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                t.content,
                style: TextStyle(
                    fontSize: 13,
                    color: AppColors.slate600,
                    height: 1.4),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(
                  t.isActive ? Icons.check_circle : Icons.cancel,
                  size: 14,
                  color: t.isActive ? AppColors.success : AppColors.slate400,
                ),
                const SizedBox(width: 4),
                Text(
                  t.isActive ? 'Active' : 'Inactive',
                  style: TextStyle(fontSize: 11, color: AppColors.slate500),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
