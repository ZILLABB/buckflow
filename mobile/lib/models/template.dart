class MessageTemplate {
  final String id;
  final String name;
  final String content;
  final String? category;
  final bool isActive;
  final String createdAt;

  MessageTemplate({
    required this.id,
    required this.name,
    required this.content,
    this.category,
    this.isActive = true,
    required this.createdAt,
  });

  factory MessageTemplate.fromJson(Map<String, dynamic> json) =>
      MessageTemplate(
        id: json['id'] as String,
        name: json['name'] as String,
        content: json['content'] as String,
        category: json['category'] as String?,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: json['created_at'] as String,
      );
}
