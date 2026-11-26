import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, {this.statusCode});
  @override String toString() => message;
}

class ApiService {
  final http.Client _client;
  final Future<String?> Function()? _tokenProvider;

  ApiService({http.Client? client, Future<String?> Function()? tokenProvider})
      : _client = client ?? http.Client(),
        _tokenProvider = tokenProvider;

  Future<dynamic> get(String path, {Map<String,String>? q, bool auth=true}) =>
    _send('GET', path, query: q, auth: auth);
  Future<dynamic> post(String path, {Object? body, bool auth=true}) =>
    _send('POST', path, body: body, auth: auth);
  Future<dynamic> put(String path, {Object? body, bool auth=true}) =>
    _send('PUT', path, body: body, auth: auth);
  Future<dynamic> patch(String path, {Object? body, bool auth=true}) =>
    _send('PATCH', path, body: body, auth: auth);
  Future<dynamic> delete(String path, {bool auth=true}) =>
    _send('DELETE', path, auth: auth);

  Future<dynamic> _send(String method, String path,
    {Map<String,String>? query, Object? body, required bool auth}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path')
      .replace(queryParameters: query);
    final headers = <String,String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (auth) {
      final provider = _tokenProvider;
      final tok = provider != null ? await provider() : await AuthService().getIdToken();
      if (tok == null) throw const ApiException('Not signed in.', statusCode: 401);
      headers['Authorization'] = 'Bearer $tok';
    }
    final req = http.Request(method, uri)..headers.addAll(headers);
    if (body != null) req.body = jsonEncode(body);
    try {
      final streamed = await _client.send(req).timeout(ApiConfig.timeout);
      final res = await http.Response.fromStream(streamed);
      return _handle(res);
    } on TimeoutException { throw const ApiException('Server timeout.'); }
    on http.ClientException { throw const ApiException('Cannot reach server.'); }
  }

  dynamic _handle(http.Response r) {
    final t = utf8.decode(r.bodyBytes);
    if (r.statusCode >= 200 && r.statusCode < 300) {
      if (t.trim().isEmpty) return null;
      try { return jsonDecode(t); }
      catch (_) { throw ApiException('Invalid server response.', statusCode: r.statusCode); }
    }
    try {
      final d = jsonDecode(t);
      if (d is Map) {
        final m = d['message'] ?? d['error'];
        if (m is String && m.isNotEmpty) throw ApiException(m, statusCode: r.statusCode);
      }
    } catch (e) { if (e is ApiException) rethrow; }
    throw ApiException(_genericMsg(r.statusCode), statusCode: r.statusCode);
  }

  String _genericMsg(int code) {
    if (code == 401) return 'Session expired.';
    if (code == 403) return 'Access denied.';
    if (code == 404) return 'Not found.';
    if (code >= 500) return 'Server error. Try again later.';
    return 'Request failed ($code).';
  }
}
