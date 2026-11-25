// Paiement Konnect de bout en bout, contre un faux serveur Konnect local (aucun appel réseau externe).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer, client, seed, db } from "./helpers.mjs";

let call, konnect, initBodies = [];
const payments = {}; // paymentRef -> statut

before(async () => {
  konnect = http.createServer((req, res) => {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.headers["x-api-key"] !== "test-key") { res.statusCode = 401; return res.end("{}"); }
      if (req.method === "POST" && req.url === "/payments/init-payment") {
        const b = JSON.parse(body); initBodies.push(b);
        const paymentRef = `ref-${b.orderId}`; payments[paymentRef] = "pending";
        return res.end(JSON.stringify({ payUrl: `https://konnect.test/pay/${paymentRef}`, paymentRef }));
      }
      const m = /^\/payments\/(.+)$/.exec(req.url);
      if (req.method === "GET" && m) return res.end(JSON.stringify({ payment: { status: payments[m[1]] || "unknown" } }));
      res.statusCode = 404; res.end("{}");
    });
  });
  await new Promise(r => konnect.listen(4890, r));
  Object.assign(process.env, { PAYMENT_PROVIDER: "konnect", KONNECT_API_KEY: "test-key", KONNECT_WALLET_ID: "wallet-1",
    KONNECT_BASE: "http://localhost:4890", PUBLIC_API_URL: "http://localhost:4803" });
  await seed();
  call = client(await startServer(4803));
});
after(() => konnect.close());

test("Konnect : init-payment, webhook vérifié, une seule confirmation", async () => {
  const { data: { id } } = await call("/api/orders", { method: "POST", body: { offerId: "off1", quantity: 2 }, as: "stu1" });
  const p = await call(`/api/orders/${id}/pay`, { method: "POST", as: "stu1" });
  assert.equal(p.status, 200);
  assert.equal(p.data.payUrl, `https://konnect.test/pay/ref-${id}`);
  const sent = initBodies.at(-1);
  assert.equal(sent.amount, 2400); // 2 × 1,2 TND en millimes
  assert.equal(sent.receiverWalletId, "wallet-1");
  assert.equal(sent.webhook, "http://localhost:4803/api/payments/webhook");
  assert.equal((await db.collection("orders").doc(id).get()).data().paymentRef, `ref-${id}`);

  // le webhook ne fait pas confiance au paramètre : paiement encore « pending » chez Konnect -> rien ne change
  assert.equal((await call(`/api/payments/webhook?payment_ref=ref-${id}`)).status, 200);
  assert.equal((await db.collection("orders").doc(id).get()).data().status, "pending_payment");

  payments[`ref-${id}`] = "completed";
  await Promise.all([1, 2, 3].map(() => call(`/api/payments/webhook?payment_ref=ref-${id}`))); // Konnect peut rappeler plusieurs fois
  const o = (await db.collection("orders").doc(id).get()).data();
  assert.equal(o.status, "paid"); assert.match(o.qrToken, /^[0-9a-f]{32}$/);
  const qr = o.qrToken;
  await call(`/api/payments/webhook?payment_ref=ref-${id}`);
  assert.equal((await db.collection("orders").doc(id).get()).data().qrToken, qr); // QR inchangé
});

test("Konnect : mock-pay désactivé hors mode simulé", async () => {
  const { data: { id } } = await call("/api/orders", { method: "POST", body: { offerId: "off1", quantity: 1 }, as: "stu1" });
  assert.equal((await call(`/api/orders/${id}/mock-pay`, { method: "POST", as: "stu1" })).status, 404);
});
