class AnalyticsOverview {
  final int totalConversations;
  final int totalMessages;
  final int totalOrders;
  final int totalCustomers;
  final int activeConversations;
  final double responseRate;

  AnalyticsOverview({
    this.totalConversations = 0,
    this.totalMessages = 0,
    this.totalOrders = 0,
    this.totalCustomers = 0,
    this.activeConversations = 0,
    this.responseRate = 0.0,
  });

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) =>
      AnalyticsOverview(
        totalConversations: json['total_conversations'] as int? ?? 0,
        totalMessages: json['total_messages'] as int? ?? 0,
        totalOrders: json['total_orders'] as int? ?? 0,
        totalCustomers: json['total_customers'] as int? ?? 0,
        activeConversations: json['active_conversations'] as int? ?? 0,
        responseRate: (json['response_rate'] as num?)?.toDouble() ?? 0.0,
      );
}
