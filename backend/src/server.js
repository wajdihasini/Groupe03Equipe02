import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import admin from "firebase-admin";
import { z } from "zod";
import { db, auth } from "./firebase.js";
import { sendVerificationCode } from "./mailer.js";

const CATEGORIES = ["Viennoiserie", "Sandwich", "Plat", "Salade", "Dessert", "Boisson", "Autre", "Panier surprise"];
const PENDING_MINUTES = 15;   // délai pour payer une réservation avant libération du stock
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "konnect"; // "konnect" ou "mock" (paiement simulé pour les tests)
const POINTS_PER_MEAL = 10;   // EcoPoints gagnés par repas récupéré
const FV = admin.firestore.FieldValue;

const app = express();
const origins = (process.env.CLIENT_URL || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: "1mb" })); // 1 Mo : photos redimensionnées envoyées en base64

// ---- Middlewares : authentification Firebase + rôles ----
const requireAuth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { uid, auth_time } = await auth.verifyIdToken(token);
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(403).json({ error: "Profil introuvable" });
    if (snap.data().blocked) return res.status(403).json({ error: "Compte bloqué par l'administrateur" });
    if (snap.data().emailVerified === false && !["/api/me", "/api/verify/send", "/api/verify/confirm"].includes(req.path))
      return res.status(403).json({ error: "Vérifie ton adresse e-mail pour continuer.", code: "email_unverified" }); // les comptes créés avant cette fonction n'ont pas le champ : ils restent valides
    req.user = { uid, ...snap.data() }; req.authTime = auth_time;
    next();
  } catch { res.status(401).json({ error: "Non authentifié" }); }
};
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Accès refusé" });
const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ") });
  req.body = r.data; next();
};
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---- Notifications FCM (silencieuses en cas d'échec) ----
const notify = async (uid, title, body) => {
  try {
    const tokens = (await db.collection("users").doc(uid).get()).data()?.fcmTokens || [];
    if (!tokens.length) return;
    const r = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
    const dead = tokens.filter((_, i) => !r.responses[i].success && /not-registered|invalid-registration/.test(r.responses[i].error?.code || ""));
    if (dead.length) await db.collection("users").doc(uid).update({ fcmTokens: FV.arrayRemove(...dead) });
  } catch (e) { console.error("FCM:", e.message); }
};

// ---- Schémas ----
const PHONE_RE = /^(\+216|00216)?\s?\d{2}\s?\d{3}\s?\d{3}$/; // 8 chiffres, indicatif +216 facultatif
const PHONE_MSG = "Numéro de téléphone invalide (8 chiffres)";
const phone = z.string().trim().regex(PHONE_RE, PHONE_MSG).optional().or(z.literal(""));
const nameField = (label) => z.string().trim().min(2, `${label} trop court`).max(40);
const profileSchema = z.object({
  firstName: nameField("Prénom"), lastName: nameField("Nom"), role: z.enum(["student", "merchant"]),
  phone: z.string().trim().regex(PHONE_RE, PHONE_MSG),
  shopName: z.string().trim().min(2, "Nom du commerce requis").max(60).optional(), address: z.string().trim().max(120).optional(),
});
const meSchema = z.object({ firstName: nameField("Prénom"), lastName: nameField("Nom"), phone: z.string().trim().regex(PHONE_RE, PHONE_MSG), email: z.string().trim().email("E-mail invalide").max(120) });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)");
const offerSchema = z.object({
  title: z.string().trim().min(2).max(80),
  category: z.enum(CATEGORIES),
  photo: z.string().max(400000).refine(v => v === "" || /^https?:\/\/.+/.test(v) || /^data:image\/(jpeg|png|webp);base64,/.test(v), "Photo invalide").optional(),
  description: z.string().trim().max(300).optional(),
  originalPrice: z.number().positive(), price: z.number().positive(),
  quantity: z.number().int().min(1).max(500),
  pickupFrom: hhmm, pickupTo: hhmm,
}).superRefine((o, ctx) => {
  if (o.price >= o.originalPrice) ctx.addIssue({ code: "custom", path: ["price"], message: "Le prix réduit doit être inférieur au prix initial" });
  if (o.pickupTo <= o.pickupFrom) ctx.addIssue({ code: "custom", path: ["pickupTo"], message: "L'heure de fin doit être après l'heure de début" });
});

// ---- Profil ----
app.get("/api/categories", (_, res) => res.json(CATEGORIES));

