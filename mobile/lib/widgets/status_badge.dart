import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: config.bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: config.fg,
        ),
      ),
    );
  }

  _StatusConfig _getConfig(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return _StatusConfig('Pending', AppColors.goldLight.withValues(alpha: 0.3), AppColors.goldDark);
      case 'confirmed':
        return _StatusConfig('Confirmed', AppColors.info.withValues(alpha: 0.12), AppColors.info);
      case 'processing':
        return _StatusConfig('Processing', AppColors.info.withValues(alpha: 0.12), AppColors.info);
      case 'shipped':
        return _StatusConfig('Shipped', AppColors.emeraldPale, AppColors.emeraldDark);
      case 'delivered':
      case 'completed':
        return _StatusConfig(status == 'delivered' ? 'Delivered' : 'Completed',
            AppColors.success.withValues(alpha: 0.12), AppColors.success);
      case 'cancelled':
        return _StatusConfig('Cancelled', AppColors.error.withValues(alpha: 0.12), AppColors.error);
      case 'no_show':
        return _StatusConfig('No Show', AppColors.error.withValues(alpha: 0.12), AppColors.error);
      default:
        return _StatusConfig(status, AppColors.slate200, AppColors.slate600);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color bg;
  final Color fg;
  _StatusConfig(this.label, this.bg, this.fg);
}
