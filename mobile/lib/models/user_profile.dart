import 'user_role.dart';

/// Profile returned by GET /api/me.
class UserProfile {
  final String uid;
  final String firstName;
  final String lastName;
  final String name;
  final String email;
  final String phone;
  final UserRole role;
  final bool blocked;
  final bool emailVerified;
  final int ecoPoints;
  final Map<String, dynamic>? shop;

  const UserProfile({
    required this.uid,
    this.firstName = '',
    this.lastName = '',
    required this.name,
    required this.email,
    this.phone = '',
    required this.role,
    this.blocked = false,
    this.emailVerified = true,
    this.ecoPoints = 0,
    this.shop,
  });

  bool get shopApproved => shop?['approved'] == true;
  String get displayName => name.trim().isNotEmpty ? name.trim() : '$firstName $lastName'.trim();
  String get shopName => (shop?['name'] as String?) ?? '';

  factory UserProfile.fromJson(Map<String, dynamic> j, String uid) {
    final roleStr = j['role'] as String? ?? 'student';
    final shop = j['shop'] is Map ? Map<String, dynamic>.from(j['shop'] as Map) : null;
    UserRole role;
    if (roleStr == 'admin') {
      role = UserRole.admin;
    } else if (roleStr == 'merchant') {
      role = (shop?['approved'] == true) ? UserRole.merchant : UserRole.merchantPending;
    } else {
      role = UserRole.student;
    }
    final name = (j['name'] as String?) ?? '';
    final parts = name.trim().split(RegExp(r'\s+'));
    return UserProfile(
      uid: uid,
      firstName: (j['firstName'] as String?) ?? (parts.isNotEmpty ? parts.first : ''),
      lastName: (j['lastName'] as String?) ?? (parts.length > 1 ? parts.sublist(1).join(' ') : ''),
      name: name,
      email: (j['email'] as String?) ?? '',
      phone: (j['phone'] as String?) ?? '',
      role: role,
      blocked: (j['blocked'] as bool?) ?? false,
      // Accounts created before e-mail verification existed have no field → treated as verified.
      emailVerified: j['emailVerified'] != false,
      ecoPoints: (j['ecoPoints'] as num?)?.toInt() ?? 0,
      shop: shop,
    );
  }
}
