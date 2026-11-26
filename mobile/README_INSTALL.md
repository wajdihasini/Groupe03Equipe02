# CampusSave – Mobile Flutter App

## ⚡ Quick setup (5 steps)

### 1. Add dependencies
```powershell
cd C:\Users\WAJDI\CampusSave\mobile
flutter pub add firebase_core firebase_auth http shared_preferences qr_flutter
flutter pub get
```

### 2. Regenerate Firebase config (REQUIRED)
```powershell
flutterfire configure --project=campussave-d1a3f --platforms=android,web
```
This overwrites `lib/firebase_options.dart` with your real config.

### 3. Analyze
```powershell
flutter analyze
```
Expected: `No issues found!`

### 4. Run on Android emulator
```powershell
flutter devices
flutter run -d <EMULATOR_ID>
```

### 5. Run in browser (Chrome/Edge)
```powershell
flutter run -d chrome
```

### Backend connection

The API defaults to `http://localhost:4000` on Windows desktop and in Chrome/Edge,
and to `http://10.0.2.2:4000` on the Android emulator. Start the backend in
`C:\Users\WAJDI\CampusSave\backend` with `npm run dev` before opening profile,
orders, or dashboards. For a physical phone, pass your computer's LAN address:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000
```

Replace `192.168.1.10` with the computer's local network address.

---

## 🔑 Admin account

| Field    | Value                      |
|----------|----------------------------|
| Email    | `admin@campussave.tn`      |
| Password | *(create once via Register)* |

The app automatically assigns **Admin** role to this email.
Register with this email **once** using the Sign up screen.

---

## 👤 Role selection on sign up

- **Student** → browse offers, reserve, pay (simulated), QR code
- **Merchant** → pending approval by admin, then manage offers & orders

---

## 🏗️ Architecture

```
lib/
├── config/        # Theme, API config
├── models/        # Offer, Order, Payment, UserRole, MerchantInfo
├── repositories/  # Demo data (replace with API at step 7b)
├── services/      # Auth, Role, API client
├── utils/         # Validators, formatters, filters
├── widgets/       # Reusable UI components
└── screens/
    ├── auth/      # Login, Register (with role), Forgot password
    ├── student/   # Offers, Reservations, Payment, QR code
    ├── merchant/  # My offers (CRUD), Orders, Dashboard
    └── admin/     # Dashboard stats, Users, Merchant approval
```

---

## ⚠️ Demo mode

All data is in-memory and disappears on app restart.
Backend integration at step 7b (waiting for API contract).
