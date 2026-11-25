// Outils communs aux tests : démarrage du serveur, requêtes HTTP authentifiées, jeu de données.
import admin from "firebase-admin"; // résolu vers la doublure par tests/setup.mjs

export const { db, sentMessages } = admin.__fake;

export async function startServer(port) {
  process.env.PORT = String(port);
  await import("../src/server.js");
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(base + "/api/categories"); return base; } catch { await new Promise(r => setTimeout(r, 50)); }
  }
  throw new Error("Le serveur n'a pas démarré");
}

// Jeton de test reconnu par la doublure Auth.
export const token = (uid, email = `${uid}@test.tn`, authTime) => `test:${uid}:${email}${authTime ? `:${authTime}` : ""}`;

export function client(base) {
  return async function call(path, { method = "GET", body, as, raw, authTime } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (as) headers.Authorization = `Bearer ${token(as, undefined, authTime)}`;
    const r = await fetch(base + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined) });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data, type: r.headers.get("content-type") || "" };
  };
}

// Jeu de données : 1 admin, 2 étudiants, 2 commerçants (1 validé, 1 en attente), 3 offres.
export async function seed() {
  const now = Date.now();
  const users = {
    admin1: { name: "Ada Min", firstName: "Ada", lastName: "Min", email: "admin1@test.tn", role: "admin", blocked: false, createdAt: now - 5000 },
    stu1: { name: "Sami Ben", firstName: "Sami", lastName: "Ben", email: "stu1@test.tn", role: "student", blocked: false, emailVerified: true, createdAt: now - 4000, fcmTokens: ["tok-stu1-aaaaaaaaaaaaaaaaaaaa"] },
    stu2: { name: "Lina Tr", firstName: "Lina", lastName: "Tr", email: "stu2@test.tn", role: "student", blocked: false, emailVerified: true, createdAt: now - 3000 },
    mer1: { name: "Karim Ch", firstName: "Karim", lastName: "Ch", email: "mer1@test.tn", role: "merchant", blocked: false, emailVerified: true, createdAt: now - 2000 },
    mer2: { name: "Nour Pe", firstName: "Nour", lastName: "Pe", email: "mer2@test.tn", role: "merchant", blocked: false, emailVerified: true, createdAt: now - 1000 },
    unver: { name: "Uno Ver", firstName: "Uno", lastName: "Ver", email: "unver@test.tn", role: "student", blocked: false, emailVerified: false, createdAt: now },
    blk: { name: "Blo Ck", firstName: "Blo", lastName: "Ck", email: "blk@test.tn", role: "student", blocked: true, createdAt: now },
  };
  for (const [id, u] of Object.entries(users)) await db.collection("users").doc(id).set(u);
  await db.collection("shops").doc("mer1").set({ name: "Café Médina", address: "Rue ESSECT", phone: "71000001", description: "Café", ownerId: "mer1", approved: true, lat: 36.8, lng: 10.18, createdAt: now });
  await db.collection("shops").doc("mer2").set({ name: "Chez Nour", address: "Av. Bourguiba", phone: "71000002", description: "", ownerId: "mer2", approved: false, createdAt: now });
  const offer = (o) => ({ originalPrice: 10, price: 5, quantity: 5, pickupFrom: "00:00", pickupTo: "23:59", description: "", photo: "", createdAt: now, ...o });
  await db.collection("offers").doc("off1").set(offer({ shopId: "mer1", title: "Croissant", category: "Viennoiserie", price: 1.2, originalPrice: 2.5, quantity: 10, photo: "https://x.test/c.jpg" }));
  await db.collection("offers").doc("off2").set(offer({ shopId: "mer1", title: "Couscous", category: "Plat", price: 7, originalPrice: 14, quantity: 2 }));
  await db.collection("offers").doc("off3").set(offer({ shopId: "mer2", title: "Salade cachée", category: "Salade" })); // commerce non validé
  await db.collection("offers").doc("off4").set(offer({ shopId: "mer1", title: "Épuisé", category: "Dessert", quantity: 0 }));
}

export async function outbox() {
  for (const p of ["../src/services/mailer.js", "../src/mailer.js"]) {
    try { return (await import(p)).outbox; } catch { /* chemin suivant */ }
  }
  throw new Error("mailer introuvable");
}
