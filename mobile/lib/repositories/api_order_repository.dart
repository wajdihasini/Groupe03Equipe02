import '../models/order.dart';
import '../services/api_service.dart';

class OrderException implements Exception {
  final String message;
  const OrderException(this.message);
  @override
  String toString() => message;
}

/// Routes :
///   POST /api/orders              réserver
///   POST /api/orders/:id/cancel   annuler
///   GET  /api/my/orders           lister (student ou merchant)
///   POST /api/orders/validate     valider QR (merchant)
class ApiOrderRepository {
  final _api = ApiService();

  Future<List<Order>> fetchForStudent() async {
    try {
      return _parseList(await _api.get('/api/my/orders'));
    } on ApiException catch (e) {
      throw OrderException(e.message);
    } on TypeError {
      throw const OrderException('The server returned invalid order data.');
    }
  }

  Future<List<Order>> fetchForMerchant() async {
    try {
      return _parseList(await _api.get('/api/my/orders'));
    } on ApiException catch (e) {
      throw OrderException(e.message);
    } on TypeError {
      throw const OrderException('The server returned invalid order data.');
    }
  }

  List<Order> _parseList(dynamic data) => (data as List)
      .map((j) => Order.fromJson(j as Map<String, dynamic>))
      .toList();

  Future<Order> create({required String offerId, required int quantity}) async {
    try {
      final data = await _api.post(
        '/api/orders',
        body: {'offerId': offerId, 'quantity': quantity},
      );
      // Backend renvoie { id }; on refetch la commande.
      final orderId = data['id'] as String;
      return await fetchOrder(orderId);
    } on ApiException catch (e) {
      throw OrderException(e.message);
    } on TypeError {
      throw const OrderException('The server returned an invalid order.');
    }
  }

  Future<Order> fetchOrder(String id) async {
    // Pas de route GET /api/orders/:id → on refetch la liste et on filtre.
    final all = await fetchForStudent();
    for (final order in all) {
      if (order.id == id) return order;
    }
    throw const OrderException('Order not found');
  }

  Future<void> cancel(String orderId) async {
    try {
      await _api.post('/api/orders/$orderId/cancel', body: {});
    } on ApiException catch (e) {
      throw OrderException(e.message);
    }
  }

  /// Valide le QR code chez le commerçant.
  /// Envoie { token: qrToken } → backend : POST /api/orders/validate
  Future<Map<String, dynamic>> validateQr(String qrToken) async {
    try {
      final data = await _api.post(
        '/api/orders/validate',
        body: {'token': qrToken},
      );
      if (data is! Map) {
        throw const OrderException(
          'The server returned invalid pickup details.',
        );
      }
      return Map<String, dynamic>.from(data);
    } on ApiException catch (e) {
      throw OrderException(e.message);
    }
  }
}
