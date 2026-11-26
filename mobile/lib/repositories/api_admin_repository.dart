import '../services/api_service.dart';

class ApiAdminRepository {
  final _api = ApiService();

  Future<List<Map<String, dynamic>>> fetchUsers() async {
    final data = await _api.get('/api/admin/users');
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<void> blockUser(String uid, {required bool blocked}) async {
    await _api.patch('/api/admin/users/$uid', body: {'blocked': blocked});
  }

  Future<List<Map<String, dynamic>>> fetchShops() async {
    final data = await _api.get('/api/admin/shops');
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<void> approveShop(String shopId, {required bool approved}) async {
    await _api.patch('/api/admin/shops/$shopId', body: {'approved': approved});
  }

  Future<Map<String, dynamic>> fetchStats() async {
    final data = await _api.get('/api/stats');
    return data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> fetchImpact() async {
    final data = await _api.get('/api/impact', auth: false);
    return data as Map<String, dynamic>;
  }
}
