import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/offer.dart';
import '../../models/order.dart';
import '../../models/user_role.dart';
import '../../repositories/offer_repository.dart';
import '../../utils/formatters.dart';
import '../../utils/offer_filter.dart';
import '../../widgets/app_card.dart';
import '../../widgets/offer_card.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'offer_detail_screen.dart';

/// Opens the offer sheet; returns the created order when the student reserved.
Future<Order?> openOffer(BuildContext context, Offer o) =>
    Navigator.of(context).push<Order>(MaterialPageRoute(builder: (_) => OfferDetailScreen(offer: o)));

class OffersTab extends StatefulWidget {
  final User user;
  final UserRole role;
  final ValueChanged<Order>? onReserved;
  const OffersTab({super.key, required this.user, required this.role, this.onReserved});
  @override State<OffersTab> createState() => _State();
}

class _State extends State<OffersTab> {
  static const double _smax = 20;
  final _repo = OfferRepository();
  final _search = TextEditingController();
  Timer? _debounce;
  late Future<List<Offer>> _fut;
  List<Offer> _forYou = [];
  String? _cat;
  double _mp = _smax;
  OfferSort _sort = OfferSort.relevance;

  @override
  void initState() {
    super.initState();
    _load();
    _loadForYou();
  }

  @override
  void dispose() { _debounce?.cancel(); _search.dispose(); super.dispose(); }

  void _load() {
    setState(() {
      _fut = _repo.fetchAll(query: _search.text.trim(), category: _cat, maxPrice: _mp >= _smax ? null : _mp);
    });
  }

  Future<void> _loadForYou() async {
    try {
      final r = await _repo.fetchRecommendations();
      if (mounted) setState(() => _forYou = r);
    } catch (_) { /* optional section */ }
  }

  Future<void> _refresh() async { _load(); _loadForYou(); await _fut.catchError((_) => <Offer>[]); }

  void _onSearch(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _load);
  }

  Future<void> _open(Offer o) async {
    final order = await openOffer(context, o);
    if (!mounted) return;
    _load();
    if (order != null) widget.onReserved?.call(order);
  }

  Future<void> _filters() async {
    var mp = _mp; var sort = _sort;
    final apply = await showAppSheet<bool>(context, child: StatefulBuilder(builder: (ctx, set) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Filters', style: Theme.of(ctx).textTheme.headlineMedium),
        const SizedBox(height: 20),
        Row(children: [
          const Text('Max price', style: TextStyle(fontWeight: FontWeight.w800)),
          const Spacer(),
          StatusBadge(label: mp >= _smax ? 'Any' : '≤ ${mp.round()} TND', color: AppColors.lime),
        ]),
        Slider(value: mp, min: 1, max: _smax, divisions: 19, onChanged: (v) => set(() => mp = v)),
        const SizedBox(height: 12),
        const Text('Sort by', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final s in OfferSort.values)
            ChoiceChip(label: Text(_sortLabel(s)), selected: sort == s, onSelected: (_) => set(() => sort = s)),
        ]),
        const SizedBox(height: 26),
        Row(children: [
          Expanded(child: OutlinedButton(onPressed: () => set(() { mp = _smax; sort = OfferSort.relevance; }),
              child: const Text('Reset'))),
          const SizedBox(width: 12),
          Expanded(flex: 2, child: PrimaryButton(label: 'Show results', onPressed: () => Navigator.pop(ctx, true))),
        ]),
      ])));
    if (apply == true) { setState(() { _mp = mp; _sort = sort; }); _load(); }
  }

  String _sortLabel(OfferSort s) => switch (s) {
    OfferSort.relevance => 'Relevance',
    OfferSort.priceLow => 'Price ↑',
    OfferSort.priceHigh => 'Price ↓',
    OfferSort.discount => 'Best discount',
  };

  bool get _filtered => _mp < _smax || _sort != OfferSort.relevance;

  @override
  Widget build(BuildContext context) {
    return SafeArea(bottom: false, child: RefreshIndicator(
      onRefresh: _refresh,
      child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
        SliverToBoxAdapter(child: TabHeader(
          subtitle: 'Hi ${firstNameOf(widget.user)} 👋',
          title: 'Today\'s deals',
          trailing: ProfileAvatar(user: widget.user, role: widget.role),
        )),
        // Search + filter
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _search,
              onChanged: _onSearch,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search meals, shops…',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _search.text.isEmpty ? null : IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () { _search.clear(); _load(); }),
              ),
            )),
            const SizedBox(width: 10),
            Pressable(onTap: _filters, child: Container(
              width: 56, height: 56,
              decoration: BoxDecoration(color: _filtered ? AppColors.lime : AppColors.ink,
                  borderRadius: BorderRadius.circular(AppRadius.md)),
              child: Icon(Icons.tune_rounded, color: _filtered ? AppColors.ink : Colors.white),
            )),
          ]),
        )),
        // Categories
        SliverToBoxAdapter(child: SizedBox(height: 58, child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          children: [
            _CatChip(label: 'All', icon: Icons.apps_rounded, selected: _cat == null,
                onTap: () { setState(() => _cat = null); _load(); }),
            for (final c in offerCategories)
              _CatChip(label: c, icon: categoryIcon(c), selected: _cat == c,
                  onTap: () { setState(() => _cat = _cat == c ? null : c); _load(); }),
          ],
        ))),
        // For you carousel
        if (_forYou.isNotEmpty && _search.text.isEmpty && _cat == null) ...[
          const SliverToBoxAdapter(child: Padding(
            padding: EdgeInsets.fromLTRB(20, 14, 20, 0),
            child: SectionTitle('✨ Picked for you'),
          )),
          SliverToBoxAdapter(child: SizedBox(height: 206, child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            itemCount: _forYou.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (_, i) => OfferMiniCard(offer: _forYou[i], onTap: () => _open(_forYou[i]))
                .animate().fadeIn(delay: (60 * i).ms).slideX(begin: 0.15),
          ))),
        ],
        const SliverToBoxAdapter(child: Padding(
          padding: EdgeInsets.fromLTRB(20, 10, 20, 0),
          child: SectionTitle('All offers'),
        )),
        FutureBuilder<List<Offer>>(
          future: _fut,
          builder: (_, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const SliverToBoxAdapter(child: SizedBox(height: 520,
                  child: SkeletonList(count: 3, itemHeight: 220, padding: EdgeInsets.symmetric(horizontal: 16))));
            }
            if (snap.hasError) {
              return SliverFillRemaining(hasScrollBody: false, child: ErrorView(message: snap.error.toString(), onRetry: _load));
            }
            final offers = filterOffers(snap.data ?? [], sort: _sort);
            if (offers.isEmpty) {
              return const SliverFillRemaining(hasScrollBody: false, child: EmptyView(
                  message: 'No offers match your search.\nTry another category or price.', icon: Icons.search_off_rounded));
            }
            return SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, FloatingPillNav.reservedHeight),
              sliver: SliverList.separated(
                itemCount: offers.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (_, i) => OfferCard(offer: offers[i], onTap: () => _open(offers[i]))
                    .animate().fadeIn(delay: (50 * (i % 8)).ms, duration: 350.ms).slideY(begin: 0.08),
              ),
            );
          },
        ),
      ]),
    ));
  }
}

class _CatChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _CatChip({required this.label, required this.icon, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: Pressable(onTap: onTap, child: AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: selected ? AppColors.ink : AppColors.surface,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: selected ? AppColors.ink : AppColors.line),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 17, color: selected ? AppColors.lime : AppColors.textSub),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
            color: selected ? Colors.white : AppColors.ink)),
      ]),
    )),
  );
}
