// Contrôleur « commandes » : réservation, annulation, historique, retrait par QR code.
import { PENDING_MINUTES, POINTS_PER_MEAL } from "../config/constants.js";
import { asyncHandler } from "../utils/http.js";
import { notify } from "../services/notificationService.js";
import * as orderModel from "../models/orderModel.js";
import * as offerModel from "../models/offerModel.js";

// POST /api/orders — réserve une offre (stock décrémenté de façon atomique).
// Les erreurs métier (stock, offre introuvable...) donnent un 400 via le gestionnaire d'erreurs.
export const reserve = asyncHandler(async (req, res) => {
  const id = await orderModel.reserve({ offerId: req.body.offerId, quantity: req.body.quantity, student: req.user, pendingMinutes: PENDING_MINUTES });
  res.status(201).json({ id });
});

// POST /api/orders/:id/cancel — annule une réservation non payée (stock restitué).
export const cancel = asyncHandler(async (req, res) => {
  const order = await orderModel.findById(req.params.id);
  if (!order || order.studentId !== req.user.uid) return res.status(404).json({ error: "Commande introuvable" });
  (await orderModel.release(req.params.id, "cancelled"))
    ? res.json({ ok: true })
    : res.status(400).json({ error: "Cette commande ne peut plus être annulée" });
});

// GET /api/my/orders — commandes de l'étudiant, ou reçues par le commerçant (sans le QR).
export const mine = asyncHandler(async (req, res) => {
  const merchant = req.user.role === "merchant";
  const orders = merchant ? await orderModel.findByShop(req.user.uid) : await orderModel.findByStudent(req.user.uid);
  res.json(orders.map(o => { if (merchant) delete o.qrToken; return o; }).sort((a, b) => b.createdAt - a.createdAt));
});

// POST /api/orders/validate — le commerçant scanne le QR : commande retirée + EcoPoints.
export const validateQr = asyncHandler(async (req, res) => {
  const order = await orderModel.findByQrToken(req.body.token);
  if (!order) return res.status(404).json({ error: "QR code invalide" });
  const r = await orderModel.collect(order.id, req.user.uid, POINTS_PER_MEAL);
  if (r.error) return res.status(r.code).json({ error: r.error });
  notify(r.o.studentId, "Commande retirée", `Merci ! +${r.points} EcoPoints pour « ${r.o.title} ».`);
  const offer = await offerModel.findById(r.o.offerId);
  const hm = new Date().toLocaleTimeString("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  res.json({ ok: true, title: r.o.title, quantity: r.o.quantity, studentName: r.o.studentName || "", points: r.points,
    outsideSlot: !!offer && (hm < offer.pickupFrom || hm > offer.pickupTo), slot: offer ? `${offer.pickupFrom}–${offer.pickupTo}` : "" });
});

// Tâche de fond (toutes les minutes) : libère les réservations non payées dans les délais.
export async function expirePending() {
  try {
    for (const o of await orderModel.findByStatus("pending_payment"))
      if ((o.expiresAt || 0) < Date.now()) await orderModel.release(o.id, "expired");
  } catch (e) { console.error("expirePending:", e.message); }
}
