import '../models/order.dart';
import '../services/api_service.dart';

class PaymentException implements Exception {
  final String message;
  const PaymentException(this.message);
  @override
  String toString() => message;
}

class PaymentResult {
  /// URL Konnect à ouvrir dans le navigateur (null si mode mock).
  final String? payUrl;

  /// true si le paiement a déjà été confirmé (mode mock).
  final bool confirmed;

  const PaymentResult({this.payUrl, this.confirmed = false});
}

/// Routes :
///   POST /api/orders/:id/pay       → { payUrl } (Konnect ou mock URL)
///   POST /api/orders/:id/mock-pay  → { ok: true } (PAYMENT_PROVIDER=mock)
class ApiPaymentRepository {
  final _api = ApiService();

  /// Initie le paiement.
  /// En mode mock (backend local), appelle mock-pay directement.
  /// En mode Konnect, renvoie le payUrl à ouvrir dans le navigateur.
  Future<PaymentResult> pay(Order order) async {
    // 1. Essayer le mode mock (développement local)
    try {
      await _api.post('/api/orders/${order.id}/mock-pay', body: {});
      return const PaymentResult(confirmed: true);
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        // Mode mock désactivé → passer en mode Konnect
        return _payKonnect(order);
      }
      if (e.statusCode == 400) {
        throw PaymentException(e.message);
      }
      throw PaymentException(e.message);
    } on TypeError {
      throw const PaymentException(
        'The server returned an invalid payment response.',
      );
    }
  }

  Future<PaymentResult> _payKonnect(Order order) async {
    try {
      final data = await _api.post('/api/orders/${order.id}/pay', body: {});
      if (data is! Map) {
        throw const PaymentException('No payment details were returned.');
      }
      final payUrl = data['payUrl'] as String?;
      if (payUrl == null) {
        throw const PaymentException('No payment URL returned');
      }
      return PaymentResult(payUrl: payUrl);
    } on ApiException catch (e) {
      throw PaymentException(e.message);
    }
  }
}
