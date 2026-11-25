// Valide req.body avec un schéma zod : 400 avec la liste des erreurs, sinon req.body = données nettoyées.
export const validate = (schema) => (req, res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ error: r.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ") });
  req.body = r.data;
  next();
};
