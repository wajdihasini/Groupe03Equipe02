// Middlewares d'authentification (jeton Firebase) et de contrôle des rôles.
import { auth } from "../config/firebase.js";
import { UNVERIFIED_ALLOWED } from "../config/constants.js";
import * as userModel from "../models/userModel.js";

export const bearerToken = (req) => (req.headers.authorization || "").replace("Bearer ", "");

export async function requireAuth(req, res, next) {
  let decoded;
  try { decoded = await auth.verifyIdToken(bearerToken(req)); }
  catch { return res.status(401).json({ error: "Non authentifié" }); }
  try {
    const user = await userModel.findById(decoded.uid);
    if (!user) return res.status(403).json({ error: "Profil introuvable" });
    if (user.blocked) return res.status(403).json({ error: "Compte bloqué par l'administrateur" });
    // chemin complet (les routeurs sont montés sur /api : req.path seul serait relatif)
    // les comptes créés avant la vérification d'e-mail n'ont pas le champ : ils restent valides
    if (user.emailVerified === false && !UNVERIFIED_ALLOWED.includes(req.baseUrl + req.path))
      return res.status(403).json({ error: "Vérifie ton adresse e-mail pour continuer.", code: "email_unverified" });
    req.user = { uid: decoded.uid, ...user };
    req.authTime = decoded.auth_time;
    next();
  } catch (e) { next(e); } // panne de la base : erreur serveur (500), et non « Non authentifié »
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Accès refusé" });
