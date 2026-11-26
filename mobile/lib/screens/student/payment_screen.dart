import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../models/order.dart';
import '../../repositories/order_repository.dart';
import '../../repositories/payment_repository.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';

/// Pops `true` once the order is paid.
/// - PAYMENT_PROVIDER=mock    → POST /mock-pay confirms instantly.
/// - PAYMENT_PROVIDER=konnect → opens the Konnect page, then polls the order status.
class PaymentScreen extends StatefulWidget {
  final Order order;
  const PaymentScreen({super.key, required this.order});
  @override State<PaymentScreen> createState() => _State();
}

class _State extends State<PaymentScreen> with WidgetsBindingObserver {
  bool _busy = false;
  bool _waitingExternal = false;
  String? _error;
  Timer? _poll;

  @override
  void initState() { super.initState(); WidgetsBinding.instance.addObserver(this); }

  @override
  void dispose() { _poll?.cancel(); WidgetsBinding.instance.removeObserver(this); super.dispose(); }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (s == AppLifecycleState.resumed && _waitingExternal) _checkPaid();
  }

  Future<void> _pay() async {
    setState(() { _busy = true; _error = null; });
    try {
      final result = await PaymentRepository().pay(widget.order);
      if (!mounted) return;
      if (result.confirmed) {
        HapticFeedback.heavyImpact();
        Navigator.of(context).pop(true);
      } else if (result.payUrl != null) {
        final ok = await launchUrl(Uri.parse(result.payUrl!), mode: LaunchMode.externalApplication);
        if (!ok) throw const PaymentException('Cannot open the payment page.');
        setState(() => _waitingExternal = true);
        _poll?.cancel();
        _poll = Timer.periodic(const Duration(seconds: 4), (_) => _checkPaid());
      }
    } on PaymentException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkPaid() async {
    try {
      final o = await OrderRepository().findById(widget.order.id);
      if (!mounted || o == null) return;
      if (o.status == OrderStatus.paid) {
        _poll?.cancel();
        HapticFeedback.heavyImpact();
        Navigator.of(context).pop(true);
      } else if (o.status != OrderStatus.pendingPayment) {
        _poll?.cancel();
        setState(() { _waitingExternal = false; _error = 'This reservation is ${o.status.label.toLowerCase()}.'; });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout'), backgroundColor: Colors.transparent),
      body: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 24), children: [
        // Amount card
        AppCard(
          gradient: AppColors.brandGradient,
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Amount to pay', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(fPrice(o.total), style: const TextStyle(color: Colors.white, fontSize: 38,
                fontWeight: FontWeight.w900, letterSpacing: -1.5)),
            const SizedBox(height: 14),
            if (o.expiresAt != null) Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: Colors.white.withAlpha(30), borderRadius: BorderRadius.circular(100)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.timer_outlined, size: 16, color: AppColors.lime),
                const SizedBox(width: 6),
                CountdownText(until: o.expiresAt!, prefix: 'Reservation held for ',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ]),
            ),
          ]),
        ).animate().fadeIn().slideY(begin: 0.05),
        const SizedBox(height: 20),
        Text('Summary', style: t.headlineSmall),
        const SizedBox(height: 10),
        AppCard(child: Column(children: [
          _row('Item', o.title),
          _row('Quantity', '×${o.quantity}'),
          _row('Original price', fPrice(o.originalTotal)),
          _row('You save', fPrice(o.originalTotal - o.total), color: AppColors.eco),
          const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Divider()),
          Row(children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            const Spacer(),
            Text(fPrice(o.total), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
          ]),
        ])).animate().fadeIn(delay: 100.ms),
        const SizedBox(height: 14),
        AppCard(color: AppColors.card4, border: false, padding: const EdgeInsets.all(14), child: const Row(children: [
          Icon(Icons.shield_outlined, color: AppColors.sky),
          SizedBox(width: 10),
          Expanded(child: Text('Secure payment. Your QR pickup pass appears right after confirmation.',
              style: TextStyle(fontSize: 12.5, height: 1.4))),
        ])),
        if (_waitingExternal) ...[
          const SizedBox(height: 14),
          AppCard(color: AppColors.card1, border: false, padding: const EdgeInsets.all(14), child: Row(children: [
            const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.amber)),
            const SizedBox(width: 12),
            const Expanded(child: Text('Waiting for payment confirmation…',
                style: TextStyle(fontWeight: FontWeight.w700))),
            TextButton(onPressed: _checkPaid, child: const Text('Check')),
          ])),
        ],
        if (_error != null) ...[
          const SizedBox(height: 14),
          AppCard(color: AppColors.error.withAlpha(20), border: false, padding: const EdgeInsets.all(14),
            child: Row(children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.error),
              const SizedBox(width: 10),
              Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w700))),
            ])).animate().shakeX(hz: 4, amount: 3),
        ],
      ]),
      bottomNavigationBar: SafeArea(child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        child: PrimaryButton(
          label: _waitingExternal ? 'Open payment page again' : 'Pay ${fPrice(o.total)}',
          icon: Icons.lock_rounded, color: AppColors.primary,
          isLoading: _busy, onPressed: _pay),
      )),
    );
  }

  Widget _row(String k, String v, {Color? color}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      Text(k, style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w600)),
      const SizedBox(width: 16),
      Expanded(child: Text(v, textAlign: TextAlign.end, maxLines: 2, overflow: TextOverflow.ellipsis,
          style: TextStyle(fontWeight: FontWeight.w800, color: color ?? AppColors.ink))),
    ]),
  );
}
