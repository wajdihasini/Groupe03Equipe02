// Contrôleur « commerces » (Campus Radar, page Partenaires, page d'un restaurant).
import { asyncHandler } from "../utils/http.js";
import { availableOffers } from "../services/catalogService.js";
import * as shopModel from "../models/shopModel.js";
import * as offerModel from "../models/offerModel.js";

// Informations publiques d'un commerce (jamais ownerId, approved...).
const publicShop = (id, s) => ({ id, name: s.name, address: s.address || "", phone: s.phone || "", description: s.description || "", lat: s.lat ?? null, lng: s.lng ?? null });

// GET /api/shops — commerces validés avec position et nombre d'offres disponibles.
export const list = asyncHandler(async (req, res) => {
  const [shops, offers] = await Promise.all([shopModel.findApproved(), offerModel.findInStock()]);
  const count = {};
  offers.forEach(o => { count[o.shopId] = (count[o.shopId] || 0) + 1; });
  res.json(shops.map(s => ({ ...publicShop(s.id, s), offersCount: count[s.id] || 0 })));
});

// GET /api/shops/:id — page d'un restaurant : ses informations et ses offres disponibles.
export const detail = asyncHandler(async (req, res) => {
  const shop = await shopModel.findById(req.params.id);
  if (!shop?.approved) return res.status(404).json({ error: "Commerce introuvable" });
  const offers = (await availableOffers()).filter(o => o.shopId === req.params.id);
  res.json({ ...publicShop(req.params.id, shop), offersCount: offers.length, offers });
});
