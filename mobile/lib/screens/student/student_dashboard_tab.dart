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

/// "Impact" tab: personal stats (GET /api/stats), leaderboard (GET /api/leaderboard)
/// and community figures (GET /api/impact).
class StudentDashboardTab extends StatefulWidget {
  final User user;
  final UserRole role;
  const StudentDashboardTab({super.key, required this.user, required this.role});
  @override State<StudentDashboardTab> createState() => _State();
}

class _State extends State<StudentDashboardTab> {
  Map<String, dynamic>? _stats, _lb, _impact;
  String? _error;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final api = ApiService();
      final res = await Future.wait([
        api.get('/api/stats'),
        api.get('/api/leaderboard'),
        api.get('/api/impact', auth: false).catchError((_) => <String, dynamic>{}),
      ]);
      if (!mounted) return;
      setState(() {
        _stats = Map<String, dynamic>.from(res[0] as Map);
        _lb = Map<String, dynamic>.from(res[1] as Map);
        _impact = Map<String, dynamic>.from(res[2] as Map);
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  int _i(Object? v) => (v as num?)?.toInt() ?? 0;

  @override
  Widget build(BuildContext context) {
    return SafeArea(bottom: false, child: Column(children: [
      TabHeader(subtitle: 'Your eco journey', title: 'Impact',
          trailing: ProfileAvatar(user: widget.user, role: widget.role)),
      Expanded(child: Builder(builder: (_) {
        if (_stats == null && _error == null) return const SkeletonList(count: 4, itemHeight: 130);
        if (_stats == null) return ErrorView(message: _error!, onRetry: _load);
        return _content();
      })),
    ]));
  }

  Widget _content() {
    final s = _stats!;
    final points = _i(s['ecoPoints']);
    final orders = _i(s['orders']); // paid + collected
    final meals = _i(s['mealsSaved']);
    final toCollect = _i(s['toCollect']);
    final savings = (s['savings'] as num?)?.toDouble() ?? 0;
    final byDay = (s['byDay'] as List?) ?? [];
    final top = (_lb?['top'] as List?) ?? [];
    final myRank = _lb?['myRank'] as int?;
    final lbTotal = _i(_lb?['total']);
    // Level every 100 EcoPoints.
    final level = points ~/ 100 + 1;
    final progress = (points % 100) / 100;

    final tiles = <Widget>[
      // Hero — EcoPoints & level
      AppCard(
        gradient: AppColors.brandGradient,
        padding: const EdgeInsets.all(22),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            StatusBadge(label: 'Level $level', color: AppColors.lime, icon: Icons.bolt_rounded),
            const Spacer(),
            if (myRank != null) StatusBadge(label: 'Rank #$myRank of $lbTotal',
                color: Colors.white.withAlpha(35), textColor: Colors.white, icon: Icons.emoji_events_rounded),
          ]),
          const SizedBox(height: 18),
          Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: points.toDouble()),
              duration: const Duration(milliseconds: 900), curve: Curves.easeOutCubic,
              builder: (_, v, _) => Text('${v.round()}', style: const TextStyle(color: Colors.white,
                  fontSize: 52, fontWeight: FontWeight.w900, letterSpacing: -2, height: 1)),
            ),
            const Padding(padding: EdgeInsets.only(left: 8, bottom: 8),
                child: Text('EcoPoints', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w700))),
          ]),
          const SizedBox(height: 16),
          ClipRRect(borderRadius: BorderRadius.circular(100), child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: progress), duration: const Duration(milliseconds: 900), curve: Curves.easeOutCubic,
            builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 10,
                backgroundColor: Colors.white.withAlpha(30), color: AppColors.lime),
          )),
          const SizedBox(height: 8),
          Text('${100 - points % 100} pts to level ${level + 1} · +10 per meal collected',
              style: const TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ]),
      ),
      // Bento stats
      SizedBox(height: 300, child: Row(children: [
        Expanded(child: Column(children: [
          Expanded(child: StatCard(label: 'Meals rescued', value: '$meals', icon: Icons.restaurant_rounded, color: AppColors.coral)),
          const SizedBox(height: 12),
          Expanded(child: StatCard(label: 'Orders', value: '$orders', icon: Icons.receipt_long_rounded, color: AppColors.violet)),
        ])),
        const SizedBox(width: 12),
        Expanded(child: Column(children: [
          Expanded(flex: 3, child: AppCard(
            color: AppColors.lime, border: false, padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const IconBubble(icon: Icons.savings_rounded, color: AppColors.primaryDk),
              const Spacer(),
              FittedBox(fit: BoxFit.scaleDown, child: Text(fPrice(savings), style: const TextStyle(
                  fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.8))),
              const Text('Money saved', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryDk)),
            ]),
          )),
          const SizedBox(height: 12),
          Expanded(flex: 2, child: StatCard(label: 'To collect', value: '$toCollect', icon: Icons.shopping_bag_rounded, color: AppColors.sky)),
        ])),
      ])),
      // Weekly chart
      if (byDay.isNotEmpty) AppCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Meals rescued', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const Spacer(),
          const StatusBadge(label: 'Last 7 days', color: AppColors.surface2, textColor: AppColors.textSub),
        ]),
        const SizedBox(height: 16),
        MiniBarChart(
          values: byDay.map((e) => (((e as Map)['meals'] as num?) ?? 0).toDouble()).toList(),
          labels: byDay.map((e) => weekdayLabel(((e as Map)['date'] ?? '').toString())).toList(),
          color: AppColors.primary,
        ),
      ])),
      // Community
      if (_impact != null && _impact!.isNotEmpty) AppCard(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ImpactScreen())),
        color: AppColors.ink, border: false,
        child: Row(children: [
          const IconBubble(icon: Icons.public_rounded, color: AppColors.lime, size: 50),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${_i(_impact!['meals'])} meals saved on campus',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15.5)),
            const SizedBox(height: 2),
            Text('≈ ${(_i(_impact!['meals']) * 2.5).toStringAsFixed(0)} kg CO₂e avoided · ${_i(_impact!['students'])} students',
                style: const TextStyle(color: Colors.white60, fontSize: 12.5)),
          ])),
          const Icon(Icons.arrow_forward_rounded, color: AppColors.lime),
        ]),
      ),
      // Leaderboard
      const SectionTitle('🏆 Leaderboard'),
      if (top.isEmpty)
        const AppCard(child: Text('No points yet — collect your first order to enter the ranking!',
            style: TextStyle(color: AppColors.textSub)))
      else ...[
        if (top.length >= 3) _Podium(top: top.take(3).map((e) => Map<String, dynamic>.from(e as Map)).toList()),
        if (top.length > 3 || top.length < 3) AppCard(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(children: [
            for (final e in (top.length >= 3 ? top.skip(3) : top))
              _LeaderRow(entry: Map<String, dynamic>.from(e as Map)),
          ]),
        ),
      ],
    ];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, FloatingPillNav.reservedHeight),
        itemCount: tiles.length,
        separatorBuilder: (_, _) => const SizedBox(height: 14),
        itemBuilder: (_, i) => tiles[i].animate().fadeIn(delay: (50 * i).ms, duration: 350.ms).slideY(begin: 0.06),
      ),
    );
  }
}

