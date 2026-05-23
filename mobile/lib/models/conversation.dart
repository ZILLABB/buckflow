class Conversation {
  final String id;
  final String customerName;
  final String? customerPhone;
  final String? lastMessage;
  final String? lastMessageAt;
  final int messageCount;
  final String mode;
  final bool isArchived;
  final String? assignedTo;

  Conversation({
    required this.id,
    required this.customerName,
    this.customerPhone,
    this.lastMessage,
    this.lastMessageAt,
    this.messageCount = 0,
    this.mode = 'ai',
    this.isArchived = false,
    this.assignedTo,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        customerName: json['customer_name'] as String? ?? 'Unknown',
        customerPhone: json['customer_phone'] as String?,
        lastMessage: json['last_message'] as String?,
        lastMessageAt: json['last_message_at'] as String?,
        messageCount: json['message_count'] as int? ?? 0,
        mode: json['mode'] as String? ?? 'ai',
        isArchived: json['is_archived'] as bool? ?? false,
        assignedTo: json['assigned_to'] as String?,
      );
}

class Message {
  final String id;
  final String conversationId;
  final String direction;  // 'inbound' | 'outbound'
  final String content;
  final String? responseSource;
  final String createdAt;

  Message({
    required this.id,
    required this.conversationId,
    required this.direction,
    required this.content,
    this.responseSource,
    required this.createdAt,
  });

  bool get isInbound => direction == 'inbound';
  bool get isOutbound => direction == 'outbound';

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        conversationId: json['conversation_id'] as String,
        direction: json['direction'] as String,
        content: json['content'] as String? ?? '',
        responseSource: json['response_source'] as String?,
        createdAt: json['created_at'] as String,
      );
}
