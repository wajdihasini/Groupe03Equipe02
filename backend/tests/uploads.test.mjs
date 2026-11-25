// Photos des offres enregistrées comme fichiers (POST /api/uploads, servies sur /uploads).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { startServer, client, seed } from "./helpers.mjs";

let call, base;
// Plus petit JPEG / PNG valides (signatures binaires correctes).
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const dataUrl = (type, buf) => `data:${type};base64,${buf.toString("base64")}`;

before(async () => { await seed(); base = await startServer(4805); call = client(base); });

test("POST /api/uploads : enregistre la photo et renvoie une URL servie par /uploads", async () => {
  const r = await call("/api/uploads", { method: "POST", body: { data: dataUrl("image/jpeg", JPEG) }, as: "mer1" });
  assert.equal(r.status, 201);
  assert.match(r.data.url, /^http:\/\/localhost:4805\/uploads\/mer1-[0-9a-f]{16}\.jpg$/);
  const img = await fetch(r.data.url);
  assert.equal(img.status, 200);
  assert.match(img.headers.get("content-type"), /image\/jpeg/);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), JPEG);
  // l'URL est acceptée comme photo d'offre
  const o = await call("/api/offers", { method: "POST", as: "mer1", body: { title: "Tarte", category: "Dessert", originalPrice: 6, price: 3, quantity: 4, pickupFrom: "10:00", pickupTo: "20:00", photo: r.data.url } });
  assert.equal(o.status, 201);
});

test("POST /api/uploads : refuse les fichiers qui ne sont pas des images ou trop lourds", async () => {
  assert.equal((await call("/api/uploads", { method: "POST", body: { data: "data:text/html;base64,PGgxPg==" }, as: "mer1" })).status, 400);
  assert.equal((await call("/api/uploads", { method: "POST", body: { data: dataUrl("image/png", Buffer.from("pas une image")) }, as: "mer1" })).status, 400); // type annoncé mensonger
  assert.equal((await call("/api/uploads", { method: "POST", body: {}, as: "mer1" })).status, 400);
  const big = Buffer.concat([JPEG, Buffer.alloc(650 * 1024)]);
  assert.equal((await call("/api/uploads", { method: "POST", body: { data: dataUrl("image/jpeg", big) }, as: "mer1" })).status, 413);
});

test("POST /api/uploads : réservé aux commerçants connectés", async () => {
  assert.equal((await call("/api/uploads", { method: "POST", body: { data: dataUrl("image/jpeg", JPEG) } })).status, 401);
  assert.equal((await call("/api/uploads", { method: "POST", body: { data: dataUrl("image/jpeg", JPEG) }, as: "stu1" })).status, 403);
});

test("GET /uploads/<inconnu> : 404 sans planter", async () => {
  assert.equal((await fetch(`${base}/uploads/inexistant.jpg`)).status, 404);
});
