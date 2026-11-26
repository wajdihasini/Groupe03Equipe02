import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/offer.dart';
import '../../models/user_role.dart';
import '../../repositories/offer_repository.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/offer_card.dart';
import '../../widgets/state_views.dart';
import '../../widgets/ui.dart';
import '../shared/profile_avatar.dart';
import 'offer_form_screen.dart';

class MyOffersTab extends StatefulWidget {
  final User user;
  final UserRole role;
  const MyOffersTab({super.key, required this.user, required this.role});
  @override State<MyOffersTab> createState() => _State();
}

class _State extends State<MyOffersTab> {
  final _repo = OfferRepository();
  late Future<List<Offer>> _fut;

  @override void initState() { super.initState(); _fut = _repo.fetchForMerchant(); }
  Future<void> _load() async {
    setState(() => _fut = _repo.fetchForMerchant());
    await _fut.catchError((_) => <Offer>[]);
  }

  Future<void> _delete(Offer o) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Delete offer?'),
      content: Text('“${o.title}” will be removed from the catalogue.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppColors.error))),
      ]));
    if (ok != true) return;
    try {
      await _repo.deleteOffer(o.id);
      if (mounted) showSnack(context, 'Offer deleted.');
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), error: true);
    }
    if (mounted) _load();
  }

  Future<void> _openForm({Offer? edit}) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
        builder: (_) => OfferFormScreen(merchantId: widget.user.uid, existing: edit)));
    if (saved == true && mounted) {
      showSnack(context, edit == null ? 'Offer published! 🎉' : 'Offer updated.', success: true);
      _load();
    }
  }

  Future<void> _actions(Offer o) async {
    final a = await showAppSheet<String>(context, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(o.title, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 14),
      ListTile(leading: const IconBubble(icon: Icons.edit_rounded, color: AppColors.primary),
          title: const Text('Edit offer', style: TextStyle(fontWeight: FontWeight.w700)),
          onTap: () => Navigator.pop(context, 'edit')),
      ListTile(leading: const IconBubble(icon: Icons.delete_rounded, color: AppColors.error),
          title: const Text('Delete', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.error)),
          onTap: () => Navigator.pop(context, 'delete')),
    ]));
    if (a == 'edit') _openForm(edit: o);
    if (a == 'delete') _delete(o);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(bottom: false, child: Column(children: [
      TabHeader(
        subtitle: currentShopLabel(),
        title: 'My offers',
        trailing: ProfileAvatar(user: widget.user, role: widget.role),
      ),
      Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
        child: PrimaryButton(label: 'New offer', icon: Icons.add_rounded, color: AppColors.primary, onPressed: () => _openForm())),
      Expanded(child: FutureBuilder<List<Offer>>(
        future: _fut,
        builder: (_, snap) {
          if (snap.connectionState != ConnectionState.done) return const SkeletonList(count: 4, itemHeight: 96);
          if (snap.hasError) return ErrorView(message: snap.error.toString(), onRetry: _load);
          final offers = snap.data ?? [];
          if (offers.isEmpty) {
            return const EmptyView(message: 'No offers yet.\nPublish your first surplus deal!', icon: Icons.add_box_outlined);
          }
          final live = offers.where((o) => o.quantity > 0).length;
          return RefreshIndicator(onRefresh: _load, child: ListView.separated(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 0, 16, FloatingPillNav.reservedHeight),
            itemCount: offers.length + 1,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              if (i == 0) {
                return Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Text(
                    '$live live · ${offers.length - live} sold out',
                    style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w700)));
              }
              final o = offers[i - 1];
              return _OfferRow(offer: o, onTap: () => _actions(o))
                  .animate().fadeIn(delay: (40 * (i % 10)).ms).slideY(begin: 0.06);
            },
          ));
        },
      )),
    ]));
  }
}

class _OfferRow extends StatelessWidget {
  final Offer offer;
  final VoidCallback onTap;
  const _OfferRow({required this.offer, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final o = offer;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(10),
      child: Row(children: [
        ClipRRect(borderRadius: BorderRadius.circular(AppRadius.md),
            child: SizedBox(width: 76, height: 76, child: OfferVisual(offer: o, iconSize: 32))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(o.title, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
          const SizedBox(height: 2),
          Text('${fPrice(o.price)}  ·  ${o.pickupFrom}–${o.pickupTo}',
              style: const TextStyle(fontSize: 12.5, color: AppColors.textSub)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 4, children: [
            StatusBadge(
              label: o.soldOut ? 'Sold out' : '${o.quantity} in stock',
              color: o.soldOut ? AppColors.error.withAlpha(25) : AppColors.card2,
              textColor: o.soldOut ? AppColors.error : AppColors.eco),
            if (o.sold > 0) StatusBadge(label: '${o.sold} reserved', color: AppColors.card5, textColor: AppColors.violet),
          ]),
        ])),
        const Icon(Icons.more_vert_rounded, color: AppColors.textSub),
      ]),
    );
  }
}
