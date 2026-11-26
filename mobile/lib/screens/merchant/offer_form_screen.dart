import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../models/offer.dart';
import '../../repositories/offer_repository.dart';
import '../../utils/formatters.dart';
import '../../utils/validators.dart';
import '../../widgets/offer_photo.dart';
import '../../widgets/app_card.dart';

class OfferFormScreen extends StatefulWidget {
  final String merchantId;
  final Offer? existing;
  const OfferFormScreen({super.key, required this.merchantId, this.existing});
  @override State<OfferFormScreen> createState() => _State();
}
class _State extends State<OfferFormScreen> {
  final _fk   = GlobalKey<FormState>();
  final _repo  = OfferRepository();
  late final TextEditingController _title, _desc, _orig, _price, _qty;
  String _cat = offerCategories.first;
  TimeOfDay _start = const TimeOfDay(hour: 17, minute: 0);
  TimeOfDay _end   = const TimeOfDay(hour: 19, minute: 0);
  bool _busy = false;
  List<String> _cats = offerCategories;
  String? _photo;         // data URI (data:image/jpeg;base64,...) ou URL http(s)

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _title = TextEditingController(text: e?.title        ?? '');
    _desc  = TextEditingController(text: e?.description  ?? '');
    _orig  = TextEditingController(text: e != null ? e.originalPrice.toString() : '');
    _price = TextEditingController(text: e != null ? e.price.toString() : '');
    _qty   = TextEditingController(text: e != null ? e.quantity.toString() : '');
    if (e != null) {
      _cat   = e.category;
      final s = e.pickupFrom.split(':');
      if (s.length == 2) _start = TimeOfDay(hour: int.parse(s[0]), minute: int.parse(s[1]));
      final t = e.pickupTo.split(':');
      if (t.length == 2) _end   = TimeOfDay(hour: int.parse(t[0]), minute: int.parse(t[1]));
      _photo = (e.photo != null && e.photo!.isNotEmpty) ? e.photo : null;
    }
    _loadCats();
  }

  Future<void> _loadCats() async {
    final c = await _repo.fetchCategories();
    if (mounted) setState(() {
      _cats = c;
      if (!c.contains(_cat)) _cat = c.first;
    });
  }

  @override void dispose() {
    _title.dispose(); _desc.dispose();
    _orig.dispose(); _price.dispose(); _qty.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final msg = ScaffoldMessenger.of(context);
    try {
      final file = await ImagePicker().pickImage(
          source: source, imageQuality: 55, maxWidth: 800, maxHeight: 800);
      if (file == null) return;
      final bytes = await file.readAsBytes();
      final name  = file.name.toLowerCase();
      final mime  = name.endsWith('.png') ? 'png' : (name.endsWith('.webp') ? 'webp' : 'jpeg');
      final data  = 'data:image/$mime;base64,${base64Encode(bytes)}';
      // Le backend refuse les photos de plus de 400 000 caractères.
      if (data.length > 390000) {
        msg.showSnackBar(const SnackBar(
            content: Text('Image too large. Please choose a smaller picture.')));
        return;
      }
      if (mounted) setState(() => _photo = data);
    } catch (e) {
      msg.showSnackBar(SnackBar(content: Text('Could not pick image: $e')));
    }
  }

  void _showImagePicker() {
    showModalBottomSheet(context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(height: 4, width: 40, margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
        ListTile(leading: const Icon(Icons.photo_library),
          title: const Text('Choose from gallery'),
          onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery); }),
        ListTile(leading: const Icon(Icons.camera_alt),
          title: const Text('Take a photo'),
          onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera); }),
        if (_photo != null)
          ListTile(leading: const Icon(Icons.delete, color: AppColors.error),
            title: const Text('Remove photo', style: TextStyle(color: AppColors.error)),
            onTap: () { setState(() => _photo = null);
              Navigator.pop(context); }),
        const SizedBox(height: 10),
      ])));
  }

  Future<void> _pickTime(bool isStart) async {
    final t = await showTimePicker(context: context,
        initialTime: isStart ? _start : _end);
    if (t != null) setState(() { if (isStart) _start = t; else _end = t; });
  }

  Future<void> _save() async {
    if (!_fk.currentState!.validate()) return;
    setState(() => _busy = true);
    final body = <String, dynamic>{
      'title':         _title.text.trim(),
      'description':   _desc.text.trim(),
      'category':      _cat,
      'originalPrice': double.parse(_orig.text.trim().replaceAll(',', '.')),
      'price':         double.parse(_price.text.trim().replaceAll(',', '.')),
      'quantity':      int.parse(_qty.text.trim()),
      'pickupFrom':    fTimeOfDay(_start),
      'pickupTo':      fTimeOfDay(_end),
    };
    // photo: data URI ou URL ; chaîne vide = suppression (accepté par le backend)
    body['photo'] = _photo ?? '';

    try {
      if (widget.existing == null) await _repo.createOffer(body);
      else await _repo.updateOffer(widget.existing!.id, body);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasPhoto = _photo != null;
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(title: Text(widget.existing == null ? 'New Offer' : 'Edit Offer')),
      body: Form(key: _fk, child: ListView(padding: const EdgeInsets.all(16), children: [
        // ── Photo section ─────────────────────────────────────────────────
        GestureDetector(
          onTap: _showImagePicker,
          child: Container(height: 160,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid)),
            clipBehavior: Clip.antiAlias,
            child: hasPhoto
                ? Stack(fit: StackFit.expand, children: [
                    OfferPhoto(photo: _photo!),
                    Positioned(bottom: 10, right: 10,
                      child: Container(padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                        child: const Icon(Icons.edit, color: Colors.white, size: 18))),
                  ])
                : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.add_a_photo_outlined, size: 40,
                        color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text('Add a photo (optional)',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                  ])),
        ),
        const SizedBox(height: 16),

        // ── Fields ────────────────────────────────────────────────────────
        TextFormField(controller: _title,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: 'Title', prefixIcon: Icon(Icons.title)),
          validator: (v) => Validators.required(v, label: 'Title')),
        const SizedBox(height: 14),
        TextFormField(controller: _desc, maxLines: 3,
          decoration: const InputDecoration(labelText: 'Description',
              prefixIcon: Icon(Icons.description_outlined), alignLabelWithHint: true)),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          initialValue: _cats.contains(_cat) ? _cat : _cats.first,
          decoration: const InputDecoration(labelText: 'Category',
              prefixIcon: Icon(Icons.category_outlined)),
          items: _cats.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) { if (v != null) setState(() => _cat = v); }),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: TextFormField(controller: _orig,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Original price',
                prefixIcon: Icon(Icons.price_change_outlined)),
            validator: Validators.positiveNumber)),
          const SizedBox(width: 12),
          Expanded(child: TextFormField(controller: _price,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Discounted price',
                prefixIcon: Icon(Icons.sell_outlined)),
            validator: Validators.positiveNumber)),
        ]),
        const SizedBox(height: 14),
        TextFormField(controller: _qty, keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Quantity',
              prefixIcon: Icon(Icons.inventory_2_outlined)),
          validator: Validators.positiveInt),
        const SizedBox(height: 16),
        const Text('Pickup window',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textSub)),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: OutlinedButton.icon(
            icon: const Icon(Icons.access_time),
            label: Text('Start: ${fTimeOfDay(_start)}'),
            onPressed: () => _pickTime(true))),
          const SizedBox(width: 12),
          Expanded(child: OutlinedButton.icon(
            icon: const Icon(Icons.access_time_filled),
            label: Text('End: ${fTimeOfDay(_end)}'),
            onPressed: () => _pickTime(false))),
        ]),
        const SizedBox(height: 24),
        PrimaryButton(
          label: widget.existing == null ? 'Create offer' : 'Save changes',
          onPressed: _busy ? null : _save,
          isLoading: _busy),
        const SizedBox(height: 16),
      ])));
  }
}
