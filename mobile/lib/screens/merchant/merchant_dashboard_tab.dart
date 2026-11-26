import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/user_role.dart';
import '../../services/api_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/mini_bar_chart.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/impact_screen.dart';
import '../shared/profile_avatar.dart';

/// Merchant statistics (GET /api/stats, role = merchant).
class MerchantDashboardTab extends StatefulWidget {
  final User user;
  final UserRole role;
  final int refreshSignal;
  const MerchantDashboardTab({super.key, required this.user, required this.role, this.refreshSignal = 0});
  @override State<MerchantDashboardTab> createState() => _State();
}

class _State extends State<MerchantDashboardTab> {
  Map<String, dynamic>? _d;
  String? _error;

  @override void initState() { super.initState(); _load(); }
  @override void didUpdateWidget(covariant MerchantDashboardTab old) {
    super.didUpdateWidget(old);
    if (old.refreshSignal != widget.refreshSignal) _load();
  }

  Future<void> _load() async {
    try {
      final d = await ApiService().get('/api/stats');
      if (mounted) setState(() { _d = Map<String, dynamic>.from(d as Map); _error = null; });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  int _i(Object? v) => (v as num?)?.toInt() ?? 0;

  @override
  Widget build(BuildContext context) => SafeArea(bottom: false, child: Column(children: [
    TabHeader(subtitle: currentShopLabel(), title: 'Statistics',
        trailing: ProfileAvatar(user: widget.user, role: widget.role)),
    Expanded(child: Builder(builder: (_) {
      if (_d == null && _error == null) return const SkeletonList(count: 4, itemHeight: 130);
      if (_d == null) return ErrorView(message: _error!, onRetry: _load);
      return _content();
    })),
  ]));

  Widget _content() {
    final d = _d!;
    final revenue = (d['revenue'] as num?)?.toDouble() ?? 0;
    final byDay = (d['byDay'] as List?) ?? [];
    final topOffers = (d['topOffers'] as List?) ?? [];
    final week = byDay.fold<double>(0, (s, e) => s + (((e as Map)['revenue'] as num?) ?? 0).toDouble());

    final tiles = <Widget>[
      AppCard(
        gradient: AppColors.brandGradient,
        padding: const EdgeInsets.all(22),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Total revenue', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: revenue), duration: const Duration(milliseconds: 900), curve: Curves.easeOutCubic,
            builder: (_, v, _) => Text(fPrice(v), style: const TextStyle(color: Colors.white, fontSize: 36,
                fontWeight: FontWeight.w900, letterSpacing: -1.2)),
          ),
          const SizedBox(height: 10),
          StatusBadge(label: '${fPrice(week)} this week', color: AppColors.lime, icon: Icons.trending_up_rounded),
        ]),
      ),
      SizedBox(height: 280, child: GridView.count(
        crossAxisCount: 2, physics: const NeverScrollableScrollPhysics(), padding: EdgeInsets.zero,
        crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.25,
        children: [
          StatCard(label: 'Paid orders', value: '${_i(d['orders'])}', icon: Icons.receipt_long_rounded, color: AppColors.violet),
          StatCard(label: 'To hand over', value: '${_i(d['toCollect'])}', icon: Icons.shopping_bag_rounded, color: AppColors.coral),
          StatCard(label: 'Meals saved', value: '${_i(d['mealsSaved'])}', icon: Icons.eco_rounded, color: AppColors.primary),
          StatCard(label: 'Discount given', value: fPrice((d['savings'] as num?)?.toDouble() ?? 0),
              icon: Icons.local_offer_rounded, color: AppColors.amber),
        ],
      )),
      if (byDay.isNotEmpty) AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Text('Revenue', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          Spacer(),
          StatusBadge(label: 'Last 7 days', color: AppColors.surface2, textColor: AppColors.textSub),
        ]),
        const SizedBox(height: 16),
        MiniBarChart(
          values: byDay.map((e) => (((e as Map)['revenue'] as num?) ?? 0).toDouble()).toList(),
          labels: byDay.map((e) => weekdayLabel(((e as Map)['date'] ?? '').toString())).toList(),
          format: (v) => v.toStringAsFixed(v >= 10 ? 0 : 1),
        ),
      ])),
      if (topOffers.isNotEmpty) ...[
        const SectionTitle('🔥 Best sellers'),
        AppCard(padding: const EdgeInsets.symmetric(vertical: 6), child: Column(children: [
          for (var k = 0; k < topOffers.length; k++) Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(children: [
              Container(width: 30, height: 30, alignment: Alignment.center,
                decoration: BoxDecoration(color: k == 0 ? AppColors.lime : AppColors.surface2, shape: BoxShape.circle),
                child: Text('${k + 1}', style: const TextStyle(fontWeight: FontWeight.w900))),
              const SizedBox(width: 12),
              Expanded(child: Text('${(topOffers[k] as Map)['title']}', maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
              Text('${(topOffers[k] as Map)['quantity']} sold',
                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
            ]),
          ),
        ])),
      ],
      AppCard(
        color: AppColors.ink, border: false,
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ImpactScreen())),
        child: const Row(children: [
          IconBubble(icon: Icons.public_rounded, color: AppColors.lime, size: 48),
          SizedBox(width: 14),
          Expanded(child: Text('See the community impact', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
          Icon(Icons.arrow_forward_rounded, color: AppColors.lime),
        ]),
      ),
    ];

    return RefreshIndicator(onRefresh: _load, child: ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, FloatingPillNav.reservedHeight),
      itemCount: tiles.length,
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (_, i) => tiles[i].animate().fadeIn(delay: (50 * i).ms).slideY(begin: 0.06),
    ));
  }
}
