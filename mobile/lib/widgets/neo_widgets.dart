// Compatibility aliases — new screens use app_card.dart / ui.dart directly.
export 'app_card.dart';
import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import 'app_card.dart';

class NeoCard extends AppCard {
  const NeoCard({super.key, required super.child, super.color,
      super.padding, super.onTap});
}

class NeoButton extends PrimaryButton {
  const NeoButton({super.key, required super.label, super.onPressed,
      super.icon, super.isLoading, super.color});
}

/// Secondary outlined button. Safe inside a Row (intrinsic width).
class NeoOutlineButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Color? borderColor;
  final Color? textColor;
  final IconData? icon;
  const NeoOutlineButton({super.key, required this.label,
      this.onPressed, this.borderColor, this.textColor, this.icon});
  @override
  Widget build(BuildContext c) {
    final fg = textColor ?? AppColors.ink;
    return Pressable(
      onTap: onPressed,
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: (borderColor ?? AppColors.line).withAlpha(onPressed == null ? 80 : 255), width: 1.4),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 18, color: fg), const SizedBox(width: 6)],
          Text(label, style: TextStyle(fontWeight: FontWeight.w800, color: onPressed == null ? fg.withAlpha(100) : fg)),
        ]),
      ),
    );
  }
}

class NeoTag extends StatusBadge {
  const NeoTag({super.key, required super.label, required super.color,
      super.textColor, super.icon});
}
