import 'package:flutter/material.dart';
import 'config/app_theme.dart';
import 'screens/auth/auth_gate.dart';

class CampusSaveApp extends StatelessWidget {
  const CampusSaveApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(
    title: 'CampusSave',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    home: const AuthGate(),
  );
}
