import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/order.dart';
import 'app_card.dart';

extension OrderStatusStyle on OrderStatus {
  Color get color => switch (this) {
    OrderStatus.pendingPayment => AppColors.amber,
    OrderStatus.paid => AppColors.primary,
    OrderStatus.collected => AppColors.violet,
    OrderStatus.cancelled => AppColors.textSub,
    OrderStatus.expired => AppColors.error,
  };
  IconData get icon => switch (this) {
    OrderStatus.pendingPayment => Icons.hourglass_bottom_rounded,
    OrderStatus.paid => Icons.qr_code_2_rounded,
    OrderStatus.collected => Icons.check_circle_rounded,
    OrderStatus.cancelled => Icons.cancel_rounded,
    OrderStatus.expired => Icons.timer_off_rounded,
  };
  String get shortLabel => switch (this) {
    OrderStatus.pendingPayment => 'To pay',
    OrderStatus.paid => 'Ready for pickup',
    OrderStatus.collected => 'Collected',
    OrderStatus.cancelled => 'Cancelled',
    OrderStatus.expired => 'Expired',
  };
  bool get isActive => this == OrderStatus.pendingPayment || this == OrderStatus.paid;
}

class OrderStatusBadge extends StatelessWidget {
  final OrderStatus status;
  const OrderStatusBadge(this.status, {super.key});
  @override
  Widget build(BuildContext context) => StatusBadge(
    label: status.shortLabel, icon: status.icon,
    color: status.color.withAlpha(30), textColor: status.color,
  );
}
