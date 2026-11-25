// Contrôles d'appartenance côté commerçant.
import { asyncHandler } from "../utils/http.js";
import * as shopModel from "../models/shopModel.js";
import * as offerModel from "../models/offerModel.js";

// Le commerce du commerçant connecté doit être validé par l'administrateur.
export const shopApproved = asyncHandler(async (req, res, next) => {
  const shop = await shopModel.findById(req.user.uid);
  shop?.approved ? next() : res.status(403).json({ error: "Commerce non validé par l'administrateur" });
});

// L'offre :id doit appartenir au commerçant connecté.
export const ownOffer = asyncHandler(async (req, res, next) => {
  const offer = await offerModel.findById(req.params.id);
  offer && offer.shopId === req.user.uid ? next() : res.status(403).json({ error: "Offre introuvable ou interdite" });
});
