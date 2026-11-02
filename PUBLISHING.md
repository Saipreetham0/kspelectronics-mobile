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

## 3. Google Play listing and data safety
Every Play Console field (listing text, screenshots, content rating, data safety, app content, release notes, Hindi and Telugu listings, ASO) is in [docs/PLAY_STORE_LISTING.md](docs/PLAY_STORE_LISTING.md), ready to paste.

## 5. Production setup (once)
Everything below is switched on by a value in the EAS build environment (`eas env:create`, or `.env` for a local build). Nothing is sent until its value is set.
| Value | What it turns on |
|---|---|
| `EXPO_PUBLIC_API_URL` | The store's API. Production: `https://store.kspelectronics.in` (a `192.168...` address must never reach a release build) |
| `EXPO_PUBLIC_SENTRY_DSN` | Crash reports. Create a Sentry project (React Native), copy its DSN. Set it as an EAS environment variable, not in `eas.json`: a value there (even an empty one) overrides the dashboard. For readable stack traces also set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` and remove `SENTRY_DISABLE_AUTO_UPLOAD` from `eas.json` |
| `EXPO_PUBLIC_POSTHOG_KEY` (+ `EXPO_PUBLIC_POSTHOG_HOST` for the EU or a self-hosted server) | Analytics |
| `EAS_PROJECT_ID` | Run `npx eas init` once and add the id it prints to `app.json` under `extra.eas.projectId` (or set this value). It turns on over-the-air updates and push tokens |
| `GOOGLE_MAPS_ANDROID_KEY`, `GOOGLE_MAPS_IOS_KEY` | Maps. There is no key in the code any more: restrict each key in Google Cloud to this app's package name or bundle id |

Push also needs, outside the app: a Firebase project with an Android app `in.kspelectronics.app`; its `google-services.json` goes to EAS as a file env var (`eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret`, or the file in the project root for a local build), and its FCM V1 service-account key goes to EAS (`eas credentials` → Android → Push Notifications: FCM V1), an APNs key for iOS, and a store endpoint `POST /api/push/register` (body `{ token, platform }`) that saves the token against the customer, plus code that sends order-status messages to Expo's push API with `data: { url: '/order/<id>' }` so a tap opens the order.

Releases: `npm run check` (typecheck and tests) must pass; CI runs the same on every push. After `eas init`, ship a fix without a store review with `npx eas update --channel production --message "what changed"` (it reaches builds of the same app `version`).

## 6. After the first release
- Phone OTP login needs an SMS provider.
- Bump `version` in `app.json` for each store release; `versionCode` rises automatically (`autoIncrement`).

## 7. Store listing (ASO)
Every Play Console field (listing text, screenshots, content rating, data safety, app content, release notes, Hindi and Telugu listings, ASO) is in [docs/PLAY_STORE_LISTING.md](docs/PLAY_STORE_LISTING.md), ready to paste.
