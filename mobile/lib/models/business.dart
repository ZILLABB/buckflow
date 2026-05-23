class Business {
  final String id;
  final String name;
  final String businessType;
  final String category;
  final String? description;
  final String? phoneNumber;
  final String? whatsappPhoneId;
  final String? aiSystemPrompt;
  final String? aiModel;
  final bool humanOnlyMode;
  final bool autoReplyOutsideHours;
  final String? outsideHoursMessage;
  final String? operatingHours;
  final int monthlyConversationLimit;
  final int monthlyAiLimit;
  final int conversationsUsed;
  final int aiMessagesUsed;

  Business({
    required this.id,
    required this.name,
    required this.businessType,
    required this.category,
    this.description,
    this.phoneNumber,
    this.whatsappPhoneId,
    this.aiSystemPrompt,
    this.aiModel,
    this.humanOnlyMode = false,
    this.autoReplyOutsideHours = false,
    this.outsideHoursMessage,
    this.operatingHours,
    this.monthlyConversationLimit = 50,
    this.monthlyAiLimit = 200,
    this.conversationsUsed = 0,
    this.aiMessagesUsed = 0,
  });

  bool get isProduct =>
      businessType == 'product' || businessType == 'hybrid';
  bool get isService =>
      businessType == 'service' || businessType == 'hybrid';
  bool get isWhatsAppConnected =>
      whatsappPhoneId != null && whatsappPhoneId!.isNotEmpty;

  factory Business.fromJson(Map<String, dynamic> json) => Business(
        id: json['id'] as String,
        name: json['name'] as String,
        businessType: json['business_type'] as String? ?? 'product',
        category: json['category'] as String? ?? 'other',
        description: json['description'] as String?,
        phoneNumber: json['phone_number'] as String?,
        whatsappPhoneId: json['whatsapp_phone_id'] as String?,
        aiSystemPrompt: json['ai_system_prompt'] as String?,
        aiModel: json['ai_model'] as String?,
        humanOnlyMode: json['human_only_mode'] as bool? ?? false,
        autoReplyOutsideHours:
            json['auto_reply_outside_hours'] as bool? ?? false,
        outsideHoursMessage: json['outside_hours_message'] as String?,
        operatingHours: json['operating_hours'] as String?,
        monthlyConversationLimit:
            json['monthly_conversation_limit'] as int? ?? 50,
        monthlyAiLimit: json['monthly_ai_limit'] as int? ?? 200,
        conversationsUsed: json['conversations_used'] as int? ?? 0,
        aiMessagesUsed: json['ai_messages_used'] as int? ?? 0,
      );
}
