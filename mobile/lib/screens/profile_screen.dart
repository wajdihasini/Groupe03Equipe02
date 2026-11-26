import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../config/app_theme.dart';
import '../models/user_profile.dart';
import '../models/user_role.dart';
import '../repositories/profile_repository.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/role_service.dart';
import '../utils/validators.dart';
import '../widgets/app_card.dart';
import '../widgets/state_views.dart';
import '../widgets/ui.dart';

class ProfileScreen extends StatefulWidget {
  final User user;
  final UserRole? role;
  const ProfileScreen({super.key, required this.user, this.role});
  @override State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repo = ProfileRepository();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh(silent: currentProfile.value != null);
  }

  Future<void> _refresh({bool silent = false}) async {
    if (!silent) setState(() { _loading = true; _error = null; });
    try {
      currentProfile.value = await _repo.fetch();
    } catch (e) {
      if (mounted && currentProfile.value == null) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Edit actions ────────────────────────────────────────────────────────

  Future<void> _editName(UserProfile p) async {
    final saved = await showAppSheet<bool>(context, child: _NameSheet(profile: p));
    if (saved == true && mounted) showSnack(context, 'Name updated.', success: true);
  }

  Future<void> _editPhone(UserProfile p) async {
    final saved = await showAppSheet<bool>(context, child: _PhoneSheet(profile: p));
    if (saved == true && mounted) showSnack(context, 'Phone number updated.', success: true);
  }

  Future<void> _editEmail(UserProfile p) async {
    final changed = await showAppSheet<bool>(context, child: _EmailSheet(profile: p));
    if (changed != true || !mounted) return;
    showSnack(context, 'Email changed. Enter the code we just sent to verify it.', success: true);
    // AuthGate keys the home on uid+email → it rebuilds and shows the verification screen.
    Navigator.of(context).popUntil((r) => r.isFirst);
  }

  Future<void> _resetPwd(String email) async {
    try {
      await AuthService().sendPasswordReset(email);
      if (mounted) showSnack(context, 'Reset link sent to $email.', success: true);
    } on AuthException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  Future<void> _signOut() async {
    final nav = Navigator.of(context);
    final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(
      title: const Text('Sign out?'),
      content: const Text('You will need to sign in again to reserve offers.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(c, true),
            child: const Text('Sign out', style: TextStyle(color: AppColors.error))),
      ]));
    if (ok != true) return;
    nav.popUntil((r) => r.isFirst);
    currentProfile.value = null;
    await AuthService().signOut();
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  Color get _roleColor => switch (widget.role) {
    UserRole.admin => AppColors.violet,
    UserRole.merchant || UserRole.merchantPending => AppColors.coral,
    _ => AppColors.primary,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My profile'), backgroundColor: Colors.transparent),
      extendBodyBehindAppBar: true,
      body: AuroraBackground(child: SafeArea(child: ValueListenableBuilder<UserProfile?>(
        valueListenable: currentProfile,
        builder: (_, p, _) {
          if (p == null && _loading) return const LoadingView(message: 'Loading profile…');
          if (p == null) return ErrorView(message: _error ?? 'Profile unavailable.', onRetry: _refresh);
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 40), children: [
              _hero(p),
              const SizedBox(height: 22),
              const SectionTitle('Personal information'),
              AppCard(padding: const EdgeInsets.symmetric(vertical: 6), child: Column(children: [
                _Tile(icon: Icons.badge_outlined, color: AppColors.primary, title: 'Full name',
                    value: p.displayName.isEmpty ? 'Not set' : p.displayName, onTap: () => _editName(p)),
                const _Sep(),
                _Tile(icon: Icons.phone_iphone_rounded, color: AppColors.sky, title: 'Phone number',
                    value: p.phone.isEmpty ? 'Add a phone number' : p.phone, onTap: () => _editPhone(p)),
                const _Sep(),
                _Tile(icon: Icons.alternate_email_rounded, color: AppColors.violet, title: 'Email',
                    value: p.email, onTap: () => _editEmail(p),
                    badge: p.emailVerified ? const StatusBadge(label: 'Verified', color: AppColors.card2,
                        textColor: AppColors.eco, icon: Icons.verified_rounded) : null),
              ])).animate().fadeIn(delay: 100.ms).slideY(begin: 0.05),
              if (p.shop != null) ...[
                const SizedBox(height: 18),
                const SectionTitle('My shop'),
                AppCard(padding: const EdgeInsets.symmetric(vertical: 6), child: Column(children: [
                  _Tile(icon: Icons.storefront_rounded, color: AppColors.coral, title: 'Shop',
                      value: p.shopName.isEmpty ? '—' : p.shopName,
                      badge: StatusBadge(label: p.shopApproved ? 'Approved' : 'Pending',
                          color: p.shopApproved ? AppColors.card2 : AppColors.card1,
                          textColor: p.shopApproved ? AppColors.eco : AppColors.amber)),
                  if ((p.shop?['address'] ?? '').toString().isNotEmpty) ...[
                    const _Sep(),
                    _Tile(icon: Icons.place_outlined, color: AppColors.amber, title: 'Address',
                        value: p.shop!['address'].toString()),
                  ],
                ])).animate().fadeIn(delay: 150.ms).slideY(begin: 0.05),
              ],
              const SizedBox(height: 18),
              const SectionTitle('Security'),
              AppCard(padding: const EdgeInsets.symmetric(vertical: 6), child: _Tile(
                  icon: Icons.lock_reset_rounded, color: AppColors.amber, title: 'Reset password',
                  value: 'Receive a reset link by email', onTap: () => _resetPwd(p.email)))
                  .animate().fadeIn(delay: 200.ms).slideY(begin: 0.05),
              const SizedBox(height: 28),
              PrimaryButton(label: 'Sign out', icon: Icons.logout_rounded,
                  color: AppColors.error.withAlpha(25), foreground: AppColors.error, onPressed: _signOut),
            ]),
          );
        },
      ))),
    );
  }

  Widget _hero(UserProfile p) => AppCard(
    gradient: AppColors.brandGradient,
    padding: const EdgeInsets.all(22),
    child: Row(children: [
      AvatarButton(name: p.displayName, size: 72),
      const SizedBox(width: 16),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(p.displayName.isEmpty ? 'Welcome!' : p.displayName, maxLines: 2, overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        const SizedBox(height: 8),
        Wrap(spacing: 6, runSpacing: 6, children: [
          if (widget.role != null) StatusBadge(label: widget.role!.label, color: _roleColor == AppColors.primary ? AppColors.lime : _roleColor),
          if (p.role == UserRole.student) StatusBadge(label: '${p.ecoPoints} EcoPoints',
              color: Colors.white.withAlpha(35), textColor: Colors.white, icon: Icons.eco_rounded),
        ]),
      ])),
    ]),
  ).animate().fadeIn().scaleXY(begin: 0.97);
}

