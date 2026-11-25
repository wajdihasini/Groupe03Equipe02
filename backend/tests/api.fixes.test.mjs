// Tests des corrections et des ajouts. Sur le server.js d'origine, ces tests échouaient (sauf mention).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, seed, db, sentMessages } from "./helpers.mjs";

let call;
before(async () => { await seed(); call = client(await startServer(4802)); });

test("Corps JSON mal formé : 400 avec message JSON (avant : 500 « Erreur serveur »)", async () => {
  const r = await call("/api/orders", { method: "POST", raw: "{offerId:", as: "stu1" });
  assert.equal(r.status, 400);
  assert.match(r.type, /json/); assert.ok(r.data.error);
});

test("Corps trop volumineux : 413 avec message JSON (avant : 500)", async () => {
  const r = await call("/api/offers", { method: "POST", raw: JSON.stringify({ photo: "x".repeat(1_200_000) }), as: "mer1" });
  assert.equal(r.status, 413); assert.ok(r.data.error);
});

test("Route inconnue : 404 en JSON (avant : page HTML « Cannot GET »)", async () => {
  const r = await call("/api/nexiste-pas");
  assert.equal(r.status, 404);
  assert.match(r.type, /json/); assert.equal(r.data.error, "Route introuvable");
});

test("PATCH /api/admin/shops/:id inconnu : 404 (avant : 500)", async () => {
  const r = await call("/api/admin/shops/ghost", { method: "PATCH", body: { approved: true }, as: "admin1" });
  assert.equal(r.status, 404); assert.equal(r.data.error, "Commerce introuvable");
});

test("PUT /api/shop sans fiche commerce : 404 (avant : 500)", async () => {
  await db.collection("users").doc("mer3").set({ name: "Sans Shop", email: "mer3@test.tn", role: "merchant", blocked: false, emailVerified: true, createdAt: Date.now() });
  const r = await call("/api/shop", { method: "PUT", body: { name: "Nouveau" }, as: "mer3" });
  assert.equal(r.status, 404); assert.equal(r.data.error, "Commerce introuvable");
});

test("Double clic sur « payer » (mode simulé) : une seule confirmation, un seul QR (avant : deux)", async () => {
  for (let round = 0; round < 5; round++) {
    const { data: { id } } = await call("/api/orders", { method: "POST", body: { offerId: "off1", quantity: 1 }, as: "stu1" });
    sentMessages.length = 0;
    const rs = await Promise.all([1, 2, 3].map(() => call(`/api/orders/${id}/mock-pay`, { method: "POST", as: "stu1" })));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 400, 400], `tour ${round}`);
    await new Promise(r => setTimeout(r, 50));
    assert.equal(sentMessages.filter(m => m.notification.title === "Paiement confirmé").length, 1);
  }
});

test("Ajout : GET /api/health (route documentée dans documentation/architecture.md)", async () => {
  const r = await call("/api/health");
  assert.equal(r.status, 200); assert.equal(r.data.ok, true); assert.ok(typeof r.data.uptime === "number");
});

test("Ajout : GET /api/shops/:id — page d'un restaurant avec ses offres disponibles", async () => {
  const r = await call("/api/shops/mer1");
  assert.equal(r.status, 200);
  assert.equal(r.data.name, "Café Médina"); assert.equal(r.data.id, "mer1");
  assert.deepEqual(r.data.offers.map(o => o.id).sort(), ["off1", "off2"]); // off4 épuisée : exclue
  assert.ok(r.data.offers.every(o => o.shopName === "Café Médina" && "sold" in o));
  assert.equal((await call("/api/shops/mer2")).status, 404); // commerce non validé
  assert.equal((await call("/api/shops/ghost")).status, 404);
});

test("GET /api/my/offers inclut « sold » (compteur de la page Mon commerce, avant : absent donc toujours 0)", async () => {
  const r = await call("/api/my/offers", { as: "mer1" });
  assert.equal(r.status, 200);
  assert.ok(r.data.every(o => typeof o.sold === "number"));
  assert.equal(r.data.find(o => o.id === "off1").sold, 5); // 5 commandes d'une portion payées dans le test « double clic »
});
