// Contrôleur « utilisateur » : inscription, profil, commerce du commerçant, jeton de notifications.
import { auth } from "../config/firebase.js";
import { asyncHandler } from "../utils/http.js";
import { bearerToken } from "../middlewares/auth.js";
import { profileSchema } from "../validators/schemas.js";
import * as userModel from "../models/userModel.js";
import * as shopModel from "../models/shopModel.js";
import * as emailCodeModel from "../models/emailCodeModel.js";

// POST /api/users — appelé juste après l'inscription Firebase (le profil n'existe pas encore : pas de requireAuth).
export const createProfile = asyncHandler(async (req, res) => {
  let uid, email;
  try { ({ uid, email } = await auth.verifyIdToken(bearerToken(req))); }
  catch { return res.status(401).json({ error: "Non authentifié" }); }
  const p = profileSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues.map(i => i.message).join(", ") });
  const { firstName, lastName, role, shopName, address, phone } = p.data;
  if (role === "merchant" && !shopName) return res.status(400).json({ error: "Nom du commerce requis" });
  if (await userModel.findById(uid)) return res.status(409).json({ error: "Profil déjà existant" }); // empêche de changer son rôle
  await userModel.create(uid, { firstName, lastName, name: `${firstName} ${lastName}`, phone, email, role, emailVerified: false, blocked: false, createdAt: Date.now() });
  if (role === "merchant")
    await shopModel.create(uid, { name: shopName, address: address || "", phone, description: "", ownerId: uid, approved: false, createdAt: Date.now() });
  res.status(201).json({ ok: true });
});

// GET /api/me — profil connecté (+ son commerce pour un commerçant, avec son id), sans les jetons FCM.
export const getMe = asyncHandler(async (req, res) => {
  const shop = req.user.role === "merchant" ? await shopModel.findById(req.user.uid) : null;
  const { fcmTokens, ...safe } = req.user;
  res.json({ ...safe, shop: shop && { id: req.user.uid, ...shop } }); // id utilisé par le frontend (lien « Voir ma page publique »)
});

// PUT /api/me — nom, téléphone et e-mail.
export const updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email } = req.body;
  const changes = { firstName, lastName, name: `${firstName} ${lastName}`, phone };
  if (email.toLowerCase() !== (req.user.email || "").toLowerCase()) { // changer d'e-mail exige une connexion récente (< 5 min)
    if (Date.now() / 1000 - (req.authTime || 0) > 300) return res.status(401).json({ error: "Confirme ton mot de passe pour changer d'e-mail." });
    try { await auth.updateUser(req.user.uid, { email }); }
    catch (e) {
      const used = e.code === "auth/email-already-exists";
      return res.status(used ? 409 : 400).json({ error: used ? "Cet e-mail est déjà utilisé." : "E-mail invalide." });
    }
    changes.email = email; changes.emailVerified = false; // la nouvelle adresse doit être vérifiée
    await emailCodeModel.remove(req.user.uid).catch(() => {});
  }
  await userModel.update(req.user.uid, changes);
  res.json({ ok: true });
});

// PUT /api/shop — fiche du commerce du commerçant connecté.
export const updateShop = asyncHandler(async (req, res) => {
  if (!(await shopModel.findById(req.user.uid))) return res.status(404).json({ error: "Commerce introuvable" });
  await shopModel.update(req.user.uid, req.body);
  res.json({ ok: true });
});

// POST /api/me/fcm-token — enregistre l'appareil pour les notifications push.
export const addFcmToken = asyncHandler(async (req, res) => {
  await userModel.addFcmToken(req.user.uid, req.body.token);
  res.json({ ok: true });
});
