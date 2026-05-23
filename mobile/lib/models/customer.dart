class Customer {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String status;
  final bool aiEnabled;
  final bool isFlagged;
  final List<String> tags;
  final int conversationCount;
  final int orderCount;
  final String createdAt;

  Customer({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.status = 'active',
    this.aiEnabled = true,
    this.isFlagged = false,
    this.tags = const [],
    this.conversationCount = 0,
    this.orderCount = 0,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Unknown',
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        status: json['status'] as String? ?? 'active',
        aiEnabled: json['ai_enabled'] as bool? ?? true,
        isFlagged: json['is_flagged'] as bool? ?? false,
        tags: (json['tags'] as List<dynamic>?)
                ?.map((t) => t.toString())
                .toList() ??
            [],
        conversationCount: json['conversation_count'] as int? ?? 0,
        orderCount: json['order_count'] as int? ?? 0,
        createdAt: json['created_at'] as String,
      );
}
