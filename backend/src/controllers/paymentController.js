// Contrôleur « paiement » : Konnect (sandbox) ou mode simulé (PAYMENT_PROVIDER=mock).
import crypto from "crypto";
import { PAYMENT_PROVIDER, CLIENT_URL } from "../config/constants.js";
import { asyncHandler } from "../utils/http.js";
import { notify } from "../services/notificationService.js";
import * as paymentService from "../services/paymentService.js";
import * as orderModel from "../models/orderModel.js";

// Passe une commande en « payée » (une seule fois), génère le QR et notifie l'étudiant et le commerçant.
// Renvoie false si la commande n'était plus en attente de paiement.
async function markPaid(orderId) {
  const o = await orderModel.markPaidIfPending(orderId, crypto.randomBytes(16).toString("hex"));
  if (!o) return false;
  notify(o.studentId, "Paiement confirmé", `Votre commande « ${o.title} » est prête : présentez votre QR code.`);
  notify(o.shopId, "Nouvelle commande payée", `${o.studentName || "Un étudiant"} : ${o.title} × ${o.quantity}`);
  return true;
}

// Commande de l'étudiant connecté, encore payable ; sinon répond directement l'erreur et renvoie null.
async function payableOrder(req, res) {
  const o = await orderModel.findById(req.params.id);
  if (!o || o.studentId !== req.user.uid || o.status !== "pending_payment") { res.status(400).json({ error: "Commande non payable" }); return null; }
  if ((o.expiresAt || 0) < Date.now()) {
    await orderModel.release(req.params.id, "expired");
    res.status(400).json({ error: "Réservation expirée, le stock a été libéré" });
    return null;
  }
  return o;
}

// POST /api/orders/:id/pay — renvoie l'URL de paiement.
export const pay = asyncHandler(async (req, res) => {
  const o = await payableOrder(req, res);
  if (!o) return;
  if (PAYMENT_PROVIDER === "mock") return res.json({ payUrl: `${CLIENT_URL}/pay/${req.params.id}` });
  if (!paymentService.konnectConfigured()) return res.status(503).json({ error: "Konnect non configuré (KONNECT_API_KEY manquante)" });
  const d = await paymentService.initPayment({ orderId: req.params.id, order: o, user: req.user });
  if (!d.payUrl) return res.status(502).json({ error: "Échec Konnect" });
  await orderModel.update(req.params.id, { paymentRef: d.paymentRef });
  res.json({ payUrl: d.payUrl });
});

// POST /api/orders/:id/mock-pay — confirmation du paiement simulé (désactivée hors mode "mock").
export const mockPay = asyncHandler(async (req, res) => {
  if (PAYMENT_PROVIDER !== "mock") return res.status(404).json({ error: "Paiement simulé désactivé" });
  if (!(await payableOrder(req, res))) return;
  (await markPaid(req.params.id)) ? res.json({ ok: true }) : res.status(400).json({ error: "Commande non payable" });
});

// GET /api/payments/webhook?payment_ref= — appelé par Konnect ; on revérifie le statut auprès de Konnect.
export const webhook = asyncHandler(async (req, res) => {
  const { payment_ref } = req.query;
  if (!payment_ref) return res.sendStatus(400);
  const p = await paymentService.getPayment(payment_ref);
  if (p?.status !== "completed") return res.sendStatus(200);
  const order = await orderModel.findByPaymentRef(payment_ref);
  if (order) await markPaid(order.id); // sans effet si déjà payée
  res.sendStatus(200);
});
