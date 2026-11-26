import '../services/api_service.dart';

class ApiStatisticsRepository {
  final _api = ApiService();

  Future<Map<String, dynamic>> fetchOverview() async {
    final response = await _api.get('/api/stats');
    if (response is! Map) return const {};
    return Map<String, dynamic>.from(response);
  }
}
