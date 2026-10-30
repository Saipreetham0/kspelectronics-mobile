# Publishing the KSP Electronics app

Everything below that can be done in code is done. What is left needs your accounts or your decisions, and is marked **You**.

## 0. Before the first build (You)
1. **API Endpoint:** Configured to `https://store.kspelectronics.in` in `eas.json` and `.env`.
2. **Rotate keys if exposed** (WooCommerce key/secret, revalidate secret, Razorpay secret) before going live to real customers.
3. **Razorpay:** Live keys on the server (`store.kspelectronics.in`), and webhook configured at `/api/checkout/razorpay/webhook` (events `order.paid` and `payment.captured`).
4. **Accounts:** Expo account (free), Google Play Console (one-time US$25), Apple Developer Program (US$99/yr) for iOS.

## 1. Build (You run these)
```
npm install -g eas-cli
eas login
eas init                       # links the project, adds extra.eas.projectId to app.json
eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <the key> --environment production --visibility sensitive
eas env:create --name GOOGLE_MAPS_IOS_KEY --value <the key> --environment production --visibility sensitive   # iPhone builds only
eas build --platform android --profile preview      # an APK to test on real phones first
eas build --platform android --profile production   # the .aab for Google Play
```
EAS creates and keeps the signing key. After the first build run `eas credentials`, copy the **SHA-1** of the upload key, and add it (with package `in.kspelectronics.app`) to the Android Maps key in Google Cloud. After Google Play re-signs the app, add the **Play app-signing SHA-1** from Play Console > Setup > App signing as well, or the map will be blank for customers.

The `.easignore` file keeps `.env` (which holds server secrets on this machine) from being uploaded. Do not remove it.

## 2. Test the preview APK on real phones
- Sign up, log in, forgot password, delete account.
- Search, add to cart, change quantity, coupon, free-shipping bar.
- Location: GPS, search, map pin (the map must show tiles), saved address.
- Checkout as a guest and logged in: GST invoice, Razorpay UPI and card, cash on delivery, Velocity One BNPL, a failed payment, a cancelled payment.
- Order details, cancel, return request, track order, order again.
- Poor network and offline banner, rotate the phone, large font size.

## 3. Google Play listing
- **Name:** KSP Electronics
- **Short description (80):** 3D printers, Raspberry Pi, Arduino, ESP32 and electronics, delivered across India.
- **Full description:** Shop 3D printers and filaments (Bambu Lab, Creality and more), Raspberry Pi, Arduino and ESP32 boards, sensors, engineering project kits and tools from KSP Electronics, Hyderabad. Same-day delivery in Hyderabad and delivery across India. Prices include GST, pay by UPI, cards, netbanking or cash on delivery, and get a GST invoice for your business. Track orders, reorder in one tap, and get help on WhatsApp.
- **Category:** Shopping. **Contact email:** sales@kspelectronics.in. **Website:** https://kspelectronics.in
- **Privacy policy URL:** https://kspelectronics.in/privacy-policy/
- **Account deletion URL (Play requires a web page):** a page on the website that explains how to delete an account, for example a section on `/contact/`. Create it before submitting.
- **Assets (You):** 512x512 icon (use `assets/icon.png` resized), a 1024x500 feature graphic, at least 4 phone screenshots (Home, Categories, Product, Cart, Checkout).
- **Content rating:** answer the questionnaire as a shopping app with no user-generated content that others can see. Reviews are moderated before they show.
- **Target audience:** 18 and over.