class _Sep extends StatelessWidget {
  const _Sep();
  @override Widget build(BuildContext context) => const Padding(
      padding: EdgeInsets.only(left: 70), child: Divider(height: 1));
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title, value;
  final VoidCallback? onTap;
  final Widget? badge;
  const _Tile({required this.icon, required this.color, required this.title, required this.value, this.onTap, this.badge});
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(AppRadius.lg),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        IconBubble(icon: icon, color: color, size: 42),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textSub, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(value, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        ])),
        if (badge != null) ...[const SizedBox(width: 6), badge!],
        if (onTap != null) const Padding(padding: EdgeInsets.only(left: 6),
            child: Icon(Icons.edit_rounded, size: 18, color: AppColors.textSub)),
      ]),
    ),
  );
}

// ── Bottom sheets ────────────────────────────────────────────────────────

class _SheetHeader extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title, subtitle;
  const _SheetHeader({required this.icon, required this.color, required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Row(children: [
      IconBubble(icon: icon, color: color, size: 50),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        Text(subtitle, style: const TextStyle(color: AppColors.textSub, fontSize: 13)),
      ])),
    ]),
  );
}

/// Shared save logic: PUT /api/me then refresh the shared profile.
mixin _SaveMixin<T extends StatefulWidget> on State<T> {
  bool busy = false;
  String? error;
  Future<void> save(Future<void> Function() op, {bool closeWith = true}) async {
    setState(() { busy = true; error = null; });
    try {
      await op();
      try { currentProfile.value = await ProfileRepository().fetch(); } catch (_) {}
      if (mounted) Navigator.of(context).pop(closeWith);
    } on ApiException catch (e) {
      if (mounted) setState(() => error = e.message);
    } on AuthException catch (e) {
      if (mounted) setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
  Widget errorText() => error == null ? const SizedBox.shrink() : Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Text(error!, style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)));
}

