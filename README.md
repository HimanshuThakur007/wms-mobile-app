# WMS Mobile App (React Native & Expo)

A cross-platform (iOS & Android) mobile application built with **React Native**, **Expo SDK 52**, **TypeScript**, and **Expo Router**.

---

## 📱 Features

- **Cross-Platform**: 100% shared codebase optimized for both iOS and Android (dynamic safe area handling, keyboard avoidance, and platform-specific touch feedback).
- **Authentication**:
  - Secure login interface with inline validation.
  - Password visibility toggle.
  - 1-Click **Demo Lead Sign-In** for quick review.
  - Simulated biometric prompt (Face ID / Touch ID / Fingerprint).
  - Session state management via React Context (`AuthContext`).
- **Dashboard / Home Screen**:
  - Facility & Operator Header with unread alert badge and custom profile avatar.
  - Live search across SKU, batch, dock, and shipment IDs.
  - Dynamic filter chips (Inbound, Outbound, Audits, Alerts).
  - Live system status banner (docks active, AGVs online, sync status).
  - 4 Key KPI performance stat cards with positive/negative trend pills.
  - 4 Quick-Action tool cards (Barcode Scanner, Receive Stock, Order Picking, Cycle Count).
  - Interactive activity log stream with status badges and detail bottom-sheet modal.
  - Pull-to-refresh (`RefreshControl`).
  - Interactive Profile sheet with sign-out flow.

---

## 🚀 Getting Started

### 1. Start the Expo Development Server
```bash
npm start
```
or
```bash
npx expo start
```

### 2. Run on Target Platform
- **iOS Simulator**: Press `i` in the terminal or run:
  ```bash
  npm run ios
  ```
- **Android Emulator**: Press `a` in the terminal or run:
  ```bash
  npm run android
  ```
- **Physical Device (iPhone / Android)**:
  1. Install the **Expo Go** app from App Store or Google Play.
  2. Scan the QR code shown in your terminal with your camera (iOS) or the Expo Go app (Android).
- **Web Preview**:
  ```bash
  npm run web
  ```

---

## 📂 Project Structure

```
wms-app/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx          # Professional Login Screen
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab bar navigation
│   │   └── index.tsx          # Rich Home Dashboard
│   ├── _layout.tsx            # Root Layout with SafeArea & AuthProvider
│   ├── index.tsx              # Entry auth redirection router
│   └── +not-found.tsx         # 404 handler
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx     # Custom Button with loading, sizes & variants
│   │   │   ├── Input.tsx      # Custom Input with icons, toggle & error states
│   │   │   ├── Card.tsx       # Elevated container card
│   │   │   └── Badge.tsx      # Multi-state pill badges
│   │   └── home/
│   │       ├── StatCard.tsx   # Metric KPI cards
│   │       ├── QuickActionCard.tsx # Grid action cards
│   │       └── ActivityItem.tsx    # Feed log list item
│   ├── context/
│   │   └── AuthContext.tsx    # Auth state & session simulation
│   ├── constants/
│   │   ├── theme.ts           # Design tokens (colors, spacing, shadows)
│   │   └── mockData.ts        # Mock datasets
│   └── types/
│       └── index.ts           # TypeScript models
├── app.json
├── package.json
└── tsconfig.json
```
