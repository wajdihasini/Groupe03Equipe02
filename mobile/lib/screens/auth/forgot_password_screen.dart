import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../utils/validators.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _fk = GlobalKey<FormState>();
  final _ec = TextEditingController();
  bool _load = false;

  @override void dispose() { _ec.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_fk.currentState!.validate()) return;
    setState(() => _load = true);
    try {
      await AuthService().sendPasswordReset(_ec.text);
      if (!mounted) return;
      showSnack(context, 'If this email exists, a reset link has been sent.', success: true);
      Navigator.of(context).pop();
    } on AuthException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _load = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(backgroundColor: Colors.transparent),
    extendBodyBehindAppBar: true,
    body: AuroraBackground(child: SafeArea(child: Form(key: _fk, child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const IconBubble(icon: Icons.lock_reset_rounded, color: AppColors.violet, size: 76)
            .animate().scale(curve: Curves.easeOutBack),
        const SizedBox(height: 22),
        Text('Forgot your\npassword?', style: Theme.of(context).textTheme.displaySmall),
        const SizedBox(height: 10),
        const Text("No worries — enter your email and we'll send you a reset link.",
            style: TextStyle(color: AppColors.textSub, fontSize: 15, height: 1.4)),
        const SizedBox(height: 28),
        TextFormField(
          controller: _ec,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _submit(),
          decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
          validator: Validators.email,
        ),
        const SizedBox(height: 22),
        PrimaryButton(label: 'Send reset link', icon: Icons.send_rounded, isLoading: _load, onPressed: _submit),
      ],
    )))),
  );
}
