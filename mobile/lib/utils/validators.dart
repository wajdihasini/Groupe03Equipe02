class Validators {
  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  // Same rule as the backend (validators/schemas.js): 8 digits, optional +216 / 00216 prefix.
  static final _phone = RegExp(r'^(\+216|00216)?\s?\d{2}\s?\d{3}\s?\d{3}$');

  static String? required(String? v, {String label = 'This field'}) =>
    (v == null || v.trim().isEmpty) ? '$label is required' : null;

  /// First / last name: 2–40 characters (backend nameField).
  static String? name(String? v, {String label = 'Name'}) {
    final s = v?.trim() ?? '';
    if (s.isEmpty) return '$label is required';
    if (s.length < 2) return '$label is too short';
    if (s.length > 40) return '$label is too long';
    return null;
  }

  static String? phone(String? v) {
    final s = v?.trim() ?? '';
    if (s.isEmpty) return 'Phone number is required';
    if (!_phone.hasMatch(s)) return 'Invalid phone (8 digits, e.g. 22 123 456)';
    return null;
  }

  static String? email(String? v) {
    if (v == null || v.trim().isEmpty) return 'Email is required';
    if (!_email.hasMatch(v.trim())) return 'Enter a valid email';
    return null;
  }

  static String? password(String? v) {
    if (v == null || v.isEmpty) return 'Password is required';
    if (v.length < 6) return 'Min. 6 characters';
    return null;
  }

  static String? confirmPassword(String? v, String original) {
    if (v == null || v.isEmpty) return 'Confirm your password';
    if (v != original) return 'Passwords do not match';
    return null;
  }

  static String? positiveNumber(String? v, {String label = 'Value'}) {
    if (v == null || v.trim().isEmpty) return '$label is required';
    final n = double.tryParse(v.trim().replaceAll(',', '.'));
    if (n == null || n <= 0) return 'Enter a positive number';
    return null;
  }

  static String? positiveInt(String? v, {String label = 'Value'}) {
    if (v == null || v.trim().isEmpty) return '$label is required';
    final n = int.tryParse(v.trim());
    if (n == null || n <= 0) return 'Enter a whole positive number';
    return null;
  }
}
