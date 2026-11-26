import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// Rounded, animated bar chart; the highest bar is highlighted.
class MiniBarChart extends StatelessWidget {
  final List<double> values;
  final List<String> labels;
  final Color color;
  final String Function(double)? format;
  const MiniBarChart({super.key, required this.values, required this.labels,
      this.color = AppColors.primary, this.format});

  @override
  Widget build(BuildContext context) {
    final maxV = values.fold<double>(0, (a, b) => b > a ? b : a);
    final top = maxV <= 0 ? -1 : values.indexOf(maxV);
    return SizedBox(height: 150, child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(values.length, (i) {
        final ratio = maxV <= 0 ? 0.0 : values[i] / maxV;
        final hi = i == top;
        final v = values[i];
        return Expanded(child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
            Text(v == 0 ? '' : (format?.call(v) ?? v.round().toString()),
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: hi ? AppColors.ink : AppColors.textSub)),
            const SizedBox(height: 4),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: ratio),
              duration: Duration(milliseconds: 500 + i * 60),
              curve: Curves.easeOutCubic,
              builder: (_, r, _) => Container(
                height: 8 + r * 92,
                decoration: BoxDecoration(
                  color: hi ? AppColors.ink : (v > 0 ? color.withAlpha(110) : AppColors.surface2),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(labels[i], style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700,
                color: hi ? AppColors.ink : AppColors.textSub)),
          ]),
        ));
      }),
    ));
  }
}

/// Short weekday label from "YYYY-MM-DD".
String weekdayLabel(String ymd) {
  final d = DateTime.tryParse(ymd);
  if (d == null) return ymd;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[d.weekday - 1];
}
