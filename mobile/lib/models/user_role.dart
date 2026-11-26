enum UserRole {
  student, merchant, merchantPending, admin;
  static UserRole? fromString(String? v) {
    if (v == null) return null;
    for (final r in values) { if (r.name == v) return r; }
    return null;
  }
  String get label {
    switch (this) {
      case UserRole.student: return 'Student';
      case UserRole.merchant: return 'Merchant';
      case UserRole.merchantPending: return 'Merchant (Pending)';
      case UserRole.admin: return 'Admin';
    }
  }
}
