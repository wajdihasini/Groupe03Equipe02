// Connexion à Firebase (Admin SDK) : Firestore (base de données), Auth et Cloud Messaging.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

// GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json est relatif au dossier backend/ :
// on le rend absolu pour que le serveur démarre aussi quand il est lancé depuis un autre dossier.
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (keyPath && !path.isAbsolute(keyPath)) {
  const absolute = path.resolve(backendDir, keyPath);
  if (fs.existsSync(absolute)) process.env.GOOGLE_APPLICATION_CREDENTIALS = absolute;
}

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });

export const db = admin.firestore();
export const auth = admin.auth();
export const messaging = () => admin.messaging();
export const FieldValue = admin.firestore.FieldValue;
