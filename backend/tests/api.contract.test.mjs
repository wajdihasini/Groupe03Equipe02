// Tests de contrat de l'API : chaque route utilisée par le frontend, avec ses codes HTTP et la forme de ses réponses.
// Ils ont été écrits et exécutés sur le server.js D'ORIGINE avant la réorganisation MVC, puis réexécutés après :
// ils garantissent que les routes et les formats attendus par le frontend n'ont pas changé.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, seed, db, sentMessages, outbox } from "./helpers.mjs";

let call;
before(async () => { await seed(); call = client(await startServer(4801)); });

// ---------- Routes publiques ----------
test("GET /api/categories renvoie les 8 catégories", async () => {
  const r = await call("/api/categories");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, ["Viennoiserie", "Sandwich", "Plat", "Salade", "Dessert", "Boisson", "Autre", "Panier surprise"]);
});

test("GET /api/offers : uniquement les offres en stock de commerces validés, enrichies", async () => {
  const r = await call("/api/offers");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.map(o => o.id).sort(), ["off1", "off2"]);
  const o = r.data.find(x => x.id === "off1");
  for (const k of ["title", "category", "price", "originalPrice", "quantity", "pickupFrom", "pickupTo", "shopId", "shopName", "shopAddress", "shopLat", "shopLng", "sold"]) assert.ok(k in o, k);
  assert.equal(o.shopName, "Café Médina");
  assert.equal(o.sold, 0);
});

test("GET /api/offers : filtres q, category et maxPrice", async () => {
  assert.deepEqual((await call("/api/offers?q=couscous")).data.map(o => o.id), ["off2"]);
  assert.deepEqual((await call("/api/offers?q=médina")).data.length, 2); // recherche aussi dans le nom du commerce
  assert.deepEqual((await call("/api/offers?category=Viennoiserie")).data.map(o => o.id), ["off1"]);
  assert.deepEqual((await call("/api/offers?maxPrice=2")).data.map(o => o.id), ["off1"]);
});

test("GET /api/offers/:id : fiche produit, 404 si inconnue ou commerce non validé", async () => {
  const r = await call("/api/offers/off1");
  assert.equal(r.status, 200);
  for (const k of ["shopName", "shopAddress", "shopPhone", "shopDescription", "shopLat", "shopLng", "sold"]) assert.ok(k in r.data, k);
  assert.equal((await call("/api/offers/nope")).status, 404);
  assert.equal((await call("/api/offers/off3")).status, 404);
});

test("GET /api/shops : commerces validés avec nombre d'offres", async () => {
  const r = await call("/api/shops");
  assert.equal(r.status, 200);
  assert.equal(r.data.length, 1);
  assert.deepEqual(Object.keys(r.data[0]).sort(), ["address", "description", "id", "lat", "lng", "name", "offersCount", "phone"]);
  assert.equal(r.data[0].offersCount, 2);
});

test("GET /api/impact : chiffres publics", async () => {
  const r = await call("/api/impact");
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data).sort(), ["meals", "orders", "savings", "shops", "students"]);
  assert.equal(r.data.shops, 1);
});

// ---------- Authentification et profil ----------
test("Routes protégées : 401 sans jeton, 403 si compte bloqué", async () => {
  assert.equal((await call("/api/me")).status, 401);
  const r = await call("/api/me", { as: "blk" });
  assert.equal(r.status, 403);
  assert.match(r.data.error, /bloqué/);
});

test("POST /api/users : inscription étudiant / commerçant et contrôles", async () => {
  const body = { firstName: "Yasmine", lastName: "Ali", role: "student", phone: "22 333 444" };
  assert.equal((await call("/api/users", { method: "POST", body })).status, 401);
  assert.equal((await call("/api/users", { method: "POST", body: { ...body, role: "admin" }, as: "new1" })).status, 400);
  assert.equal((await call("/api/users", { method: "POST", body: { ...body, phone: "12" }, as: "new1" })).status, 400);
  const r = await call("/api/users", { method: "POST", body, as: "new1" });
  assert.equal(r.status, 201);
  assert.deepEqual(r.data, { ok: true });
  const u = (await db.collection("users").doc("new1").get()).data();
  assert.equal(u.role, "student"); assert.equal(u.emailVerified, false); assert.equal(u.name, "Yasmine Ali");
  assert.equal((await call("/api/users", { method: "POST", body, as: "new1" })).status, 409);
  // commerçant : nom du commerce obligatoire, commerce créé non validé
  const m = { ...body, role: "merchant" };
  assert.equal((await call("/api/users", { method: "POST", body: m, as: "newm" })).status, 400);
  assert.equal((await call("/api/users", { method: "POST", body: { ...m, shopName: "Pizza Roma" }, as: "newm" })).status, 201);
  const s = (await db.collection("shops").doc("newm").get()).data();
  assert.equal(s.name, "Pizza Roma"); assert.equal(s.approved, false);
});

