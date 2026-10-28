# KSP Electronics mobile app (Expo / React Native)

Customer app for the headless WooCommerce store. It talks only to the Next.js API in `../kspelectronics-store`, never to WooCommerce directly.

## Run
1. Start the API: `cd ../kspelectronics-store && pnpm dev` (port 3000).
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:
   - iOS simulator `http://localhost:3000`, Android emulator `http://10.0.2.2:3000`, real phone `http://<your-computer-LAN-IP>:3000`.
3. `npm install` then `npx expo start` (press `i`, `a`, or scan the QR code with Expo Go). `npx expo start --web --port 8081` gives a browser preview (the API allows that origin in development only).

## Screens
Home (location chip, categories, rows) · Categories rail + grid · Product (options, quantity) · Cart (coupon, free-shipping bar) · Checkout (delivery + billing address, live shipping, Razorpay or other methods) · Order success · My orders · Track order · Account (login / register).

## Notes
- Login token and cart token are kept in the OS keychain (`expo-secure-store`).
- Razorpay opens in a WebView (`app/pay.tsx`); the server verifies the payment before the order is marked paid.
- `src/checkoutForm.ts` mirrors the website's `lib/checkout-form.ts`; keep them in sync.
- Brand colours live in `src/theme.ts`.
