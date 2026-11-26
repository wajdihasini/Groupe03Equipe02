import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shimmer/shimmer.dart';
import '../config/app_theme.dart';
import 'app_card.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Floating pill bottom navigation
// ─────────────────────────────────────────────────────────────────────────────

class PillNavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int badge;
  const PillNavItem({required this.icon, required this.activeIcon, required this.label, this.badge = 0});
}

/// Glassy capsule floating above the content. The active item expands into a
/// dark pill showing its label; the others are icon-only.
/// Use as `Scaffold.bottomNavigationBar` together with `extendBody: true`.
class FloatingPillNav extends StatelessWidget {
  final List<PillNavItem> items;
  final int index;
  final ValueChanged<int> onChanged;
  const FloatingPillNav({super.key, required this.items, required this.index, required this.onChanged});

  /// Space content must leave at the bottom so the nav never hides it.
  static const double reservedHeight = 110;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(100),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
            child: Container(
              height: 70,
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: Colors.white.withAlpha(215),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: Colors.white.withAlpha(200)),
                boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(30), blurRadius: 30, offset: const Offset(0, 12))],
              ),
              child: Row(children: [
                for (var i = 0; i < items.length; i++)
                  _PillButton(
                    item: items[i], active: i == index,
                    onTap: () { if (i != index) { HapticFeedback.selectionClick(); onChanged(i); } },
                  ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _PillButton extends StatelessWidget {
  final PillNavItem item;
  final bool active;
  final VoidCallback onTap;
  const _PillButton({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: active ? 5 : 2,
      child: Semantics(
        button: true, selected: active, label: item.label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 320),
            curve: Curves.easeOutCubic,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            decoration: BoxDecoration(
              color: active ? AppColors.ink : Colors.transparent,
              borderRadius: BorderRadius.circular(100),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Badge(
                isLabelVisible: item.badge > 0,
                label: Text('${item.badge}'),
                backgroundColor: AppColors.coral,
                child: Icon(active ? item.activeIcon : item.icon,
                    size: 23, color: active ? AppColors.lime : AppColors.textSub),
              ),
              if (active) Flexible(
                child: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(item.label, maxLines: 1, overflow: TextOverflow.fade, softWrap: false,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13.5)),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Headers & layout
// ─────────────────────────────────────────────────────────────────────────────

/// Large editorial header used at the top of each tab.
class TabHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? leading;
  const TabHeader({super.key, required this.title, this.subtitle, this.trailing, this.leading});

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 16, 8),
      child: Row(children: [
        if (leading != null) ...[leading!, const SizedBox(width: 12)],
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (subtitle != null)
            Text(subtitle!, style: t.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
          Text(title, style: t.headlineLarge),
        ])),
        ?trailing,
      ]),
    );
  }
}

/// Section title with optional action on the right.
class SectionTitle extends StatelessWidget {
  final String title;
  final String? action;
  final VoidCallback? onAction;
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 12),
    child: Row(children: [
      Expanded(child: Text(title, style: Theme.of(context).textTheme.headlineSmall)),
      if (action != null)
        GestureDetector(onTap: onAction,
          child: Text(action!, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 13))),
    ]),
  );
}

/// Gradient initials avatar, tappable.
class AvatarButton extends StatelessWidget {
  final String name;
  final VoidCallback? onTap;
  final double size;
  final Gradient gradient;
  const AvatarButton({super.key, required this.name, this.onTap, this.size = 46,
      this.gradient = const LinearGradient(colors: [AppColors.lime, Color(0xFF6EE7B7)])});

  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      width: size, height: size,
      decoration: BoxDecoration(
        gradient: gradient, shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(25), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      alignment: Alignment.center,
      child: Text(initials(name), style: TextStyle(fontSize: size * 0.36, fontWeight: FontWeight.w800, color: AppColors.ink)),
    ),
  );
}

/// Soft blurred colour blobs behind content (aurora / mesh look).
class AuroraBackground extends StatelessWidget {
  final Widget child;
  final List<Color> colors;
  const AuroraBackground({super.key, required this.child,
      this.colors = const [Color(0x55C8F169), Color(0x3348D1A0), Color(0x227B61FF)]});
  @override
  Widget build(BuildContext context) => Stack(children: [
    const Positioned.fill(child: ColoredBox(color: AppColors.bg)),
    Positioned(top: -120, right: -80, child: _blob(colors[0], 300)),
    Positioned(top: 160, left: -140, child: _blob(colors[1], 280)),
    Positioned(bottom: -60, right: -60, child: _blob(colors[2], 260)),
    Positioned.fill(child: child),
  ]);

