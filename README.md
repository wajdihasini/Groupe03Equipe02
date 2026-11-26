# 🌿 CampusSave

**La plateforme anti-gaspillage alimentaire du campus.**
Les restaurants, cafétérias et boulangeries autour de l'ESSECT (Tunis) publient leurs invendus du jour à prix réduit ; les étudiants les réservent, paient en ligne et les récupèrent avec un QR code.

> Moins de gaspillage pour les commerces, des repas abordables pour les étudiants.

---

## ✨ Fonctionnalités

### 👩‍🎓 Étudiant
- Catalogue des offres : recherche, catégories, prix maximum, disponibilité (« retrait possible maintenant »), distance, tri
- Fiche produit, fiche restaurant et **Campus Radar** (carte des commerces partenaires)
- Réservation avec blocage du stock pendant **15 minutes**, puis paiement en ligne (Konnect sandbox ou mode simulé)
- **QR code** de retrait et suivi de la commande (réservée → payée → retirée)
- **EcoPoints** (10 points par repas sauvé), niveaux et classement
- Favoris, recommandations personnalisées, tableau de bord et impact environnemental

### 🏪 Commerçant
- Publication, modification, duplication et suppression des offres (photo, prix, quantité, créneau de retrait, paniers surprise)
- Aperçu de l'offre en direct pendant la saisie
- Suivi des commandes et **validation des retraits par scan du QR code**
- Statistiques de vente et position du commerce sur la carte

### 🛡️ Administrateur
- Validation et suspension des commerces, blocage des comptes
- Vue d'ensemble de la plateforme (indicateurs, graphiques), commandes, modération des offres, export CSV

### 🔐 Sécurité
- Authentification Firebase, vérification de l'adresse e-mail par code à 6 chiffres
- Contrôle des rôles côté serveur, validation de toutes les données reçues
- Réservations et paiements protégés par des transactions (pas de double paiement, pas de survente)

---

## 🧱 Architecture

```
CampusSave/
├── backend/          API REST Node.js / Express + Firebase Admin (Firestore)
│   ├── src/
│   │   ├── models/       Accès aux données Firestore (Modèle)
│   │   ├── controllers/  Logique de chaque route (Contrôleur)
│   │   ├── routes/       Table des URL de l'API
│   │   ├── middlewares/  Authentification, rôles, validation, erreurs
│   │   ├── services/     Notifications, paiement Konnect, e-mails, catalogue
│   │   ├── validators/   Schémas de validation (zod)
│   │   └── config/       Connexion Firebase et constantes
│   └── tests/        Tests automatiques de l'API
├── frontend/         Application web React + Vite (la « Vue »)
│   └── src/
│       ├── pages/        Une page par écran
│       ├── components/   Composants partagés (en-tête, cartes, carte…)
│       ├── api.js        Appels au backend + Firebase Auth
│       └── styles.css    Système de design
├── documentation/    Architecture, schéma Firestore, routes
├── rapport/          Plan du rapport
└── firestore.rules   Règles de sécurité Firestore
```

Le backend suit l'architecture **MVC** : les *modèles* accèdent aux données, les *contrôleurs* traitent chaque requête, et la *vue* est l'application React qui affiche les réponses JSON.

| Partie | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Leaflet (cartes), html5-qrcode, qrcode.react |
| Backend | Node.js, Express, Firebase Admin, zod, nodemailer |
| Données et services | Cloud Firestore, Firebase Auth, Firebase Cloud Messaging, Konnect (paiement) |

---

## 🚀 Installation

**Prérequis :** Node.js 18 ou plus récent, un projet Firebase (Authentication + Firestore).

### 1. Backend (port 4000)
```bash
cd backend
npm install
cp .env.example .env        # puis compléter les valeurs
npm run dev
```
Placer la clé de service Firebase dans `backend/serviceAccountKey.json` (Console Firebase → Paramètres du projet → Comptes de service).

### 2. Frontend (port 5173)
```bash
cd frontend
npm install
cp .env.example .env        # configuration web Firebase + URL du backend
npm run dev
```
Ouvrir **http://localhost:5173**.

### 3. Données de démonstration (facultatif)
```bash
cd backend
npm run seed                # 8 commerces et 48 offres avec photos
```

> ⚠️ Les fichiers `.env` et `serviceAccountKey.json` contiennent des secrets : ils sont exclus du dépôt par `.gitignore` et ne doivent **jamais** être commités.

---

## ⚙️ Variables d'environnement

### `backend/.env`
| Variable | Rôle |
|---|---|
| `PORT` | Port de l'API (4000 par défaut) |
| `CLIENT_URL` | Adresse du frontend (CORS et redirections après paiement) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Chemin de la clé de service Firebase |
| `PAYMENT_PROVIDER` | `mock` (paiement simulé) ou `konnect` |
| `KONNECT_API_KEY`, `KONNECT_WALLET_ID`, `KONNECT_BASE` | Paiement Konnect (sandbox) |
| `PUBLIC_API_URL` | Adresse publique de l'API (webhook Konnect, URL des photos) |
| `CODE_SECRET` | Secret de hachage des codes de vérification e-mail |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envoi des e-mails (sans SMTP, le code s'affiche dans le terminal) |

### `frontend/.env`
| Variable | Rôle |
|---|---|
| `VITE_API_URL` | URL du backend, ex. `http://localhost:4000` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Configuration web Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY` | Notifications push (facultatif) |
| `VITE_CONTACT_EMAIL` | Adresse de la page Contact (facultatif) |

---

## 🧪 Tests

```bash
cd backend
npm test
```
43 tests automatiques couvrent toutes les routes de l'API (inscription, offres, réservations, paiement, QR code, administration, envoi de photos). Ils s'exécutent sur une base Firestore **en mémoire** : la vraie base n'est jamais modifiée.

---

## 🔌 API

Préfixe `/api`, authentification par jeton Firebase (`Authorization: Bearer <token>`).
Principales routes : `/offers`, `/shops`, `/orders`, `/orders/:id/pay`, `/orders/validate`, `/me`, `/stats`, `/impact`, `/leaderboard`, `/uploads`, `/admin/*`.

La liste complète des routes et de leurs droits d'accès est détaillée dans [`backend/README.md`](backend/README.md).

---

## 👥 Équipe

Projet réalisé par le **Groupe 03 – Équipe 02**.
