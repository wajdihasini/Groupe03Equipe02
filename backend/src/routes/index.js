// Table des routes de l'API (préfixe /api). Chaque route associe une URL à des middlewares et à une action de contrôleur.
// Les URL et les formats de réponse sont identiques à ceux utilisés par le frontend (frontend/src/api.js).
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { shopApproved, ownOffer } from "../middlewares/ownership.js";
import * as schemas from "../validators/schemas.js";
import * as users from "../controllers/userController.js";
import * as verify from "../controllers/verifyController.js";
import * as offers from "../controllers/offerController.js";
import * as shops from "../controllers/shopController.js";
import * as orders from "../controllers/orderController.js";
import * as payments from "../controllers/paymentController.js";
import * as stats from "../controllers/statsController.js";
import * as admin from "../controllers/adminController.js";
import * as uploads from "../controllers/uploadController.js";

const router = Router();
const student = [requireAuth, requireRole("student")];
const merchant = [requireAuth, requireRole("merchant")];
const adminOnly = [requireAuth, requireRole("admin")];

// ---- Santé du serveur ----
router.get("/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

// ---- Profil et vérification de l'e-mail ----
router.get("/categories", offers.categories);
router.post("/users", users.createProfile);
router.get("/me", requireAuth, users.getMe);
router.put("/me", requireAuth, validate(schemas.meSchema), users.updateMe);
router.post("/me/fcm-token", requireAuth, validate(schemas.fcmTokenSchema), users.addFcmToken);
router.post("/verify/send", requireAuth, verify.sendCode);
router.post("/verify/confirm", requireAuth, validate(schemas.verifyCodeSchema), verify.confirmCode);
router.put("/shop", ...merchant, validate(schemas.shopSchema), users.updateShop);

// ---- Offres ----
router.get("/offers", offers.list);
router.get("/offers/:id", offers.detail);
router.post("/offers", ...merchant, shopApproved, validate(schemas.offerSchema), offers.create);
router.put("/offers/:id", ...merchant, ownOffer, validate(schemas.offerSchema), offers.update);
router.delete("/offers/:id", ...merchant, ownOffer, offers.remove);
router.get("/my/offers", ...merchant, offers.mine);
router.post("/uploads", ...merchant, uploads.uploadPhoto); // photo d'offre enregistrée comme fichier

// ---- Commerces (Campus Radar, page restaurant) ----
router.get("/shops", shops.list);
router.get("/shops/:id", shops.detail);

// ---- Recommandations, impact, classement, tableaux de bord ----
router.get("/recommendations", ...student, stats.recommendations);
router.get("/impact", stats.impact);
router.get("/leaderboard", requireAuth, stats.leaderboard);
router.get("/stats", requireAuth, stats.stats);

// ---- Réservations et retrait ----
router.post("/orders", ...student, validate(schemas.reserveSchema), orders.reserve);
router.post("/orders/validate", ...merchant, validate(schemas.qrTokenSchema), orders.validateQr);
router.post("/orders/:id/cancel", ...student, orders.cancel);
router.get("/my/orders", requireAuth, requireRole("student", "merchant"), orders.mine);

// ---- Paiement ----
router.post("/orders/:id/pay", ...student, payments.pay);
router.post("/orders/:id/mock-pay", ...student, payments.mockPay);
router.get("/payments/webhook", payments.webhook);

// ---- Administrateur ----
router.get("/admin/shops", ...adminOnly, admin.shops);
router.patch("/admin/shops/:id", ...adminOnly, validate(schemas.approveSchema), admin.approveShop);
router.get("/admin/users", ...adminOnly, admin.users);
router.patch("/admin/users/:id", ...adminOnly, validate(schemas.blockSchema), admin.blockUser);
router.get("/admin/overview", ...adminOnly, admin.overview);
router.get("/admin/orders", ...adminOnly, admin.orders);
router.get("/admin/offers", ...adminOnly, admin.offers);
router.delete("/admin/offers/:id", ...adminOnly, admin.deleteOffer);

export default router;
