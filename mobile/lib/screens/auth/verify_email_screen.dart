import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../repositories/profile_repository.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';

/// The backend blocks every route until the e-mail is confirmed with a
/// 6-digit code (POST /api/verify/send then /api/verify/confirm).
class VerifyEmailScreen extends StatefulWidget {
  final String email;
  final VoidCallback onVerified;
  const VerifyEmailScreen({super.key, required this.email, required this.onVerified});
  @override State<VerifyEmailScreen> createState() => _State();
}

class _State extends State<VerifyEmailScreen> {
  final _repo = ProfileRepository();
  final _c = TextEditingController();
  final _focus = FocusNode();
  bool _busy = false, _sending = false;
  int _wait = 0;
  Timer? _timer;
  String? _error;

  @override
  void initState() {
    super.initState();
    _send();
    _c.addListener(() {
      setState(() {});
      if (_c.text.length == 6 && !_busy) _confirm();
    });
  }

  @override
  void dispose() { _timer?.cancel(); _c.dispose(); _focus.dispose(); super.dispose(); }

  void _startCooldown(int s) {
    _timer?.cancel();
    setState(() => _wait = s);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _wait = (_wait - 1).clamp(0, 999));
      if (_wait == 0) t.cancel();
    });
  }

  Future<void> _send() async {
    setState(() { _sending = true; _error = null; });
    try {
      final w = await _repo.sendCode();
      if (!mounted) return;
      if (w == 0) { widget.onVerified(); return; }
      _startCooldown(w);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _confirm() async {
    if (_c.text.length != 6) return;
    setState(() { _busy = true; _error = null; });
    try {
      final ok = await _repo.confirmCode(_c.text);
      if (!mounted) return;
      if (ok) {
        HapticFeedback.mediumImpact();
        widget.onVerified();
      }
    } on ApiException catch (e) {
      HapticFeedback.heavyImpact();
      if (mounted) setState(() { _error = e.message; _c.clear(); });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: AuroraBackground(child: SafeArea(child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 24),
          Container(
            width: 84, height: 84,
            decoration: BoxDecoration(gradient: AppColors.brandGradient, borderRadius: BorderRadius.circular(28)),
            child: const Icon(Icons.mark_email_unread_rounded, color: AppColors.lime, size: 40),
          ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
          const SizedBox(height: 24),
          Text('Check your inbox', style: t.displaySmall),
          const SizedBox(height: 10),
          Text.rich(TextSpan(style: const TextStyle(color: AppColors.textSub, height: 1.5, fontSize: 15), children: [
            const TextSpan(text: 'We sent a 6-digit code to '),
            TextSpan(text: widget.email, style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.w800)),
            const TextSpan(text: '. Enter it below to activate your account.'),
          ])),
          const SizedBox(height: 32),
          GestureDetector(
            onTap: () => _focus.requestFocus(),
            child: Stack(children: [
              // Invisible field that actually receives the input.
              Opacity(opacity: 0, child: SizedBox(height: 64, child: TextField(
                controller: _c, focusNode: _focus, autofocus: true,
                keyboardType: TextInputType.number, maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                autofillHints: const [AutofillHints.oneTimeCode],
              ))),
              Row(children: [
                for (var i = 0; i < 6; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(child: _Box(char: i < _c.text.length ? _c.text[i] : '',
                      active: i == _c.text.length && _focus.hasFocus, error: _error != null)),
                ],
              ]),
            ]),
          ),
          if (_error != null) Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Text(_error!, style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)),
          ).animate().shakeX(hz: 5, amount: 4),
          const SizedBox(height: 28),
          PrimaryButton(label: 'Verify', icon: Icons.verified_rounded, isLoading: _busy,
              onPressed: _c.text.length == 6 ? _confirm : null),
          const SizedBox(height: 14),
          Center(child: TextButton(
            onPressed: _wait > 0 || _sending ? null : _send,
            child: Text(_wait > 0 ? 'Resend code in ${_wait}s' : (_sending ? 'Sending…' : 'Resend code')),
          )),
          const SizedBox(height: 8),
          AppCard(color: AppColors.card4, border: false, padding: const EdgeInsets.all(14), child: const Row(children: [
            Icon(Icons.info_outline_rounded, color: AppColors.sky, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Can\'t find it? Check your spam folder. The code is valid for 10 minutes.',
                style: TextStyle(fontSize: 12.5, height: 1.4))),
          ])),
          const SizedBox(height: 16),
          Center(child: TextButton.icon(
            onPressed: () => AuthService().signOut(),
            icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.textSub),
            label: const Text('Use another account', style: TextStyle(color: AppColors.textSub)),
          )),
        ],
      ))),
    );
  }
}

class _Box extends StatelessWidget {
  final String char;
  final bool active, error;
  const _Box({required this.char, required this.active, required this.error});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    height: 64,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.md),
      border: Border.all(
        color: error ? AppColors.error : active ? AppColors.primary : (char.isEmpty ? AppColors.line : AppColors.ink),
        width: active || char.isNotEmpty ? 2 : 1.3),
      boxShadow: active ? [BoxShadow(color: AppColors.primary.withAlpha(40), blurRadius: 14)] : null,
    ),
    child: Text(char, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
  );
}