app.post("/api/users", wrap(async (req, res) => { // appelé après inscription Firebase
  let uid, email;
  try { ({ uid, email } = await auth.verifyIdToken((req.headers.authorization || "").replace("Bearer ", ""))); }
  catch { return res.status(401).json({ error: "Non authentifié" }); }
  const p = profileSchema.safeParse(req.body); // admin impossible par inscription (enum)
  if (!p.success) return res.status(400).json({ error: p.error.issues.map(i => i.message).join(", ") });
  const { firstName, lastName, role, shopName, address, phone: tel } = p.data;
  if (role === "merchant" && !shopName) return res.status(400).json({ error: "Nom du commerce requis" });
  const ref = db.collection("users").doc(uid);
  if ((await ref.get()).exists) return res.status(409).json({ error: "Profil déjà existant" }); // empêche de changer son rôle
  await ref.set({ firstName, lastName, name: `${firstName} ${lastName}`, phone: tel, email, role, emailVerified: false, blocked: false, createdAt: Date.now() });
  if (role === "merchant")
    await db.collection("shops").doc(uid).set({ name: shopName, address: address || "", phone: tel, description: "", ownerId: uid, approved: false, createdAt: Date.now() });
  res.status(201).json({ ok: true });
}));
app.get("/api/me", requireAuth, wrap(async (req, res) => {
  const shop = req.user.role === "merchant" ? (await db.collection("shops").doc(req.user.uid).get()).data() : null;
  const { fcmTokens, ...safe } = req.user;
  res.json({ ...safe, shop });
}));
app.put("/api/me", requireAuth, validate(meSchema), wrap(async (req, res) => {
  const { firstName, lastName, phone: tel, email } = req.body, upd = { firstName, lastName, name: `${firstName} ${lastName}`, phone: tel };
  if (email.toLowerCase() !== (req.user.email || "").toLowerCase()) { // changer d'e-mail exige une connexion récente (< 5 min)
    if (Date.now() / 1000 - (req.authTime || 0) > 300) return res.status(401).json({ error: "Confirme ton mot de passe pour changer d'e-mail." });
    try { await auth.updateUser(req.user.uid, { email }); }
    catch (e) { return res.status(e.code === "auth/email-already-exists" ? 409 : 400).json({ error: e.code === "auth/email-already-exists" ? "Cet e-mail est déjà utilisé." : "E-mail invalide." }); }
    upd.email = email; upd.emailVerified = false; // la nouvelle adresse doit être vérifiée
    await db.collection("emailCodes").doc(req.user.uid).delete().catch(() => {});
  }
  await db.collection("users").doc(req.user.uid).update(upd); res.json({ ok: true });
}));
// ---- Vérification de l'e-mail par code à 6 chiffres (valable 10 min, 5 essais, renvoi limité) ----
const CODE_MINUTES = 10, RESEND_SECONDS = 45, MAX_SENDS_PER_HOUR = 5, MAX_TRIES = 5;
const hashCode = (uid, code) => crypto.createHmac("sha256", process.env.CODE_SECRET || "campussave-dev-secret").update(`${uid}:${code}`).digest("hex"); // le code n'est jamais stocké en clair
app.post("/api/verify/send", requireAuth, wrap(async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ ok: true, already: true });
  const ref = db.collection("emailCodes").doc(req.user.uid), d = (await ref.get()).data() || {}, now = Date.now();
  const wait = Math.ceil(((d.sentAt || 0) + RESEND_SECONDS * 1000 - now) / 1000);
  if (wait > 0 && d.hash) return res.json({ ok: true, cooldown: true, wait }); // un code vient d'être envoyé
  const fresh = !d.windowStart || now - d.windowStart > 3600e3, windowStart = fresh ? now : d.windowStart, sends = fresh ? 0 : (d.sends || 0);
  if (sends >= MAX_SENDS_PER_HOUR) return res.status(429).json({ error: "Trop de codes demandés. Réessaie dans une heure." });
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  let r;
  try { r = await sendVerificationCode({ to: req.user.email, name: req.user.firstName || req.user.name, code, minutes: CODE_MINUTES }); }
  catch (e) { console.error("Envoi e-mail :", e.message); return res.status(502).json({ error: "Impossible d'envoyer l'e-mail pour le moment. Réessaie dans un instant." }); }
  await ref.set({ hash: hashCode(req.user.uid, code), expiresAt: now + CODE_MINUTES * 60000, tries: 0, sentAt: now, sends: sends + 1, windowStart });
  res.json({ ok: true, wait: RESEND_SECONDS, dev: !!r.dev });
}));
app.post("/api/verify/confirm", requireAuth, validate(z.object({ code: z.string().trim().regex(/^\d{6}$/, "Le code contient 6 chiffres.") })), wrap(async (req, res) => {
  if (req.user.emailVerified !== false) return res.json({ ok: true, already: true });
  const ref = db.collection("emailCodes").doc(req.user.uid), d = (await ref.get()).data();
  if (!d?.hash) return res.status(400).json({ error: "Aucun code actif : demande un nouveau code." });
  if (Date.now() > d.expiresAt) return res.status(400).json({ error: "Ce code a expiré : demande un nouveau code." });
  if ((d.tries || 0) >= MAX_TRIES) return res.status(429).json({ error: "Trop d'essais : demande un nouveau code." });
  const a = Buffer.from(hashCode(req.user.uid, req.body.code)), b = Buffer.from(d.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const tries = (d.tries || 0) + 1; await ref.update({ tries }); const left = MAX_TRIES - tries;
    return res.status(400).json({ error: left > 0 ? `Code incorrect. Il te reste ${left} essai${left > 1 ? "s" : ""}.` : "Code incorrect. Demande un nouveau code." });
  }
  await db.collection("users").doc(req.user.uid).update({ emailVerified: true, emailVerifiedAt: Date.now() });
  auth.updateUser(req.user.uid, { emailVerified: true }).catch(() => {}); // synchronise l'indicateur Firebase Auth
  await ref.delete(); res.json({ ok: true });
}));
app.put("/api/shop", requireAuth, requireRole("merchant"), validate(z.object({
  name: z.string().trim().min(2, "Nom trop court").max(60), address: z.string().trim().max(120).optional(),
  phone, description: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional() })), wrap(async (req, res) => {
  await db.collection("shops").doc(req.user.uid).update(req.body); res.json({ ok: true });
}));
app.post("/api/me/fcm-token", requireAuth, validate(z.object({ token: z.string().min(20) })), wrap(async (req, res) => {
  await db.collection("users").doc(req.user.uid).update({ fcmTokens: FV.arrayUnion(req.body.token) }); res.json({ ok: true });
}));

