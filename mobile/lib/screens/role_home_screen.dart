import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/app_theme.dart';
import '../models/user_role.dart';
import '../services/auth_service.dart';
import '../services/role_service.dart';
import '../widgets/app_card.dart';
import '../widgets/state_views.dart';
import '../widgets/ui.dart';
import 'admin/admin_home_screen.dart';
import 'auth/verify_email_screen.dart';
import 'merchant/merchant_home_screen.dart';
import 'student/student_home_screen.dart';
import 'profile_screen.dart';

class RoleHomeScreen extends StatefulWidget {
  final User user;
  const RoleHomeScreen({super.key, required this.user});
  @override State<RoleHomeScreen> createState() => _State();
}

class _State extends State<RoleHomeScreen> {
  late Future<Session> _fut;
  @override void initState() { super.initState(); _fut = RoleService().fetchSession(widget.user); }
  void _reload() => setState(() => _fut = RoleService().fetchSession(widget.user));

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Session>(
      future: _fut,
      builder: (ctx, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: LoadingView(message: 'Loading your space…'));
        }
        if (snap.hasError) {
          return Scaffold(body: SafeArea(child: Column(children: [
            Expanded(child: ErrorView(message: snap.error.toString(), onRetry: _reload)),
            TextButton.icon(onPressed: () => AuthService().signOut(),
                icon: const Icon(Icons.logout_rounded), label: const Text('Sign out')),
            const SizedBox(height: 16),
          ])));
        }
        final s = snap.data!;
        if (s.needsEmailVerification) {
          return VerifyEmailScreen(email: s.profile!.email, onVerified: _reload);
        }
        switch (s.role) {
          case UserRole.student:  return StudentHomeScreen(user: widget.user, role: s.role);
          case UserRole.merchant: return MerchantHomeScreen(user: widget.user, role: s.role);
          case UserRole.admin:    return AdminHomeScreen(user: widget.user);
          case UserRole.merchantPending: return _PendingScreen(user: widget.user, onRefresh: _reload);
        }
      });
  }
}

class _PendingScreen extends StatelessWidget {
  final User user;
  final VoidCallback onRefresh;
  const _PendingScreen({required this.user, required this.onRefresh});
  @override
  Widget build(BuildContext ctx) => Scaffold(
    body: AuroraBackground(child: SafeArea(child: Column(children: [
      TabHeader(title: 'CampusSave', subtitle: 'Merchant space',
        trailing: ValueListenableBuilder(valueListenable: currentProfile, builder: (_, p, _) =>
          AvatarButton(name: p?.displayName ?? user.displayName ?? '?',
            onTap: () => Navigator.of(ctx).push(MaterialPageRoute(
                builder: (_) => ProfileScreen(user: user, role: UserRole.merchantPending)))))),
      Expanded(child: Center(child: Padding(padding: const EdgeInsets.all(28),
        child: AppCard(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
          const IconBubble(icon: Icons.hourglass_top_rounded, color: AppColors.amber, size: 88)
              .animate(onPlay: (c) => c.repeat()).rotate(duration: 2400.ms, curve: Curves.easeInOutBack),
          const SizedBox(height: 20),
          Text('Pending approval', style: Theme.of(ctx).textTheme.headlineMedium),
          const SizedBox(height: 10),
          const Text('Your shop is waiting for admin validation.\nTap the button below once you have been approved.',
              textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSub, height: 1.5)),
          const SizedBox(height: 24),
          PrimaryButton(label: 'Check again', icon: Icons.refresh_rounded, onPressed: onRefresh),
          const SizedBox(height: 10),
          TextButton.icon(onPressed: () => AuthService().signOut(),
              icon: const Icon(Icons.logout_rounded, color: AppColors.error),
              label: const Text('Sign out', style: TextStyle(color: AppColors.error))),
        ])).animate().fadeIn().slideY(begin: 0.06),
      ))),
    ]))),
  );
}
