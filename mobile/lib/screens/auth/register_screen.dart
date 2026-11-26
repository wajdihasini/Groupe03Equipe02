import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../config/app_theme.dart';
import '../../models/user_role.dart';
import '../../services/auth_service.dart';
import '../../utils/validators.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override State<RegisterScreen> createState() => _State();
}

class _State extends State<RegisterScreen> {
  final _fk = GlobalKey<FormState>();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _confirm = TextEditingController();
  final _shop = TextEditingController();
  final _address = TextEditingController();
  UserRole _role = UserRole.student;
  bool _load = false, _obs = true;

  @override
  void dispose() {
    for (final c in [_first, _last, _phone, _email, _pass, _confirm, _shop, _address]) { c.dispose(); }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_fk.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _load = true);
    try {
      await AuthService().register(
        firstName: _first.text, lastName: _last.text, phone: _phone.text,
        email: _email.text, password: _pass.text, role: _role,
        shopName: _shop.text, address: _address.text);
      if (!mounted) return;
      // AuthGate now shows the e-mail verification screen.
      Navigator.of(context).popUntil((r) => r.isFirst);
    } on AuthException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _load = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final merchant = _role == UserRole.merchant;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.transparent),
      extendBodyBehindAppBar: true,
      body: AuroraBackground(child: SafeArea(child: Form(key: _fk, child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text('Create your\naccount', style: t.displaySmall).animate().fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 8),
          const Text('Join the campus anti-waste movement.', style: TextStyle(color: AppColors.textSub, fontSize: 15)),
          const SizedBox(height: 24),
          Row(children: [
            Expanded(child: _RoleTile(label: 'Student', subtitle: 'Grab deals', icon: Icons.school_rounded,
                selected: !merchant, onTap: () => setState(() => _role = UserRole.student))),
            const SizedBox(width: 12),
            Expanded(child: _RoleTile(label: 'Merchant', subtitle: 'Sell surplus', icon: Icons.storefront_rounded,
                selected: merchant, onTap: () => setState(() => _role = UserRole.merchant))),
          ]),
          AnimatedSize(
            duration: const Duration(milliseconds: 250), curve: Curves.easeOutCubic,
            child: merchant ? Padding(padding: const EdgeInsets.only(top: 12), child: AppCard(
              color: AppColors.card1, border: false, padding: const EdgeInsets.all(14),
              child: const Row(children: [
                Icon(Icons.verified_user_outlined, size: 20, color: AppColors.amber),
                SizedBox(width: 10),
                Expanded(child: Text('Your shop will be reviewed by an admin before it goes live.',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
              ]))) : const SizedBox(width: double.infinity),
          ),
          const SizedBox(height: 20),
          AppCard(padding: const EdgeInsets.all(18), child: Column(children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: TextFormField(controller: _first,
                textCapitalization: TextCapitalization.words, textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.givenName],
                decoration: const InputDecoration(labelText: 'First name'),
                validator: (v) => Validators.name(v, label: 'First name'))),
              const SizedBox(width: 12),
              Expanded(child: TextFormField(controller: _last,
                textCapitalization: TextCapitalization.words, textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.familyName],
                decoration: const InputDecoration(labelText: 'Last name'),
                validator: (v) => Validators.name(v, label: 'Last name'))),
            ]),
            const SizedBox(height: 14),
            TextFormField(controller: _phone,
              keyboardType: TextInputType.phone, textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.telephoneNumber],
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]'))],
              decoration: const InputDecoration(labelText: 'Phone number', hintText: '22 123 456',
                  prefixIcon: Icon(Icons.phone_iphone_rounded)),
              validator: Validators.phone),
            if (merchant) ...[
              const SizedBox(height: 14),
              TextFormField(controller: _shop,
                textCapitalization: TextCapitalization.words, textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Shop name', prefixIcon: Icon(Icons.storefront_outlined)),
                validator: (v) => !merchant ? null
                    : (v?.trim().length ?? 0) < 2 ? 'Shop name is required'
                    : (v!.trim().length > 60 ? 'Shop name is too long' : null)),
              const SizedBox(height: 14),
              TextFormField(controller: _address,
                textCapitalization: TextCapitalization.sentences, textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Shop address (optional)', prefixIcon: Icon(Icons.place_outlined))),
            ],
            const SizedBox(height: 14),
            TextFormField(controller: _email,
              keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.alternate_email_rounded)),
              validator: Validators.email),
            const SizedBox(height: 14),
            TextFormField(controller: _pass, obscureText: _obs, textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  icon: Icon(_obs ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obs = !_obs))),
              validator: Validators.password),
            const SizedBox(height: 14),
            TextFormField(controller: _confirm, obscureText: _obs, textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(),
              decoration: const InputDecoration(labelText: 'Confirm password', prefixIcon: Icon(Icons.lock_outline_rounded)),
              validator: (v) => Validators.confirmPassword(v, _pass.text)),
          ])).animate().fadeIn(delay: 150.ms).slideY(begin: 0.06),
          const SizedBox(height: 24),
          PrimaryButton(label: 'Create account', icon: Icons.arrow_forward_rounded, isLoading: _load, onPressed: _submit),
          const SizedBox(height: 12),
          const Text('We will send a 6-digit code to verify your email.',
              textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSub, fontSize: 12.5)),
        ],
      )))),
    );
  }
}

class _RoleTile extends StatelessWidget {
  final String label, subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _RoleTile({required this.label, required this.subtitle, required this.icon,
      required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => Pressable(
    onTap: () { HapticFeedback.selectionClick(); onTap(); },
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 250), curve: Curves.easeOutCubic,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: selected ? AppColors.ink : AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: selected ? AppColors.ink : AppColors.line, width: 1.4),
        boxShadow: selected ? [BoxShadow(color: AppColors.ink.withAlpha(50), blurRadius: 20, offset: const Offset(0, 8))] : null,
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 28, color: selected ? AppColors.lime : AppColors.textSub),
          const Spacer(),
          AnimatedOpacity(opacity: selected ? 1 : 0, duration: const Duration(milliseconds: 200),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.lime, size: 20)),
        ]),
        const SizedBox(height: 14),
        Text(label, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16,
            color: selected ? Colors.white : AppColors.ink)),
        Text(subtitle, style: TextStyle(fontSize: 12, color: selected ? Colors.white60 : AppColors.textSub)),
      ]),
    ),
  );
}
