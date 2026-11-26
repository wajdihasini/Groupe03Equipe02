import '../models/user_profile.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// GET  /api/me            profile (+ shop for merchants)
/// PUT  /api/me            { firstName, lastName, phone, email }  (email change needs sign-in < 5 min)
/// POST /api/verify/send   send the 6-digit e-mail code
/// POST /api/verify/confirm { code }
class ProfileRepository {
  final ApiService _api;
  ProfileRepository({ApiService? api}) : _api = api ?? ApiService();

  Future<UserProfile> fetch() async {
    final uid = AuthService().currentUser?.uid ?? '';
    final data = await _api.get('/api/me');
    return UserProfile.fromJson(Map<String, dynamic>.from(data as Map), uid);
  }

  /// Returns true when the e-mail changed (the new address must then be verified).
  Future<bool> update({
    required UserProfile current,
    String? firstName,
    String? lastName,
    String? phone,
    String? email,
  }) async {
    final newEmail = (email ?? current.email).trim();
    await _api.put('/api/me', body: {
      'firstName': (firstName ?? current.firstName).trim(),
      'lastName': (lastName ?? current.lastName).trim(),
      'phone': (phone ?? current.phone).trim(),
      'email': newEmail,
    });
    final changed = newEmail.toLowerCase() != current.email.toLowerCase();
    if (firstName != null || lastName != null) {
      await AuthService().updateDisplayName('${(firstName ?? current.firstName).trim()} ${(lastName ?? current.lastName).trim()}');
    }
    if (changed) await AuthService().reload();
    return changed;
  }

  /// Returns the cooldown in seconds before a new code can be requested.
  Future<int> sendCode() async {
    final r = await _api.post('/api/verify/send', body: {});
    if (r is Map) {
      if (r['already'] == true) return 0;
      return (r['wait'] as num?)?.toInt() ?? 45;
    }
    return 45;
  }

  /// Returns true if the address is (now) verified.
  Future<bool> confirmCode(String code) async {
    final r = await _api.post('/api/verify/confirm', body: {'code': code.trim()});
    return r is Map && r['ok'] == true;
  }
}
