class User {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? businessId;

  User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.businessId,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['full_name'] as String,
        role: json['role'] as String,
        businessId: json['business_id'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role,
        'business_id': businessId,
      };
}

class AuthResponse {
  final String accessToken;
  final String tokenType;
  final User user;

  AuthResponse({
    required this.accessToken,
    required this.tokenType,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
        accessToken: json['access_token'] as String,
        tokenType: json['token_type'] as String,
        user: User.fromJson(json['user'] as Map<String, dynamic>),
      );
}
