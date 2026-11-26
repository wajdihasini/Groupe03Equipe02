import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../repositories/admin_repository.dart';
import '../../widgets/neo_widgets.dart';
import '../../widgets/state_views.dart';

class MerchantsTab extends StatefulWidget {
  const MerchantsTab({super.key});
  @override State<MerchantsTab> createState() => _State();
}
class _State extends State<MerchantsTab> {
  final _repo = AdminRepository();
  late Future<List<Map<String, dynamic>>> _fut;

  @override void initState() { super.initState(); _load(); }
  void _load() {
    _fut = _repo.fetchShops();
    setState(() {});
  }

  Future<void> _setApproved(Map<String, dynamic> shop, bool approved) async {
    final id   = shop['id']   as String? ?? shop['uid'] as String;
    final name = shop['name'] as String? ?? id;
    try {
      await _repo.setShopApproved(id, approved: approved);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('"$name" ${approved ? "validated" : "rejected"}.'),
        backgroundColor: approved ? AppColors.green : AppColors.red));
      _load();
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
        final all      = snap.data ?? [];
        final pending  = all.where((s) => s['approved'] != true).toList();
        final approved = all.where((s) => s['approved'] == true).toList();

        if (all.isEmpty)
          return const EmptyView(
              message: 'No merchant registrations yet.',
              icon: Icons.storefront_outlined);

        return RefreshIndicator(
          onRefresh: () async => _load(),
          child: ListView(padding: const EdgeInsets.all(16), children: [
            if (pending.isNotEmpty) ...[
              const Text('⏳ Pending approval',
                  style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              ...pending.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: NeoCard(
                  color: AppColors.cardYellow,
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s['name'] ?? '—',
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    if ((s['address'] ?? '').toString().isNotEmpty)
                      Text(s['address'].toString(),
                          style: const TextStyle(
                              fontSize: 12, color: Colors.black54)),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: NeoButton(
                          label: 'Validate', icon: Icons.check,
                          onPressed: () => _setApproved(s, true))),
                      const SizedBox(width: 10),
                      NeoOutlineButton(
                          label: 'Reject',
                          borderColor: AppColors.red,
                          textColor: AppColors.red,
                          onPressed: () => _setApproved(s, false)),
                    ]),
                  ])))),
              const SizedBox(height: 16),
            ],
            if (approved.isNotEmpty) ...[
              const Text('✅ Validated',
                  style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              ...approved.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: NeoCard(
                  color: AppColors.cardGreen,
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    const Icon(Icons.storefront, color: AppColors.black),
                    const SizedBox(width: 10),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(s['name'] ?? '—',
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text(s['address'] ?? '',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.black54)),
                    ])),
                    NeoOutlineButton(
                        label: 'Revoke',
                        borderColor: Colors.orange,
                        textColor: Colors.orange,
                        onPressed: () => _setApproved(s, false)),
                  ])))),
            ],
          ]));
      });
  }
}