class _NameSheet extends StatefulWidget {
  final UserProfile profile;
  const _NameSheet({required this.profile});
  @override State<_NameSheet> createState() => _NameSheetState();
}
class _NameSheetState extends State<_NameSheet> with _SaveMixin {
  final _fk = GlobalKey<FormState>();
  late final _f = TextEditingController(text: widget.profile.firstName);
  late final _l = TextEditingController(text: widget.profile.lastName);
  @override void dispose() { _f.dispose(); _l.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Form(key: _fk, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const _SheetHeader(icon: Icons.badge_outlined, color: AppColors.primary, title: 'Edit name', subtitle: 'How shops will see you'),
    TextFormField(controller: _f, autofocus: true, textCapitalization: TextCapitalization.words,
        decoration: const InputDecoration(labelText: 'First name'), validator: (v) => Validators.name(v, label: 'First name')),
    const SizedBox(height: 14),
    TextFormField(controller: _l, textCapitalization: TextCapitalization.words,
        decoration: const InputDecoration(labelText: 'Last name'), validator: (v) => Validators.name(v, label: 'Last name')),
    errorText(),
    const SizedBox(height: 22),
    PrimaryButton(label: 'Save', icon: Icons.check_rounded, isLoading: busy, onPressed: () {
      if (!_fk.currentState!.validate()) return;
      save(() => ProfileRepository().update(current: widget.profile, firstName: _f.text, lastName: _l.text));
    }),
  ]));
}

class _PhoneSheet extends StatefulWidget {
  final UserProfile profile;
  const _PhoneSheet({required this.profile});
  @override State<_PhoneSheet> createState() => _PhoneSheetState();
}
class _PhoneSheetState extends State<_PhoneSheet> with _SaveMixin {
  final _fk = GlobalKey<FormState>();
  late final _c = TextEditingController(text: widget.profile.phone);
  @override void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Form(key: _fk, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const _SheetHeader(icon: Icons.phone_iphone_rounded, color: AppColors.sky, title: 'Phone number', subtitle: 'Shops may call you about your order'),
    TextFormField(controller: _c, autofocus: true, keyboardType: TextInputType.phone,
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]'))],
        decoration: const InputDecoration(labelText: 'Phone number', hintText: '22 123 456', prefixIcon: Icon(Icons.phone_rounded)),
        validator: Validators.phone),
    errorText(),
    const SizedBox(height: 22),
    PrimaryButton(label: 'Save', icon: Icons.check_rounded, isLoading: busy, onPressed: () {
      if (!_fk.currentState!.validate()) return;
      save(() => ProfileRepository().update(current: widget.profile, phone: _c.text));
    }),
  ]));
}

class _EmailSheet extends StatefulWidget {
  final UserProfile profile;
  const _EmailSheet({required this.profile});
  @override State<_EmailSheet> createState() => _EmailSheetState();
}
class _EmailSheetState extends State<_EmailSheet> with _SaveMixin {
  final _fk = GlobalKey<FormState>();
  late final _e = TextEditingController(text: widget.profile.email);
  final _p = TextEditingController();
  bool _obs = true;
  @override void dispose() { _e.dispose(); _p.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Form(key: _fk, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const _SheetHeader(icon: Icons.alternate_email_rounded, color: AppColors.violet, title: 'Change email',
        subtitle: 'You will verify the new address with a code'),
    TextFormField(controller: _e, autofocus: true, keyboardType: TextInputType.emailAddress,
        decoration: const InputDecoration(labelText: 'New email', prefixIcon: Icon(Icons.alternate_email_rounded)),
        validator: (v) {
          final err = Validators.email(v);
          if (err != null) return err;
          if (v!.trim().toLowerCase() == widget.profile.email.toLowerCase()) return 'This is already your email';
          return null;
        }),
    const SizedBox(height: 14),
    TextFormField(controller: _p, obscureText: _obs,
        decoration: InputDecoration(labelText: 'Current password', prefixIcon: const Icon(Icons.lock_outline_rounded),
          suffixIcon: IconButton(icon: Icon(_obs ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              onPressed: () => setState(() => _obs = !_obs))),
        validator: Validators.password),
    errorText(),
    const SizedBox(height: 22),
    PrimaryButton(label: 'Change email', icon: Icons.check_rounded, isLoading: busy, onPressed: () {
      if (!_fk.currentState!.validate()) return;
      save(() async {
        // The backend accepts an e-mail change only within 5 min of signing in.
        await AuthService().reauthenticate(_p.text);
        await ProfileRepository().update(current: widget.profile, email: _e.text);
      });
    }),
  ]));
}