test("GET /api/me : profil sans fcmTokens, avec le commerce pour un commerçant", async () => {
  const r = await call("/api/me", { as: "stu1" });
  assert.equal(r.status, 200);
  assert.equal(r.data.uid, "stu1"); assert.equal(r.data.role, "student");
  assert.ok(!("fcmTokens" in r.data)); assert.equal(r.data.shop, null);
  const m = await call("/api/me", { as: "mer1" });
  assert.equal(m.data.shop.name, "Café Médina");
  assert.equal(m.data.shop.id, "mer1"); // utilisé par Merchant.jsx (me.shop.id)
});

test("E-mail non vérifié : accès limité à /api/me et à la vérification", async () => {
  assert.equal((await call("/api/me", { as: "unver" })).status, 200);
  const r = await call("/api/my/orders", { as: "unver" });
  assert.equal(r.status, 403); assert.equal(r.data.code, "email_unverified");
});

test("Vérification de l'e-mail : envoi, mauvais code, bon code", async () => {
  const s = await call("/api/verify/send", { method: "POST", as: "unver" });
  assert.equal(s.status, 200); assert.equal(s.data.ok, true); assert.equal(s.data.wait, 45);
  const again = await call("/api/verify/send", { method: "POST", as: "unver" });
  assert.equal(again.data.cooldown, true);
  const code = (await outbox()).filter(m => m.to === "unver@test.tn").at(-1).code;
  assert.match(code, /^\d{6}$/);
  const bad = await call("/api/verify/confirm", { method: "POST", body: { code: code === "000000" ? "111111" : "000000" }, as: "unver" });
  assert.equal(bad.status, 400); assert.match(bad.data.error, /4 essais/);
  assert.equal((await call("/api/verify/confirm", { method: "POST", body: { code: "12" }, as: "unver" })).status, 400);
  const ok = await call("/api/verify/confirm", { method: "POST", body: { code }, as: "unver" });
  assert.equal(ok.status, 200); assert.deepEqual(ok.data, { ok: true });
  assert.equal((await db.collection("users").doc("unver").get()).data().emailVerified, true);
  assert.equal((await call("/api/verify/send", { method: "POST", as: "unver" })).data.already, true);
});

test("PUT /api/me : mise à jour du profil, changement d'e-mail protégé", async () => {
  const body = { firstName: "Samy", lastName: "Ben", phone: "+216 22 333 444", email: "stu2@test.tn" };
  const r = await call("/api/me", { method: "PUT", body, as: "stu2" });
  assert.equal(r.status, 200);
  assert.equal((await db.collection("users").doc("stu2").get()).data().name, "Samy Ben");
  const old = Math.floor(Date.now() / 1000) - 3600;
  assert.equal((await call("/api/me", { method: "PUT", body: { ...body, email: "neuf@test.tn" }, as: "stu2", authTime: old })).status, 401);
  assert.equal((await call("/api/me", { method: "PUT", body: { ...body, email: "neuf@test.tn" }, as: "stu2" })).status, 200);
  const u = (await db.collection("users").doc("stu2").get()).data();
  assert.equal(u.email, "neuf@test.tn"); assert.equal(u.emailVerified, false);
  await db.collection("users").doc("stu2").update({ emailVerified: true, email: "stu2@test.tn" });
});

test("PUT /api/shop et POST /api/me/fcm-token", async () => {
  assert.equal((await call("/api/shop", { method: "PUT", body: { name: "X" }, as: "stu1" })).status, 403);
  assert.equal((await call("/api/shop", { method: "PUT", body: { name: "Café Médina", address: "Rue ESSECT", description: "Le meilleur café", lat: 36.81, lng: 10.18 }, as: "mer1" })).status, 200);
  assert.equal((await db.collection("shops").doc("mer1").get()).data().description, "Le meilleur café");
  assert.equal((await call("/api/me/fcm-token", { method: "POST", body: { token: "short" }, as: "mer1" })).status, 400);
  assert.equal((await call("/api/me/fcm-token", { method: "POST", body: { token: "tok-mer1-aaaaaaaaaaaaaaaaaaaa" }, as: "mer1" })).status, 200);
  assert.deepEqual((await db.collection("users").doc("mer1").get()).data().fcmTokens, ["tok-mer1-aaaaaaaaaaaaaaaaaaaa"]);
});

