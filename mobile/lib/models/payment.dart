enum PaymentStatus { pending, success, failed }

class PaymentSession {
  final String id;
  final String orderId;
  final double amount;
  final String? paymentUrl;
  PaymentSession({required this.id, required this.orderId, required this.amount, this.paymentUrl});
}
