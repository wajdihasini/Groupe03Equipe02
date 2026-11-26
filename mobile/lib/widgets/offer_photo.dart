import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// Affiche une photo d'offre : URL http(s) ou data URI base64 (format du backend).
class OfferPhoto extends StatelessWidget {
  final String photo;
  final BoxFit fit;
  const OfferPhoto({super.key, required this.photo, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    if (photo.startsWith('http')) {
      return Image.network(photo, fit: fit, errorBuilder: (_, __, ___) => _placeholder());
    }
    try {
      final raw = photo.contains(',') ? photo.split(',').last : photo;
      return Image.memory(base64Decode(raw), fit: fit,
          errorBuilder: (_, __, ___) => _placeholder());
    } catch (_) {
      return _placeholder();
    }
  }

  Widget _placeholder() => Container(
      color: AppColors.card2,
      child: const Center(child: Icon(Icons.fastfood, size: 36, color: AppColors.textSub)));
}
