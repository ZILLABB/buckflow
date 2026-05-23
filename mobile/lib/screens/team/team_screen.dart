import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../models/team_member.dart';
import '../../widgets/empty_state.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  List<TeamMember> _members = [];
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
      final data = await api.get<List<dynamic>>(Endpoints.teamMembers);
      _members = data
          .map((j) => TeamMember.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _inviteMember() async {
    final emailCtrl = TextEditingController();
    String role = 'AGENT';

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Invite Team Member'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: 'Role'),
                items: const [
                  DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
                  DropdownMenuItem(value: 'AGENT', child: Text('Agent')),
                  DropdownMenuItem(value: 'VIEWER', child: Text('Viewer')),
                ],
                onChanged: (v) => setDialogState(() => role = v!),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx,
                  {'email': emailCtrl.text.trim(), 'role': role}),
              child: const Text('Invite'),
            ),
          ],
        ),
      ),
    );

    if (result == null || result['email']!.isEmpty) return;

    if (!mounted) return;
    final api = context.read<ApiClient>();
    try {
      await api.post(Endpoints.teamMembers, data: result);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Invite sent'),
            backgroundColor: AppColors.emerald));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  Future<void> _updateRole(TeamMember m, String newRole) async {
    final api = context.read<ApiClient>();
    await api.patch(Endpoints.updateMember(m.id), data: {'role': newRole});
    _load();
  }

  Future<void> _toggleActive(TeamMember m) async {
    final api = context.read<ApiClient>();
    await api.patch(Endpoints.updateMember(m.id),
        data: {'is_active': !m.isActive});
    _load();
  }

  Future<void> _removeMember(TeamMember m) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Member'),
        content: Text('Remove ${m.fullName} from the team?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    if (!mounted) return;
    final api = context.read<ApiClient>();
    await api.delete(Endpoints.deleteMember(m.id));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Team')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _inviteMember,
        backgroundColor: AppColors.emerald,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add),
        label: const Text('Invite'),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.emerald))
          : _members.isEmpty
              ? const EmptyState(
                  icon: Icons.group_outlined,
                  title: 'No team members yet',
                  subtitle: 'Invite agents and admins to help manage conversations.',
                )
              : RefreshIndicator(
                  color: AppColors.emerald,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _members.length,
                    itemBuilder: (_, i) => _buildMemberCard(_members[i]),
                  ),
                ),
    );
  }

  Widget _buildMemberCard(TeamMember m) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor:
              m.isActive ? AppColors.emeraldPale : AppColors.slate200,
          child: Text(
            m.fullName.isNotEmpty ? m.fullName[0].toUpperCase() : '?',
            style: TextStyle(
              color:
                  m.isActive ? AppColors.emeraldDark : AppColors.slate400,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        title: Text(m.fullName,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${m.email}  |  ${m.role}',
            style: TextStyle(fontSize: 12, color: AppColors.slate500)),
        trailing: PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'toggle') _toggleActive(m);
            if (v == 'remove') _removeMember(m);
            if (v.startsWith('role:')) _updateRole(m, v.substring(5));
          },
          itemBuilder: (_) => [
            PopupMenuItem(
                value: 'toggle',
                child: Text(m.isActive ? 'Deactivate' : 'Activate')),
            const PopupMenuItem(value: 'role:ADMIN', child: Text('Set Admin')),
            const PopupMenuItem(value: 'role:AGENT', child: Text('Set Agent')),
            const PopupMenuItem(
                value: 'role:VIEWER', child: Text('Set Viewer')),
            const PopupMenuItem(
              value: 'remove',
              child: Text('Remove', style: TextStyle(color: AppColors.error)),
            ),
          ],
        ),
      ),
    );
  }
}