// ---- Offres ----
// Popularité = unités payées ou retirées par offre (mise en cache 60 s).
let popCache = { t: 0, map: {} };
async function popularity() {
  if (Date.now() - popCache.t < 60000) return popCache.map;
  const s = await db.collection("orders").where("status", "in", ["paid", "collected"]).get();
  const map = {}; s.docs.forEach(d => { const o = d.data(); map[o.offerId] = (map[o.offerId] || 0) + o.quantity; });
  popCache = { t: Date.now(), map }; return map;
}
// Offres disponibles (stock > 0, commerce validé) enrichies avec les infos du commerce.
async function availableOffers() {
  const [snap, shopSnap, pop] = await Promise.all([db.collection("offers").get(), db.collection("shops").where("approved", "==", true).get(), popularity()]);
  const shops = Object.fromEntries(shopSnap.docs.map(d => [d.id, d.data()]));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.quantity > 0 && shops[o.shopId])
    .map(o => ({ ...o, shopName: shops[o.shopId].name, shopAddress: shops[o.shopId].address || "", shopLat: shops[o.shopId].lat ?? null, shopLng: shops[o.shopId].lng ?? null, sold: pop[o.id] || 0 }));
}
app.get("/api/offers", wrap(async (req, res) => {
  const { q = "", category = "", maxPrice = "" } = req.query;
  const list = (await availableOffers())
    .filter(o => (!q || (o.title + o.shopName + (o.description || "")).toLowerCase().includes(String(q).toLowerCase())) &&
                 (!category || o.category === category) && (!maxPrice || o.price <= Number(maxPrice)));
  res.json(list);
}));
app.get("/api/offers/:id", wrap(async (req, res) => { // fiche produit
  const d = await db.collection("offers").doc(req.params.id).get();
  if (!d.exists) return res.status(404).json({ error: "Offre introuvable" });
  const o = { id: d.id, ...d.data() }, shop = (await db.collection("shops").doc(o.shopId).get()).data();
  if (!shop?.approved) return res.status(404).json({ error: "Offre introuvable" });
  const pop = await popularity();
  res.json({ ...o, shopName: shop.name, shopAddress: shop.address || "", shopPhone: shop.phone || "", shopDescription: shop.description || "",
    shopLat: shop.lat ?? null, shopLng: shop.lng ?? null, sold: pop[o.id] || 0 });
}));

