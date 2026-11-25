// Passerelle de paiement Konnect (mode sandbox). Seuls les appels HTTP vers Konnect sont ici.
import { PENDING_MINUTES, CLIENT_URL } from "../config/constants.js";

export const konnectConfigured = () => !!process.env.KONNECT_API_KEY;

// Crée un paiement Konnect et renvoie { payUrl, paymentRef } (payUrl absent en cas d'échec).
export async function initPayment({ orderId, order, user }) {
  const r = await fetch(`${process.env.KONNECT_BASE}/payments/init-payment`, {
    method: "POST", headers: { "x-api-key": process.env.KONNECT_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ receiverWalletId: process.env.KONNECT_WALLET_ID, amount: Math.round(order.total * 1000), token: "TND",
      orderId, firstName: user.name, email: user.email, lifespan: PENDING_MINUTES,
      webhook: `${process.env.PUBLIC_API_URL}/api/payments/webhook`, successUrl: `${CLIENT_URL}/orders`, failUrl: `${CLIENT_URL}/orders` }),
  });
  return r.json();
}

// Interroge Konnect sur l'état réel d'un paiement (le webhook ne fait pas confiance à son paramètre).
export async function getPayment(paymentRef) {
  const r = await fetch(`${process.env.KONNECT_BASE}/payments/${paymentRef}`, { headers: { "x-api-key": process.env.KONNECT_API_KEY } });
  return (await r.json()).payment;
}
