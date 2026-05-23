class Plan {
  final String id;
  final String name;
  final double price;
  final int conversationLimit;
  final int aiMessagesLimit;
  final String aiModel;
  final List<String> features;
  final bool isActive;

  Plan({
    required this.id,
    required this.name,
    this.price = 0,
    this.conversationLimit = 50,
    this.aiMessagesLimit = 200,
    this.aiModel = 'gpt-4o-mini',
    this.features = const [],
    this.isActive = true,
  });

  factory Plan.fromJson(Map<String, dynamic> json) => Plan(
        id: json['id'] as String,
        name: json['name'] as String,
        price: (json['price'] as num?)?.toDouble() ?? 0,
        conversationLimit: json['conversation_limit'] as int? ?? 50,
        aiMessagesLimit: json['ai_messages_limit'] as int? ?? 200,
        aiModel: json['ai_model'] as String? ?? 'gpt-4o-mini',
        features: (json['features'] as List<dynamic>?)
                ?.map((f) => f.toString())
                .toList() ??
            [],
        isActive: json['is_active'] as bool? ?? true,
      );
}

class SubscriptionStatus {
  final String? planId;
  final String? planName;
  final String status;
  final String? currentPeriodEnd;
  final bool isActive;

  SubscriptionStatus({
    this.planId,
    this.planName,
    this.status = 'none',
    this.currentPeriodEnd,
    this.isActive = false,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) =>
      SubscriptionStatus(
        planId: json['plan_id'] as String?,
        planName: json['plan_name'] as String?,
        status: json['status'] as String? ?? 'none',
        currentPeriodEnd: json['current_period_end'] as String?,
        isActive: json['is_active'] as bool? ?? false,
      );
}
