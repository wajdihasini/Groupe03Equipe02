// Modèle « commande » : accès à la collection orders.
// Les opérations qui touchent plusieurs documents (stock + commande, points + commande) sont faites
// dans des transactions Firestore pour rester cohérentes même quand plusieurs étudiants réservent en même temps.
import { db, FieldValue } from "../config/firebase.js";
import { listOf, withId, HttpError } from "../utils/http.js";
import * as offerModel from "./offerModel.js";
import * as shopModel from "./shopModel.js";
import * as userModel from "./userModel.js";

const orders = () => db.collection("orders");
export const ref = (id) => orders().doc(id);

export async function findById(id) {
  const snap = await ref(id).get();
  return snap.exists ? snap.data() : null;
}
export const findAll = async () => listOf(await orders().get());
export const findByStudent = async (uid) => listOf(await orders().where("studentId", "==", uid).get());
export const findByShop = async (shopId) => listOf(await orders().where("shopId", "==", shopId).get());
export const findByStatus = async (status) => listOf(await orders().where("status", "==", status).get());
export const findByStatuses = async (statuses) => listOf(await orders().where("status", "in", statuses).get());

async function findOneBy(field, value) {
  const q = await orders().where(field, "==", value).limit(1).get();
  return q.empty ? null : withId(q.docs[0]);
}
export const findByQrToken = (token) => findOneBy("qrToken", token);
export const findByPaymentRef = (paymentRef) => findOneBy("paymentRef", paymentRef);

export const update = (id, data) => ref(id).update(data);

// Réservation : vérifie l'offre, le commerce et le stock, décrémente le stock et crée la commande (atomique).
export async function reserve({ offerId, quantity, student, pendingMinutes }) {
  const orderRef = orders().doc();
  await db.runTransaction(async (t) => {
    const offerRef = offerModel.ref(offerId), offer = await t.get(offerRef);
    if (!offer.exists) throw new HttpError(400, "Offre introuvable");
    const shop = await t.get(shopModel.ref(offer.data().shopId));
    if (!shop.data()?.approved) throw new HttpError(400, "Commerce non disponible");
    if (offer.data().quantity < quantity) throw new HttpError(400, "Stock insuffisant");
    const { price, originalPrice, title, shopId } = offer.data();
    t.update(offerRef, { quantity: offer.data().quantity - quantity });
    t.set(orderRef, { offerId: offer.id, title, shopId, studentId: student.uid, studentName: student.name, quantity,
      total: +(price * quantity).toFixed(3), originalTotal: +(originalPrice * quantity).toFixed(3), status: "pending_payment",
      createdAt: Date.now(), expiresAt: Date.now() + pendingMinutes * 60000 });
  });
  return orderRef.id;
}

// Libère une réservation non payée (annulée ou expirée) : le stock est restitué à l'offre.
export function release(orderId, status) {
  return db.runTransaction(async (t) => {
    const oRef = ref(orderId), o = await t.get(oRef);
    if (!o.exists || o.data().status !== "pending_payment") return false;
    const offRef = offerModel.ref(o.data().offerId), off = await t.get(offRef);
    if (off.exists) t.update(offRef, { quantity: FieldValue.increment(o.data().quantity) });
    t.update(oRef, { status, releasedAt: Date.now() });
    return true;
  });
}

// Passe la commande en « payée » UNIQUEMENT si elle est encore en attente de paiement.
// Renvoie la commande, ou null si elle a déjà été payée/annulée entre-temps (évite deux QR codes pour un double clic).
export function markPaidIfPending(orderId, qrToken) {
  return db.runTransaction(async (t) => {
    const oRef = ref(orderId), o = await t.get(oRef);
    if (!o.exists || o.data().status !== "pending_payment") return null;
    t.update(oRef, { status: "paid", qrToken, paidAt: Date.now() });
    return o.data();
  });
}

// Retrait validé par le commerçant : commande « retirée » + EcoPoints crédités à l'étudiant (atomique).
export function collect(orderId, merchantId, pointsPerMeal) {
  return db.runTransaction(async (t) => {
    const oRef = ref(orderId), o = (await t.get(oRef)).data();
    if (o.shopId !== merchantId) return { code: 403, error: "Cette commande appartient à un autre commerce" };
    if (o.status !== "paid") return { code: 409, error: "Commande déjà retirée" };
    const points = o.quantity * pointsPerMeal;
    t.update(oRef, { status: "collected", collectedAt: Date.now() });
    t.set(userModel.ref(o.studentId), { ecoPoints: FieldValue.increment(points) }, { merge: true });
    return { o, points };
  });
}
