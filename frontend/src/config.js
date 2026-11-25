// Réglages du site (modifiables sans toucher aux composants).
// Point de départ de la carte Campus Radar. À REMPLACER par les coordonnées exactes de l'ESSECT.
export const CAMPUS = { name: "Campus", lat: 36.8065, lng: 10.1815 };

// Niveaux EcoPoints : points minimum pour atteindre chaque niveau.
export const ECO_LEVELS = [
  { name: "Graine", min: 0, color: "#6366f1" },
  { name: "Pousse", min: 50, color: "#4f46e5" },
  { name: "Arbuste", min: 150, color: "#4338ca" },
  { name: "Arbre", min: 400, color: "#3730a3" },
  { name: "Forêt", min: 1000, color: "#312e81" },
];
export const ecoLevel = (points = 0) => {
  const i = ECO_LEVELS.reduce((acc, l, idx) => (points >= l.min ? idx : acc), 0);
  const cur = ECO_LEVELS[i], next = ECO_LEVELS[i + 1] || null;
  return { ...cur, next, progress: next ? (points - cur.min) / (next.min - cur.min) : 1, toNext: next ? next.min - points : 0 };
};

// Estimations INDICATIVES de l'impact d'un repas sauvé (à adapter ou à sourcer dans le rapport).
export const IMPACT = { kgPerMeal: 0.4, co2PerKg: 2.5 };

// Questions fréquentes (accueil et page « Comment ça marche »).
export const FAQ = [
  ["Combien de temps ai-je pour payer ma réservation ?", "Tu as 15 minutes après ta réservation. Passé ce délai, ou si tu annules depuis « Mes commandes », le stock est remis en vente pour les autres étudiants."],
  ["Comment récupérer ma commande ?", "Une fois le paiement confirmé, un QR code apparaît dans « Mes commandes ». Montre-le au commerçant pendant le créneau de retrait indiqué sur l'offre : il le scanne et valide ta commande."],
  ["Qu'est-ce qu'un panier surprise ?", "Le commerçant y met ses invendus du jour. Tu ne connais pas le contenu à l'avance, mais sa valeur annoncée est toujours supérieure au prix que tu paies."],
  ["À quoi servent les EcoPoints ?", "Chaque repas récupéré te rapporte 10 points par portion. Ils font monter ton niveau (de Graine à Forêt) et te placent dans le classement des étudiants."],
  ["Comment un commerce rejoint-il CampusSave ?", "Il crée un compte commerçant, puis l'administrateur valide son inscription. Il peut ensuite publier ses offres, suivre ses commandes et scanner les QR codes."],
];
