// Contrôleur « offres » : catalogue public et gestion des offres par le commerçant.
import { CATEGORIES } from "../config/constants.js";
import { asyncHandler } from "../utils/http.js";
import { availableOffers, popularity, shopFields } from "../services/catalogService.js";
import * as offerModel from "../models/offerModel.js";
import * as shopModel from "../models/shopModel.js";
import * as orderModel from "../models/orderModel.js";

// GET /api/categories
export const categories = (req, res) => res.json(CATEGORIES);

// GET /api/offers?q=&category=&maxPrice= — offres disponibles filtrées.
export const list = asyncHandler(async (req, res) => {
  const { q = "", category = "", maxPrice = "" } = req.query;
  const search = String(q).toLowerCase();
  const offers = (await availableOffers()).filter(o =>
    (!search || (o.title + o.shopName + (o.description || "")).toLowerCase().includes(search)) &&
    (!category || o.category === category) &&
    (!maxPrice || o.price <= Number(maxPrice)));
  res.json(offers);
});

// GET /api/offers/:id — fiche produit (404 si l'offre ou son commerce n'est pas visible).
export const detail = asyncHandler(async (req, res) => {
  const offer = await offerModel.findById(req.params.id);
  if (!offer) return res.status(404).json({ error: "Offre introuvable" });
  const shop = await shopModel.findById(offer.shopId);
  if (!shop?.approved) return res.status(404).json({ error: "Offre introuvable" });
  const pop = await popularity();
  res.json({ ...offer, ...shopFields(shop), shopPhone: shop.phone || "", shopDescription: shop.description || "", sold: pop[offer.id] || 0 });
});

// GET /api/my/offers — offres du commerçant connecté, avec « sold » (portions payées ou retirées),
// affiché par la page Mon commerce (« portions réservées », « X réservées »).
export const mine = asyncHandler(async (req, res) => {
  const [offers, orders] = await Promise.all([offerModel.findByShop(req.user.uid), orderModel.findByShop(req.user.uid)]);
  const sold = {};
  orders.filter(o => ["paid", "collected"].includes(o.status)).forEach(o => { sold[o.offerId] = (sold[o.offerId] || 0) + o.quantity; });
  res.json(offers.map(o => ({ ...o, sold: sold[o.id] || 0 })));
});

// POST /api/offers
export const create = asyncHandler(async (req, res) => {
  const id = await offerModel.create({ ...req.body, shopId: req.user.uid, createdAt: Date.now() });
  res.status(201).json({ id });
});

// PUT /api/offers/:id
export const update = asyncHandler(async (req, res) => {
  await offerModel.update(req.params.id, req.body);
  res.json({ ok: true });
});

// DELETE /api/offers/:id
export const remove = asyncHandler(async (req, res) => {
  await offerModel.remove(req.params.id);
  res.json({ ok: true });
});