## 4. Data safety form (what the app collects)
| Data | Collected | Why | Shared with |
|---|---|---|---|
| Name, email, phone, address | Yes | Orders, delivery, account | Delivery partners, payment processor |
| Approximate and precise location | Yes, only when you tap "Use current location" | Find your pincode and the delivery spot | Not shared |
| Purchase history | Yes | Orders, reorder | Not shared |
| Payment info | Not stored by the app: handled by Razorpay | Payment | Razorpay |
| App activity (searches) | Only on the phone (recent searches) | Convenience | Not shared |
| Crash logs and diagnostics | Yes, if `EXPO_PUBLIC_SENTRY_DSN` is set (no name, email or address attached) | App stability | Sentry |
| App activity (screens viewed, add to cart, checkout started, search used) | Yes, if `EXPO_PUBLIC_POSTHOG_KEY` is set. Anonymous per-install id, no personal data | Improving the app | PostHog |
| Push notification token | Yes, if the shopper allows notifications | Order updates | Expo push service |
| Device or other IDs | The anonymous analytics id above | Analytics | PostHog |
- Data is encrypted in transit (https). Users can request deletion in the app (Account > Profile and security > Delete my account).

## 5. Production setup (once)
Everything below is switched on by a value in the EAS build environment (`eas env:create`, or `.env` for a local build). Nothing is sent until its value is set.
| Value | What it turns on |
|---|---|
| `EXPO_PUBLIC_API_URL` | The store's API. Production: `https://store.kspelectronics.in` (a `192.168...` address must never reach a release build) |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash reports. Create a Sentry project (React Native), copy its DSN. For readable stack traces also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` and remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json` |
| `EXPO_PUBLIC_POSTHOG_KEY` (+ `EXPO_PUBLIC_POSTHOG_HOST` for the EU or a self-hosted server) | Analytics |
| `EAS_PROJECT_ID` | Run `npx eas init` once and add the id it prints to `app.json` under `extra.eas.projectId` (or set this value). It turns on over-the-air updates and push tokens |
| `GOOGLE_MAPS_ANDROID_KEY`, `GOOGLE_MAPS_IOS_KEY` | Maps. There is no key in the code any more: restrict each key in Google Cloud to this app's package name or bundle id |

Push also needs, outside the app: an FCM (Firebase) key uploaded to EAS for Android (`eas credentials`), an APNs key for iOS, and a store endpoint `POST /api/push/register` (body `{ token, platform }`) that saves the token against the customer, plus code that sends order-status messages to Expo's push API with `data: { url: '/order/<id>' }` so a tap opens the order.

Releases: `npm run check` (typecheck and tests) must pass; CI runs the same on every push. After `eas init`, ship a fix without a store review with `npx eas update --channel production --message "what changed"` (it reaches builds of the same app `version`).

## 6. After the first release
- Phone OTP login needs an SMS provider.
- Bump `version` in `app.json` for each store release; `versionCode` rises automatically (`autoIncrement`).

## 7. App Store / Play Store listing (ASO)
- **Title (30 characters):** `KSP Electronics: Maker Store` . **Subtitle (iOS, 30):** `3D printers, Pi, Arduino, ESP32`.
- **Keywords (iOS, 100 characters, no spaces after commas):** `raspberry pi,arduino,esp32,3d printer,filament,bambu lab,sensors,electronics,components,maker,diy kit,hyderabad`
- **First two lines of the description matter most** (they show before "more"): "Shop 3D printers, Raspberry Pi, Arduino, ESP32 and electronic components. Same-day delivery in Hyderabad, GST invoice, UPI and COD."
- **Screenshots (5-8, portrait):** 1 Home with categories, 2 a product page with price and "Add", 3 cart with the savings line, 4 checkout with UPI, 5 live order tracking, 6 Order again, 7 search suggestions. Put a short headline on each ("Same-day in Hyderabad", "Prices include GST", "Track your rider live"). Use real products, no placeholder text.
- **Preview video (15-30 s):** open the app, search "Raspberry Pi", add to cart, check out with UPI, show the order screen. No audio needed.
- **Ratings:** the app asks for a store rating only after a 4-5 star review of a product, at most every 90 days. Reply to every review in the console.
- **Localised listings:** add Hindi and Telugu listing text in the consoles even though the app itself is English-only for now.
- **After launch:** watch search terms in Play Console / App Store Connect and move the ones people use into the title, keywords and first lines.
