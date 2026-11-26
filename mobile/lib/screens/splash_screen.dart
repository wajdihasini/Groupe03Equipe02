import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/app_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Container(
      decoration: const BoxDecoration(gradient: AppColors.brandGradient),
      child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 108, height: 108,
          decoration: BoxDecoration(color: Colors.white.withAlpha(22), borderRadius: BorderRadius.circular(36),
              border: Border.all(color: Colors.white.withAlpha(40))),
          child: const Icon(Icons.eco_rounded, size: 58, color: AppColors.lime),
        ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 22),
        const Text('CampusSave', style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800,
            color: Colors.white, letterSpacing: -1.2)).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3),
        const SizedBox(height: 6),
        Text('Fight food waste on campus', style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 15))
            .animate().fadeIn(delay: 350.ms),
      ])),
    ),
  );
}
