import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../utils/validators.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override State<LoginScreen> createState() => _State();
}

class _State extends State<LoginScreen> {
  final _fk = GlobalKey<FormState>();
  final _ec = TextEditingController();
  final _pc = TextEditingController();
  bool _load = false, _obs = true;

  @override void dispose() { _ec.dispose(); _pc.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_fk.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _load = true);
    try {
      await AuthService().signIn(email: _ec.text, password: _pc.text);
    } on AuthException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _load = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: AuroraBackground(child: SafeArea(child: Center(child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 440), child: Form(key: _fk, child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(gradient: AppColors.brandGradient, borderRadius: BorderRadius.circular(18)),
                child: const Icon(Icons.eco_rounded, color: AppColors.lime, size: 28),
              ),
              const SizedBox(width: 12),
              Text('CampusSave', style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            ]).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1),
            const SizedBox(height: 40),
            Text('Save food.\nSave money.', style: t.displaySmall?.copyWith(fontSize: 40))
                .animate().fadeIn(delay: 100.ms, duration: 500.ms).slideY(begin: 0.15),
            const SizedBox(height: 10),
            const Text('Sign in to grab today\'s best deals on campus 🌱',
                style: TextStyle(color: AppColors.textSub, fontSize: 15))
                .animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 32),
            AppCard(padding: const EdgeInsets.all(20), child: Column(children: [
              TextFormField(controller: _ec,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                validator: Validators.email),
              const SizedBox(height: 14),
              TextFormField(controller: _pc,
                obscureText: _obs,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                  suffixIcon: IconButton(
                    icon: Icon(_obs ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obs = !_obs))),
                validator: Validators.password),
              Align(alignment: Alignment.centerRight, child: TextButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                child: const Text('Forgot password?'))),
              PrimaryButton(label: 'Sign in', icon: Icons.arrow_forward_rounded, isLoading: _load, onPressed: _submit),
            ])).animate().fadeIn(delay: 250.ms, duration: 500.ms).slideY(begin: 0.08),
            const SizedBox(height: 22),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('New here?', style: TextStyle(color: AppColors.textSub)),
              TextButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                child: const Text('Create an account')),
            ]).animate().fadeIn(delay: 400.ms),
          ],
        ))),
      )))),
    );
  }
}
