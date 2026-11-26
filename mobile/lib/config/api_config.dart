class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL', defaultValue: 'http://10.0.2.2:4000');
  static const Duration timeout = Duration(seconds: 15);
}
