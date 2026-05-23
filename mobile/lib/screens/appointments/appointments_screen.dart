import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../models/appointment.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/empty_state.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<Appointment> _appointments = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final api = context.read<ApiClient>();
    try {
      final params = _filter != 'all' ? '?status=$_filter' : '';
      final data =
          await api.get<List<dynamic>>('${Endpoints.appointments}$params');
      _appointments = data
          .map((j) => Appointment.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _updateStatus(String id, String status) async {
    final api = context.read<ApiClient>();
    try {
      await api.patch(
        Endpoints.appointmentStatus(id),
        data: {'status': status},
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Appointment $status'),
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
        title: const Text('Appointments'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children:
                  ['all', 'pending', 'confirmed', 'completed', 'no_show']
                      .map((f) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(f == 'all'
                                  ? 'All'
                                  : f == 'no_show'
                                      ? 'No Show'
                                      : f[0].toUpperCase() + f.substring(1)),
                              selected: _filter == f,
                              onSelected: (_) {
                                setState(() => _filter = f);
                                _load();
                              },
                              selectedColor: AppColors.emeraldPale,
                              checkmarkColor: AppColors.emeraldDark,
                            ),
                          ))
                      .toList(),
            ),
          ),

          // Appointments list
          Expanded(
            child: _loading
                ? const Center(
                    child:
                        CircularProgressIndicator(color: AppColors.emerald))
                : _appointments.isEmpty
                    ? const EmptyState(
                        icon: Icons.calendar_today_outlined,
                        title: 'No appointments',
                        subtitle:
                            'Appointments booked through WhatsApp appear here.',
                      )
                    : RefreshIndicator(
                        color: AppColors.emerald,
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _appointments.length,
                          itemBuilder: (_, i) =>
                              _buildAppointmentCard(_appointments[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(Appointment apt) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    apt.customerName ?? 'Unknown Customer',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                ),
                StatusBadge(status: apt.status),
              ],
            ),
            const SizedBox(height: 8),

            // Service + scheduled time
            if (apt.serviceName != null)
              Row(
                children: [
                  const Icon(Icons.spa_outlined,
                      size: 16, color: AppColors.emerald),
                  const SizedBox(width: 6),
                  Text(
                    apt.serviceName!,
                    style:
                        TextStyle(fontSize: 13, color: AppColors.slate600),
                  ),
                ],
              ),
            if (apt.scheduledAt != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.schedule,
                      size: 16, color: AppColors.gold),
                  const SizedBox(width: 6),
                  Text(
                    Formatters.dateTime(apt.scheduledAt!),
                    style: TextStyle(
                        fontSize: 13,
                        color: AppColors.slate600,
                        fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],
            if (apt.customerPhone != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.phone_outlined,
                      size: 16, color: AppColors.slate400),
                  const SizedBox(width: 6),
                  Text(
                    apt.customerPhone!,
                    style:
                        TextStyle(fontSize: 12, color: AppColors.slate500),
                  ),
                ],
              ),
            ],
            if (apt.notes != null && apt.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                apt.notes!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 13,
                    color: AppColors.slate500,
                    fontStyle: FontStyle.italic),
              ),
            ],

            // Action buttons
            if (apt.status == 'pending' || apt.status == 'confirmed') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (apt.status == 'pending')
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            _updateStatus(apt.id, 'confirmed'),
                        child: const Text('Confirm'),
                      ),
                    ),
                  if (apt.status == 'confirmed') ...[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            _updateStatus(apt.id, 'completed'),
                        child: const Text('Complete'),
                      ),
                    ),
                  ],
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () =>
                        _updateStatus(apt.id, 'no_show'),
                    style: TextButton.styleFrom(
                        foregroundColor: AppColors.error),
                    child: const Text('No Show'),
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
