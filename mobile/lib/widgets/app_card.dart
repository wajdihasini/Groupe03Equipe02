import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// Scales its child down slightly while pressed — gives every tappable
/// surface a tactile, modern feel.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  const Pressable({super.key, required this.child, this.onTap, this.scale = 0.97});
  @override State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;
  void _set(bool v) { if (widget.onTap != null && _down != v) setState(() => _down = v); }
  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTapDown: (_) => _set(true),
    onTapUp: (_) => _set(false),
    onTapCancel: () => _set(false),
    onTap: widget.onTap,
    child: AnimatedScale(
      scale: _down ? widget.scale : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: widget.child,
    ),
  );
}

/// Universal surface: big radius, hairline border, soft diffuse shadow.
class AppCard extends StatelessWidget {
  final Widget child;
  final Color? color;
  final Gradient? gradient;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final double radius;
  final bool border;

  const AppCard({
    super.key, required this.child,
    this.color, this.gradient, this.onTap,
    this.padding = const EdgeInsets.all(18),
    this.radius = AppRadius.lg,
    this.border = true,
  });

  @override
  Widget build(BuildContext context) {
    final bg = color ?? AppColors.surface;
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? bg : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(radius),
        border: border && gradient == null && bg == AppColors.surface
            ? Border.all(color: AppColors.line.withAlpha(160)) : null,
        boxShadow: [
          BoxShadow(color: AppColors.ink.withAlpha(10), blurRadius: 24, offset: const Offset(0, 10)),
        ],
      ),
      child: child,
    );
    return onTap == null ? card : Pressable(onTap: onTap, child: card);
  }
}

/// Full-width primary call to action.
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final Color? color;
  final Color? foreground;
  final double? width;
  final double height;

  const PrimaryButton({
    super.key, required this.label,
    this.onPressed, this.icon, this.isLoading = false,
    this.color, this.foreground, this.width, this.height = 56,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !isLoading;
    final bg = color ?? AppColors.ink;
    final fg = foreground ?? (bg.computeLuminance() > 0.5 ? AppColors.ink : Colors.white);
    return Pressable(
      onTap: enabled ? onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: width ?? double.infinity,
        height: height,
        decoration: BoxDecoration(
          color: enabled ? bg : AppColors.line,
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: enabled ? [BoxShadow(color: bg.withAlpha(70), blurRadius: 18, offset: const Offset(0, 8))] : null,
        ),
        alignment: Alignment.center,
        child: isLoading
            ? SizedBox(height: 22, width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: fg))
            : Row(mainAxisSize: MainAxisSize.min, children: [
                if (icon != null) ...[Icon(icon, size: 20, color: enabled ? fg : AppColors.textSub), const SizedBox(width: 10)],
                Flexible(child: Text(label, overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800,
                        color: enabled ? fg : AppColors.textSub, letterSpacing: -0.2))),
              ]),
      ),
    );
  }
}

/// Rounded pill label.
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final Color? textColor;
  final IconData? icon;

  const StatusBadge({super.key, required this.label, required this.color,
      this.textColor, this.icon});

  @override
  Widget build(BuildContext context) {
    final fg = textColor ?? (color.computeLuminance() > 0.55 ? AppColors.ink : Colors.white);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(100)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 13, color: fg), const SizedBox(width: 4)],
        Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: fg, letterSpacing: 0.1)),
      ]),
    );
  }
}

/// Bento-style statistic tile.
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? color;
  final String? subtitle;

  const StatCard({super.key, required this.label, required this.value,
      required this.icon, this.color, this.subtitle});

  @override
  Widget build(BuildContext context) {
    final col = color ?? AppColors.primary;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        IconBubble(icon: icon, color: col),
        const Spacer(),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
          child: Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800,
              color: AppColors.ink, letterSpacing: -0.8))),
        const SizedBox(height: 2),
        Text(label, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: AppColors.textSub, fontWeight: FontWeight.w600)),
        if (subtitle != null) Text(subtitle!,
            style: const TextStyle(fontSize: 11, color: AppColors.textSub)),
      ]),
    );
  }
}

/// Tinted rounded square holding an icon.
class IconBubble extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const IconBubble({super.key, required this.icon, required this.color, this.size = 42});
  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(color: color.withAlpha(30), borderRadius: BorderRadius.circular(size * 0.34)),
    child: Icon(icon, color: color, size: size * 0.5),
  );
}
