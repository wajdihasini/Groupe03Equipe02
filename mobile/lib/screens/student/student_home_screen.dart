import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../models/order.dart';
import '../../models/user_role.dart';
import '../../widgets/ui.dart';
import 'campus_radar_screen.dart';
import 'offers_tab.dart';
import 'orders_tab.dart';
import 'student_dashboard_tab.dart';
import 'surprise_basket_screen.dart';

/// Student shell: 5 tabs behind a floating pill navigation bar.
class StudentHomeScreen extends StatefulWidget {
  final User user;
  final UserRole role;
  const StudentHomeScreen({super.key, required this.user, required this.role});
  @override State<StudentHomeScreen> createState() => _State();
}

class _State extends State<StudentHomeScreen> {
  static const _offers = 0, _orders = 3;
  int _idx = _offers;
  int _ordersSignal = 0;
  int _activeOrders = 0;

  void _onReserved(Order o) {
    setState(() { _idx = _orders; _ordersSignal++; });
    showSnack(context, 'Reserved! Pay within 15 min to confirm.', success: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _idx, children: [
        OffersTab(user: widget.user, role: widget.role, onReserved: _onReserved),
        CampusRadarScreen(user: widget.user, role: widget.role, onReserved: _onReserved),
        SurpriseBasketScreen(user: widget.user, role: widget.role, onReserved: _onReserved),
        OrdersTab(user: widget.user, role: widget.role, refreshSignal: _ordersSignal,
            visible: _idx == _orders,
            onActiveCount: (n) { if (n != _activeOrders && mounted) setState(() => _activeOrders = n); },
            onBrowse: () => setState(() => _idx = _offers)),
        StudentDashboardTab(user: widget.user, role: widget.role),
      ]),
      bottomNavigationBar: FloatingPillNav(
        index: _idx,
        onChanged: (i) => setState(() { _idx = i; if (i == _orders) _ordersSignal++; }),
        items: [
          const PillNavItem(icon: Icons.local_offer_outlined, activeIcon: Icons.local_offer_rounded, label: 'Offers'),
          const PillNavItem(icon: Icons.radar_outlined, activeIcon: Icons.radar_rounded, label: 'Radar'),
          const PillNavItem(icon: Icons.card_giftcard_outlined, activeIcon: Icons.card_giftcard_rounded, label: 'Baskets'),
          PillNavItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Orders', badge: _activeOrders),
          const PillNavItem(icon: Icons.insights_outlined, activeIcon: Icons.insights_rounded, label: 'Impact'),
        ],
      ),
    );
  }
}
