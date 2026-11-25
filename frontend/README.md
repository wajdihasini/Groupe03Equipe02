# CampusSave — web frontend (React + Vite)

The React web app for CampusSave. It talks to the CampusSave Node.js/Express backend (`VITE_API_URL`) and uses Firebase Authentication (plus optional Firebase Cloud Messaging for push notifications).

## Requirements
- Node.js 18 or newer
- The CampusSave backend running (by default on `http://localhost:4000`)

## Setup
```bash
cd frontend
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev               # http://localhost:5173
```

Production build:
```bash
npm run build             # output in dist/
npm run preview           # serves dist/ locally
```
When you deploy `dist/`, configure the host to send every unknown path to `index.html`, because routing happens in the browser (React Router).

## Environment variables (`.env`)
| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | yes | Backend URL, e.g. `http://localhost:4000` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | yes | Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_VAPID_KEY` | optional | Push notifications (FCM) |
| `VITE_CONTACT_EMAIL` | optional | Address used by the Contact page form |

`.env` is listed in `.gitignore`. Never commit it, and never put service-account keys in the frontend.

## Routes
| Path | Access | Page |
|---|---|---|
| `/` | public | Home |
| `/catalog` (`/offers`) | public | Offers: search, category, price, availability, distance, sorting |
| `/offer/:id` | public | Offer details and reservation |
| `/restaurant/:id` | public | Restaurant details and its current offers |
| `/radar` (`/restaurants`) | public | Map of partner restaurants |
| `/favorites` | public / student | Favourite offers and followed restaurants (stored in the browser) |
| `/impact` | public | Impact and EcoPoints |
| `/about`, `/faq`, `/contact`, `/partners` | public | Information pages |
| `/login` (`/register`, `/signup`) | public | Sign in, sign up, password reset |
| `/dashboard` | signed in | Student space, or statistics for merchants and admins |
| `/orders` (`/reservations`) | student, merchant | Reservations |
| `/shop` | merchant | Restaurant dashboard: offers, pickups, QR validation |
| `/profile` | signed in | Profile, password, restaurant info and map position |
| `/admin/*` | admin | Administration |

If you are signed out, protected pages send you to `/login?next=…` and bring you back after you sign in. If you are signed in with the wrong role, you see an "access restricted" page.

## Structure
```
src/
  api.js            Firebase init + api() helper for backend calls + push notifications
  config.js         Campus coordinates, EcoPoints levels, impact factors, FAQ, contact e-mail
  components/       Shared UI (ui.jsx), map (RadarMap), password field, useReserve hook
  pages/            One file per page
  styles.css        Design system and all page styles
```
