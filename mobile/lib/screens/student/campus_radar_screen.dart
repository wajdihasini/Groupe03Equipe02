import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../config/app_theme.dart';
import '../../models/offer.dart';
import '../../models/order.dart';
import '../../models/user_role.dart';
import '../../repositories/offer_repository.dart';
import '../../services/api_service.dart';
import '../../widgets/app_card.dart';
import '../../widgets/offer_card.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'offers_tab.dart';

/// Map of approved shops (GET /api/shops) — tab of the student shell.
class CampusRadarScreen extends StatefulWidget {
  final User user;
  final UserRole role;
  final ValueChanged<Order>? onReserved;
  const CampusRadarScreen({super.key, required this.user, required this.role, this.onReserved});
  @override State<CampusRadarScreen> createState() => _State();
}

class _State extends State<CampusRadarScreen> {
  static const LatLng _defaultCenter = LatLng(36.8065, 10.1815); // Tunis

  final _map = MapController();
  final _cards = PageController(viewportFraction: 0.82);
  List<Map<String, dynamic>> _shops = [];
  bool _loading = true;
  String? _error;
  int _sel = -1;
  bool _onlyWithOffers = false;

  @override void initState() { super.initState(); _load(); }
  @override void dispose() { _cards.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = _shops.isEmpty; _error = null; });
    try {
      final data = await ApiService().get('/api/shops', auth: false);
      if (!mounted) return;
      final list = (data as List).cast<Map<String, dynamic>>()
        ..sort((a, b) => ((b['offersCount'] as num?) ?? 0).compareTo((a['offersCount'] as num?) ?? 0));
      setState(() { _shops = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<Map<String, dynamic>> get _visible =>
      _onlyWithOffers ? _shops.where((s) => ((s['offersCount'] as num?) ?? 0) > 0).toList() : _shops;

  LatLng? _pos(Map<String, dynamic> s) {
    final lat = s['lat'] as num?, lng = s['lng'] as num?;
    return (lat == null || lng == null) ? null : LatLng(lat.toDouble(), lng.toDouble());
  }

  void _focus(int i, {bool fromMap = false}) {
    final shops = _visible;
    if (i < 0 || i >= shops.length) return;
    setState(() => _sel = i);
    final p = _pos(shops[i]);
    if (p != null) _map.move(p, 16);
    if (fromMap && _cards.hasClients) {
      _cards.animateToPage(i, duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic);
    }
  }

  Future<void> _openShop(Map<String, dynamic> s) async {
    final offer = await showAppSheet<Offer>(context, child: _ShopSheet(shopId: s['id'].toString(), fallback: s));
    if (offer == null || !mounted) return;
    final order = await openOffer(context, offer);
    if (order != null) widget.onReserved?.call(order);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(bottom: false, child: Column(children: [
      TabHeader(subtitle: 'Shops around campus', title: 'Campus Radar',
          trailing: ProfileAvatar(user: widget.user, role: widget.role)),
      Expanded(child: Builder(builder: (_) {
        if (_loading) return const LoadingView(message: 'Scanning campus…');
        if (_error != null) return ErrorView(message: _error!, onRetry: _load);
        final shops = _visible;
        final located = [for (var i = 0; i < shops.length; i++) if (_pos(shops[i]) != null) i];
        final center = located.isNotEmpty ? _pos(shops[located.first])! : _defaultCenter;

        return Stack(children: [
          // Map
          Positioned.fill(child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.xl),
              child: FlutterMap(
                mapController: _map,
                options: MapOptions(initialCenter: center, initialZoom: 14,
                    onTap: (_, _) => setState(() => _sel = -1)),
                children: [
                  TileLayer(
                    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                    subdomains: const ['a', 'b', 'c', 'd'],
                    userAgentPackageName: 'com.example.mobile',
                  ),
                  MarkerLayer(markers: [
                    for (final i in located)
                      Marker(
                        point: _pos(shops[i])!, width: 64, height: 64,
                        child: GestureDetector(onTap: () => _focus(i, fromMap: true),
                            child: _Pin(count: ((shops[i]['offersCount'] as num?) ?? 0).toInt(), selected: i == _sel)),
                      ),
                  ]),
                  const RichAttributionWidget(attributions: [TextSourceAttribution('© OpenStreetMap © CARTO')]),
                ],
              ),
            ),
          )),
          // Filter chip
          Positioned(top: 20, left: 28, child: Pressable(
            onTap: () => setState(() { _onlyWithOffers = !_onlyWithOffers; _sel = -1; }),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: _onlyWithOffers ? AppColors.ink : Colors.white,
                borderRadius: BorderRadius.circular(100),
                boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(30), blurRadius: 14)],
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.local_offer_rounded, size: 16, color: _onlyWithOffers ? AppColors.lime : AppColors.ink),
                const SizedBox(width: 6),
                Text('With deals', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13,
                    color: _onlyWithOffers ? Colors.white : AppColors.ink)),
              ]),
            ),
          )),
          Positioned(top: 20, right: 28, child: Pressable(onTap: _load, child: Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppColors.ink.withAlpha(30), blurRadius: 14)]),
            child: const Icon(Icons.refresh_rounded),
          ))),
          // Shop cards carousel
          Positioned(left: 0, right: 0, bottom: FloatingPillNav.reservedHeight - 8, height: 132,
            child: shops.isEmpty
                ? const Center(child: AppCard(child: Text('No approved shops yet.')))
                : PageView.builder(
                    controller: _cards,
                    itemCount: shops.length,
                    onPageChanged: (i) => _focus(i),
                    itemBuilder: (_, i) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: _ShopCard(shop: shops[i], selected: i == _sel,
                          located: _pos(shops[i]) != null, onTap: () => _openShop(shops[i])),
                    ),
                  ).animate().fadeIn().slideY(begin: 0.3),
          ),
        ]);
      })),
    ]));
  }
}

