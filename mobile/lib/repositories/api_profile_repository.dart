import '../models/user_profile.dart';
import '../services/api_service.dart';

class ApiProfileRepository {
  final _api = ApiService();

  Future<UserProfile> fetchProfile(String uid) async {
    final data = await _api.get('/api/me') as Map<String, dynamic>;
    return UserProfile.fromJson(data, uid);
  }

  Future<void> updateProfile({
    required String name,
    required String phone,
  }) async {
    await _api.put(
      '/api/me',
      body: {'name': name.trim(), 'phone': phone.trim()},
    );
  }
}
