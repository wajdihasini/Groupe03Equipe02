import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/app_theme.dart';
import 'app_card.dart';

class LoadingView extends StatelessWidget {
  final String? message;
  const LoadingView({super.key, this.message});
  @override
  Widget build(BuildContext context) => Center(child: Column(
    mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 64, height: 64,
        decoration: BoxDecoration(gradient: AppColors.brandGradient, borderRadius: BorderRadius.circular(22)),
        child: const Icon(Icons.eco_rounded, color: AppColors.lime, size: 32),
      ).animate(onPlay: (c) => c.repeat(reverse: true))
          .scaleXY(begin: 0.9, end: 1.05, duration: 700.ms, curve: Curves.easeInOut),
      if (message != null) ...[
        const SizedBox(height: 18),
        Text(message!, style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w600)),
      ],
    ]));
}

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorView({super.key, required this.message, this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: SingleChildScrollView(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const IconBubble(icon: Icons.wifi_off_rounded, color: AppColors.error, size: 84),
      const SizedBox(height: 18),
      const Text('Something went wrong', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      const SizedBox(height: 6),
      Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSub)),
      if (onRetry != null) ...[
        const SizedBox(height: 22),
        PrimaryButton(label: 'Try again', icon: Icons.refresh_rounded, width: 180, onPressed: onRetry),
      ],
    ]).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05),
  ));
}

class EmptyView extends StatelessWidget {
  final String message;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;
  const EmptyView({super.key, required this.message,
      this.icon = Icons.inbox_outlined, this.actionLabel, this.onAction});
  @override
  Widget build(BuildContext context) => Center(child: SingleChildScrollView(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 96, height: 96,
        decoration: BoxDecoration(color: AppColors.lime.withAlpha(90), borderRadius: BorderRadius.circular(32)),
        child: Icon(icon, size: 44, color: AppColors.primaryDk),
      ),
      const SizedBox(height: 18),
      Text(message, textAlign: TextAlign.center,
          style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w600, height: 1.5)),
      if (onAction != null && actionLabel != null) ...[
        const SizedBox(height: 20),
        PrimaryButton(label: actionLabel!, width: 220, onPressed: onAction),
      ],
    ]).animate().fadeIn(duration: 300.ms).scaleXY(begin: 0.96),
  ));
}
