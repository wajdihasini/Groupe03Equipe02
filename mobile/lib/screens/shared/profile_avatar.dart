import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../models/user_profile.dart';
import '../../models/user_role.dart';
import '../../services/role_service.dart';
import '../../widgets/ui.dart';
import '../profile_screen.dart';

/// Avatar in the top-right of every tab; opens the profile page.
class ProfileAvatar extends StatelessWidget {
  final User user;
  final UserRole role;
  const ProfileAvatar({super.key, required this.user, required this.role});

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<UserProfile?>(
    valueListenable: currentProfile,
    builder: (_, p, _) => AvatarButton(
      name: p?.displayName ?? user.displayName ?? '?',
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ProfileScreen(user: user, role: role))),
    ),
  );
}

/// Shop name of the signed-in merchant (for headers).
String currentShopLabel() {
  final n = currentProfile.value?.shopName ?? '';
  return n.isEmpty ? 'Your shop' : n;
}

/// First name of the signed-in user (for greetings).
String firstNameOf(User user) {
  final p = currentProfile.value;
  final n = (p?.firstName.isNotEmpty == true ? p!.firstName : (user.displayName ?? '')).trim();
  return n.isEmpty ? 'there' : n.split(' ').first;
}
