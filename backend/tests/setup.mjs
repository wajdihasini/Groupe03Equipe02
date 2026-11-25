// Chargé avant les tests (node --import ./tests/setup.mjs) : remplace « firebase-admin » par la doublure en mémoire
// et fixe un environnement de test (aucun e-mail réel, paiement simulé, port dédié).
import { registerHooks } from "node:module";

const fake = new URL("./fake-firebase-admin.mjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "firebase-admin") return { url: fake, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = (await import("node:path")).join((await import("node:os")).tmpdir(), "campussave-test-uploads"); // jamais backend/uploads
process.env.PUBLIC_API_URL = ""; // URL des photos construite à partir de la requête
process.env.PAYMENT_PROVIDER = "mock";
process.env.PORT = process.env.TEST_PORT || "4999";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.CODE_SECRET = "test-secret";
process.env.KONNECT_API_KEY = ""; // vide (et non absent) : dotenv ne le remplace pas par la valeur du .env
