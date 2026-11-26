import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../models/offer.dart';
import '../../models/order.dart';
import '../../repositories/offer_repository.dart';
import '../../repositories/order_repository.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/offer_card.dart';
import '../../widgets/ui.dart';

class OfferDetailScreen extends StatefulWidget {
  final Offer offer;
  const OfferDetailScreen({super.key, required this.offer});
  @override State<OfferDetailScreen> createState() => _State();
}

class _State extends State<OfferDetailScreen> {
  late Offer _o = widget.offer;
  int _qty = 1;
  bool _busy = false;
  bool _gone = false; // offer no longer available

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  /// Fresh product sheet (live stock, shop phone & description).
  Future<void> _refresh() async {
    try {
      final o = await OfferRepository().fetchById(widget.offer.id);
      if (!mounted) return;
      setState(() {
        _o = o;
        if (_qty > o.quantity) _qty = o.quantity.clamp(1, 10);
      });
    } on OfferException {
      if (mounted) setState(() => _gone = true);
    } catch (_) {/* keep the data we already have */}
  }

  int get _maxQty => _o.quantity.clamp(1, 10); // backend: 1..10 per order

  Future<void> _reserve() async {
    setState(() => _busy = true);
    try {
      final repo = OrderRepository();
      final id = await repo.create(offerId: _o.id, quantity: _qty);
      final order = await repo.findById(id);
      HapticFeedback.mediumImpact();
      if (!mounted) return;
      Navigator.of(context).pop(order ?? Order(
        id: id, offerId: _o.id, title: _o.title, shopId: _o.shopId,
        quantity: _qty, total: _o.price * _qty, originalTotal: _o.originalPrice * _qty,
        createdAt: DateTime.now(), status: OrderStatus.pendingPayment,
        expiresAt: DateTime.now().add(const Duration(minutes: 15)),
      ));
    } on OrderException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
      _refresh();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _call() async {
    final uri = Uri(scheme: 'tel', path: _o.shopPhone.replaceAll(' ', ''));
    if (!await launchUrl(uri) && mounted) showSnack(context, 'Cannot open the dialer.', error: true);
  }

  Future<void> _directions() async {
    final uri = (_o.shopLat != null && _o.shopLng != null)
        ? Uri.parse('https://www.google.com/maps/search/?api=1&query=${_o.shopLat},${_o.shopLng}')
        : Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('${_o.shopName} ${_o.shopAddress}')}');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      showSnack(context, 'Cannot open maps.', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _o;
    final unavailable = _gone || o.soldOut;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverAppBar(
          expandedHeight: 320, pinned: true, stretch: true,
          backgroundColor: AppColors.bg,
          leading: Padding(padding: const EdgeInsets.all(8), child: _RoundBtn(
              icon: Icons.arrow_back_rounded, onTap: () => Navigator.of(context).maybePop())),
          flexibleSpace: FlexibleSpaceBar(
            stretchModes: const [StretchMode.zoomBackground],
            background: Stack(fit: StackFit.expand, children: [
              OfferVisual(offer: o, iconSize: 110),
              const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(
                begin: Alignment.topCenter, end: Alignment.bottomCenter,
                colors: [Color(0x55000000), Colors.transparent, Color(0x22000000)]))),
              Positioned(left: 20, bottom: 36, child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(100)),
                child: Text('-${o.discountPercent}%  OFF', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
              ).animate().scale(delay: 200.ms, curve: Curves.easeOutBack)),
              Positioned(left: 0, right: 0, bottom: -1, child: Container(
                height: 24,
                decoration: const BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
                ),
              )),
            ]),
          ),
        ),
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              StatusBadge(label: o.category, color: categoryTint(o.category), textColor: AppColors.ink,
                  icon: categoryIcon(o.category)),
              const SizedBox(width: 8),
              if (o.sold > 0) StatusBadge(label: '${o.sold} saved', color: AppColors.card2,
                  textColor: AppColors.eco, icon: Icons.local_fire_department_rounded),
            ]),
            const SizedBox(height: 12),
            Text(o.title, style: t.headlineLarge),
            const SizedBox(height: 14),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(fPrice(o.price), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900,
                  color: AppColors.primary, letterSpacing: -1)),
              const SizedBox(width: 10),
              Padding(padding: const EdgeInsets.only(bottom: 5), child: Text(fPrice(o.originalPrice),
                  style: const TextStyle(fontSize: 15, color: AppColors.textSub, decoration: TextDecoration.lineThrough))),
            ]),
            const SizedBox(height: 18),
            // Info bento
            Row(children: [
              Expanded(child: _InfoTile(icon: Icons.schedule_rounded, color: AppColors.violet,
                  label: 'Pickup', value: '${o.pickupFrom} – ${o.pickupTo}')),
              const SizedBox(width: 12),
              Expanded(child: _InfoTile(icon: Icons.inventory_2_rounded,
                  color: unavailable ? AppColors.error : AppColors.amber,
                  label: 'Available', value: _gone ? 'Unavailable' : (o.soldOut ? 'Sold out' : '${o.quantity} left'))),
            ]),
            if (o.description.isNotEmpty) ...[
              const SizedBox(height: 22),
              Text('About this offer', style: t.headlineSmall),
              const SizedBox(height: 8),
              Text(o.description, style: const TextStyle(fontSize: 15, height: 1.55, color: AppColors.ink)),
            ],
            const SizedBox(height: 22),
            Text('Shop', style: t.headlineSmall),
            const SizedBox(height: 10),
            AppCard(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const IconBubble(icon: Icons.storefront_rounded, color: AppColors.coral, size: 48),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(o.shopName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  if (o.shopAddress.isNotEmpty)
                    Text(o.shopAddress, style: const TextStyle(color: AppColors.textSub, fontSize: 13)),
                ])),
              ]),
              if (o.shopDescription.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(o.shopDescription, style: const TextStyle(color: AppColors.textSub, fontSize: 13, height: 1.4)),
              ],
              const SizedBox(height: 14),
              Row(children: [
                if (o.shopPhone.isNotEmpty) ...[
                  Expanded(child: _ActionPill(icon: Icons.call_rounded, label: 'Call', onTap: _call)),
                  const SizedBox(width: 10),
                ],
                Expanded(child: _ActionPill(icon: Icons.directions_rounded, label: 'Directions', onTap: _directions)),
              ]),
            ])),
            const SizedBox(height: 120),
          ].animate(interval: 40.ms).fadeIn(duration: 300.ms).slideY(begin: 0.06)),
        )),
      ]),
      bottomNavigationBar: _ReserveBar(
        unavailable: unavailable,
        qty: _qty, maxQty: _maxQty, total: o.price * _qty, busy: _busy,
        onQty: (v) => setState(() => _qty = v),
        onReserve: _reserve,
      ),
    );
  }
}

