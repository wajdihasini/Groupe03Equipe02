import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const fb = getAuth(app);

export const CATEGORIES = ["Viennoiserie", "Sandwich", "Plat", "Salade", "Dessert", "Boisson", "Autre", "Panier surprise"]; // identique au backend

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// api("/chemin", { method, body }) -> renvoie directement les données JSON
export async function api(path, { method = "GET", body } = {}) {
  const token = fb.currentUser ? await fb.currentUser.getIdToken() : "";
  let r;
  try {
    r = await fetch(API_URL + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Impossible de joindre le serveur (${API_URL}). Vérifie que le backend tourne : cd backend && npm run dev`);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return d;
}

// ---- Notifications push (Firebase Cloud Messaging) ----
export const notificationsAvailable = () => "Notification" in window && "serviceWorker" in navigator && !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
let listening = false;
// ask=false : s'abonne seulement si la permission est déjà accordée ; ask=true : demande la permission (clic utilisateur).
export async function enableNotifications({ ask = false, onForeground } = {}) {
  try {
    if (!notificationsAvailable() || !(await isSupported()) || !fb.currentUser) return false;
    if (Notification.permission !== "granted") {
      if (!ask || (await Notification.requestPermission()) !== "granted") return false;
    }
    // le service worker ne lit pas import.meta.env : on lui passe la config dans l'URL
    const qs = new URLSearchParams({ apiKey: cfg.apiKey, projectId: cfg.projectId, messagingSenderId: cfg.messagingSenderId, appId: cfg.appId });
    const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) await api("/api/me/fcm-token", { method: "POST", body: { token } });
    if (!listening && onForeground) { listening = true; onMessage(messaging, p => onForeground(p.notification || {})); }
    return !!token;
  } catch (e) { console.warn("Notifications non activées :", e.message); return false; }
}
export default api;