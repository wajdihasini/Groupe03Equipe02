import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/order.dart';
import '../../models/user_role.dart';
import '../../repositories/order_repository.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/order_status.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'scan_flow.dart';

/// Orders received by the shop (GET /api/my/orders), refreshed live.
class MerchantOrdersTab extends StatefulWidget {
  final User user;
  final UserRole role;
  final bool visible;
  final int refreshSignal;
  final ValueChanged<int>? onToCollect;
  final VoidCallback? onCollected;
  const MerchantOrdersTab({super.key, required this.user, required this.role, this.visible = true,
      this.refreshSignal = 0, this.onToCollect, this.onCollected});
  @override State<MerchantOrdersTab> createState() => _State();
}

class _State extends State<MerchantOrdersTab> {
  final _repo = OrderRepository();
  List<Order>? _orders;
  String? _error;
  bool _loading = false;
  int _seg = 0; // 0 = to pick up, 1 = awaiting payment, 2 = history
  Timer? _poll;
  int _tick = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 6), (_) {
      _tick++;
      if (widget.visible || _tick % 5 == 0) _load(silent: true);
    });
  }

  @override
  void didUpdateWidget(covariant MerchantOrdersTab old) {
    super.didUpdateWidget(old);
    if (old.refreshSignal != widget.refreshSignal) _load(silent: true);
  }

  @override void dispose() { _poll?.cancel(); super.dispose(); }

  Future<void> _load({bool silent = false}) async {
    if (_loading) return;
    _loading = true;
    try {
      final list = await _repo.fetchMine();
      if (!mounted) return;
      final before = {for (final o in _orders ?? <Order>[]) o.id: o.status};
      setState(() { _orders = list; _error = null; });
      widget.onToCollect?.call(list.where((o) => o.status == OrderStatus.paid).length);
      if (_orders != null && before.isNotEmpty) {
        final fresh = list.where((o) => o.status == OrderStatus.paid && before[o.id] != OrderStatus.paid).toList();
        if (fresh.isNotEmpty) {
          showSnack(context, fresh.length == 1
              ? 'New paid order: ${fresh.first.title} ×${fresh.first.quantity}'
              : '${fresh.length} new paid orders', success: true);
        }
      }
    } on OrderException catch (e) {
      if (mounted && (!silent || _orders == null)) setState(() => _error = e.message);
    } finally {
      _loading = false;
    }
  }

  Future<void> _scan() async {
    if (await scanAndValidate(context)) {
      widget.onCollected?.call();
      _load(silent: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final all = _orders ?? [];
    final toPick = all.where((o) => o.status == OrderStatus.paid).toList();
    final waiting = all.where((o) => o.status == OrderStatus.pendingPayment).toList();
    final history = all.where((o) => !o.status.isActive).toList();
    final list = [toPick, waiting, history][_seg];

    return SafeArea(bottom: false, child: Column(children: [
      TabHeader(subtitle: 'Incoming', title: 'Orders', trailing: ProfileAvatar(user: widget.user, role: widget.role)),
      Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 6), child: SegmentedPills(
        labels: ['Pick up (${toPick.length})', 'Unpaid (${waiting.length})', 'History'],
        index: _seg, onChanged: (i) => setState(() => _seg = i))),
      const Padding(
        padding: EdgeInsets.fromLTRB(22, 2, 22, 6),
        child: Row(children: [
          LiveDot(),
          SizedBox(width: 6),
          Text('Live — new orders appear automatically',
              style: TextStyle(fontSize: 12, color: AppColors.textSub, fontWeight: FontWeight.w600)),
        ]),
      ),
      Expanded(child: Builder(builder: (_) {
        if (_orders == null && _error == null) return const SkeletonList(count: 4, itemHeight: 110);
        if (_orders == null) return ErrorView(message: _error!, onRetry: _load);
        if (list.isEmpty) {
          return RefreshIndicator(onRefresh: _load, child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [SizedBox(height: 360, child: EmptyView(
              icon: [Icons.shopping_bag_outlined, Icons.hourglass_empty_rounded, Icons.history_rounded][_seg],
              message: ['Nothing to hand over right now.', 'No unpaid reservations.', 'No past orders yet.'][_seg],
            ))],
          ));
        }
        return RefreshIndicator(onRefresh: _load, child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 6, 16, FloatingPillNav.reservedHeight),
          itemCount: list.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (_, i) => _Card(order: list[i], onScan: _scan)
              .animate().fadeIn(delay: (40 * (i % 10)).ms).slideY(begin: 0.06),
        ));
      })),
    ]));
  }
}

class _Card extends StatelessWidget {
  final Order order;
  final VoidCallback onScan;
  const _Card({required this.order, required this.onScan});
  @override
  Widget build(BuildContext context) {
    final s = order.status;
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          AvatarButton(name: order.studentName.isEmpty ? '?' : order.studentName, size: 46),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(order.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
            Text('${order.studentName.isEmpty ? 'Student' : order.studentName}  ·  ×${order.quantity}',
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, color: AppColors.textSub)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(fPrice(order.total), style: const TextStyle(fontWeight: FontWeight.w900)),
            Text(fTime(order.paidAt ?? order.createdAt), style: const TextStyle(fontSize: 11.5, color: AppColors.textSub)),
          ]),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          OrderStatusBadge(s),
          const Spacer(),
          if (s == OrderStatus.pendingPayment && order.expiresAt != null)
            CountdownText(until: order.expiresAt!, prefix: 'Expires in ',
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.amber, fontSize: 12.5)),
          if (s != OrderStatus.pendingPayment)
            Text(fDate(order.createdAt), style: const TextStyle(fontSize: 12, color: AppColors.textSub)),
        ]),
        if (s == OrderStatus.paid) ...[
          const SizedBox(height: 12),
          PrimaryButton(label: 'Scan pickup pass', icon: Icons.qr_code_scanner_rounded,
              color: AppColors.primary, height: 50, onPressed: onScan),
        ],
      ]),
    );
  }
}
