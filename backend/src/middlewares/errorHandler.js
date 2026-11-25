// Fin de chaîne Express : route inconnue (404) et gestion centralisée des erreurs.
// Le frontend lit toujours { error } : on répond donc en JSON, jamais avec une page HTML.

export const notFound = (req, res) => res.status(404).json({ error: "Route introuvable" });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Requête invalide : JSON mal formé" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Requête trop volumineuse (photo trop lourde ?)" });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message }); // erreurs métier (HttpError)
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
}