// ---------- Offres du commerçant ----------
const newOffer = { title: "Pain au chocolat", category: "Viennoiserie", description: "Du jour", originalPrice: 2.8, price: 1.4, quantity: 6, pickupFrom: "00:00", pickupTo: "23:59", photo: "" };
let createdOffer;
test("POST /api/offers : commerce validé requis, validation des champs", async () => {
  assert.equal((await call("/api/offers", { method: "POST", body: newOffer, as: "stu1" })).status, 403);
  const pending = await call("/api/offers", { method: "POST", body: newOffer, as: "mer2" });
  assert.equal(pending.status, 403); assert.match(pending.data.error, /non validé/);
  const bad = await call("/api/offers", { method: "POST", body: { ...newOffer, price: 3 }, as: "mer1" });
  assert.equal(bad.status, 400); assert.match(bad.data.error, /inférieur/);
  assert.equal((await call("/api/offers", { method: "POST", body: { ...newOffer, pickupTo: "25:00" }, as: "mer1" })).status, 400);
  const r = await call("/api/offers", { method: "POST", body: newOffer, as: "mer1" });
  assert.equal(r.status, 201); assert.ok(r.data.id);
  createdOffer = r.data.id;
});

test("PUT / DELETE /api/offers/:id : seulement ses propres offres ; GET /api/my/offers", async () => {
  assert.equal((await call(`/api/offers/${createdOffer}`, { method: "PUT", body: { ...newOffer, quantity: 8 }, as: "mer2" })).status, 403);
  assert.equal((await call(`/api/offers/${createdOffer}`, { method: "PUT", body: { ...newOffer, quantity: 8 }, as: "mer1" })).status, 200);
  assert.equal((await db.collection("offers").doc(createdOffer).get()).data().quantity, 8);
  const mine = await call("/api/my/offers", { as: "mer1" });
  assert.equal(mine.status, 200);
  assert.ok(mine.data.some(o => o.id === createdOffer));
  assert.ok(mine.data.every(o => o.shopId === "mer1"));
  assert.equal((await call(`/api/offers/${createdOffer}`, { method: "DELETE", as: "mer2" })).status, 403);
  assert.equal((await call(`/api/offers/${createdOffer}`, { method: "DELETE", as: "mer1" })).status, 200);
  assert.equal((await db.collection("offers").doc(createdOffer).get()).exists, false);
});

// ---------- Réservation, paiement, QR ----------
let orderId;
test("POST /api/orders : réservation atomique, contrôles de stock et de rôle", async () => {
  assert.equal((await call("/api/orders", { method: "POST", body: { offerId: "off2", quantity: 1 }, as: "mer1" })).status, 403);
  const tooMany = await call("/api/orders", { method: "POST", body: { offerId: "off2", quantity: 3 }, as: "stu1" });
  assert.equal(tooMany.status, 400); assert.equal(tooMany.data.error, "Stock insuffisant");
  assert.equal((await call("/api/orders", { method: "POST", body: { offerId: "off3", quantity: 1 }, as: "stu1" })).data.error, "Commerce non disponible");
  assert.equal((await call("/api/orders", { method: "POST", body: { offerId: "zzz", quantity: 1 }, as: "stu1" })).data.error, "Offre introuvable");
  const r = await call("/api/orders", { method: "POST", body: { offerId: "off1", quantity: 2 }, as: "stu1" });
  assert.equal(r.status, 201); orderId = r.data.id;
  assert.equal((await db.collection("offers").doc("off1").get()).data().quantity, 8);
  const o = (await db.collection("orders").doc(orderId).get()).data();
  assert.equal(o.status, "pending_payment"); assert.equal(o.total, 2.4); assert.equal(o.originalTotal, 5); assert.equal(o.studentName, "Sami Ben");
});

test("POST /api/orders/:id/cancel : stock restitué, une seule fois", async () => {
  const r = await call("/api/orders", { method: "POST", body: { offerId: "off1", quantity: 3 }, as: "stu1" });
  assert.equal((await db.collection("offers").doc("off1").get()).data().quantity, 5);
  assert.equal((await call(`/api/orders/${r.data.id}/cancel`, { method: "POST", as: "stu2" })).status, 404);
  assert.equal((await call(`/api/orders/${r.data.id}/cancel`, { method: "POST", as: "stu1" })).status, 200);
  assert.equal((await db.collection("offers").doc("off1").get()).data().quantity, 8);
  assert.equal((await db.collection("orders").doc(r.data.id).get()).data().status, "cancelled");
  assert.equal((await call(`/api/orders/${r.data.id}/cancel`, { method: "POST", as: "stu1" })).status, 400);
});

