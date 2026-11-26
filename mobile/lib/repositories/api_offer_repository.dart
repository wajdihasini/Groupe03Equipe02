import '../models/offer.dart';
import '../services/api_service.dart';

class ApiOfferException implements Exception {
  final String message;
  const ApiOfferException(this.message);
  @override
  String toString() => message;
}

/// Remplace FakeOfferRepository en production.
/// Routes utilisées :
///   GET  /api/offers            (public)
///   GET  /api/my/offers         (merchant, auth)
///   POST /api/offers            (merchant, auth)
///   PUT  /api/offers/:id        (merchant, auth)
///   DELETE /api/offers/:id      (merchant, auth)
class ApiOfferRepository {
  final _api = ApiService();

  Future<List<Offer>> fetchAll({
    String query = '',
    String? category,
    double? maxPrice,
  }) async {
    final params = <String, String>{
      if (query.isNotEmpty) 'q': query,
      'category': ?category,
      if (maxPrice != null) 'maxPrice': maxPrice.toString(),
    };
    final data = await _api.get('/api/offers', q: params, auth: false);
    return (data as List)
        .map((j) => Offer.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<List<Offer>> fetchForMerchant() async {
    final data = await _api.get('/api/my/offers');
    return (data as List)
        .map((j) => Offer.fromJson(j as Map<String, dynamic>))
        .toList();
  }

  Future<List<String>> fetchCategories() async {
    try {
      final data = await _api.get('/api/categories', auth: false);
      return (data as List).cast<String>();
    } catch (_) {
      return offerCategories; // fallback local
    }
  }

  Future<Offer> createOffer({
    required String title,
    required String description,
    required String category,
    required double originalPrice,
    required double price,
    required int quantity,
    required String pickupFrom,
    required String pickupTo,
    String? photo,
  }) async {
    final body = {
      'title': title,
      'description': description,
      'category': category,
      'originalPrice': originalPrice,
      'price': price,
      'quantity': quantity,
      'pickupFrom': pickupFrom,
      'pickupTo': pickupTo,
      if (photo != null && photo.isNotEmpty) 'photo': photo,
    };
    final data = await _api.post('/api/offers', body: body);
    // Backend renvoie { id } seulement; on reconstruit l'objet.
    return Offer(
      id: data['id'] as String,
      shopId: '',
      shopName: '',
      title: title,
      description: description,
      category: category,
      originalPrice: originalPrice,
      price: price,
      quantity: quantity,
      pickupFrom: pickupFrom,
      pickupTo: pickupTo,
    );
  }

  Future<void> updateOffer(Offer offer) async {
    await _api.put('/api/offers/${offer.id}', body: offer.toJson());
  }

  Future<void> deleteOffer(String id) async {
    await _api.delete('/api/offers/$id');
  }
}
