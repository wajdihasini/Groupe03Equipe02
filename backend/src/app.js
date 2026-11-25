// Application Express : middlewares globaux, routes de l'API, puis gestion des erreurs.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { CLIENT_ORIGINS } from "./config/constants.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { UPLOAD_DIR } from "./controllers/uploadController.js";

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS.length ? CLIENT_ORIGINS : true }));
app.use(express.json({ limit: "1mb" })); // 1 Mo : photos redimensionnées envoyées en base64
// Photos des offres (fichiers) : mises en cache 7 jours, noms uniques donc jamais modifiés.
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true, fallthrough: true, index: false }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
