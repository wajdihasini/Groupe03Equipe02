import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../repositories/admin_repository.dart';
import '../../widgets/neo_widgets.dart';
import '../../widgets/state_views.dart';

class UsersTab extends StatefulWidget {
  const UsersTab({super.key});
  @override State<UsersTab> createState() => _State();
}
class _State extends State<UsersTab> {
  final _repo = AdminRepository();
  late Future<List<Map<String, dynamic>>> _fut;

  @override void initState() { super.initState(); _load(); }
  void _load() {
    _fut = _repo.fetchUsers();
    setState(() {});
  }

  Future<void> _toggle(Map<String, dynamic> u) async {
    final nowBlocked = u['blocked'] == true;
    final willBlock  = !nowBlocked;
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text(willBlock ? 'Block user' : 'Unblock user'),
      content: Text('${willBlock ? "Block" : "Unblock"} ${u['name'] ?? u['email']}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel')),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true),
            child: Text(willBlock ? 'Block' : 'Unblock')),
      ]));
    if (ok != true) return;
    try {
      await _repo.setUserBlocked(
          u['id'] as String? ?? u['uid'] as String,
          blocked: willBlock);
      if (mounted) _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fut,
      builder: (_, snap) {
        if (snap.connectionState != ConnectionState.done) return const LoadingView();
        if (snap.hasError)
          return ErrorView(message: snap.error.toString(), onRetry: _load);
        final users = snap.data ?? [];
        if (users.isEmpty)
          return const EmptyView(
              message: 'No users yet.', icon: Icons.people_outline);
        return RefreshIndicator(
          onRefresh: () async => _load(),
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: users.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final u       = users[i];
              final role    = u['role']    as String? ?? 'student';
              final blocked = u['blocked'] == true;
              Color col;
              switch (role) {
                case 'admin':    col = AppColors.purple; break;
                case 'merchant': col = AppColors.teal;   break;
                default:         col = AppColors.green;
              }
              IconData icon;
              switch (role) {
                case 'admin':    icon = Icons.admin_panel_settings; break;
                case 'merchant': icon = Icons.storefront;           break;
                default:         icon = Icons.school;
              }
              return NeoCard(
                color: blocked ? Colors.grey.shade100 : Colors.white,
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 12),
                child: Row(children: [
                  CircleAvatar(backgroundColor: col.withAlpha(30),
                    child: Icon(icon, color: col, size: 20)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(u['name'] ?? '—',
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text(u['email'] ?? '',
                        style: const TextStyle(
                            fontSize: 12, color: Colors.black54)),
                  ])),
                  NeoTag(label: role,
                      color: col.withAlpha(30), textColor: col),
                  if (role != 'admin') ...[
                    const SizedBox(width: 6),
                    IconButton(
                      icon: Icon(
                        blocked ? Icons.lock_open : Icons.block,
                        color: blocked ? AppColors.green : AppColors.red,
                        size: 20),
                      onPressed: () => _toggle(u)),
                  ],
                ]));
            }));
      });
  }
}