class _Podium extends StatelessWidget {
  final List<Map<String, dynamic>> top;
  const _Podium({required this.top});
  @override
  Widget build(BuildContext context) {
    Widget col(Map<String, dynamic> e, double h, Color c, String medal) => Expanded(child: Column(
      mainAxisAlignment: MainAxisAlignment.end, children: [
        Text(medal, style: const TextStyle(fontSize: 26)),
        const SizedBox(height: 4),
        Text(e['me'] == true ? 'You' : (e['name'] ?? '—').toString(), maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w800)),
        Text('${e['points']} pts', style: const TextStyle(fontSize: 12, color: AppColors.textSub, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: h), duration: const Duration(milliseconds: 700), curve: Curves.easeOutBack,
          builder: (_, v, _) => Container(
            height: v.clamp(0, 200),
            decoration: BoxDecoration(color: c, borderRadius: const BorderRadius.vertical(top: Radius.circular(18))),
          ),
        ),
      ]));
    return AppCard(
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 0),
      child: SizedBox(height: 210, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        col(top[1], 70, AppColors.surface2, '🥈'),
        const SizedBox(width: 10),
        col(top[0], 110, AppColors.lime, '🥇'),
        const SizedBox(width: 10),
        col(top[2], 50, AppColors.card3, '🥉'),
      ])),
    );
  }
}

class _LeaderRow extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _LeaderRow({required this.entry});
  @override
  Widget build(BuildContext context) {
    final rank = (entry['rank'] as num?)?.toInt() ?? 0;
    final points = (entry['points'] as num?)?.toInt() ?? 0;
    final name = entry['name'] as String? ?? '—';
    final isMe = entry['me'] == true;
    const medals = ['🥇', '🥈', '🥉'];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: isMe ? AppColors.lime.withAlpha(80) : Colors.transparent,
          borderRadius: BorderRadius.circular(AppRadius.md)),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(children: [
        SizedBox(width: 34, child: Text(rank >= 1 && rank <= 3 ? medals[rank - 1] : '#$rank',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textSub))),
        AvatarButton(name: name, size: 34),
        const SizedBox(width: 10),
        Expanded(child: Text(isMe ? '$name (you)' : name,
            style: TextStyle(fontWeight: isMe ? FontWeight.w800 : FontWeight.w600))),
        Text('$points pts', style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
      ]),
    );
  }
}