test("POST /api/orders/:id/pay (mode simulé) puis /mock-pay : commande payée avec QR et notifications", async () => {
  assert.equal((await call(`/api/orders/${orderId}/pay`, { method: "POST", as: "stu2" })).status, 400);
  const p = await call(`/api/orders/${orderId}/pay`, { method: "POST", as: "stu1" });
  assert.equal(p.status, 200); assert.equal(p.data.payUrl, `http://localhost:5173/pay/${orderId}`);
  sentMessages.length = 0;
  const m = await call(`/api/orders/${orderId}/mock-pay`, { method: "POST", as: "stu1" });
  assert.equal(m.status, 200); assert.deepEqual(m.data, { ok: true });
  const o = (await db.collection("orders").doc(orderId).get()).data();
  assert.equal(o.status, "paid"); assert.match(o.qrToken, /^[0-9a-f]{32}$/); assert.ok(o.paidAt);
  await new Promise(r => setTimeout(r, 50));
  assert.ok(sentMessages.some(x => x.notification.title === "Paiement confirmé"));
  assert.equal((await call(`/api/orders/${orderId}/mock-pay`, { method: "POST", as: "stu1" })).status, 400);
});

test("Réservation expirée : paiement refusé et stock libéré", async () => {
  const r = await call("/api/orders", { method: "POST", body: { offerId: "off2", quantity: 1 }, as: "stu2" });
  await db.collection("orders").doc(r.data.id).update({ expiresAt: Date.now() - 1000 });
  const p = await call(`/api/orders/${r.data.id}/pay`, { method: "POST", as: "stu2" });
  assert.equal(p.status, 400); assert.match(p.data.error, /expirée/);
  assert.equal((await db.collection("orders").doc(r.data.id).get()).data().status, "expired");
  assert.equal((await db.collection("offers").doc("off2").get()).data().quantity, 2);
});

test("GET /api/my/orders : QR visible par l'étudiant, masqué pour le commerçant", async () => {
  const s = await call("/api/my/orders", { as: "stu1" });
  assert.equal(s.status, 200);
  const mine = s.data.find(o => o.id === orderId);
  assert.ok(mine.qrToken);
  for (let i = 1; i < s.data.length; i++) assert.ok(s.data[i - 1].createdAt >= s.data[i].createdAt); // plus récentes d'abord
  const m = await call("/api/my/orders", { as: "mer1" });
  assert.ok(m.data.some(o => o.id === orderId));
  assert.ok(m.data.every(o => !("qrToken" in o)));
  assert.equal((await call("/api/my/orders", { as: "admin1" })).status, 403);
});

test("POST /api/orders/validate : retrait par le bon commerçant, EcoPoints, pas de double retrait", async () => {
  const qr = (await db.collection("orders").doc(orderId).get()).data().qrToken;
  assert.equal((await call("/api/orders/validate", { method: "POST", body: { token: "deadbeefdeadbeef" }, as: "mer1" })).status, 404);
  assert.equal((await call("/api/orders/validate", { method: "POST", body: { token: qr }, as: "mer2" })).status, 403);
  const r = await call("/api/orders/validate", { method: "POST", body: { token: qr }, as: "mer1" });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data).sort(), ["ok", "outsideSlot", "points", "quantity", "slot", "studentName", "title"]);
  assert.equal(r.data.points, 20); assert.equal(r.data.outsideSlot, false); assert.equal(r.data.slot, "00:00–23:59");
  assert.equal((await db.collection("users").doc("stu1").get()).data().ecoPoints, 20);
  assert.equal((await db.collection("orders").doc(orderId).get()).data().status, "collected");
  assert.equal((await call("/api/orders/validate", { method: "POST", body: { token: qr }, as: "mer1" })).status, 409);
});

// ---------- Tableaux de bord, classement, recommandations ----------
test("GET /api/stats : étudiant, commerçant, admin", async () => {
  const s = await call("/api/stats", { as: "stu1" });
  assert.equal(s.status, 200);
  for (const k of ["orders", "revenue", "mealsSaved", "toCollect", "savings", "byDay", "topOffers", "statusCounts", "ecoPoints"]) assert.ok(k in s.data, k);
  assert.equal(s.data.mealsSaved, 2); assert.equal(s.data.ecoPoints, 20); assert.equal(s.data.byDay.length, 7);
  const m = await call("/api/stats", { as: "mer1" });
  assert.equal(m.data.revenue, 2.4); assert.ok(!("ecoPoints" in m.data));
  const a = await call("/api/stats", { as: "admin1" });
  for (const k of ["users", "students", "merchants", "shopsApproved", "shopsPending", "activeOffers"]) assert.ok(k in a.data, k);
});

