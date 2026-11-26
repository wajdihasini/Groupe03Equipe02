import 'package:flutter/material.dart';

String fPrice(double v) => '${v.toStringAsFixed(3)} TND';

/// pickupFrom / pickupTo are "HH:MM" strings from the backend.
String fPickup(String from, String to) => 'Pickup $from – $to';

String fDate(DateTime d) =>
    '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}/${d.year}';
String fTime(DateTime t) =>
    '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}';
String fTimeOfDay(TimeOfDay t) =>
    '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}';

IconData categoryIcon(String c) {
  switch (c) {
    case 'Plat':            return Icons.restaurant;
    case 'Viennoiserie':    return Icons.bakery_dining;
    case 'Boisson':         return Icons.local_cafe;
    case 'Dessert':         return Icons.cake;
    case 'Sandwich':        return Icons.lunch_dining;
    case 'Salade':          return Icons.spa;
    case 'Panier surprise': return Icons.card_giftcard;
    default:                return Icons.fastfood;
  }
}
