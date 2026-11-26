import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../config/app_theme.dart';
import '../../models/order.dart';
import '../../repositories/order_repository.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';

/// Pickup pass: QR code the merchant scans (POST /api/orders/validate).
/// Polls the order so the screen flips to "Collected" the moment it is scanned.
class OrderConfirmationScreen extends StatefulWidget {
  final Order order;
  final bool justPaid;
  const OrderConfirmationScreen({super.key, required this.order, this.justPaid = false});
  @override State<OrderConfirmationScreen> createState() => _State();
}

class _State extends State<OrderConfirmationScreen> {
  late Order _o = widget.order;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    if (_o.status == OrderStatus.paid) {
      _poll = Timer.periodic(const Duration(seconds: 4), (_) => _check());
    }
  }

  @override
  void dispose() { _poll?.cancel(); super.dispose(); }

  Future<void> _check() async {
    try {
      final o = await OrderRepository().findById(_o.id);
      if (!mounted || o == null) return;
      if (o.status != _o.status) {
        if (o.status == OrderStatus.collected) HapticFeedback.heavyImpact();
        setState(() => _o = o);
        if (o.status != OrderStatus.paid) _poll?.cancel();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final collected = _o.status == OrderStatus.collected;
    final qrData = (_o.qrToken?.isNotEmpty == true) ? _o.qrToken! : _o.id;
    // Full code grouped by 4 — the merchant can type it if the camera fails.
    final code = [for (var i = 0; i < qrData.length; i += 4)
      qrData.substring(i, (i + 4).clamp(0, qrData.length))].join(' ').toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.primaryDk,
      appBar: AppBar(
        backgroundColor: Colors.transparent, foregroundColor: Colors.white,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Pickup pass', style: TextStyle(color: Colors.white)),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 24), children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          child: Column(key: ValueKey(collected), children: [
            Container(
              width: 64, height: 64,
              decoration: const BoxDecoration(color: AppColors.lime, shape: BoxShape.circle),
              child: Icon(collected ? Icons.celebration_rounded : Icons.check_rounded, size: 34, color: AppColors.ink),
            ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),
            const SizedBox(height: 14),
            Text(collected ? 'Enjoy your meal! 🎉' : (widget.justPaid ? 'Payment confirmed!' : 'Ready for pickup'),
                style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.6)),
            const SizedBox(height: 6),
            Text(collected ? 'Order collected — EcoPoints added to your account.' : 'Show this code at the counter',
                textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withAlpha(180))),
          ]),
        ),
        const SizedBox(height: 22),
        // Ticket
        ClipPath(
          clipper: _TicketClipper(),
          child: Container(
            color: AppColors.surface,
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            child: Column(children: [
              AnimatedOpacity(
                opacity: collected ? 0.25 : 1, duration: const Duration(milliseconds: 400),
                child: QrImageView(
                  data: qrData, version: QrVersions.auto, size: 230,
                  backgroundColor: Colors.white,
                  errorCorrectionLevel: QrErrorCorrectLevel.M,
                  eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.circle, color: AppColors.ink),
                  dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.circle, color: AppColors.ink),
                ),
              ),
              const SizedBox(height: 10),
              SelectableText(code, textAlign: TextAlign.center, style: const TextStyle(fontFamily: 'monospace',
                  fontSize: 14, letterSpacing: 1.5, fontWeight: FontWeight.w800, color: AppColors.textSub)),
              const SizedBox(height: 22),
              // dashed separator
              Row(children: List.generate(30, (i) => Expanded(child: Container(
                height: 2, color: i.isEven ? AppColors.line : Colors.transparent)))),
              const SizedBox(height: 18),
              _row('Item', _o.title),
              _row('Quantity', '×${_o.quantity}'),
              _row('Paid', fPrice(_o.total)),
              if (_o.paidAt != null) _row('Date', '${fDate(_o.paidAt!)} · ${fTime(_o.paidAt!)}'),
              const SizedBox(height: 6),
              StatusBadge(
                label: collected ? 'Collected' : 'Valid — awaiting pickup',
                icon: collected ? Icons.check_circle_rounded : Icons.qr_code_2_rounded,
                color: collected ? AppColors.card5 : AppColors.card2,
                textColor: collected ? AppColors.violet : AppColors.primary),
            ]),
          ),
        ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.08),
        const SizedBox(height: 22),
        PrimaryButton(label: 'Back to my orders', color: AppColors.lime, foreground: AppColors.ink,
            onPressed: () => Navigator.of(context).pop()),
      ]),
    );
  }

  Widget _row(String k, String v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Text(k, style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w600)),
      const SizedBox(width: 16),
      Expanded(child: Text(v, textAlign: TextAlign.end, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800))),
    ]));
}

/// Ticket shape: rounded corners + side notches.
class _TicketClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size s) {
    const r = 26.0, notch = 14.0;
    final notchY = s.height * 0.66;
    final rect = Path()..addRRect(RRect.fromRectAndRadius(Offset.zero & s, const Radius.circular(r)));
    final holes = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, notchY), radius: notch))
      ..addOval(Rect.fromCircle(center: Offset(s.width, notchY), radius: notch));
    return Path.combine(PathOperation.difference, rect, holes);
  }
  @override bool shouldReclip(covariant CustomClipper<Path> old) => false;
}
