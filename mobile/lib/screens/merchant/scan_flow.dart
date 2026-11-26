import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../config/app_theme.dart';
import '../../repositories/order_repository.dart';
import '../../widgets/app_card.dart';
import '../../widgets/ui.dart';

/// Scan a student's pickup pass then validate it (POST /api/orders/validate).
/// Returns true when an order was collected.
Future<bool> scanAndValidate(BuildContext context) async {
  final token = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScanScreen(), fullscreenDialog: true));
  if (token == null || token.trim().isEmpty || !context.mounted) return false;
  return validateToken(context, token.trim());
}

Future<bool> validateToken(BuildContext context, String token) async {
  showDialog(context: context, barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()));
  Map<String, dynamic>? result;
  String? error;
  try {
    result = await OrderRepository().validateQr(token);
  } on OrderException catch (e) {
    error = e.message;
  }
  if (!context.mounted) return false;
  Navigator.of(context).pop(); // progress
  if (result != null) HapticFeedback.heavyImpact(); else HapticFeedback.vibrate();
  await showAppSheet(context, child: _ResultSheet(result: result, error: error));
  return result != null;
}

class _ResultSheet extends StatelessWidget {
  final Map<String, dynamic>? result;
  final String? error;
  const _ResultSheet({this.result, this.error});
  @override
  Widget build(BuildContext context) {
    final ok = result != null;
    final r = result ?? const {};
    final outside = r['outsideSlot'] == true;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Center(child: Container(
        width: 84, height: 84,
        decoration: BoxDecoration(color: ok ? AppColors.lime : AppColors.error.withAlpha(30), shape: BoxShape.circle),
        child: Icon(ok ? Icons.check_rounded : Icons.close_rounded, size: 46, color: ok ? AppColors.ink : AppColors.error),
      ).animate().scale(duration: 500.ms, curve: Curves.elasticOut)),
      const SizedBox(height: 16),
      Text(ok ? 'Order collected!' : 'Invalid pass', textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 6),
      Text(ok ? 'Hand over the order to the student.' : (error ?? 'This QR code cannot be validated.'),
          textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSub)),
      if (ok) ...[
        const SizedBox(height: 18),
        AppCard(child: Column(children: [
          _row('Item', '${r['title'] ?? '—'}'),
          _row('Quantity', '×${r['quantity'] ?? 1}'),
          if ((r['studentName'] ?? '').toString().isNotEmpty) _row('Student', '${r['studentName']}'),
          _row('EcoPoints given', '+${r['points'] ?? 0}'),
        ])),
        if (outside) ...[
          const SizedBox(height: 12),
          AppCard(color: AppColors.card1, border: false, padding: const EdgeInsets.all(14), child: Row(children: [
            const Icon(Icons.schedule_rounded, color: AppColors.amber),
            const SizedBox(width: 10),
            Expanded(child: Text('Collected outside the pickup window (${r['slot']}).',
                style: const TextStyle(fontWeight: FontWeight.w700))),
          ])),
        ],
      ],
      const SizedBox(height: 22),
      PrimaryButton(label: 'Done', onPressed: () => Navigator.of(context).pop()),
    ]);
  }

  Widget _row(String k, String v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      Text(k, style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w600)),
      const SizedBox(width: 12),
      Expanded(child: Text(v, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w800))),
    ]));
}

/// Full-screen camera scanner. Pops the scanned token (or a manually typed code).
class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});
  @override State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  final _ctrl = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates, formats: const [BarcodeFormat.qrCode]);
  bool _done = false;

  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  void _onDetect(BarcodeCapture c) {
    if (_done) return;
    final v = c.barcodes.map((b) => b.rawValue).whereType<String>().firstWhere((s) => s.trim().isNotEmpty, orElse: () => '');
    if (v.isEmpty) return;
    _done = true;
    HapticFeedback.mediumImpact();
    Navigator.of(context).pop(v);
  }

  Future<void> _manual() async {
    final ctrl = TextEditingController();
    final code = await showAppSheet<String>(context, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Enter the code', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 6),
      const Text('If the camera cannot read the pass, type the full code shown under the student\'s QR.',
          style: TextStyle(color: AppColors.textSub)),
      const SizedBox(height: 16),
      TextField(controller: ctrl, autofocus: true,
          decoration: const InputDecoration(labelText: 'Pickup code', prefixIcon: Icon(Icons.qr_code_rounded))),
      const SizedBox(height: 18),
      Builder(builder: (ctx) => PrimaryButton(label: 'Validate', onPressed: () => Navigator.of(ctx).pop(ctrl.text.trim()))),
    ]));
    // Tokens are lowercase hex; the pass displays them upper-cased in groups of 4.
    final token = code?.replaceAll(RegExp(r'\s+'), '').toLowerCase() ?? '';
    if (token.length >= 8 && mounted) Navigator.of(context).pop(token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(children: [
        Positioned.fill(child: MobileScanner(
          controller: _ctrl,
          onDetect: _onDetect,
          errorBuilder: (_, e) => Center(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text('Camera unavailable (${e.errorCode.name}).\nUse "Enter code" below.',
                textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
          )),
        )),
        // Dimmed overlay with a rounded window
        Positioned.fill(child: IgnorePointer(child: CustomPaint(painter: _ScanOverlay()))),
        Center(child: SizedBox(width: 260, height: 260, child: DecoratedBox(
          decoration: BoxDecoration(border: Border.all(color: AppColors.lime, width: 4),
              borderRadius: BorderRadius.circular(32)),
        )).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 0.97, end: 1.02, duration: 900.ms)),
        SafeArea(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            Row(children: [
              _CircleBtn(icon: Icons.close_rounded, onTap: () => Navigator.of(context).pop()),
              const Spacer(),
              _CircleBtn(icon: Icons.flash_on_rounded, onTap: () => _ctrl.toggleTorch()),
              const SizedBox(width: 10),
              _CircleBtn(icon: Icons.cameraswitch_rounded, onTap: () => _ctrl.switchCamera()),
            ]),
            const SizedBox(height: 24),
            const Text('Scan the pickup pass', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Align the student\'s QR code inside the frame', style: TextStyle(color: Colors.white70)),
            const Spacer(),
            PrimaryButton(label: 'Enter code manually', icon: Icons.keyboard_rounded,
                color: Colors.white, foreground: AppColors.ink, onPressed: _manual),
          ]),
        )),
      ]),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => Pressable(onTap: onTap, child: Container(
    width: 46, height: 46,
    decoration: BoxDecoration(color: Colors.white.withAlpha(40), shape: BoxShape.circle),
    child: Icon(icon, color: Colors.white),
  ));
}

class _ScanOverlay extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final window = RRect.fromRectAndRadius(
        Rect.fromCenter(center: size.center(Offset.zero), width: 260, height: 260), const Radius.circular(32));
    final path = Path.combine(PathOperation.difference,
        Path()..addRect(Offset.zero & size), Path()..addRRect(window));
    canvas.drawPath(path, Paint()..color = Colors.black.withAlpha(150));
  }
  @override bool shouldRepaint(covariant CustomPainter old) => false;
}
