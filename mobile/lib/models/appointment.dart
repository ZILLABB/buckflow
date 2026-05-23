class Appointment {
  final String id;
  final String? customerName;
  final String? customerPhone;
  final String? serviceName;
  final String status;
  final String? scheduledAt;
  final String? notes;
  final String createdAt;

  Appointment({
    required this.id,
    this.customerName,
    this.customerPhone,
    this.serviceName,
    this.status = 'pending',
    this.scheduledAt,
    this.notes,
    required this.createdAt,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: json['id'] as String,
        customerName: json['customer_name'] as String?,
        customerPhone: json['customer_phone'] as String?,
        serviceName: json['service_name'] as String?,
        status: json['status'] as String? ?? 'pending',
        scheduledAt: json['scheduled_at'] as String?,
        notes: json['notes'] as String?,
        createdAt: json['created_at'] as String,
      );
}

class ServiceItem {
  final String id;
  final String name;
  final String? description;
  final double price;
  final int? durationMinutes;
  final String? category;
  final bool isActive;

  ServiceItem({
    required this.id,
    required this.name,
    this.description,
    this.price = 0,
    this.durationMinutes,
    this.category,
    this.isActive = true,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) => ServiceItem(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        price: (json['price'] as num?)?.toDouble() ?? 0,
        durationMinutes: json['duration_minutes'] as int?,
        category: json['category'] as String?,
        isActive: json['is_active'] as bool? ?? true,
      );
}