// ---- Bonus Campus Radar : commerces validés avec position et nombre d'offres disponibles ----
app.get("/api/shops", wrap(async (_, res) => {
  const [sh, of] = await Promise.all([db.collection("shops").where("approved", "==", true).get(), db.collection("offers").where("quantity", ">", 0).get()]);
  const count = {}; of.docs.forEach(d => { const id = d.data().shopId; count[id] = (count[id] || 0) + 1; });
  res.json(sh.docs.map(d => { const s = d.data(); return { id: d.id, name: s.name, address: s.address || "", phone: s.phone || "", description: s.description || "",
    lat: s.lat ?? null, lng: s.lng ?? null, offersCount: count[d.id] || 0 }; }));
}));

// ---- Recommandations : selon les catégories et commerces des commandes passées de l'étudiant ----
app.get("/api/recommendations", requireAuth, requireRole("student"), wrap(async (req, res) => {
  const mine = (await db.collection("orders").where("studentId", "==", req.user.uid).get()).docs.map(d => d.data()).filter(o => ["paid", "collected"].includes(o.status));
  const qty = {}; mine.forEach(o => { qty[o.offerId] = (qty[o.offerId] || 0) + o.quantity; });
  const ids = Object.keys(qty).slice(0, 30);
  const past = ids.length ? (await db.getAll(...ids.map(id => db.collection("offers").doc(id)))).filter(d => d.exists) : [];
  const cats = {}, favShops = {};
  past.forEach(d => { const o = d.data(); cats[o.category] = (cats[o.category] || 0) + qty[d.id]; favShops[o.shopId] = (favShops[o.shopId] || 0) + qty[d.id]; });
  const recent = Date.now() - 48 * 3600e3;
  const list = (await availableOffers()).map(o => ({ ...o, score: (cats[o.category] || 0) * 3 + (favShops[o.shopId] || 0) * 2 + o.sold * 0.5 + (o.createdAt > recent ? 1 : 0),
    reason: cats[o.category] ? `Vous aimez : ${o.category}` : favShops[o.shopId] ? `Vous avez déjà commandé chez ${o.shopName}` : "Populaire en ce moment" }))
    .sort((a, b) => b.score - a.score).slice(0, 8);
  res.json(list);
}));

// ---- Bonus Impact Dashboard : chiffres de la communauté (public, cache 30 s) ----
let impactCache = { t: 0, data: null };
app.get("/api/impact", wrap(async (_, res) => {
  if (impactCache.data && Date.now() - impactCache.t < 30000) return res.json(impactCache.data);
  const [os, ss, us] = await Promise.all([db.collection("orders").where("status", "==", "collected").get(),
    db.collection("shops").where("approved", "==", true).get(), db.collection("users").where("role", "==", "student").get()]);
  const o = os.docs.map(d => d.data());
  const data = { meals: o.reduce((s, x) => s + x.quantity, 0), savings: +o.reduce((s, x) => s + ((x.originalTotal || x.total) - x.total), 0).toFixed(3),
    orders: o.length, shops: ss.size, students: us.size };
  impactCache = { t: Date.now(), data }; res.json(data);
}));

// ---- Bonus EcoPoints : classement des étudiants (prénom + points uniquement) ----
app.get("/api/leaderboard", requireAuth, wrap(async (req, res) => {
  const s = await db.collection("users").where("role", "==", "student").get();
  const all = s.docs.map(d => ({ id: d.id, name: (d.data().name || "Étudiant").split(" ")[0], points: d.data().ecoPoints || 0 }))
    .filter(u => u.points > 0).sort((a, b) => b.points - a.points);
  const idx = all.findIndex(u => u.id === req.user.uid);
  res.json({ top: all.slice(0, 10).map((u, i) => ({ name: u.name, points: u.points, rank: i + 1, me: u.id === req.user.uid })), myRank: idx >= 0 ? idx + 1 : null, total: all.length });
}));
const shopApproved = wrap(async (req, res, next) => {
  const s = await db.collection("shops").doc(req.user.uid).get();
  s.data()?.approved ? next() : res.status(403).json({ error: "Commerce non validé par l'administrateur" });
});
app.post("/api/offers", requireAuth, requireRole("merchant"), shopApproved, validate(offerSchema), wrap(async (req, res) => {
  const ref = await db.collection("offers").add({ ...req.body, shopId: req.user.uid, createdAt: Date.now() });
  res.status(201).json({ id: ref.id });
}));
const ownOffer = wrap(async (req, res, next) => {
  const s = await db.collection("offers").doc(req.params.id).get();
  s.exists && s.data().shopId === req.user.uid ? next() : res.status(403).json({ error: "Offre introuvable ou interdite" });
});
app.put("/api/offers/:id", requireAuth, requireRole("merchant"), ownOffer, validate(offerSchema), wrap(async (req, res) => {
  await db.collection("offers").doc(req.params.id).update(req.body); res.json({ ok: true });
}));
app.delete("/api/offers/:id", requireAuth, requireRole("merchant"), ownOffer, wrap(async (req, res) => {
  await db.collection("offers").doc(req.params.id).delete(); res.json({ ok: true });
}));
app.get("/api/my/offers", requireAuth, requireRole("merchant"), wrap(async (req, res) => {
  const s = await db.collection("offers").where("shopId", "==", req.user.uid).get();
  res.json(s.docs.map(d => ({ id: d.id, ...d.data() })));
}));

