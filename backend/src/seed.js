// Données de démo : 8 commerces et 48 offres. Idempotent (IDs fixes : relancer ne crée pas de doublons).
// Si photos.json existe (créé par « node src/fetch-photos.js »), les offres reçoivent leur photo réelle.
import fs from "fs";
import { db } from "./config/firebase.js";
import { CAMPUS, shops, offers } from "./catalog.js";

let photos = {};
try { photos = JSON.parse(fs.readFileSync(new URL("./photos.json", import.meta.url), "utf8")); } catch { /* pas encore de photos : les illustrations sont utilisées */ }

for (const [i, [name, address, phone, dLat, dLng, description]] of shops.entries()) {
  const id = `demo-shop-${i + 1}`;
  await db.collection("shops").doc(id).set({ name, address, phone, description, lat: +(CAMPUS.lat + dLat).toFixed(6), lng: +(CAMPUS.lng + dLng).toFixed(6), ownerId: id, approved: true, createdAt: Date.now() }, { merge: true });
}
let withPhoto = 0;
for (const [n, [shop, title, category, originalPrice, price, quantity, description]] of offers.entries()) {
  const [, , , , , , from, to] = shops[shop - 1], basket = category === "Panier surprise", ph = basket ? null : photos[title], photo = ph?.url || "";
  if (photo) withPhoto++;
  await db.collection("offers").doc(`demo-offer-${n + 1}`).set({ shopId: `demo-shop-${shop}`, title, category, originalPrice, price, quantity, description, photo,
    photoCredit: ph ? [ph.credit, ph.license].filter(Boolean).join(", ") : "", photoSource: ph?.source || "",
    pickupFrom: basket ? to : from, pickupTo: basket ? (to < "21:00" ? "21:30" : "22:30") : to, createdAt: Date.now() - (n % 9) * 5 * 3600e3 }, { merge: true });
}
console.log(`Seed terminé : ${shops.length} commerces, ${offers.length} offres, ${withPhoto} avec photo réelle.`);
process.exit(0);
