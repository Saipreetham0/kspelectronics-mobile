# KSP Electronics — Mobile App

> Customer-facing React Native (Expo) app for [kspelectronics.in](https://kspelectronics.in) — 3D printers, Raspberry Pi, Arduino, ESP32, sensors and electronics delivered across India.

The app communicates **only with the Next.js API** (`kspelectronics-store`), never directly with WooCommerce.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 58) + [React Native](https://reactnative.dev) 0.88 |
| Language | TypeScript 6 |
| Navigation | [Expo Router](https://expo.github.io/router) (file-based) |
| UI / Icons | [Phosphor Icons](https://phosphoricons.com) · `@expo/vector-icons` |
| Fonts | Inter (via `@expo-google-fonts/inter`) |
| Payments | Razorpay (WebView) |
| Maps | `react-native-maps` + Expo Location |
| Secure Storage | `expo-secure-store` (OS keychain) |
| Network | Fetch API via `src/api.ts` with offline fallback banner |
| Builds | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
├── (tabs)/             # Bottom-tab navigator
│   ├── index.tsx       # Home — banners, categories, product rows
│   ├── shop.tsx        # Browse / search with filter sheet
│   ├── cart.tsx        # Cart (coupon, free-shipping bar)
│   ├── reorder.tsx     # Quick reorder from past orders
│   └── account.tsx     # Login / register / profile
├── product/[slug].tsx  # Product detail (variants, quantity, add-to-cart)
├── checkout.tsx        # Checkout (addresses, live shipping, payment)
├── pay.tsx             # Razorpay WebView payment screen
├── order/[id].tsx      # Order detail
├── orders.tsx          # My orders list
├── order-success.tsx   # Post-payment success screen
├── order-failed.tsx    # Payment failure screen
├── track.tsx           # Order tracking
├── wishlist.tsx        # Saved wishlist
├── profile.tsx         # Edit profile
└── help.tsx            # Help & support

src/
├── components/         # Reusable UI components
│   ├── ProductCard.tsx
│   ├── BannerCarousel.tsx
│   ├── CartBar.tsx
│   ├── FilterSheet.tsx
│   ├── LocationSheet.tsx
│   ├── MapPicker.tsx   # Native map picker (web shim included)
│   ├── Skeleton.tsx
│   ├── OfflineBanner.tsx
│   └── ...
├── api.ts              # Typed fetch wrapper (primary + backup URL)
├── store.tsx           # Global state (cart, auth token)
├── theme.ts            # Brand colours & spacing
├── types.ts            # Shared TypeScript types
├── checkoutForm.ts     # Checkout logic (mirrors website's lib/checkout-form.ts)
├── format.ts           # Price, date, weight formatters
├── location.ts         # Pincode / GPS helpers
├── storage.ts          # Secure-store wrappers
└── useFetch.ts         # Data-fetching hook

assets/                 # App icons, splash screen, logos
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- iOS Simulator (macOS + Xcode) or Android Emulator / physical device with [Expo Go](https://expo.dev/go)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Saipreetham0/kspelectronics-mobile.git
cd kspelectronics-mobile

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` based on your environment:

| Target | Value |
|---|---|
| Production | `https://store.kspelectronics.in` |
| iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Physical Device | `http://<your-LAN-IP>:3000` |

### Run

```bash
# Start API first (separate terminal)
cd ../kspelectronics-store && pnpm dev   # runs on port 3000

# Start Expo dev server
npx expo start

# Platform shortcuts
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
npx expo start --web --port 8081  # Browser preview (dev CORS enabled)
```

Press `i` for iOS, `a` for Android, or scan the QR code with **Expo Go**.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) |
| `npm run doctor` | Run `expo-doctor` for environment diagnostics |
| `npm run build:preview` | EAS build — Android APK (internal preview) |
| `npm run build:prod` | EAS build — Android AAB (production) |

---

## Screens & Features

| Screen | Features |
|---|---|
| **Home** | Location chip, banner carousel, category rail, product rows |
| **Shop** | Search, category filter, sort, product grid |
| **Product** | Images, variants/options, quantity selector, notify-me, reviews |
| **Cart** | Item list, coupon code, free-shipping progress bar |
| **Checkout** | Delivery & billing address, live shipping rates, Razorpay / other methods |
| **Payment** | Razorpay WebView; server verifies signature before marking order paid |
| **Orders** | Order history list + detail view |
| **Track** | Real-time order tracking |
| **Wishlist** | Save & manage favourite products |
| **Account** | Login, register, profile edit |
| **Help** | Support & FAQs |

---

## Deep Linking

Android intent filters are configured for `kspelectronics.in`:

| Path prefix | Opens |
|---|---|
| `/product/*` | Product detail screen |
| `/shop` | Shop / browse screen |
| `/cart` | Cart screen |

iOS Universal Links are configured via `associatedDomains: applinks:kspelectronics.in`.

---

## Building for Production (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Android APK (internal testing)
npm run build:preview

# Android App Bundle (Google Play)
npm run build:prod
```

Build profiles are defined in [`eas.json`](./eas.json).

---

## Key Implementation Notes

- **Auth & Cart tokens** are stored in the OS keychain via `expo-secure-store` — never in AsyncStorage.
- **Payments** open Razorpay in a WebView (`app/pay.tsx`); the Next.js API verifies the payment signature before marking the order as paid.
- **Checkout logic** in `src/checkoutForm.ts` mirrors the website's `lib/checkout-form.ts` — keep them in sync when either changes.
- **Offline support** — `OfflineBanner` component detects connectivity via `@react-native-community/netinfo`; read requests retry against `EXPO_PUBLIC_API_URL_BACKUP` when the primary URL fails.
- **Brand colours & spacing** live in `src/theme.ts`.
- **Map picker** has a native implementation (`MapPicker.tsx`) and a web shim (`MapPicker.web.tsx`) for browser preview.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Base URL of the Next.js API |
| `EXPO_PUBLIC_API_URL_BACKUP` | ❌ | Fallback API URL for read requests |

---

## License

Private — © KSP Electronics. All rights reserved.
