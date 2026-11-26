// Categories matching backend exactly.
const List<String> offerCategories = [
  'Viennoiserie','Sandwich','Plat','Salade','Dessert','Boisson','Autre','Panier surprise',
];

class Offer {
  final String id;
  final String shopId;       // backend: shopId
  final String shopName;     // backend: shopName (enriched)
  final String shopAddress;
  final String title;
  final String description;
  final String category;
  final double originalPrice;
  final double price;        // backend: price  (discounted price)
  int quantity;
  final String? photo;       // backend: photo (URL or base64)
  final String pickupFrom;   // backend: pickupFrom "HH:MM"
  final String pickupTo;     // backend: pickupTo  "HH:MM"
  final int sold;
  final double? shopLat;
  final double? shopLng;
  final String shopPhone;        // only on GET /api/offers/:id
  final String shopDescription;  // only on GET /api/offers/:id
  final String reason;           // only on GET /api/recommendations

  Offer({
    required this.id,
    required this.shopId,
    this.shopName = '',
    this.shopAddress = '',
    required this.title,
    this.description = '',
    required this.category,
    required this.originalPrice,
    required this.price,
    required this.quantity,
    this.photo,
    required this.pickupFrom,
    required this.pickupTo,
    this.sold = 0,
    this.shopLat,
    this.shopLng,
    this.shopPhone = '',
    this.shopDescription = '',
    this.reason = '',
  });

  // Backward-compat aliases used in some UI widgets.
  double get discountedPrice => price;
  String get merchantId      => shopId;
  String get merchantName    => shopName;

  int  get discountPercent => originalPrice <= 0 ? 0
      : (((originalPrice - price) / originalPrice) * 100).round();
  bool get soldOut => quantity <= 0;

  factory Offer.fromJson(Map<String, dynamic> j) => Offer(
    id:            j['id']             as String,
    shopId:        (j['shopId']        as String?) ?? '',
    shopName:      (j['shopName']      as String?) ?? '',
    shopAddress:   (j['shopAddress']   as String?) ?? '',
    title:         j['title']          as String,
    description:   (j['description']   as String?) ?? '',
    category:      j['category']       as String,
    originalPrice: (j['originalPrice'] as num).toDouble(),
    price:         (j['price']         as num).toDouble(),
    quantity:      (j['quantity']      as num).toInt(),
    photo:         j['photo']          as String?,
    pickupFrom:    (j['pickupFrom']    as String?) ?? '--:--',
    pickupTo:      (j['pickupTo']      as String?) ?? '--:--',
    sold:          (j['sold']          as num?)?.toInt() ?? 0,
    shopLat:       (j['shopLat']       as num?)?.toDouble(),
    shopLng:       (j['shopLng']       as num?)?.toDouble(),
    shopPhone:       (j['shopPhone']       as String?) ?? '',
    shopDescription: (j['shopDescription'] as String?) ?? '',
    reason:          (j['reason']          as String?) ?? '',
  );

  Map<String, dynamic> toJson() => {
    'title':         title,
    'category':      category,
    'originalPrice': originalPrice,
    'price':         price,
    'quantity':      quantity,
    'pickupFrom':    pickupFrom,
    'pickupTo':      pickupTo,
    if (description.isNotEmpty) 'description': description,
    if (photo != null && photo!.isNotEmpty) 'photo': photo,
  };
}
