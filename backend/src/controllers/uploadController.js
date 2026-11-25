// Contrôleur « photos » : enregistre la photo d'une offre comme fichier (au lieu de la stocker en base64 dans Firestore).
// Le navigateur redimensionne déjà l'image (720 px, JPEG) ; le serveur vérifie le type et la taille, puis l'écrit
// dans le dossier uploads/ servi en statique sur /uploads. L'offre ne garde que l'URL.
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { asyncHandler } from "../utils/http.js";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const MAX_BYTES = 600 * 1024; // une photo redimensionnée fait ~100-300 Ko
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
// Signatures binaires : on ne fait pas confiance au type annoncé seul.
const MAGIC = { jpg: (b) => b[0] === 0xff && b[1] === 0xd8, png: (b) => b[0] === 0x89 && b[1] === 0x50, webp: (b) => b.toString("ascii", 8, 12) === "WEBP" };

// POST /api/uploads  { data: "data:image/jpeg;base64,..." }  ->  201 { url }
export const uploadPhoto = asyncHandler(async (req, res) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(req.body?.data || "");
  if (!m) return res.status(400).json({ error: "Image invalide (JPEG, PNG ou WebP attendu)" });
  const ext = TYPES[m[1]], buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX_BYTES) return res.status(413).json({ error: "Photo trop lourde (600 Ko maximum)" });
  if (!MAGIC[ext](buf)) return res.status(400).json({ error: "Le contenu ne correspond pas à une image" });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${req.user.uid.replace(/[^\w-]/g, "").slice(0, 32)}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  const base = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  res.status(201).json({ url: `${base}/uploads/${name}` });
});
