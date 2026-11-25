// Contrôleur « vérification de l'e-mail » : code à 6 chiffres (valable 10 min, 5 essais, renvoi limité).
import crypto from "crypto";
import { auth } from "../config/firebase.js";
import { CODE_MINUTES, RESEND_SECONDS, MAX_SENDS_PER_HOUR, MAX_TRIES, CODE_SECRET } from "../config/constants.js";
import { asyncHandler } from "../utils/http.js";
import { sendVerificationCode } from "../services/mailer.js";
import * as userModel from "../models/userModel.js";
import * as emailCodeModel from "../models/emailCodeModel.js";

// Le code n'est jamais stocké en clair : seul son HMAC est enregistré.
const hashCode = (uid, code) => crypto.createHmac("sha256", CODE_SECRET).update(`${uid}:${code}`).digest("hex");

// POST /api/verify/send
export const sendCode = asyncHandler(async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ ok: true, already: true });
  const uid = req.user.uid, d = (await emailCodeModel.findByUser(uid)) || {}, now = Date.now();
  const wait = Math.ceil(((d.sentAt || 0) + RESEND_SECONDS * 1000 - now) / 1000);
  if (wait > 0 && d.hash) return res.json({ ok: true, cooldown: true, wait }); // un code vient d'être envoyé
  const fresh = !d.windowStart || now - d.windowStart > 3600e3, windowStart = fresh ? now : d.windowStart, sends = fresh ? 0 : (d.sends || 0);
  if (sends >= MAX_SENDS_PER_HOUR) return res.status(429).json({ error: "Trop de codes demandés. Réessaie dans une heure." });
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  let r;
  try { r = await sendVerificationCode({ to: req.user.email, name: req.user.firstName || req.user.name, code, minutes: CODE_MINUTES }); }
  catch (e) { console.error("Envoi e-mail :", e.message); return res.status(502).json({ error: "Impossible d'envoyer l'e-mail pour le moment. Réessaie dans un instant." }); }
  await emailCodeModel.save(uid, { hash: hashCode(uid, code), expiresAt: now + CODE_MINUTES * 60000, tries: 0, sentAt: now, sends: sends + 1, windowStart });
  res.json({ ok: true, wait: RESEND_SECONDS, dev: !!r.dev });
});

// POST /api/verify/confirm
export const confirmCode = asyncHandler(async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ ok: true, already: true });
  const uid = req.user.uid, d = await emailCodeModel.findByUser(uid);
  if (!d?.hash) return res.status(400).json({ error: "Aucun code actif : demande un nouveau code." });
  if (Date.now() > d.expiresAt) return res.status(400).json({ error: "Ce code a expiré : demande un nouveau code." });
  if ((d.tries || 0) >= MAX_TRIES) return res.status(429).json({ error: "Trop d'essais : demande un nouveau code." });
  const a = Buffer.from(hashCode(uid, req.body.code)), b = Buffer.from(d.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { // comparaison à temps constant
    const tries = (d.tries || 0) + 1, left = MAX_TRIES - tries;
    await emailCodeModel.update(uid, { tries });
    return res.status(400).json({ error: left > 0 ? `Code incorrect. Il te reste ${left} essai${left > 1 ? "s" : ""}.` : "Code incorrect. Demande un nouveau code." });
  }
  await userModel.update(uid, { emailVerified: true, emailVerifiedAt: Date.now() });
  auth.updateUser(uid, { emailVerified: true }).catch(() => {}); // synchronise l'indicateur Firebase Auth
  await emailCodeModel.remove(uid);
  res.json({ ok: true });
});
