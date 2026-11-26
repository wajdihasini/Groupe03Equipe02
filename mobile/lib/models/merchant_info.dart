enum MerchantStatus { pending, validated, rejected }

class MerchantInfo {
  final String uid;
  final String name;
  final String email;
  final String businessName;
  MerchantStatus status;
  MerchantInfo({required this.uid, required this.name, required this.email,
    required this.businessName, this.status = MerchantStatus.pending});
}
