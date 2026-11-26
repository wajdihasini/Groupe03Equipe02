import '../models/offer.dart';
import '../services/api_service.dart';

class OfferException implements Exception {
  final String message;
  const OfferException(this.message);
  @override String toString() => message;
}

/// GET  /api/offers            (public, with optional q/category/maxPrice)
/// GET  /api/my/offers         (merchant, authenticated)
/// POST /api/offers            (merchant)
/// PUT  /api/offers/:id        (merchant)
/// DELETE /api/offers/:id      (merchant)
/// GET  /api/categories        (public)
class OfferRepository {
  final _api = ApiService();

  Future<List<Offer>> fetchAll({
    String query    = '',
    String? category,
    double? maxPrice,
  }) async {
    try {
      final params = <String, String>{
        if (query.isNotEmpty)   'q':        query,
        if (category != null)   'category': category,
        if (maxPrice != null)   'maxPrice': maxPrice.toString(),
      };
      final data = await _api.get('/api/offers', q: params, auth: false);
      return (data as List).map((j) => Offer.fromJson(j as Map<String, dynamic>)).toList();
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  /// GET /api/offers/:id — full product sheet (adds shopPhone, shopDescription).
  Future<Offer> fetchById(String id) async {
    try {
      final data = await _api.get('/api/offers/$id', auth: false);
      return Offer.fromJson(Map<String, dynamic>.from(data as Map));
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  /// GET /api/recommendations (student) — personalised picks with a "reason".
  Future<List<Offer>> fetchRecommendations() async {
    try {
      final data = await _api.get('/api/recommendations');
      return (data as List).map((j) => Offer.fromJson(j as Map<String, dynamic>)).toList();
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  /// GET /api/shops/:id — shop info + its available offers.
  Future<Map<String, dynamic>> fetchShop(String id) async {
    try {
      return Map<String, dynamic>.from(await _api.get('/api/shops/$id', auth: false) as Map);
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  Future<List<Offer>> fetchForMerchant() async {
    try {
      final data = await _api.get('/api/my/offers');
      return (data as List).map((j) => Offer.fromJson(j as Map<String, dynamic>)).toList();
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  Future<List<String>> fetchCategories() async {
    try {
      final data = await _api.get('/api/categories', auth: false);
      return (data as List).cast<String>();
    } catch (_) { return offerCategories; } // local fallback
  }

  Future<String> createOffer(Map<String, dynamic> body) async {
    try {
      final data = await _api.post('/api/offers', body: body);
      return data['id'] as String;
    } on ApiException catch (e) { throw OfferException(e.message); }
  }

  Future<void> updateOffer(String id, Map<String, dynamic> body) async {
    try { await _api.put('/api/offers/$id', body: body); }
    on ApiException catch (e) { throw OfferException(e.message); }
  }

  Future<void> deleteOffer(String id) async {
    try { await _api.delete('/api/offers/$id'); }
    on ApiException catch (e) { throw OfferException(e.message); }
  }
}
