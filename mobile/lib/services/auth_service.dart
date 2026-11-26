import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user_role.dart';
import 'role_service.dart' show currentProfile;

class AuthException implements Exception {
  final String message;
  const AuthException(this.message);
  @override String toString() => message;
}

class AuthService {
  /// True while an account is being created: Firebase signs the user in before
  /// POST /api/users has created the profile, so the gate must wait.
  static final ValueNotifier<bool> registering = ValueNotifier<bool>(false);

  final _auth = FirebaseAuth.instance;

  Stream<User?> get userChanges => _auth.userChanges();
  Stream<User?> get authStateChanges => _auth.authStateChanges();
  User? get currentUser => _auth.currentUser;

  Future<void> signIn({required String email, required String password}) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email.trim(), password: password);
    } on FirebaseAuthException catch (e) { throw AuthException(_msg(e.code)); }
  }

  /// Creates the Firebase user, then POST /api/users to create the Firestore profile.
  /// Backend contract (profileSchema): firstName, lastName, role, phone, [shopName, address].
  Future<void> register({
    required String firstName,
    required String lastName,
    required String phone,
    required String email,
    required String password,
    required UserRole role,
    String shopName = '',
    String address = '',
  }) async {
    UserCredential? cred;
    registering.value = true;
    try {
      cred = await _auth.createUserWithEmailAndPassword(email: email.trim(), password: password);
      await cred.user?.updateDisplayName('${firstName.trim()} ${lastName.trim()}');

      final token = await cred.user!.getIdToken();
      final merchant = role == UserRole.merchant || role == UserRole.merchantPending;
      final body = <String, dynamic>{
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'phone': phone.trim(),
        'role': merchant ? 'merchant' : 'student',
        if (merchant) 'shopName': shopName.trim(),
        if (merchant && address.trim().isNotEmpty) 'address': address.trim(),
      };

      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/users'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode(body),
      ).timeout(ApiConfig.timeout);

      // 409 = profile already exists (acceptable); anything else is an error.
      if (res.statusCode != 201 && res.statusCode != 409) {
        final err = _safeDecode(res.body)?['error'] ?? 'Server error (${res.statusCode})';
        // Roll back the Firebase account so the user can retry with the same e-mail.
        await cred.user?.delete().catchError((_) {});
        await _auth.signOut();
        throw AuthException('Profile not created: $err');
      }
    } on FirebaseAuthException catch (e) {
      throw AuthException(_msg(e.code));
    } on AuthException {
      rethrow;
    } catch (e) {
      if (cred != null) { await cred.user?.delete().catchError((_) {}); await _auth.signOut(); }
      throw const AuthException('Cannot reach the server. Check your connection and try again.');
    } finally {
      registering.value = false;
    }
  }

  /// Confirms the password again. The backend requires a sign-in less than
  /// 5 minutes old to change the e-mail address (auth_time in the ID token).
  Future<void> reauthenticate(String password) async {
    final u = _auth.currentUser;
    if (u == null || u.email == null) throw const AuthException('Not signed in.');
    try {
      await u.reauthenticateWithCredential(EmailAuthProvider.credential(email: u.email!, password: password));
      await u.getIdToken(true); // fresh token carrying the new auth_time
    } on FirebaseAuthException catch (e) { throw AuthException(_msg(e.code)); }
  }

  Future<void> sendPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found') return;
      throw AuthException(_msg(e.code));
    }
  }

  Future<void> updateDisplayName(String name) async {
    try {
      await _auth.currentUser?.updateDisplayName(name.trim());
      await _auth.currentUser?.reload();
    } on FirebaseAuthException catch (e) { throw AuthException(_msg(e.code)); }
  }

  /// Reloads the Firebase user (e.g. after the backend changed the e-mail).
  Future<void> reload() async {
    try { await _auth.currentUser?.reload(); await _auth.currentUser?.getIdToken(true); } catch (_) {}
  }

  Future<void> signOut() {
    currentProfile.value = null;
    return _auth.signOut();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async =>
      await _auth.currentUser?.getIdToken(forceRefresh);

  Map<String, dynamic>? _safeDecode(String body) {
    try { return jsonDecode(body) as Map<String, dynamic>; } catch (_) { return null; }
  }

  String _msg(String code) {
    switch (code) {
      case 'invalid-email':          return 'Invalid email address.';
      case 'user-disabled':          return 'Account disabled.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':     return 'Incorrect email or password.';
      case 'email-already-in-use':   return 'An account already exists for this email.';
      case 'weak-password':          return 'Password is too weak (min. 6 chars).';
      case 'network-request-failed': return 'Network error. Check your connection.';
      case 'too-many-requests':      return 'Too many attempts. Try again later.';
      case 'requires-recent-login':  return 'Please confirm your password again.';
      default:                       return 'Authentication error ($code).';
    }
  }
}
