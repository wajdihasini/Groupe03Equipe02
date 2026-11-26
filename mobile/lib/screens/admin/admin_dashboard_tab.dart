import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../repositories/admin_repository.dart';
import '../../widgets/neo_widgets.dart';
import '../../widgets/state_views.dart';

class AdminDashboardTab extends StatefulWidget {
  const AdminDashboardTab({super.key});
  @override State<AdminDashboardTab> createState() => _State();
}

class _State extends State<AdminDashboardTab> {
  late Future<Map<String, dynamic>> _fut;

  @override void initState() { super.initState(); _load(); }
  void _load() {
    _fut = AdminRepository().fetchStats();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _fut,
      builder: (_, snap) {
        if (!snap.hasData && !snap.hasError) return const LoadingView();
        if (snap.hasError)
          return ErrorView(message: snap.error.toString(), onRetry: _load);
        final d = snap.data!;
        final rev = (d['revenue'] as num?)?.toDouble() ?? 0.0;
        return ListView(padding: const EdgeInsets.all(16), children: [
          NeoCard(color: AppColors.black, padding: const EdgeInsets.all(20),
            child: Row(children: [
              Container(width: 48, height: 48,
                decoration: BoxDecoration(color: AppColors.yellow,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white, width: 2)),
                child: const Icon(Icons.admin_panel_settings, color: AppColors.black)),
              const SizedBox(width: 14),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('ADMIN PANEL', style: TextStyle(color: Colors.white,
                    fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: 1)),
                Text('Platform Overview',
                    style: TextStyle(color: Colors.white60, fontSize: 12)),
              ]),
            ])),
          const SizedBox(height: 20),
          const Text('Platform Stats', style: TextStyle(
              fontWeight: FontWeight.w900, fontSize: 18)),
          const SizedBox(height: 12),
          GridView.count(crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
            children: [
              StatCard(label: 'Students',
                  value: '${d['students']  ?? 0}', icon: Icons.school,
                  color: AppColors.teal),
              StatCard(label: 'Merchants',
                  value: '${d['merchants'] ?? 0}', icon: Icons.storefront,
                  color: AppColors.green),
              StatCard(label: 'Active offers',
                  value: '${d['activeOffers']    ?? 0}', icon: Icons.local_offer,
                  color: AppColors.orange),
              StatCard(label: 'Paid orders',
                  value: '${d['orders']    ?? 0}', icon: Icons.receipt_long,
                  color: AppColors.purple),
            ]),
          const SizedBox(height: 12),
          GridView.count(crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
            children: [
              StatCard(label: 'Revenue (TND)',
                  value: rev.toStringAsFixed(2),
                  icon: Icons.payments, color: AppColors.yellow),
              StatCard(label: 'Pending approval',
                  value: '${d['shopsPending']   ?? 0}',
                  icon: Icons.pending_actions, color: AppColors.red),
            ]),
          const SizedBox(height: 20),
          NeoCard(color: AppColors.cardYellow, padding: const EdgeInsets.all(16),
            child: const Column(crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              Text('Info', style: TextStyle(fontWeight: FontWeight.w900)),
              SizedBox(height: 8),
              _Info(icon: Icons.admin_panel_settings,
                  text: 'Admin role: set role="admin" in Firestore manually'),
              _Info(icon: Icons.warning_amber,
                  text: 'Set PAYMENT_PROVIDER=mock in .env for local testing'),
              _Info(icon: Icons.eco, text: 'CampusSave – Fight food waste!'),
            ])),
        ]);
      });
  }
}

class _Info extends StatelessWidget {
  final IconData icon; final String text;
  const _Info({required this.icon, required this.text});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(children: [
      Icon(icon, size: 15, color: Colors.black54),
      const SizedBox(width: 8),
      Expanded(child: Text(text,
          style: const TextStyle(fontSize: 12, color: Colors.black54))),
    ]));
}