  Widget _blob(Color c, double s) => IgnorePointer(
    child: ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
      child: Container(width: s, height: s, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loaders
// ─────────────────────────────────────────────────────────────────────────────

class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  const SkeletonBox({super.key, this.width, required this.height, this.radius = AppRadius.md});
  @override
  Widget build(BuildContext context) => Container(
    width: width, height: height,
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(radius)),
  );
}

/// Shimmering placeholder list shown while data loads.
class SkeletonList extends StatelessWidget {
  final int count;
  final double itemHeight;
  final EdgeInsets padding;
  const SkeletonList({super.key, this.count = 4, this.itemHeight = 120,
      this.padding = const EdgeInsets.fromLTRB(16, 8, 16, FloatingPillNav.reservedHeight)});
  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
    baseColor: AppColors.surface2,
    highlightColor: Colors.white,
    child: ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: padding,
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (_, _) => SkeletonBox(height: itemHeight, radius: AppRadius.lg),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small interactive widgets
// ─────────────────────────────────────────────────────────────────────────────

/// − value + stepper.
class QtyStepper extends StatelessWidget {
  final int value;
  final int min;
  final int max;
  final ValueChanged<int>? onChanged;
  const QtyStepper({super.key, required this.value, this.min = 1, required this.max, this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData i, bool enabled, int next) => Pressable(
      onTap: enabled && onChanged != null ? () { HapticFeedback.lightImpact(); onChanged!(next); } : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 42, height: 42,
        decoration: BoxDecoration(
          color: enabled ? AppColors.ink : AppColors.line,
          shape: BoxShape.circle,
        ),
        child: Icon(i, size: 20, color: enabled ? Colors.white : AppColors.textSub),
      ),
    );
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(100)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        btn(Icons.remove_rounded, value > min, value - 1),
        SizedBox(width: 46, child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          transitionBuilder: (c, a) => ScaleTransition(scale: a, child: c),
          child: Text('$value', key: ValueKey(value), textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
        )),
        btn(Icons.add_rounded, value < max, value + 1),
      ]),
    );
  }
}

/// Live "mm:ss" countdown to [until]; calls [onDone] once when it hits zero.
class CountdownText extends StatefulWidget {
  final DateTime until;
  final TextStyle? style;
  final VoidCallback? onDone;
  final String prefix;
  const CountdownText({super.key, required this.until, this.style, this.onDone, this.prefix = ''});
  @override State<CountdownText> createState() => _CountdownTextState();
}

class _CountdownTextState extends State<CountdownText> {
  Timer? _t;
  bool _fired = false;
  @override void initState() {
    super.initState();
    _t = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
      if (!_fired && DateTime.now().isAfter(widget.until)) { _fired = true; widget.onDone?.call(); }
    });
  }
  @override void dispose() { _t?.cancel(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    var left = widget.until.difference(DateTime.now());
    if (left.isNegative) left = Duration.zero;
    final m = left.inMinutes.toString().padLeft(2, '0');
    final s = (left.inSeconds % 60).toString().padLeft(2, '0');
    return Text('${widget.prefix}$m:$s', style: widget.style);
  }
}

/// Pulsing "LIVE" dot used to signal auto-refreshing data.
class LiveDot extends StatefulWidget {
  final Color color;
  const LiveDot({super.key, this.color = AppColors.eco});
  @override State<LiveDot> createState() => _LiveDotState();
}
class _LiveDotState extends State<LiveDot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();
  @override void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => SizedBox(width: 14, height: 14, child: AnimatedBuilder(
    animation: _c,
    builder: (_, _) => Stack(alignment: Alignment.center, children: [
      Container(width: 6 + 8 * _c.value, height: 6 + 8 * _c.value,
          decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color.withAlpha((120 * (1 - _c.value)).round()))),
      Container(width: 7, height: 7, decoration: BoxDecoration(shape: BoxShape.circle, color: widget.color)),
    ]),
  ));
}

/// Segmented control with an animated sliding thumb.
class SegmentedPills extends StatelessWidget {
  final List<String> labels;
  final int index;
  final ValueChanged<int> onChanged;
  const SegmentedPills({super.key, required this.labels, required this.index, required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
    height: 48,
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(100)),
    child: LayoutBuilder(builder: (_, c) {
      final w = c.maxWidth / labels.length;
      return Stack(children: [
        AnimatedPositioned(
          duration: const Duration(milliseconds: 280), curve: Curves.easeOutCubic,
          left: w * index, top: 0, bottom: 0, width: w,
          child: Container(decoration: BoxDecoration(
            color: AppColors.surface, borderRadius: BorderRadius.circular(100),
            boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(18), blurRadius: 10, offset: const Offset(0, 3))],
          )),
        ),
        Row(children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onChanged(i),
              child: Center(child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5,
                    color: i == index ? AppColors.ink : AppColors.textSub),
                child: Text(labels[i]),
              )),
            )),
        ]),
      ]);
    }),
  );
}

/// Shows a modern bottom sheet with consistent padding & keyboard handling.
Future<T?> showAppSheet<T>(BuildContext context, {required Widget child}) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
        child: SingleChildScrollView(child: child),
      ),
    );

/// Snack helper.
void showSnack(BuildContext context, String message, {bool error = false, bool success = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(children: [
        Icon(error ? Icons.error_outline_rounded : success ? Icons.check_circle_rounded : Icons.info_outline_rounded,
            color: error ? const Color(0xFFFF9A9A) : success ? AppColors.lime : Colors.white, size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
      ]),
    ));
}
