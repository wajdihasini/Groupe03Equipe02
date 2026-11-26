import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../repositories/api_statistics_repository.dart';
import '../../widgets/neo_widgets.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/state_views.dart';

class StudentStatsTab extends StatefulWidget {
  const StudentStatsTab({super.key});

  @override
  State<StudentStatsTab> createState() => _StudentStatsTabState();
}

class _StudentStatsTabState extends State<StudentStatsTab> {
  late Future<Map<String, dynamic>> _stats;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _stats = ApiStatisticsRepository().fetchOverview();
    });
  }

  int _number(Object? value) => value is num ? value.toInt() : 0;
  double _amount(Object? value) => value is num ? value.toDouble() : 0;

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: _stats,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const LoadingView();
      }
      if (snapshot.hasError) {
        return ErrorView(
          message: 'Could not load your impact yet.',
          onRetry: _load,
        );
      }
      final data = snapshot.data ?? const <String, dynamic>{};
      final statuses = data['statusCounts'] is Map
          ? Map<String, dynamic>.from(data['statusCounts'] as Map)
          : const <String, dynamic>{};
      final active =
          _number(statuses['pending_payment']) + _number(statuses['paid']);
      final completed = _number(statuses['collected']);
      final points = _number(data['ecoPoints']);
      final meals = _number(data['mealsSaved']);
      final savings = _amount(data['savings']);
      return RefreshIndicator(
        onRefresh: () async {
          _load();
          await _stats;
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            NeoCard(
              color: AppColors.blue,
              child: Row(
                children: [
                  const Icon(
                    Icons.eco_outlined,
                    color: AppColors.yellow,
                    size: 30,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Your impact',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '$points EcoPoints earned',
                          style: const TextStyle(color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.auto_awesome, color: AppColors.yellow),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: MediaQuery.sizeOf(context).width < 360 ? 1 : 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: [
                StatCard(
                  label: 'Meals saved',
                  value: '$meals',
                  icon: Icons.restaurant,
                  color: AppColors.cardGreen,
                ),
                StatCard(
                  label: 'Money saved',
                  value: '${savings.toStringAsFixed(2)} TND',
                  icon: Icons.savings_outlined,
                  color: AppColors.cardYellow,
                ),
                StatCard(
                  label: 'Active orders',
                  value: '$active',
                  icon: Icons.pending_actions,
                  color: AppColors.cardBlue,
                ),
                StatCard(
                  label: 'Picked up',
                  value: '$completed',
                  icon: Icons.check_circle_outline,
                  color: AppColors.cardOrange,
                ),
              ],
            ),
            const SizedBox(height: 16),
            NeoCard(
              color: AppColors.cardGreen,
              child: Row(
                children: [
                  const Icon(Icons.recycling_outlined, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      meals == 0
                          ? 'Reserve an offer and pick it up to start tracking your food-saving impact.'
                          : 'Your pickups kept $meals ${meals == 1 ? 'meal' : 'meals'} from going to waste.',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}