// ---- Réservations (transaction : stock décrémenté de façon atomique) ----
app.post("/api/orders", requireAuth, requireRole("student"), validate(z.object({ offerId: z.string(), quantity: z.number().int().min(1).max(10) })), async (req, res) => {
  try {
    const orderRef = db.collection("orders").doc();
    await db.runTransaction(async (t) => {
      const oRef = db.collection("offers").doc(req.body.offerId);
      const o = await t.get(oRef);
      if (!o.exists) throw new Error("Offre introuvable");
      const shop = await t.get(db.collection("shops").doc(o.data().shopId));
      if (!shop.data()?.approved) throw new Error("Commerce non disponible");
      if (o.data().quantity < req.body.quantity) throw new Error("Stock insuffisant");
      const { price, originalPrice, title, shopId } = o.data(), n = req.body.quantity;
      t.update(oRef, { quantity: o.data().quantity - n });
      t.set(orderRef, { offerId: o.id, title, shopId, studentId: req.user.uid, studentName: req.user.name, quantity: n,
        total: +(price * n).toFixed(3), originalTotal: +(originalPrice * n).toFixed(3), status: "pending_payment",
        createdAt: Date.now(), expiresAt: Date.now() + PENDING_MINUTES * 60000 });
    });
    res.status(201).json({ id: orderRef.id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Libère une réservation non payée : le stock est restitué à l'offre.
async function releaseOrder(orderId, status) {
  return db.runTransaction(async (t) => {
    const oRef = db.collection("orders").doc(orderId), o = await t.get(oRef);
    if (!o.exists || o.data().status !== "pending_payment") return false;
    const offRef = db.collection("offers").doc(o.data().offerId), off = await t.get(offRef);
    if (off.exists) t.update(offRef, { quantity: FV.increment(o.data().quantity) });
    t.update(oRef, { status, releasedAt: Date.now() });
    return true;
  });
}
const expirePending = async () => {
  try {
    const s = await db.collection("orders").where("status", "==", "pending_payment").get();
    for (const d of s.docs) if ((d.data().expiresAt || 0) < Date.now()) await releaseOrder(d.id, "expired");
  } catch (e) { console.error("expirePending:", e.message); }
};
setInterval(expirePending, 60000); expirePending();

app.post("/api/orders/:id/cancel", requireAuth, requireRole("student"), wrap(async (req, res) => {
  const o = (await db.collection("orders").doc(req.params.id).get()).data();
  if (!o || o.studentId !== req.user.uid) return res.status(404).json({ error: "Commande introuvable" });
  (await releaseOrder(req.params.id, "cancelled")) ? res.json({ ok: true }) : res.status(400).json({ error: "Cette commande ne peut plus être annulée" });
}));
app.get("/api/my/orders", requireAuth, requireRole("student", "merchant"), wrap(async (req, res) => {
  const field = req.user.role === "merchant" ? "shopId" : "studentId";
  const s = await db.collection("orders").where(field, "==", req.user.uid).get();
  res.json(s.docs.map(d => { const o = { id: d.id, ...d.data() }; if (req.user.role === "merchant") delete o.qrToken; return o; }).sort((a, b) => b.createdAt - a.createdAt));
}));

// ---- Paiement : Konnect (sandbox) ou mode simulé (PAYMENT_PROVIDER=mock) ----
// Passe une commande en "payée", génère le QR et notifie (utilisé par le webhook Konnect et le mode simulé).
async function markPaid(ref, o) {
  await ref.update({ status: "paid", qrToken: crypto.randomBytes(16).toString("hex"), paidAt: Date.now() });
  notify(o.studentId, "Paiement confirmé", `Votre commande « ${o.title} » est prête : présentez votre QR code.`);
  notify(o.shopId, "Nouvelle commande payée", `${o.studentName || "Un étudiant"} : ${o.title} × ${o.quantity}`);
}
app.post("/api/orders/:id/pay", requireAuth, requireRole("student"), wrap(async (req, res) => {
  const ref = db.collection("orders").doc(req.params.id); const o = (await ref.get()).data();
  if (!o || o.studentId !== req.user.uid || o.status !== "pending_payment") return res.status(400).json({ error: "Commande non payable" });
  if ((o.expiresAt || 0) < Date.now()) { await releaseOrder(ref.id, "expired"); return res.status(400).json({ error: "Réservation expirée, le stock a été libéré" }); }
  if (PAYMENT_PROVIDER === "mock") return res.json({ payUrl: `${origins[0] || "http://localhost:5173"}/pay/${ref.id}` });
  if (!process.env.KONNECT_API_KEY) return res.status(503).json({ error: "Konnect non configuré (KONNECT_API_KEY manquante)" });
  const r = await fetch(`${process.env.KONNECT_BASE}/payments/init-payment`, {
    method: "POST", headers: { "x-api-key": process.env.KONNECT_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ receiverWalletId: process.env.KONNECT_WALLET_ID, amount: Math.round(o.total * 1000), token: "TND",
      orderId: ref.id, firstName: req.user.name, email: req.user.email, lifespan: PENDING_MINUTES,
      webhook: `${process.env.PUBLIC_API_URL}/api/payments/webhook`, successUrl: `${origins[0] || "http://localhost:5173"}/orders`, failUrl: `${origins[0] || "http://localhost:5173"}/orders` })
  });
  const d = await r.json();
  if (!d.payUrl) return res.status(502).json({ error: "Échec Konnect" });
  await ref.update({ paymentRef: d.paymentRef }); res.json({ payUrl: d.payUrl });
}));
// Confirmation du paiement simulé (désactivée si PAYMENT_PROVIDER n'est pas "mock").
app.post("/api/orders/:id/mock-pay", requireAuth, requireRole("student"), wrap(async (req, res) => {
  if (PAYMENT_PROVIDER !== "mock") return res.status(404).json({ error: "Paiement simulé désactivé" });
  const ref = db.collection("orders").doc(req.params.id), o = (await ref.get()).data();
  if (!o || o.studentId !== req.user.uid || o.status !== "pending_payment") return res.status(400).json({ error: "Commande non payable" });
  if ((o.expiresAt || 0) < Date.now()) { await releaseOrder(ref.id, "expired"); return res.status(400).json({ error: "Réservation expirée, le stock a été libéré" }); }
  await markPaid(ref, o); res.json({ ok: true });
}));
// Le webhook ne fait pas confiance au paramètre : il revérifie auprès de Konnect.
app.get("/api/payments/webhook", wrap(async (req, res) => {
  const { payment_ref } = req.query; if (!payment_ref) return res.sendStatus(400);
  const r = await fetch(`${process.env.KONNECT_BASE}/payments/${payment_ref}`, { headers: { "x-api-key": process.env.KONNECT_API_KEY } });
  const p = (await r.json()).payment; if (p?.status !== "completed") return res.sendStatus(200);
  const q = await db.collection("orders").where("paymentRef", "==", payment_ref).limit(1).get();
  if (!q.empty && q.docs[0].data().status === "pending_payment") {
    await markPaid(q.docs[0].ref, q.docs[0].data());
  }
  res.sendStatus(200);
}));

// ---- Validation du QR code par le commerçant (+ EcoPoints) ----
app.post("/api/orders/validate", requireAuth, requireRole("merchant"), validate(z.object({ token: z.string().trim().min(8) })), wrap(async (req, res) => {
  const q = await db.collection("orders").where("qrToken", "==", req.body.token).limit(1).get();
  if (q.empty) return res.status(404).json({ error: "QR code invalide" });
  const ref = q.docs[0].ref;
  const r = await db.runTransaction(async (t) => {
    const o = (await t.get(ref)).data();
    if (o.shopId !== req.user.uid) return { code: 403, error: "Cette commande appartient à un autre commerce" };
    if (o.status !== "paid") return { code: 409, error: "Commande déjà retirée" };
    const points = o.quantity * POINTS_PER_MEAL;
    t.update(ref, { status: "collected", collectedAt: Date.now() });
    t.set(db.collection("users").doc(o.studentId), { ecoPoints: FV.increment(points) }, { merge: true });
    return { o, points };
  });
  if (r.error) return res.status(r.code).json({ error: r.error });
  notify(r.o.studentId, "Commande retirée", `Merci ! +${r.points} EcoPoints pour « ${r.o.title} ».`);
  const off = (await db.collection("offers").doc(r.o.offerId).get()).data();
  const hm = new Date().toLocaleTimeString("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  res.json({ ok: true, title: r.o.title, quantity: r.o.quantity, studentName: r.o.studentName || "", points: r.points,
    outsideSlot: !!off && (hm < off.pickupFrom || hm > off.pickupTo), slot: off ? `${off.pickupFrom}–${off.pickupTo}` : "" });
}));

// ---- Administrateur ----
app.get("/api/admin/shops", requireAuth, requireRole("admin"), wrap(async (_, res) => {
  const s = await db.collection("shops").get(); res.json(s.docs.map(d => ({ id: d.id, ...d.data() })));
}));
app.patch("/api/admin/shops/:id", requireAuth, requireRole("admin"), validate(z.object({ approved: z.boolean() })), wrap(async (req, res) => {
  await db.collection("shops").doc(req.params.id).update({ approved: req.body.approved });
  if (req.body.approved) notify(req.params.id, "Commerce validé", "Votre commerce est validé : vous pouvez publier vos offres.");
  res.json({ ok: true });
}));
app.get("/api/admin/users", requireAuth, requireRole("admin"), wrap(async (_, res) => {
  const s = await db.collection("users").get();
  res.json(s.docs.map(d => { const { fcmTokens, ...u } = d.data(); return { id: d.id, ...u }; }).sort((a, b) => b.createdAt - a.createdAt));
}));
app.patch("/api/admin/users/:id", requireAuth, requireRole("admin"), validate(z.object({ blocked: z.boolean() })), wrap(async (req, res) => {
  const ref = db.collection("users").doc(req.params.id), u = await ref.get();
  if (!u.exists) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (u.data().role === "admin") return res.status(400).json({ error: "Impossible de bloquer un administrateur" });
  await ref.update({ blocked: req.body.blocked });
  if (u.data().role === "merchant" && req.body.blocked) await db.collection("shops").doc(u.id).update({ approved: false }); // ses offres disparaissent
  res.json({ ok: true });
}));

// ---- Statistiques (tableaux de bord) ----
const dayKey = (ts) => new Date(ts).toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" }); // YYYY-MM-DD
app.get("/api/stats", requireAuth, wrap(async (req, res) => {
  const { role, uid } = req.user;
  let q = db.collection("orders");
  if (role === "student") q = q.where("studentId", "==", uid);
  if (role === "merchant") q = q.where("shopId", "==", uid);
  const all = (await q.get()).docs.map(d => d.data());
  const done = all.filter(o => ["paid", "collected"].includes(o.status));
  const sum = (arr, f) => arr.reduce((s, o) => s + f(o), 0);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(Date.now() - (6 - i) * 864e5));
  const byDay = days.map(date => { const d = done.filter(o => dayKey(o.paidAt || o.createdAt) === date); return { date, orders: d.length, revenue: +sum(d, o => o.total).toFixed(3),
    meals: sum(all.filter(o => o.status === "collected" && dayKey(o.collectedAt || o.createdAt) === date), o => o.quantity) }; });
  const top = {}; done.forEach(o => { top[o.title] = (top[o.title] || 0) + o.quantity; });
  const out = {
    orders: done.length, revenue: +sum(done, o => o.total).toFixed(3),
    mealsSaved: sum(all.filter(o => o.status === "collected"), o => o.quantity), // repas réellement récupérés
    toCollect: all.filter(o => o.status === "paid").length,
    savings: +sum(done, o => (o.originalTotal || o.total) - o.total).toFixed(3),
    byDay, topOffers: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, quantity]) => ({ title, quantity })),
    statusCounts: all.reduce((c, o) => ({ ...c, [o.status]: (c[o.status] || 0) + 1 }), {}),
  };
  if (role === "student") out.ecoPoints = req.user.ecoPoints || 0;
  if (role === "admin") {
    const users = (await db.collection("users").get()).docs.map(d => d.data());
    const shops = (await db.collection("shops").get()).docs.map(d => d.data());
    Object.assign(out, { users: users.length, students: users.filter(u => u.role === "student").length, merchants: users.filter(u => u.role === "merchant").length,
      shopsApproved: shops.filter(s => s.approved).length, shopsPending: shops.filter(s => !s.approved).length,
      activeOffers: (await db.collection("offers").where("quantity", ">", 0).count().get()).data().count });
  }
  res.json(out);
}));

