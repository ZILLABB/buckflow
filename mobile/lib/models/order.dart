class Order {
  final String id;
  final String conversationId;
  final String? customerName;
  final String? customerPhone;
  final String status;
  final double totalAmount;
  final String? items;
  final String? notes;
  final String createdAt;

  Order({
    required this.id,
    required this.conversationId,
    this.customerName,
    this.customerPhone,
    required this.status,
    required this.totalAmount,
    this.items,
    this.notes,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        customerName: json['customer_name'] as String?,
        customerPhone: json['customer_phone'] as String?,
        status: json['status'] as String? ?? 'pending',
        totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
        items: json['items'] as String?,
        notes: json['notes'] as String?,
        createdAt: json['created_at'] as String,
      );
}