class _ReserveBar extends StatelessWidget {
  final bool unavailable, busy;
  final int qty, maxQty;
  final double total;
  final ValueChanged<int> onQty;
  final VoidCallback onReserve;
  const _ReserveBar({required this.unavailable, required this.busy, required this.qty, required this.maxQty,
      required this.total, required this.onQty, required this.onReserve});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(20), blurRadius: 30, offset: const Offset(0, -6))],
    ),
    padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
    child: SafeArea(top: false, child: unavailable
        ? const PrimaryButton(label: 'Sold out', icon: Icons.block_rounded, onPressed: null)
        : Column(mainAxisSize: MainAxisSize.min, children: [
            Row(children: [
              QtyStepper(value: qty, max: maxQty, onChanged: busy ? null : onQty),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('Total', style: TextStyle(color: AppColors.textSub, fontSize: 12, fontWeight: FontWeight.w600)),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Text(fPrice(total), key: ValueKey(total),
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, letterSpacing: -0.6)),
                ),
              ]),
            ]),
            const SizedBox(height: 14),
            PrimaryButton(label: 'Reserve now', icon: Icons.shopping_bag_rounded,
                color: AppColors.primary, isLoading: busy, onPressed: onReserve),
          ])),
  );
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label, value;
  const _InfoTile({required this.icon, required this.color, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => AppCard(
    padding: const EdgeInsets.all(14),
    child: Row(children: [
      IconBubble(icon: icon, color: color, size: 40),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11.5, color: AppColors.textSub, fontWeight: FontWeight.w600)),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft,
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
      ])),
    ]),
  );
}

class _ActionPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _ActionPill({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => Pressable(onTap: onTap, child: Container(
    height: 46,
    decoration: BoxDecoration(color: AppColors.surface2, borderRadius: BorderRadius.circular(100)),
    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(icon, size: 18, color: AppColors.primary),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
    ]),
  ));
}

class _RoundBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => Pressable(onTap: onTap, child: Container(
    decoration: BoxDecoration(color: Colors.white.withAlpha(230), shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(30), blurRadius: 10)]),
    child: Icon(icon, color: AppColors.ink),
  ));
}
