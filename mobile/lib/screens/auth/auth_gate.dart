import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../models/user_profile.dart';
import '../../services/auth_service.dart';
import '../../services/role_service.dart';
import '../splash_screen.dart';
import '../role_home_screen.dart';
import 'login_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext c) => StreamBuilder<User?>(
    stream: AuthService().userChanges,
    builder: (c, snap) {
      if (snap.connectionState == ConnectionState.waiting) return const SplashScreen();
      final user = snap.data;
      if (user == null) return const LoginScreen();
      return ValueListenableBuilder<bool>(
        valueListenable: AuthService.registering,
        builder: (_, registering, _) {
          // Keep the login/register flow on screen until the profile exists.
          if (registering) return const LoginScreen();
          // Rebuild the role home when the e-mail changes or the profile becomes
          // unverified, so the verification screen shows up immediately.
          return ValueListenableBuilder<UserProfile?>(
            valueListenable: currentProfile,
            builder: (_, p, _) {
              final unverified = p != null && p.uid == user.uid && !p.emailVerified;
              return RoleHomeScreen(key: ValueKey('${user.uid}|${user.email}|$unverified'), user: user);
            },
          );
        },
      );
    });
}
