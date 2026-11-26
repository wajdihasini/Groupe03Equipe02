import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_profile.dart';
import '../models/user_role.dart';
import '../repositories/profile_repository.dart';
import 'api_service.dart';

/// Profile of the signed-in user, shared by every screen (headers, profile page…).
final ValueNotifier<UserProfile?> currentProfile = ValueNotifier<UserProfile?>(null);

class Session {
  final UserRole role;
  final UserProfile? profile;
  const Session(this.role, this.profile);
  bool get needsEmailVerification => profile != null && !profile!.emailVerified;
}

class RoleService {
  /// GET /api/me is the source of truth; falls back to the cached role offline.
  Future<Session> fetchSession(User user) async {
    try {
      final p = await ProfileRepository().fetch();
      if (p.blocked) {
        await FirebaseAuth.instance.signOut();
        throw const ApiException('Account blocked by the administrator.');
      }
      currentProfile.value = p;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('role_${user.uid}', p.role.name);
      return Session(p.role, p);
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 401) rethrow; // blocked / no profile
      if (e.message.contains('blocked')) rethrow;
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    final cached = UserRole.fromString(prefs.getString('role_${user.uid}'));
    if (cached == null) throw const ApiException('Cannot reach the server. Check that the backend is running.');
    return Session(cached, currentProfile.value);
  }

  Future<UserRole> fetchRole(User user) async => (await fetchSession(user)).role;
}
