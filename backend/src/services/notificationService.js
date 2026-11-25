// Notifications push (Firebase Cloud Messaging). Silencieuses en cas d'échec : une notification
// ratée ne doit jamais faire échouer la requête principale (paiement, retrait...).
import { messaging } from "../config/firebase.js";
import * as userModel from "../models/userModel.js";

export async function notify(uid, title, body) {
  try {
    const tokens = (await userModel.findById(uid))?.fcmTokens || [];
    if (!tokens.length) return;
    const r = await messaging().sendEachForMulticast({ tokens, notification: { title, body } });
    // jetons expirés ou désinstallés : on les retire du profil
    const dead = tokens.filter((_, i) => !r.responses[i].success && /not-registered|invalid-registration/.test(r.responses[i].error?.code || ""));
    if (dead.length) await userModel.removeFcmTokens(uid, dead);
  } catch (e) { console.error("FCM:", e.message); }
}
