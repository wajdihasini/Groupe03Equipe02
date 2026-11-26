import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../models/user_role.dart';
import '../../widgets/ui.dart';
import 'merchant_dashboard_tab.dart';
import 'merchant_orders_tab.dart';
import 'my_offers_tab.dart';
import 'scan_tab.dart';

class MerchantHomeScreen extends StatefulWidget {
  final User user;
  final UserRole role;
  const MerchantHomeScreen({super.key, required this.user, required this.role});
  @override State<MerchantHomeScreen> createState() => _State();
}

class _State extends State<MerchantHomeScreen> {
  static const _orders = 1;
  int _idx = 0;
  int _toCollect = 0;
  int _signal = 0;

  void _collected() => setState(() => _signal++);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _idx, children: [
        MyOffersTab(user: widget.user, role: widget.role),
        MerchantOrdersTab(user: widget.user, role: widget.role, visible: _idx == _orders, refreshSignal: _signal,
            onToCollect: (n) { if (n != _toCollect && mounted) setState(() => _toCollect = n); },
            onCollected: _collected),
        ScanTab(user: widget.user, role: widget.role, toCollect: _toCollect, onCollected: _collected),
        MerchantDashboardTab(user: widget.user, role: widget.role, refreshSignal: _signal),
      ]),
      bottomNavigationBar: FloatingPillNav(
        index: _idx,
        onChanged: (i) => setState(() { _idx = i; if (i == _orders) _signal++; }),
        items: [
          const PillNavItem(icon: Icons.storefront_outlined, activeIcon: Icons.storefront_rounded, label: 'Offers'),
          PillNavItem(icon: Icons.inbox_outlined, activeIcon: Icons.inbox_rounded, label: 'Orders', badge: _toCollect),
          const PillNavItem(icon: Icons.qr_code_scanner_outlined, activeIcon: Icons.qr_code_scanner_rounded, label: 'Scan'),
          const PillNavItem(icon: Icons.insights_outlined, activeIcon: Icons.insights_rounded, label: 'Stats'),
        ],
      ),
    );
  }
}
