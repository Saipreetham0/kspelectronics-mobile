# What the app expects from the store's API

Everything here is **optional**. The app works without any of it; each feature appears only when the store provides it. Where a feature needs a switch, it is a flag in `GET /api/app-config`.

All paths are on the store API (`EXPO_PUBLIC_API_URL`). Errors are `{ "error": "message shown to the shopper" }` with a 4xx/5xx status, as the existing routes do.

## `GET /api/app-config`: settings and switches
```json
{
  "minVersion": "1.2.0",
  "message": "Deliveries in Hyderabad may be 1 hour late today because of rain.",
  "flags": { "otp": true, "slots": true, "offers": true },
  "banners": [
    { "id": "diwali", "tag": "DIWALI SALE", "title": "Up to 30% off", "sub": "On 3D printers", "cta": "Shop now",
      "colors": ["#b45309", "#7c2d12"], "fg": "#ffffff", "category": "3d-printers-and-parts" }
  ]
}
```
- `minVersion`: apps older than this show "Please update" (with `message` as the text). Use it only when an old app would break.
- `message`: a notice bar above the app (not shown together with `minVersion`).
- `flags`: `otp`, `slots`, `offers` turn on the features below. Missing = off.
- `banners`: replace the Home banners (`category` is a category slug, or give `search`). Cache it at the edge: every launch reads it.

## Mobile-number (OTP) login: flag `otp`
- `POST /api/auth/otp/request` body `{ "phone": "9876543210" }` → `{ "retryAfter": 30 }` (seconds before another code may be asked for). Send a 6-digit code by SMS (MSG91, Twilio, etc.). Rate-limit per number and per IP; codes expire in 5-10 minutes; 5 wrong tries lock the code.
- `POST /api/auth/otp/verify` body `{ "phone": "9876543210", "code": "123456" }` → `{ "token": "<same login token /api/auth/login returns>" }`. Find the WooCommerce customer by billing phone, or create one for a new number.
- SMS format that lets Android offer the code automatically (Google's SMS code autofill): `<#> 123456 is your KSP Electronics code.` followed by the app hash; iOS offers it from any SMS that contains the code.

- Account deletion for these shoppers (they may have no password): `POST /api/auth/delete` also accepts `{ "phone": "9876543210", "code": "123456" }` in place of `{ "password": "..." }`.
  The app first asks for the code with the same `POST /api/auth/otp/request`. Accept it only when the request carries the login token **and** the phone is the signed-in customer's billing phone; check the code exactly as `/verify` does (expiry, 5-try lock), then delete as for a password.

## Delivery slots: flag `slots`
- `GET /api/delivery/slots?pincode=500001` →
```json
{ "slots": [
  { "id": "today-18-21", "label": "Today, 6-9 pm", "sub": "Free", "available": true },
  { "id": "tomorrow-9-12", "label": "Tomorrow, 9 am-12 pm", "available": true },
  { "id": "tomorrow-12-15", "label": "Tomorrow, 12-3 pm", "sub": "Fully booked", "available": false } ] }
```
  Return an empty list for a pincode without slots (the card is hidden). The first open window is pre-selected.
- The chosen `slot` (id) and `slotLabel` arrive inside `form` on `POST /api/checkout` and `POST /api/pay/razorpay/create`. Save them on the order (for example as order meta) and re-check availability there.

## Offers: flag `offers`
- `GET /api/offers` → `{ "offers": [ { "code": "WELCOME10", "title": "10% off your first order", "description": "Up to ₹500", "minOrder": 1500, "expires": "2026-12-31" } ] }`. "Apply" calls the existing `POST /api/cart/coupon`.

## Live rider on the map
Add to `GET /api/orders/<id>` (`delivery.live`) and `POST /api/track-order` (`live`):
```json
"live": { "status": "Out for delivery", "eta": "in about 12 minutes", "link": "https://...",
          "rider": { "name": "Ravi", "phone": "+919876543210", "lat": 17.4401, "lng": 78.3489, "updatedAt": "2026-10-29T10:15:00Z" },
          "drop": { "lat": 17.4501, "lng": 78.3601 }, "activities": [] }
```
When `rider` is present the order screen shows a map, the rider's name, a Call button and the ETA, and re-reads the order every 15 seconds until it is delivered. `drop` is the shopper's pinned location (`form.drop` from checkout). Shiprocket Quick returns the rider's position and phone for a tracked order.

## Push notifications
- `POST /api/push/register` body `{ "token": "ExponentPushToken[...]", "platform": "android" }` (logged-in shoppers carry their login token; guests are anonymous). Save the token against the customer.
- Send messages with Expo's push API (`https://exp.host/--/api/v2/push/send`): `{ "to": token, "title": "Out for delivery", "body": "Ravi is bringing order #1234", "channelId": "orders", "data": { "url": "/order/1234" } }`. A tap opens the in-app path in `data.url`. Needs an FCM key (Android) and an APNs key (iOS) added to EAS.
- Good moments to send: order placed, packed, out for delivery (with the ETA), delivered (with a "rate your items" line), refund processed, back-in-stock.

## Stock checks (nothing new)
The cart reads `GET /api/catalog/products?include=<ids>` and flags lines whose product has `is_in_stock: false`. Keep that field accurate.
