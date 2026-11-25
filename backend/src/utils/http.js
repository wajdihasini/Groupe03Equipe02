// Petits outils partagés par les contrôleurs.

// Erreur « métier » portant son code HTTP (ex. : new HttpError(400, "Stock insuffisant")).
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Enveloppe un contrôleur async : toute erreur est transmise au gestionnaire d'erreurs d'Express.
export const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Snapshot Firestore -> objet { id, ...données }.
export const withId = (doc) => ({ id: doc.id, ...doc.data() });
export const listOf = (snap) => snap.docs.map(withId);

// Tri : plus récents d'abord.
export const newest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);

// Date du jour à Tunis au format YYYY-MM-DD.
export const dayKey = (ts) => new Date(ts).toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" });

export const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
