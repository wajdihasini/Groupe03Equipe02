// Catalogue : offres disponibles enrichies avec les informations du commerce et leur popularité.
import * as offerModel from "../models/offerModel.js";
import * as shopModel from "../models/shopModel.js";
import * as orderModel from "../models/orderModel.js";

// Popularité = unités payées ou retirées par offre (mise en cache 60 s).
let popCache = { t: 0, map: {} };
export async function popularity() {
  if (Date.now() - popCache.t < 60000) return popCache.map;
  const map = {};
  (await orderModel.findByStatuses(["paid", "collected"])).forEach(o => { map[o.offerId] = (map[o.offerId] || 0) + o.quantity; });
  popCache = { t: Date.now(), map };
  return map;
}

// Champs du commerce ajoutés à chaque offre.
export const shopFields = (shop) => ({ shopName: shop.name, shopAddress: shop.address || "", shopLat: shop.lat ?? null, shopLng: shop.lng ?? null });

// Offres disponibles (stock > 0, commerce validé) enrichies avec les infos du commerce.
export async function availableOffers() {
  const [offers, shopList, pop] = await Promise.all([offerModel.findAll(), shopModel.findApproved(), popularity()]);
  const shops = Object.fromEntries(shopList.map(s => [s.id, s]));
  return offers.filter(o => o.quantity > 0 && shops[o.shopId])
    .map(o => ({ ...o, ...shopFields(shops[o.shopId]), sold: pop[o.id] || 0 }));
}
