import 'dart:ui';
import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/offer.dart';
import '../utils/formatters.dart';
import 'app_card.dart';
import 'offer_photo.dart';

/// Tint used when an offer has no photo (stable per category).
Color categoryTint(String c) => switch (c) {
  'Viennoiserie' => AppColors.card1,
  'Sandwich' => AppColors.card3,
  'Plat' => AppColors.card2,
  'Salade' => const Color(0xFFE6F7D9),
  'Dessert' => AppColors.card5,
  'Boisson' => AppColors.card4,
  'Panier surprise' => const Color(0xFFFFE3F1),
  _ => AppColors.surface2,
};

/// Visual for an offer: photo if any, otherwise a tinted category illustration.
class OfferVisual extends StatelessWidget {
  final Offer offer;
  final double iconSize;
  const OfferVisual({super.key, required this.offer, this.iconSize = 54});
  @override
  Widget build(BuildContext context) {
    if (offer.photo != null && offer.photo!.isNotEmpty) return OfferPhoto(photo: offer.photo!);
    return Container(
      color: categoryTint(offer.category),
      alignment: Alignment.center,
      child: Icon(categoryIcon(offer.category), size: iconSize, color: AppColors.ink.withAlpha(150)),
    );
  }
}

class _GlassChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  const _GlassChip({required this.icon, required this.label, this.color});
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(100),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        color: Colors.white.withAlpha(200),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color ?? AppColors.ink),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: color ?? AppColors.ink)),
        ]),
      ),
    ),
  );
}

class OfferCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback onTap;
  const OfferCard({super.key, required this.offer, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final low = offer.quantity <= 3 && !offer.soldOut;
    return AppCard(
      padding: const EdgeInsets.all(8),
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.lg - 6),
          child: SizedBox(height: 150, width: double.infinity, child: Stack(fit: StackFit.expand, children: [
            OfferVisual(offer: offer),
            Positioned(top: 10, left: 10, child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(100)),
              child: Text('-${offer.discountPercent}%',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.ink)),
            )),
            Positioned(top: 10, right: 10, child: _GlassChip(
              icon: offer.soldOut ? Icons.block_rounded : Icons.inventory_2_rounded,
              label: offer.soldOut ? 'Sold out' : '${offer.quantity} left',
              color: offer.soldOut || low ? AppColors.coral : null)),
            Positioned(bottom: 10, left: 10, child: _GlassChip(
              icon: Icons.schedule_rounded, label: '${offer.pickupFrom} – ${offer.pickupTo}')),
          ])),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 12, 8, 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(offer.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16.5, letterSpacing: -0.3)),
              const SizedBox(height: 3),
              Row(children: [
                const Icon(Icons.storefront_rounded, size: 14, color: AppColors.textSub),
                const SizedBox(width: 4),
                Flexible(child: Text(offer.shopName, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.textSub, fontSize: 12.5, fontWeight: FontWeight.w600))),
              ]),
            ])),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(fPrice(offer.originalPrice), style: const TextStyle(fontSize: 11.5,
                  decoration: TextDecoration.lineThrough, color: AppColors.textSub)),
              Text(fPrice(offer.price), style: const TextStyle(fontWeight: FontWeight.w900,
                  fontSize: 18, color: AppColors.primary, letterSpacing: -0.4)),
            ]),
          ]),
        ),
      ]),
    );
  }
}

/// Narrow card for horizontal carousels.
class OfferMiniCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback onTap;
  final double width;
  const OfferMiniCard({super.key, required this.offer, required this.onTap, this.width = 170});
  @override
  Widget build(BuildContext context) => SizedBox(width: width, child: AppCard(
    padding: const EdgeInsets.all(6),
    onTap: onTap,
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: SizedBox(height: 96, width: double.infinity, child: Stack(fit: StackFit.expand, children: [
          OfferVisual(offer: offer, iconSize: 40),
          Positioned(top: 6, left: 6, child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: AppColors.lime, borderRadius: BorderRadius.circular(100)),
            child: Text('-${offer.discountPercent}%', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
          )),
        ])),
      ),
      Padding(padding: const EdgeInsets.fromLTRB(6, 8, 6, 4), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(offer.title, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
        Text(offer.shopName, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11.5, color: AppColors.textSub)),
        const SizedBox(height: 4),
        Text(fPrice(offer.price), style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
      ])),
    ]),
  ));
}