class _Pin extends StatelessWidget {
  final int count;
  final bool selected;
  const _Pin({required this.count, required this.selected});
  @override
  Widget build(BuildContext context) => AnimatedScale(
    scale: selected ? 1.2 : 1, duration: const Duration(milliseconds: 250), curve: Curves.easeOutBack,
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: Colors.black.withAlpha(50), blurRadius: 8, offset: const Offset(0, 3))]),
        child: Container(
          width: 38, height: 38,
          decoration: BoxDecoration(color: selected ? AppColors.ink : (count > 0 ? AppColors.primary : AppColors.textSub),
              shape: BoxShape.circle),
          alignment: Alignment.center,
          child: count > 0
              ? Text('$count', style: TextStyle(color: selected ? AppColors.lime : Colors.white, fontWeight: FontWeight.w900))
              : const Icon(Icons.storefront_rounded, color: Colors.white, size: 18),
        ),
      ),
    ]),
  );
}

class _ShopCard extends StatelessWidget {
  final Map<String, dynamic> shop;
  final bool selected, located;
  final VoidCallback onTap;
  const _ShopCard({required this.shop, required this.selected, required this.located, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final count = ((shop['offersCount'] as num?) ?? 0).toInt();
    final address = (shop['address'] ?? '').toString();
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: EdgeInsets.symmetric(vertical: selected ? 0 : 8),
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
            width: 64, height: double.infinity,
            decoration: BoxDecoration(
              gradient: count > 0 ? AppColors.brandGradient : null,
              color: count > 0 ? null : AppColors.surface2,
              borderRadius: BorderRadius.circular(AppRadius.md)),
            child: Icon(Icons.storefront_rounded, color: count > 0 ? AppColors.lime : AppColors.textSub, size: 28),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(shop['name']?.toString() ?? '—', maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
            const SizedBox(height: 2),
            Row(children: [
              Icon(located ? Icons.place_rounded : Icons.location_off_outlined, size: 13, color: AppColors.textSub),
              const SizedBox(width: 3),
              Expanded(child: Text(address.isEmpty ? (located ? 'On the map' : 'No location yet') : address,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSub))),
            ]),
            const SizedBox(height: 8),
            StatusBadge(
              label: count > 0 ? '$count deal${count == 1 ? '' : 's'} available' : 'No deals right now',
              color: count > 0 ? AppColors.lime : AppColors.surface2,
              textColor: count > 0 ? AppColors.ink : AppColors.textSub),
          ])),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textSub),
        ]),
      ),
    );
  }
}

/// Shop info + its offers (GET /api/shops/:id). Pops the chosen offer.
class _ShopSheet extends StatefulWidget {
  final String shopId;
  final Map<String, dynamic> fallback;
  const _ShopSheet({required this.shopId, required this.fallback});
  @override State<_ShopSheet> createState() => _ShopSheetState();
}

class _ShopSheetState extends State<_ShopSheet> {
  late final Future<Map<String, dynamic>> _fut = OfferRepository().fetchShop(widget.shopId);
  Map<String, dynamic> get fallback => widget.fallback;
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: _fut,
    builder: (ctx, snap) {
      final s = snap.data ?? fallback;
      final offers = ((snap.data?['offers'] as List?) ?? [])
          .map((j) => Offer.fromJson(Map<String, dynamic>.from(j as Map))).toList();
      final desc = (s['description'] ?? '').toString();
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const IconBubble(icon: Icons.storefront_rounded, color: AppColors.coral, size: 54),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s['name']?.toString() ?? '—', style: Theme.of(ctx).textTheme.headlineMedium),
            if ((s['address'] ?? '').toString().isNotEmpty)
              Text(s['address'].toString(), style: const TextStyle(color: AppColors.textSub)),
          ])),
        ]),
        if (desc.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12),
            child: Text(desc, style: const TextStyle(color: AppColors.textSub, height: 1.4))),
        const SizedBox(height: 18),
        const SectionTitle('Available deals'),
        if (snap.connectionState != ConnectionState.done)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (offers.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('No deals right now — come back later!', textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSub)))
        else
          for (final o in offers) Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: OfferCard(offer: o, onTap: () => Navigator.of(ctx).pop(o)),
          ),
      ]);
    },
  );
}
