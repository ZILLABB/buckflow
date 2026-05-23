class TeamMember {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final bool isActive;
  final String createdAt;

  TeamMember({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.isActive = true,
    required this.createdAt,
  });

  factory TeamMember.fromJson(Map<String, dynamic> json) => TeamMember(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['full_name'] as String,
        role: json['role'] as String,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: json['created_at'] as String,
      );
}

class ActivityLog {
  final String id;
  final String userId;
  final String? userName;
  final String action;
  final String? details;
  final String createdAt;

  ActivityLog({
    required this.id,
    required this.userId,
    this.userName,
    required this.action,
    this.details,
    required this.createdAt,
  });

  factory ActivityLog.fromJson(Map<String, dynamic> json) => ActivityLog(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        action: json['action'] as String,
        details: json['details'] as String?,
        createdAt: json['created_at'] as String,
      );
}
