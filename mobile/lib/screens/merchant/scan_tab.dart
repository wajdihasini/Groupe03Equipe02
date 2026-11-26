import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/user_role.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'scan_flow.dart';

/// Landing page of the "Scan" tab: one big button that opens the camera.
class ScanTab extends StatelessWidget {
  final User user;
  final UserRole role;
  final int toCollect;
  final VoidCallback onCollected;
  const ScanTab({super.key, required this.user, required this.role, required this.toCollect, required this.onCollected});

  Future<void> _scan(BuildContext context) async {
    if (await scanAndValidate(context)) onCollected();
  }

  @override
  Widget build(BuildContext context) => SafeArea(bottom: false, child: Column(children: [
    TabHeader(subtitle: 'Pickup counter', title: 'Scan a pass', trailing: ProfileAvatar(user: user, role: role)),
    Expanded(child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, FloatingPillNav.reservedHeight), children: [
      Pressable(onTap: () => _scan(context), child: Container(
        height: 340,
        decoration: BoxDecoration(gradient: AppColors.brandGradient, borderRadius: BorderRadius.circular(AppRadius.xl),
            boxShadow: [BoxShadow(color: AppColors.primary.withAlpha(70), blurRadius: 30, offset: const Offset(0, 14))]),
        child: Stack(alignment: Alignment.center, children: [
          for (final s in [240.0, 180.0])
            Container(width: s, height: s, decoration: BoxDecoration(shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withAlpha(25), width: 2)))
                .animate(onPlay: (c) => c.repeat()).scaleXY(begin: 0.85, end: 1.1, duration: 1800.ms)
                .fadeOut(duration: 1800.ms),
          Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 110, height: 110,
              decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(36)),
              child: const Icon(Icons.qr_code_scanner_rounded, size: 58, color: AppColors.ink),
            ),
            const SizedBox(height: 20),
            const Text('Tap to scan', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('Validate a student\'s pickup pass', style: TextStyle(color: Colors.white.withAlpha(180))),
          ]),
        ]),
      )).animate().fadeIn().scaleXY(begin: 0.96),
      const SizedBox(height: 16),
      AppCard(child: Row(children: [
        IconBubble(icon: Icons.shopping_bag_rounded, color: toCollect > 0 ? AppColors.coral : AppColors.textSub, size: 50),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$toCollect order${toCollect == 1 ? '' : 's'} waiting',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const Text('Paid and ready to be picked up', style: TextStyle(color: AppColors.textSub, fontSize: 12.5)),
        ])),
      ])),
      const SizedBox(height: 12),
      const AppCard(color: AppColors.card4, border: false, padding: EdgeInsets.all(14), child: Row(children: [
        Icon(Icons.tips_and_updates_outlined, color: AppColors.sky),
        SizedBox(width: 10),
        Expanded(child: Text('EcoPoints are credited to the student automatically when you validate.',
            style: TextStyle(fontSize: 12.5, height: 1.4))),
      ])),
    ])),
  ]));
}
