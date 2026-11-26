import '../models/order.dart';
import '../services/api_service.dart';

class PaymentException implements Exception {
  final String message;
  const PaymentException(this.message);
  @override String toString() => message;
}

class PaymentResult {
  /// Non-null when PAYMENT_PROVIDER=konnect; open in browser.
  final String? payUrl;
  /// true when PAYMENT_PROVIDER=mock; payment is already confirmed server-side.
  final bool confirmed;
  const PaymentResult({this.payUrl, this.confirmed = false});
}

/// POST /api/orders/:id/mock-pay   (PAYMENT_PROVIDER=mock → { ok: true })
/// POST /api/orders/:id/pay        (konnect → { payUrl: "..." })
class PaymentRepository {
  final ApiService _api;

  PaymentRepository({ApiService? api}) : _api = api ?? ApiService();

  Future<PaymentResult> pay(Order order) async {
    // 1. Try mock-pay (works when backend has PAYMENT_PROVIDER=mock).
    try {
      await _api.post('/api/orders/${order.id}/mock-pay', body: {});
      return const PaymentResult(confirmed: true);
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        // Not in mock mode → use Konnect.
        return _payKonnect(order);
      }
      throw PaymentException(e.message);
    }
  }

  Future<PaymentResult> _payKonnect(Order order) async {
    try {
      final data = await _api.post('/api/orders/${order.id}/pay', body: {});
      final url  = data['payUrl'] as String?;
      if (url == null) throw const PaymentException('No payUrl returned from backend.');
      return PaymentResult(payUrl: url);
    } on ApiException catch (e) { throw PaymentException(e.message); }
  }
}
