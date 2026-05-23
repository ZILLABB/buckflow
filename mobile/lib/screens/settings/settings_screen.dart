import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/business.dart';
import '../../providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  Business? _biz;
  List<dynamic> _rules = [];
  bool _loading = true;

  final _aiPromptCtrl = TextEditingController();
  final _outsideHoursCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _aiPromptCtrl.dispose();
    _outsideHoursCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([
        api.get<Map<String, dynamic>>(Endpoints.businessMe),
        api.get<List<dynamic>>(Endpoints.rules),
      ]);
      _biz = Business.fromJson(results[0] as Map<String, dynamic>);
      _rules = results[1] as List<dynamic>;
      _aiPromptCtrl.text = _biz?.aiSystemPrompt ?? '';
      _outsideHoursCtrl.text = _biz?.outsideHoursMessage ?? '';
    } catch (e) {
      _showError('Failed to load settings');
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _updateBiz(Map<String, dynamic> data) async {
    final api = context.read<ApiClient>();
    try {
      await api.patch(Endpoints.businessMe, data: data);
      await _loadData();
      _showSuccess('Settings updated');
    } catch (e) {
      _showError('Update failed');
    }
  }

  Future<void> _connectWhatsApp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) return;
    final api = context.read<ApiClient>();
    try {
      await api.post(Endpoints.connectWhatsApp,
          data: {'phone_number': phone});
      _phoneCtrl.clear();
      await _loadData();
      _showSuccess('WhatsApp connected');
    } catch (e) {
      _showError('Connection failed');
    }
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.emerald));
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: AppColors.error));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: const Center(
            child: CircularProgressIndicator(color: AppColors.emerald)),
      );
    }

    final biz = _biz;
    if (biz == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Settings')),
        body: const Center(child: Text('Failed to load')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Business Info ──
          _sectionTitle('Business'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow('Name', biz.name),
                  _infoRow('Type', biz.businessType),
                  _infoRow('Category', biz.category),
                  const Divider(height: 24),
                  // Business type selector
                  DropdownButtonFormField<String>(
                    initialValue: biz.businessType,
                    decoration:
                        const InputDecoration(labelText: 'Business Type'),
                    items: const [
                      DropdownMenuItem(value: 'product', child: Text('Product')),
                      DropdownMenuItem(value: 'service', child: Text('Service')),
                      DropdownMenuItem(value: 'hybrid', child: Text('Hybrid')),
                    ],
                    onChanged: (v) {
                      if (v != null) _updateBiz({'business_type': v});
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── WhatsApp ──
          _sectionTitle('WhatsApp Connection'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        biz.isWhatsAppConnected
                            ? Icons.check_circle
                            : Icons.warning_amber_rounded,
                        color: biz.isWhatsAppConnected
                            ? AppColors.success
                            : AppColors.warning,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        biz.isWhatsAppConnected
                            ? 'Connected: ${biz.phoneNumber ?? ""}'
                            : 'Not connected',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  if (!biz.isWhatsAppConnected) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _phoneCtrl,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              hintText: 'Phone number',
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _connectWhatsApp,
                          child: const Text('Connect'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── AI Settings ──
          _sectionTitle('AI Configuration'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Human Only Mode'),
                    subtitle:
                        const Text('Disable AI replies, all manual'),
                    value: biz.humanOnlyMode,
                    activeThumbColor: AppColors.emerald,
                    onChanged: (v) => _updateBiz({'human_only_mode': v}),
                  ),
                  const Divider(),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Auto-reply Outside Hours'),
                    subtitle: const Text(
                        'Send custom message outside business hours'),
                    value: biz.autoReplyOutsideHours,
                    activeThumbColor: AppColors.emerald,
                    onChanged: (v) =>
                        _updateBiz({'auto_reply_outside_hours': v}),
                  ),
                  if (biz.autoReplyOutsideHours) ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: _outsideHoursCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                          labelText: 'Outside hours message'),
                      onSubmitted: (v) =>
                          _updateBiz({'outside_hours_message': v}),
                    ),
                  ],
                  const Divider(height: 24),
                  const Text('AI System Prompt',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _aiPromptCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText:
                          'Instructions for your AI assistant...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton(
                      onPressed: () => _updateBiz(
                          {'ai_system_prompt': _aiPromptCtrl.text}),
                      child: const Text('Save Prompt'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Auto-Reply Rules ──
          _sectionTitle('Auto-Reply Rules (${_rules.length})'),
          ..._rules.map((r) {
            final rule = r as Map<String, dynamic>;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(
                    (rule['keywords'] as List?)?.join(', ') ?? 'Rule'),
                subtitle: Text(rule['response_text'] ?? '',
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                trailing: IconButton(
                  icon:
                      const Icon(Icons.delete_outline, color: AppColors.error),
                  onPressed: () async {
                    final api = context.read<ApiClient>();
                    await api.delete(
                        Endpoints.deleteRule(rule['id'] as String));
                    _loadData();
                  },
                ),
              ),
            );
          }),
          const SizedBox(height: 20),

          // ── Account ──
          _sectionTitle('Account'),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Profile'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/profile'),
                ),
                ListTile(
                  leading: const Icon(Icons.payment_outlined),
                  title: const Text('Billing & Plans'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/billing'),
                ),
                ListTile(
                  leading: const Icon(Icons.group_outlined),
                  title: const Text('Team'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.pushNamed(context, '/team'),
                ),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppColors.error),
                  title: const Text('Sign Out',
                      style: TextStyle(color: AppColors.error)),
                  onTap: () => context.read<AuthProvider>().logout(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title,
            style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.slate700)),
      );

  Widget _infoRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: AppColors.slate500)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
}
