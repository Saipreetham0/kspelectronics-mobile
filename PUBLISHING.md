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
| Crash logs and diagnostics | Not collected today | n/a | n/a |
- Data is encrypted in transit (https). Users can request deletion in the app (Account > Profile and security > Delete my account).

## 5. After the first release
- Add crash reporting (Sentry) and analytics before a large launch.
- Push notifications and phone OTP login need accounts of their own (Firebase or Expo push, an SMS provider).
- Bump `version` in `app.json` for each release; `versionCode` rises automatically (`autoIncrement`).
