import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../services/api_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';

/// Community impact (GET /api/impact — public).
class ImpactScreen extends StatefulWidget {
  const ImpactScreen({super.key});
  @override State<ImpactScreen> createState() => _State();
}

class _State extends State<ImpactScreen> {
  static const double _co2PerMeal = 2.5; // indicative kg CO2e per meal saved

  Map<String, dynamic>? _data;
  String? _error;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final v = await ApiService().get('/api/impact', auth: false);
      if (mounted) setState(() => _data = Map<String, dynamic>.from(v as Map));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Community impact'), backgroundColor: Colors.transparent),
      extendBodyBehindAppBar: true,
      body: AuroraBackground(child: SafeArea(child: Builder(builder: (_) {
        if (_data == null && _error == null) return const LoadingView(message: 'Loading impact…');
        if (_data == null) return ErrorView(message: _error!, onRetry: _load);
        final d = _data!;
        int i(String k) => (d[k] as num?)?.toInt() ?? 0;
        final meals = i('meals');
        final savings = (d['savings'] as num?)?.toDouble() ?? 0;
        final co2 = meals * _co2PerMeal;
        final tiles = <Widget>[
          AppCard(
            gradient: AppColors.brandGradient,
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Together on campus', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: meals.toDouble()), duration: const Duration(milliseconds: 1000),
                curve: Curves.easeOutCubic,
                builder: (_, v, _) => Text('${v.round()}', style: const TextStyle(color: Colors.white,
                    fontSize: 60, fontWeight: FontWeight.w900, letterSpacing: -2.5, height: 1)),
              ),
              const Text('meals rescued from the bin 🎉', style: TextStyle(color: AppColors.lime,
                  fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 10),
              const Text('Only orders actually collected are counted.',
                  style: TextStyle(color: Colors.white60, fontSize: 12.5)),
            ]),
          ),
          SizedBox(height: 300, child: GridView.count(
            crossAxisCount: 2, physics: const NeverScrollableScrollPhysics(), padding: EdgeInsets.zero,
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.15,
            children: [
              StatCard(label: 'Money saved', value: fPrice(savings), icon: Icons.savings_rounded, color: AppColors.primary),
              StatCard(label: 'Orders collected', value: '${i('orders')}', icon: Icons.check_circle_rounded, color: AppColors.violet),
              StatCard(label: 'Partner shops', value: '${i('shops')}', icon: Icons.storefront_rounded, color: AppColors.coral),
              StatCard(label: 'Students', value: '${i('students')}', icon: Icons.school_rounded, color: AppColors.sky),
            ],
          )),
          AppCard(color: AppColors.ink, border: false, padding: const EdgeInsets.all(20), child: Row(children: [
            const Text('🌍', style: TextStyle(fontSize: 40)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${co2.toStringAsFixed(1)} kg CO₂e', style: const TextStyle(color: AppColors.lime,
                  fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.6)),
              const Text('estimated emissions avoided', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              const Text('Based on ≈2.5 kg CO₂e per meal saved.', style: TextStyle(color: Colors.white54, fontSize: 11.5)),
            ])),
          ])),
        ];
        return RefreshIndicator(onRefresh: _load, child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          itemCount: tiles.length,
          separatorBuilder: (_, _) => const SizedBox(height: 14),
          itemBuilder: (_, k) => tiles[k].animate().fadeIn(delay: (80 * k).ms).slideY(begin: 0.06),
        ));
      }))),
    );
  }
}
