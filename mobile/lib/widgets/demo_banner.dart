import 'package:flutter/material.dart';
import '../config/app_theme.dart';

class DemoBanner extends StatelessWidget {
  const DemoBanner({super.key});
  @override Widget build(BuildContext context) => Container(
    color: AppColors.secondary.withAlpha(20),
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
    child: Row(children: [
      Icon(Icons.science_outlined, size: 15, color: AppColors.secondary),
      const SizedBox(width: 8),
      const Text('Demo mode – backend required',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
              color: AppColors.textSub)),
    ]));
}
