// Status values must match backend exactly.
enum OrderStatus { pendingPayment, paid, collected, cancelled, expired }

extension OrderStatusLabel on OrderStatus {
  String get label {
    switch (this) {
      case OrderStatus.pendingPayment: return 'Awaiting payment';
      case OrderStatus.paid:           return 'Paid – ready for pickup';
      case OrderStatus.collected:      return 'Collected';
      case OrderStatus.cancelled:      return 'Cancelled';
      case OrderStatus.expired:        return 'Expired';
    }
  }

  static OrderStatus fromString(String s) {
    switch (s) {
      case 'pending_payment': return OrderStatus.pendingPayment;
      case 'paid':            return OrderStatus.paid;
      case 'collected':       return OrderStatus.collected;
      case 'cancelled':       return OrderStatus.cancelled;
      case 'expired':         return OrderStatus.expired;
      default:                return OrderStatus.cancelled;
    }
  }
}

class Order {
  final String id;
  final String studentId;
  final String offerId;
  final String title;        // backend: title
  final String shopId;       // backend: shopId
  final String studentName;
  final int    quantity;
  final double total;
  final double originalTotal;
  final DateTime createdAt;
  final DateTime? expiresAt;
  final DateTime? paidAt;
  final OrderStatus status;
  final String? qrToken;     // 32-char hex; present only after payment, hidden from merchant

  Order({
    required this.id,
    this.studentId = '',
    required this.offerId,
    required this.title,
    required this.shopId,
    this.studentName = '',
    required this.quantity,
    required this.total,
    required this.originalTotal,
    required this.createdAt,
    this.expiresAt,
    this.paidAt,
    required this.status,
    this.qrToken,
  });

  // Backward-compat aliases.
  String get offerTitle  => title;
  String get merchantId  => shopId;
  String get merchantName => '';   // not sent by backend; use shopId to look up if needed

  factory Order.fromJson(Map<String, dynamic> j) => Order(
    id:            j['id']           as String,
    studentId:     (j['studentId']   as String?) ?? '',
    offerId:       (j['offerId']     as String?) ?? '',
    title:         j['title']        as String,
    shopId:        (j['shopId']      as String?) ?? '',
    studentName:   (j['studentName'] as String?) ?? '',
    quantity:      (j['quantity']    as num).toInt(),
    total:         (j['total']       as num).toDouble(),
    originalTotal: ((j['originalTotal'] ?? j['total']) as num).toDouble(),
    createdAt:     DateTime.fromMillisecondsSinceEpoch((j['createdAt'] as num).toInt()),
    expiresAt:     j['expiresAt'] != null
        ? DateTime.fromMillisecondsSinceEpoch((j['expiresAt'] as num).toInt()) : null,
    paidAt: j['paidAt'] != null
        ? DateTime.fromMillisecondsSinceEpoch((j['paidAt'] as num).toInt()) : null,
    status:    OrderStatusLabel.fromString(j['status'] as String),
    qrToken:   j['qrToken'] as String?,
  );
}
