import '../models/order.dart';
import '../services/api_service.dart';

class OrderException implements Exception {
  final String message;
  const OrderException(this.message);
  @override String toString() => message;
}

/// POST /api/orders              – reserve
/// GET  /api/my/orders           – list (student or merchant)
/// POST /api/orders/:id/cancel   – cancel
/// POST /api/orders/validate     – merchant QR validation
class OrderRepository {
  final ApiService _api;

  OrderRepository({ApiService? api}) : _api = api ?? ApiService();

  Future<List<Order>> fetchMine() async {
    try {
      final data = await _api.get('/api/my/orders');
      return (data as List).map((j) => Order.fromJson(j as Map<String, dynamic>)).toList();
    } on ApiException catch (e) { throw OrderException(e.message); }
  }

  /// Returns newly created order id; caller must refetch to get the full object.
  Future<String> create({required String offerId, required int quantity}) async {
    try {
      final data = await _api.post('/api/orders', body: {
        'offerId': offerId,
        'quantity': quantity,
      });
      return data['id'] as String;
    } on ApiException catch (e) { throw OrderException(e.message); }
  }

  /// Fetches a single order from the user's list.
  Future<Order?> findById(String id) async {
    final all = await fetchMine();
    for (final o in all) { if (o.id == id) return o; }
    return null;
  }

  Future<void> cancel(String orderId) async {
    try { await _api.post('/api/orders/$orderId/cancel', body: {}); }
    on ApiException catch (e) { throw OrderException(e.message); }
  }

  /// Merchant validates a student QR token.
  /// Returns { title, quantity, studentName, points }.
  Future<Map<String, dynamic>> validateQr(String token) async {
    try {
      return await _api.post('/api/orders/validate', body: {'token': token})
          as Map<String, dynamic>;
    } on ApiException catch (e) { throw OrderException(e.message); }
  }
}
