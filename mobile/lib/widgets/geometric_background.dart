// Kept for backward compat — no longer used in main screens.
import 'package:flutter/material.dart';
class GeometricBackground extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;
  final Color? patternColor;
  const GeometricBackground({super.key, required this.child,
      this.backgroundColor, this.patternColor});
  @override Widget build(BuildContext context) =>
      Container(color: backgroundColor ?? Colors.transparent, child: child);
}