test("GET /api/leaderboard et GET /api/recommendations", async () => {
  const l = await call("/api/leaderboard", { as: "stu1" });
  assert.equal(l.status, 200);
  assert.deepEqual(l.data.top, [{ name: "Sami", points: 20, rank: 1, me: true }]);
  assert.equal(l.data.myRank, 1); assert.equal(l.data.total, 1);
  const r = await call("/api/recommendations", { as: "stu1" });
  assert.equal(r.status, 200);
  assert.ok(r.data.length > 0 && r.data.length <= 8);
  assert.equal(r.data[0].id, "off1"); assert.equal(r.data[0].reason, "Vous aimez : Viennoiserie");
  assert.ok("score" in r.data[0]);
  assert.equal((await call("/api/recommendations", { as: "mer1" })).status, 403);
});

test("GET /api/impact compte les repas retirés", async () => {
  const r = await call("/api/impact");
  assert.ok(r.data.meals >= 0); // cache de 30 s : la valeur exacte est vérifiée dans /api/stats
});

// ---------- Administration ----------
test("Routes admin : 403 pour les autres rôles", async () => {
  for (const p of ["/api/admin/shops", "/api/admin/users", "/api/admin/overview", "/api/admin/orders", "/api/admin/offers"]) assert.equal((await call(p, { as: "mer1" })).status, 403, p);
});

test("Admin : commerces (liste + validation) et utilisateurs (liste + blocage)", async () => {
  const shops = await call("/api/admin/shops", { as: "admin1" });
  assert.equal(shops.status, 200); assert.ok(shops.data.some(s => s.id === "mer2" && s.approved === false));
  sentMessages.length = 0;
  assert.equal((await call("/api/admin/shops/mer2", { method: "PATCH", body: { approved: true }, as: "admin1" })).status, 200);
  assert.equal((await db.collection("shops").doc("mer2").get()).data().approved, true);
  assert.equal((await call("/api/admin/shops/mer2", { method: "PATCH", body: { approved: "oui" }, as: "admin1" })).status, 400);
  const users = await call("/api/admin/users", { as: "admin1" });
  assert.ok(users.data.every(u => !("fcmTokens" in u)));
  assert.ok(users.data[0].createdAt >= users.data.at(-1).createdAt);
  assert.equal((await call("/api/admin/users/admin1", { method: "PATCH", body: { blocked: true }, as: "admin1" })).status, 400);
  assert.equal((await call("/api/admin/users/ghost", { method: "PATCH", body: { blocked: true }, as: "admin1" })).status, 404);
  assert.equal((await call("/api/admin/users/mer2", { method: "PATCH", body: { blocked: true }, as: "admin1" })).status, 200);
  assert.equal((await db.collection("shops").doc("mer2").get()).data().approved, false); // ses offres disparaissent
  assert.equal((await call("/api/me", { as: "mer2" })).status, 403);
  assert.equal((await call("/api/admin/users/mer2", { method: "PATCH", body: { blocked: false }, as: "admin1" })).status, 200);
});

test("Admin : vue d'ensemble, commandes et offres", async () => {
  const o = await call("/api/admin/overview", { as: "admin1" });
  assert.equal(o.status, 200);
  assert.deepEqual(Object.keys(o.data).sort(), ["byDay", "kpis", "pendingShops", "recentOrders", "recentUsers", "statusCounts", "topShops"]);
  assert.equal(o.data.byDay.length, 14);
  const orders = await call("/api/admin/orders", { as: "admin1" });
  assert.ok(orders.data.length > 0);
  assert.ok(orders.data.every(x => !("qrToken" in x) && !("paymentRef" in x) && "shopName" in x));
  const offers = await call("/api/admin/offers", { as: "admin1" });
  const c = offers.data.find(x => x.id === "off1");
  assert.equal(c.hasPhoto, true); assert.ok(!("photo" in c)); assert.equal(c.shopName, "Café Médina");
  assert.equal((await call("/api/admin/offers/off4", { method: "DELETE", as: "admin1" })).status, 200);
  assert.equal((await db.collection("offers").doc("off4").get()).exists, false);
});

test("GET /api/payments/webhook sans payment_ref : 400", async () => {
  assert.equal((await call("/api/payments/webhook")).status, 400);
});
