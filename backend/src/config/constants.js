// Constantes et réglages de l'application (lus une seule fois au démarrage).
import "dotenv/config";

export const CATEGORIES = ["Viennoiserie", "Sandwich", "Plat", "Salade", "Dessert", "Boisson", "Autre", "Panier surprise"];
export const PENDING_MINUTES = 15;   // délai pour payer une réservation avant libération du stock
export const POINTS_PER_MEAL = 10;   // EcoPoints gagnés par repas récupéré
export const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "konnect"; // "konnect" ou "mock" (paiement simulé pour les tests)

// Origines autorisées (CORS) et adresse du frontend (redirections après paiement).
export const CLIENT_ORIGINS = (process.env.CLIENT_URL || "").split(",").map(s => s.trim()).filter(Boolean);
export const CLIENT_URL = CLIENT_ORIGINS[0] || "http://localhost:5173";

// Vérification de l'e-mail par code à 6 chiffres (valable 10 min, 5 essais, renvoi limité).
export const CODE_MINUTES = 10, RESEND_SECONDS = 45, MAX_SENDS_PER_HOUR = 5, MAX_TRIES = 5;
export const CODE_SECRET = process.env.CODE_SECRET || "campussave-dev-secret";
if (!process.env.CODE_SECRET && process.env.NODE_ENV === "production")
  console.warn("ATTENTION : CODE_SECRET n'est pas défini, un secret de développement est utilisé pour les codes de vérification.");

// Routes accessibles avant d'avoir vérifié son e-mail.
export const UNVERIFIED_ALLOWED = ["/api/me", "/api/verify/send", "/api/verify/confirm"];
