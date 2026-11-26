import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import '../../models/user_role.dart';
import '../../widgets/ui.dart';
import '../shared/impact_screen.dart';
import '../shared/profile_avatar.dart';
import 'admin_dashboard_tab.dart';
import 'merchants_tab.dart';
import 'users_tab.dart';

class AdminHomeScreen extends StatefulWidget {
  final User user;
  const AdminHomeScreen({super.key, required this.user});
  @override State<AdminHomeScreen> createState() => _State();
}

class _State extends State<AdminHomeScreen> {
  int _idx = 0;
  static const _titles = ['Overview', 'Users', 'Merchants'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: SafeArea(bottom: false, child: Column(children: [
        TabHeader(
          subtitle: 'Admin console',
          title: _titles[_idx],
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(icon: const Icon(Icons.public_rounded), tooltip: 'Community impact',
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ImpactScreen()))),
            ProfileAvatar(user: widget.user, role: UserRole.admin),
          ]),
        ),
        Expanded(child: MediaQuery.removePadding(context: context, removeTop: true, child: Padding(
          padding: const EdgeInsets.only(bottom: FloatingPillNav.reservedHeight - 16),
          child: IndexedStack(index: _idx, children: const [AdminDashboardTab(), UsersTab(), MerchantsTab()]),
        ))),
      ])),
      bottomNavigationBar: FloatingPillNav(
        index: _idx,
        onChanged: (i) => setState(() => _idx = i),
        items: const [
          PillNavItem(icon: Icons.space_dashboard_outlined, activeIcon: Icons.space_dashboard_rounded, label: 'Overview'),
          PillNavItem(icon: Icons.people_outline_rounded, activeIcon: Icons.people_rounded, label: 'Users'),
          PillNavItem(icon: Icons.storefront_outlined, activeIcon: Icons.storefront_rounded, label: 'Merchants'),
        ],
      ),
    );
  }
}
