import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:qr_flutter/qr_flutter.dart';
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
import 'order_confirmation_screen.dart';
import 'payment_screen.dart';

/// Student orders, refreshed live (polling GET /api/my/orders).
class OrdersTab extends StatefulWidget {
  final User user;
  final UserRole role;
  final int refreshSignal;
  final bool visible;
  final ValueChanged<int>? onActiveCount;
  final VoidCallback? onBrowse;
  const OrdersTab({super.key, required this.user, required this.role, this.refreshSignal = 0,
      this.visible = true, this.onActiveCount, this.onBrowse});
  @override State<OrdersTab> createState() => _State();
}

class _State extends State<OrdersTab> with WidgetsBindingObserver {
  final _repo = OrderRepository();
  List<Order>? _orders;
  String? _error;
  bool _loading = false;
  int _seg = 0; // 0 = active, 1 = history
  Timer? _poll;
  int _tick = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    // Live refresh: every 5 s while the tab is visible, every 30 s otherwise (badge).
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      _tick++;
      if (widget.visible || _tick % 6 == 0) _load(silent: true);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.resumed) _load(silent: true); // back from the payment page
  }

  @override
  void didUpdateWidget(covariant OrdersTab old) {
    super.didUpdateWidget(old);
    if (old.refreshSignal != widget.refreshSignal) {
      _load(silent: _orders != null);
      if (_seg != 0) setState(() => _seg = 0);
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (_loading) return;
    _loading = true;
    if (!silent && mounted) setState(() => _error = null);
    try {
      final list = await _repo.fetchMine();
      if (!mounted) return;
      final prev = {for (final o in _orders ?? <Order>[]) o.id: o.status};
      setState(() { _orders = list; _error = null; });
      widget.onActiveCount?.call(list.where((o) => o.status.isActive).length);
      // Notify transitions detected in real time.
      for (final o in list) {
        final before = prev[o.id];
        if (before == OrderStatus.paid && o.status == OrderStatus.collected) {
          showSnack(context, '“${o.title}” collected — EcoPoints earned! 🌱', success: true);
        } else if (before == OrderStatus.pendingPayment && o.status == OrderStatus.expired) {
          showSnack(context, 'Reservation “${o.title}” expired.', error: true);
        }
      }
    } on OrderException catch (e) {
      if (mounted && (!silent || _orders == null)) setState(() => _error = e.message);
    } finally {
      _loading = false;
    }
  }

  Future<void> _pay(Order order) async {
    final paid = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => PaymentScreen(order: order)));
    await _load(silent: true);
    if (paid != true || !mounted) return;
    final updated = await _repo.findById(order.id).catchError((_) => null);
    if (updated != null && updated.status == OrderStatus.paid && mounted) {
      await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => OrderConfirmationScreen(order: updated, justPaid: true)));
    }
    if (mounted) _load(silent: true);
  }

  Future<void> _cancel(Order order) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Cancel reservation?'),
      content: Text('“${order.title}” will be released for other students.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep it')),
        TextButton(onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel it', style: TextStyle(color: AppColors.error))),
      ]));
    if (ok != true) return;
    try {
      await _repo.cancel(order.id);
      if (mounted) showSnack(context, 'Reservation cancelled.');
    } on OrderException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
    _load(silent: true);
  }

  void _showQr(Order order) => Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => OrderConfirmationScreen(order: order)));

  @override
  Widget build(BuildContext context) {
    final all = _orders;
    final active = (all ?? []).where((o) => o.status.isActive).toList()
      ..sort((a, b) => a.status == b.status ? b.createdAt.compareTo(a.createdAt)
          : (a.status == OrderStatus.pendingPayment ? -1 : 1));
    final history = (all ?? []).where((o) => !o.status.isActive).toList();
    final list = _seg == 0 ? active : history;

    return SafeArea(bottom: false, child: Column(children: [
      TabHeader(
        subtitle: 'Your reservations',
        title: 'My orders',
        trailing: ProfileAvatar(user: widget.user, role: widget.role),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        child: Row(children: [
          Expanded(child: SegmentedPills(
            labels: ['Active${active.isEmpty ? '' : ' (${active.length})'}', 'History'],
            index: _seg, onChanged: (i) => setState(() => _seg = i))),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 6),
        child: Row(children: const [
          LiveDot(),
          SizedBox(width: 6),
          Text('Live — updates automatically', style: TextStyle(fontSize: 12, color: AppColors.textSub, fontWeight: FontWeight.w600)),
        ]),
      ),
      Expanded(child: Builder(builder: (_) {
        if (all == null && _error == null) return const SkeletonList(count: 3, itemHeight: 150);
        if (all == null) return ErrorView(message: _error!, onRetry: _load);
        if (list.isEmpty) {
          return RefreshIndicator(onRefresh: _load, child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [SizedBox(height: 380, child: EmptyView(
              icon: _seg == 0 ? Icons.shopping_bag_outlined : Icons.history_rounded,
              message: _seg == 0 ? 'No active orders.\nReserve a deal to see it here.' : 'No past orders yet.',
              actionLabel: _seg == 0 ? 'Browse offers' : null,
              onAction: _seg == 0 ? widget.onBrowse : null,
            ))],
          ));
        }
        return RefreshIndicator(
          onRefresh: _load,
          child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 6, 16, FloatingPillNav.reservedHeight),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 14),
            itemBuilder: (_, i) {
              final o = list[i];
              return _OrderCard(
                key: ValueKey('${o.id}-${o.status}'),
                order: o,
                onPay: () => _pay(o),
                onCancel: () => _cancel(o),
                onShowQr: () => _showQr(o),
                onExpired: () => _load(silent: true),
              ).animate().fadeIn(delay: (40 * (i % 10)).ms, duration: 300.ms).slideY(begin: 0.06);
            },
          ),
        );
      })),
    ]));
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onPay, onCancel, onShowQr, onExpired;
  const _OrderCard({super.key, required this.order, required this.onPay,
      required this.onCancel, required this.onShowQr, required this.onExpired});

  @override
  Widget build(BuildContext context) {
    final s = order.status;
    final pending = s == OrderStatus.pendingPayment;
    final paid = s == OrderStatus.paid;
    final saved = order.originalTotal - order.total;

    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: paid ? onShowQr : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          IconBubble(icon: s.icon, color: s.color, size: 46),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(order.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 2),
            Text('×${order.quantity}  ·  ${fDate(order.createdAt)} ${fTime(order.createdAt)}',
                style: const TextStyle(fontSize: 12.5, color: AppColors.textSub)),
          ])),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(fPrice(order.total), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            if (saved > 0.0005) Text('-${fPrice(saved)}',
                style: const TextStyle(fontSize: 11.5, color: AppColors.eco, fontWeight: FontWeight.w700)),
          ]),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          OrderStatusBadge(s),
          const Spacer(),
          if (pending && order.expiresAt != null) Row(children: [
            const Icon(Icons.timer_outlined, size: 16, color: AppColors.amber),
            const SizedBox(width: 4),
            CountdownText(until: order.expiresAt!, onDone: onExpired,
                style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.amber,
                    fontFeatures: [FontFeature.tabularFigures()])),
          ]),
        ]),
        if (pending) ...[
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: PrimaryButton(label: 'Pay now', icon: Icons.lock_rounded,
                color: AppColors.primary, height: 52, onPressed: onPay)),
            const SizedBox(width: 10),
            Pressable(onTap: onCancel, child: Container(
              height: 52, width: 52,
              decoration: BoxDecoration(color: AppColors.error.withAlpha(22), borderRadius: BorderRadius.circular(AppRadius.md)),
              child: const Icon(Icons.close_rounded, color: AppColors.error),
            )),
          ]),
        ],
        if (paid) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card2, borderRadius: BorderRadius.circular(AppRadius.md)),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: QrImageView(data: order.qrToken?.isNotEmpty == true ? order.qrToken! : order.id,
                    size: 64, padding: EdgeInsets.zero),
              ),
              const SizedBox(width: 14),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Your pickup pass', style: TextStyle(fontWeight: FontWeight.w800)),
                SizedBox(height: 2),
                Text('Tap to show the QR code to the shop', style: TextStyle(fontSize: 12.5, color: AppColors.textSub)),
              ])),
              const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
            ]),
          ),
        ],
      ]),
    );
  }
}
