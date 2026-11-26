import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../models/offer.dart';
import '../../models/order.dart';
import '../../models/user_role.dart';
import '../../repositories/offer_repository.dart';
import '../../widgets/app_card.dart';
import '../../widgets/offer_card.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'offers_tab.dart';

/// "Panier surprise" offers — tab of the student shell.
class SurpriseBasketScreen extends StatefulWidget {
  final User user;
  final UserRole role;
  final ValueChanged<Order>? onReserved;
  const SurpriseBasketScreen({super.key, required this.user, required this.role, this.onReserved});
  @override State<SurpriseBasketScreen> createState() => _State();
}

class _State extends State<SurpriseBasketScreen> {
  final _repo = OfferRepository();
  late Future<List<Offer>> _fut;

  @override void initState() { super.initState(); _fut = _repo.fetchAll(category: 'Panier surprise'); }
  Future<void> _reload() async {
    setState(() => _fut = _repo.fetchAll(category: 'Panier surprise'));
    await _fut.catchError((_) => <Offer>[]);
  }

  Future<void> _open(Offer o) async {
    final order = await openOffer(context, o);
    if (!mounted) return;
    _reload();
    if (order != null) widget.onReserved?.call(order);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(bottom: false, child: RefreshIndicator(
      onRefresh: _reload,
      child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
        SliverToBoxAdapter(child: TabHeader(subtitle: 'Mystery deals', title: 'Surprise baskets',
            trailing: ProfileAvatar(user: widget.user, role: widget.role))),
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
          child: AppCard(
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [Color(0xFFFF6B4A), Color(0xFFFF2E7E)]),
            padding: const EdgeInsets.all(20),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('What\'s inside? 🤫', style: TextStyle(color: Colors.white, fontSize: 21,
                    fontWeight: FontWeight.w800, letterSpacing: -0.4)),
                const SizedBox(height: 6),
                Text('A surprise assortment of today\'s unsold goodies — for a fraction of the price.',
                    style: TextStyle(color: Colors.white.withAlpha(220), height: 1.4, fontSize: 13)),
              ])),
              const SizedBox(width: 12),
              const Icon(Icons.card_giftcard_rounded, size: 64, color: Colors.white)
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .rotate(begin: -0.04, end: 0.04, duration: 900.ms, curve: Curves.easeInOut),
            ]),
          ).animate().fadeIn().scaleXY(begin: 0.96),
        )),
        FutureBuilder<List<Offer>>(
          future: _fut,
          builder: (_, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const SliverToBoxAdapter(child: SizedBox(height: 480,
                  child: SkeletonList(count: 2, itemHeight: 220, padding: EdgeInsets.symmetric(horizontal: 16))));
            }
            if (snap.hasError) {
              return SliverFillRemaining(hasScrollBody: false,
                  child: ErrorView(message: snap.error.toString(), onRetry: _reload));
            }
            final offers = snap.data ?? [];
            if (offers.isEmpty) {
              return const SliverFillRemaining(hasScrollBody: false, child: EmptyView(
                  message: 'No surprise baskets right now.\nCheck back later today!', icon: Icons.card_giftcard_rounded));
            }
            return SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, FloatingPillNav.reservedHeight),
              sliver: SliverList.separated(
                itemCount: offers.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (_, i) => OfferCard(offer: offers[i], onTap: () => _open(offers[i]))
                    .animate().fadeIn(delay: (60 * (i % 8)).ms).slideY(begin: 0.08),
              ),
            );
          },
        ),
      ]),
    ));
  }
}
