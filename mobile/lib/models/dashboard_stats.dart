class AdminStats {
  final int totalStudents;
  final int totalMerchants;
  final int pendingMerchants;
  final int totalOffers;
  final int totalOrders;
  final double totalRevenue;
  const AdminStats({required this.totalStudents, required this.totalMerchants,
    required this.pendingMerchants, required this.totalOffers,
    required this.totalOrders, required this.totalRevenue});
}

class MerchantStats {
  final int activeOffers;
  final int pendingOrders;
  final int confirmedOrders;
  final double totalRevenue;
  const MerchantStats({required this.activeOffers, required this.pendingOrders,
    required this.confirmedOrders, required this.totalRevenue});
}
