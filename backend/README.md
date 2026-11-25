# CampusSave — Backend (API REST Express + Firebase)

API utilisée par le frontend React (`frontend/src/api.js`). Port par défaut : **4000**, préfixe **`/api`**.

## Lancer

```bash
cd backend
npm install
cp .env.example .env          # puis compléter ; serviceAccountKey.json à placer dans backend/ (jamais commité)
npm run dev                   # redémarre à chaque modification
npm test                      # 38 tests automatiques (aucun accès à la vraie base)
npm run seed                  # données de démo : 8 commerces, 48 offres
```

## Architecture MVC (Chapitre 1 du cours : Modèle – Vue – Contrôleur)

Le cours présente MVC comme une façon de *bien organiser son code source* et de *savoir quel rôle joue chaque fichier* :

| Rôle MVC | Dossier | Contenu |
|---|---|---|
| **Modèle** — « toutes les méthodes d'accès aux données (insert, delete, update, select) » | `src/models/` | `userModel`, `shopModel`, `offerModel`, `orderModel`, `emailCodeModel` : seuls ces fichiers lisent ou écrivent dans Firestore (y compris les transactions : réservation, annulation, paiement, retrait). |
| **Contrôleur** — « intermédiaire entre le modèle et la vue : demande les données au modèle, les analyse, prend les décisions » | `src/controllers/` | Une action par route : vérifie les droits, appelle le modèle, construit la réponse. |
| **Vue** — « l'affichage des données retournées par le modèle » | `frontend/` (React) | Le backend renvoie du JSON ; c'est le frontend React qui l'affiche. |
| Requête → contrôleur | `src/routes/index.js` | Table des URL : méthode + chemin → middlewares → action du contrôleur. |

Autres dossiers :

- `src/middlewares/` : authentification Firebase (`requireAuth`), rôles (`requireRole`), validation (`validate`), appartenance (`shopApproved`, `ownOffer`), erreurs (`notFound`, `errorHandler`).
- `src/validators/schemas.js` : règles de validation (zod) des formulaires envoyés par le frontend. Le serveur revérifie toujours ce que le client envoie (Chapitre 5 : les données d'un formulaire sont envoyées au serveur à la soumission).
- `src/services/` : briques techniques réutilisées par les contrôleurs (notifications FCM, catalogue enrichi, paiement Konnect, e-mails).
- `src/config/` : connexion Firebase et constantes.
- `src/app.js` : application Express ; `src/server.js` : démarrage + libération des réservations expirées (chaque minute).
- `tests/` : tests de l'API (voir plus bas).

## Routes

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/health` | public |
| GET | `/api/categories` | public |
| POST | `/api/users` | jeton Firebase (création du profil) |
| GET / PUT | `/api/me` | connecté |
| POST | `/api/me/fcm-token` | connecté |
| POST | `/api/verify/send` · `/api/verify/confirm` | connecté |
| PUT | `/api/shop` | commerçant |
| GET | `/api/offers` (`?q=&category=&maxPrice=`) · `/api/offers/:id` | public |
| POST | `/api/offers` | commerçant validé |
| PUT / DELETE | `/api/offers/:id` | commerçant propriétaire |
| GET | `/api/my/offers` | commerçant |
| POST | `/api/uploads` (`{ data: "data:image/jpeg;base64,…" }` → `{ url }`) | commerçant |
| GET | `/api/shops` · `/api/shops/:id` | public |
| GET | `/api/recommendations` | étudiant |
| GET | `/api/impact` | public |
| GET | `/api/leaderboard` · `/api/stats` | connecté |
| POST | `/api/orders` | étudiant |
| POST | `/api/orders/:id/cancel` · `/api/orders/:id/pay` · `/api/orders/:id/mock-pay` | étudiant |
| POST | `/api/orders/validate` | commerçant |
| GET | `/api/my/orders` | étudiant, commerçant |
| GET | `/api/payments/webhook` | Konnect |
| GET | `/api/admin/shops` · `/users` · `/overview` · `/orders` · `/offers` | admin |
| PATCH | `/api/admin/shops/:id` · `/api/admin/users/:id` | admin |
| DELETE | `/api/admin/offers/:id` | admin |

Photos des offres : enregistrées comme fichiers dans `backend/uploads/` (non commité) et servies sur `/uploads/…` ; l'offre ne garde que l'URL. Variables : `UPLOAD_DIR` (dossier, facultatif) et `PUBLIC_API_URL` (début des URL). Les anciennes photos intégrées en base64 restent affichées.

Photos des produits de démo : `node src/fetch-photos.js` (Wikimedia Commons, libre, relançable) remplit `src/photos.json`, puis `npm run seed` les applique.

Erreurs : toujours `{ "error": "message" }` (400 données invalides, 401 non connecté, 403 interdit, 404 introuvable, 409 conflit, 413 trop volumineux, 500 erreur serveur).

## Tests

`npm test` démarre l'API sur une base Firestore **en mémoire** (`tests/fake-firebase-admin.mjs`, branchée uniquement pendant les tests par `tests/setup.mjs`) : la vraie base n'est jamais touchée.

- `api.contract.test.mjs` : chaque route utilisée par le frontend, codes HTTP et forme des réponses. Écrits et validés sur l'ancien `server.js` avant la réorganisation : ils prouvent que le contrat avec le frontend n'a pas changé.
- `api.fixes.test.mjs` : corrections de bugs et nouvelles routes.
- `konnect.test.mjs` : paiement Konnect de bout en bout contre un faux serveur Konnect local.