// ---- Supervision administrateur : vue d'ensemble, commandes, modération des offres ----
const byId = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const newest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
app.get("/api/admin/overview", requireAuth, requireRole("admin"), wrap(async (_, res) => {
  const [users, shops, orders, offers] = (await Promise.all(["users", "shops", "orders", "offers"].map(c => db.collection(c).get()))).map(byId);
  const shopName = Object.fromEntries(shops.map(s => [s.id, s.name]));
  const done = orders.filter(o => ["paid", "collected"].includes(o.status)), sum = (a, f) => a.reduce((s, x) => s + f(x), 0), today = dayKey(Date.now());
  const days = Array.from({ length: 14 }, (_, i) => dayKey(Date.now() - (13 - i) * 864e5));
  const rev = {}; done.forEach(o => { rev[o.shopId] = (rev[o.shopId] || 0) + o.total; });
  res.json({
    kpis: { users: users.length, students: users.filter(u => u.role === "student").length, merchants: users.filter(u => u.role === "merchant").length, blocked: users.filter(u => u.blocked).length,
      shopsApproved: shops.filter(s => s.approved).length, shopsPending: shops.filter(s => !s.approved).length, offersActive: offers.filter(o => o.quantity > 0).length, offersTotal: offers.length,
      ordersTotal: orders.length, ordersToday: orders.filter(o => dayKey(o.createdAt) === today).length, toCollect: orders.filter(o => o.status === "paid").length,
      revenue: +sum(done, o => o.total).toFixed(3), meals: sum(orders.filter(o => o.status === "collected"), o => o.quantity), savings: +sum(done, o => (o.originalTotal || o.total) - o.total).toFixed(3) },
    byDay: days.map(date => { const d = done.filter(o => dayKey(o.paidAt || o.createdAt) === date); return { date, orders: d.length, revenue: +sum(d, o => o.total).toFixed(3) }; }),
    statusCounts: orders.reduce((c, o) => ({ ...c, [o.status]: (c[o.status] || 0) + 1 }), {}),
    pendingShops: shops.filter(s => !s.approved).sort(newest).map(({ id, name, address, phone, createdAt }) => ({ id, name, address, phone, createdAt })),
    recentUsers: users.sort(newest).slice(0, 6).map(({ id, name, email, role, createdAt, blocked }) => ({ id, name, email, role, createdAt, blocked })),
    recentOrders: orders.sort(newest).slice(0, 8).map(o => ({ id: o.id, title: o.title, quantity: o.quantity, total: o.total, status: o.status, studentName: o.studentName, shopName: shopName[o.shopId], createdAt: o.createdAt })),
    topShops: Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, t]) => ({ id, name: shopName[id] || "—", revenue: +t.toFixed(3) })),
  });
}));
app.get("/api/admin/orders", requireAuth, requireRole("admin"), wrap(async (_, res) => {
  const [orders, shops] = await Promise.all([db.collection("orders").get().then(byId), db.collection("shops").get().then(byId)]);
  const shopName = Object.fromEntries(shops.map(s => [s.id, s.name]));
  res.json(orders.sort(newest).slice(0, 500).map(({ qrToken, paymentRef, ...o }) => ({ ...o, shopName: shopName[o.shopId] || "—" })));
}));
app.get("/api/admin/offers", requireAuth, requireRole("admin"), wrap(async (_, res) => {
  const [offers, shops] = await Promise.all([db.collection("offers").get().then(byId), db.collection("shops").get().then(byId)]);
  const shopName = Object.fromEntries(shops.map(s => [s.id, s.name]));
  res.json(offers.sort(newest).map(({ photo, ...o }) => ({ ...o, hasPhoto: !!photo, shopName: shopName[o.shopId] || "—" })));
}));
app.delete("/api/admin/offers/:id", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  await db.collection("offers").doc(req.params.id).delete(); res.json({ ok: true });
}));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "Erreur serveur" }); });
app.listen(process.env.PORT || 4000, () => console.log("API CampusSave sur le port", process.env.PORT || 4000));
