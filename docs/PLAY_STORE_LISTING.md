# Google Play Console: everything to paste

Package `in.kspelectronics.app` · version `1.0.0` · category **Shopping** · India only.
Each text block below is ready to paste into the field named above it, and fits Play's limit (checked with
`python3 store-assets/check_listing.py`).

## Blockers to clear before you submit

| # | What | Status | Fix |
|---|---|---|---|
| 1 | **Account deletion page** (Play requires a public URL) | `https://kspelectronics.in/delete-account/` returns **404** | Publish the text in [ACCOUNT_DELETION_PAGE.md](ACCOUNT_DELETION_PAGE.md) as a WordPress page at that address |
| 2 | **Reviewer login** (App access) | None yet | Create a test customer account on the store (for example `play-review@kspelectronics.in`) and paste it under App content > App access |
| 3 | **Closed test** | Only if the developer account is a *personal* account created after Nov 2023 | 12 testers must stay opted in for 14 days before Production unlocks. An *organisation* account (with a D-U-N-S number) skips this |
| 4 | **App Links** (optional, not a blocker) | `https://kspelectronics.in/.well-known/assetlinks.json` returns **404** | After the first upload, copy the SHA-256 from Play Console > Test and release > App integrity > App signing into [web/assetlinks.json](web/assetlinks.json) and upload it to the site. Until then, product links open in the browser, not the app |
| 5 | **Velocity One "Buy now, pay later"** | In the app's payment list when the store enables it | If it is live at checkout, answer *Financial features* with "Buy now, pay later". If not, answer "My app doesn't provide any financial features" |

---

## 1. Main store listing (Grow users > Store presence > Main store listing)

### App name (30)
```text
KSP Electronics: Maker Store
```

### Short description (80)
```text
3D printers, Raspberry Pi, Arduino, ESP32 & sensors. Same-day in Hyderabad.
```

### Full description (4000)
```text
Shop 3D printers, Raspberry Pi, Arduino, ESP32 boards, sensors and electronic components from KSP Electronics, Hyderabad. Same-day delivery in Hyderabad and delivery across India, with GST included in every price.

WHAT YOU CAN BUY
• 3D printers and parts: Bambu Lab, Creality, Elegoo and Snapmaker printers, nozzles, hotends, build plates and spares
• 3D printer filament and resin: PLA, PETG, ABS, ASA, TPU and water-washable resin
• Raspberry Pi boards, kits, cases, cameras and accessories
• Arduino Uno, Nano and Mega, ESP32 and ESP8266 development boards
• Sensors and modules: ultrasonic, temperature, motion, gas, relays, displays and motor drivers
• Engineering project kits, robotics and IoT parts, batteries, cables, connectors and tools

WHY SHOP IN THE APP
• Same-day delivery in Hyderabad: switch to Quick to see what a rider can bring today
• Delivery across India to any pincode, with the delivery date shown before you pay
• Deals tab: every product on sale, biggest discount first
• Shop by category, by brand or by budget (under ₹99, ₹499, ₹999)
• A cart that shows what you save, how far you are from free delivery, and the parts you may have forgotten
• Prices include GST, and you can add your GSTIN for a business invoice
• Pay with UPI (Google Pay, PhonePe, Paytm), cards, netbanking or cash on delivery
• Track your order, cancel before dispatch, and request a return within 30 days of delivery
• Order again in one tap from your past orders
• Save products to your wishlist and get help on WhatsApp

FOR MAKERS, STUDENTS AND ENGINEERS
Whether you are building a final-year engineering project, setting up a home 3D printing workshop, prototyping an IoT device or teaching robotics in a school lab, KSP Electronics stocks the boards, sensors, printers and spares you need, with product details, specifications and reviews for each item.

ABOUT KSP ELECTRONICS
KSP Electronics is an electronics and 3D printing store in Hyderabad, Telangana, selling online at kspelectronics.in and now in this app. Questions about a product, bulk orders or a GST invoice? Reach us from Help in the app, on WhatsApp, or at sales@kspelectronics.in.
```

### App icon (512 x 512)
`store-assets/playstore_icon_512x512.png`

### Feature graphic (1024 x 500)
`store-assets/playstore_feature_graphic_1024x500.png`

### Phone screenshots (upload in this order; 1080 x 1920 each)
1. `store-assets/play/screenshots/1_deals.png`: Deals on maker gear
2. `store-assets/play/screenshots/2_categories.png`: Every category, one tap
3. `store-assets/play/screenshots/3_brands.png`: Brands makers trust
4. `store-assets/play/screenshots/4_cart.png`: See what you save
5. `store-assets/play/screenshots/5_bill.png`: Clear bill, GST included

Rebuild them from fresh phone captures with `python3 store-assets/make_screenshots.py <folder>` (edit the crop boxes and headlines at the top of the script).
Do not reuse `store-assets/screenshots/` from before: those are 1080 x 2412, taller than Play's 2:1 limit, and show the old tab bar.
Tablet screenshots are not needed, because the app is phone-only.

### Video (optional)
A 20 to 30 second YouTube link: open the app, search "Raspberry Pi", add to cart, open the cart and show the savings bar, and go to checkout. Use no music with lyrics and no personal address on screen.

---

## 2. Store settings (Grow users > Store presence > Store settings)

| Field | Value |
|---|---|
| App or game | App |
| Category | Shopping |
| Tags (up to 5, pick from Play's list) | Shopping, Electronics, Home & DIY, Education, Tools |
| Email | sales@kspelectronics.in |
| Phone | the shop's WhatsApp number (optional) |
| Website | https://kspelectronics.in |
| External marketing | On |

---

## 3. App content (Policy and programs > App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://kspelectronics.in/privacy-policy/` (live) |
| Ads | **Yes, my app contains ads.** Home shows a sponsored brand button labelled "Ad" (Bambu Lab). There is no ad network SDK |
| App access | **All or some functionality is restricted.** Instructions: "Browsing, search, cart and guest checkout need no login. To see orders, saved addresses and account deletion, sign in at Account > Log in with the email and password below." Then add the test account from blocker 2 |
| Content rating | See section 4 |
| Target audience | **18 and over** only. This keeps the app out of the Families policy. The app is not designed for children |
| News app | No |
| COVID-19 contact tracing | No |
| Data safety | See section 5 |
| Government app | No |
| Financial features | See blocker 5 |
| Health | No health features |
| Advertising ID | **No.** The release build has no `AD_ID` permission, and analytics uses its own random install id, not the Advertising ID |

---

## 4. Content rating questionnaire (IARC)

- **Email:** sales@kspelectronics.in · **Category:** *All other app types* (shopping)
- Violence, fear, sexual content, crude humour, bad language: **No**
- Drugs, alcohol, tobacco (reference or sale): **No**
- Gambling, simulated gambling, loot boxes: **No**
- Users can interact or exchange content: **Yes**. Product reviews are public after the shop approves them. There is no chat between users
- Shares the user's current location with other users: **No**
- Allows purchase of digital goods: **No** (physical goods only)
- Unrestricted internet access (web browser): **No**

Expected result: Everyone / PEGI 3 / IARC 3+, with an interactive element "Users Interact".

---

## 5. Data safety form

**Overview answers**
- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS only)
- Do you provide a way for users to request that their data is deleted? **Yes**: in the app (Account > Profile and security > Delete my account) and at the delete-account URL from blocker 1

Play does not count data sent to service providers that process it for you (payment processor, courier, crash reporting) as "shared". So everything below is **Collected: Yes, Shared: No**.

| Play data type | Collected | Required or optional | Purposes |
|---|---|---|---|
| Personal info > Name | Yes | Required for orders | App functionality, Account management |
| Personal info > Email address | Yes | Required for an account or order | App functionality, Account management, Developer communications |
| Personal info > Phone number | Yes | Required for delivery | App functionality |
| Personal info > Address | Yes | Required for delivery | App functionality |
| Personal info > Other info (GSTIN) | Yes | Optional | App functionality |
| Financial info > Purchase history | Yes | Required | App functionality |
| Financial info > Payment info | Yes (entered into Razorpay's checkout, never stored by the app) | Optional (cash on delivery needs none) | App functionality |
| Location > Approximate location | Yes | Optional ("Use current location") | App functionality |
| Location > Precise location | Yes | Optional (map pin for the delivery spot) | App functionality |
| Messages > Other in-app messages | Yes (Help form questions) | Optional | Customer support |
| App activity > Other user-generated content | Yes (product reviews) | Optional | App functionality |
| App info and performance > Crash logs | Yes (Sentry; no name, email or address attached) | Required | Analytics |
| App info and performance > Diagnostics | Yes (Sentry) | Required | Analytics |

**Only if `EXPO_PUBLIC_POSTHOG_KEY` is set in the production build environment (analytics is off without it):**
add *App activity > App interactions* and *App activity > In-app search history* (Analytics), and *Device or other IDs* (the random install id, Analytics).

**Only after push is switched on** (an EAS project id and the store's `/api/push/register`): add *Device or other IDs* for the push token (App functionality). Push is off in the current build, because `extra.eas.projectId` is not set.

Not collected: contacts, photos, files, calendar, audio, health and fitness, web browsing, and recent searches (those stay on the phone).

---

## 6. Release

| Field | Value |
|---|---|
| Build | `eas build --platform android --profile production` (.aab, `versionCode` auto-increments) |
| Submit | `eas submit --platform android --profile production` (goes to the **internal** track as a draft, per `eas.json`) |
| First bundle (1.0.0, versionCode 1) | Built locally with `cd android && ./gradlew :app:bundleRelease` and signed with the **upload key in `~/.ksp-keys/`** (`ksp-upload.jks` plus its password file; upload certificate SHA-256 `EE:14:EF:B7:…:F6:B8`). Back up both files somewhere safe. To build with EAS later, import that key with `eas credentials` (Android > production > upload keystore), or Play will reject the bundle as signed with the wrong key. The release signing block in `android/app/build.gradle` is lost on `expo prebuild --clean`, so re-add it after a clean prebuild |
| Countries | India |
| Release name | `1.0.0` |

### Release notes, en-IN (500)
```text
Welcome to the KSP Electronics app. Shop 3D printers, filament, Raspberry Pi, Arduino, ESP32 and sensors with same-day delivery in Hyderabad and delivery across India. Pay with UPI, cards or cash on delivery, track your order, and reorder in one tap.
```

Play's pre-launch report runs automatically on the internal track. Fix any crash it finds before you promote the release to production.

---

## 7. Hindi and Telugu listings (Main store listing > Manage translations > Add your own translations)

Have a native speaker read these before you publish them. Brand and product names are kept in English on purpose, because that is how buyers search for them.

### hi-IN: short description (80)
```text
3D प्रिंटर, Raspberry Pi, Arduino, ESP32 और सेंसर। हैदराबाद में उसी दिन डिलीवरी।
```

### hi-IN: full description (4000)
```text
KSP Electronics, हैदराबाद से 3D प्रिंटर, फिलामेंट, Raspberry Pi, Arduino, ESP32 बोर्ड, सेंसर और इलेक्ट्रॉनिक कंपोनेंट खरीदें। हैदराबाद में उसी दिन डिलीवरी और पूरे भारत में डिलीवरी। हर कीमत में GST शामिल है।

क्या मिलेगा
• Bambu Lab, Creality, Elegoo और Snapmaker के 3D प्रिंटर और स्पेयर पार्ट्स
• PLA, PETG, ABS, TPU फिलामेंट और रेज़िन
• Raspberry Pi बोर्ड, किट और एक्सेसरीज़
• Arduino, ESP32 और ESP8266 डेवलपमेंट बोर्ड
• सेंसर, मॉड्यूल, रिले, डिस्प्ले और मोटर ड्राइवर
• इंजीनियरिंग प्रोजेक्ट किट, रोबोटिक्स और IoT पार्ट्स

ऐप में क्यों खरीदें
• Deals टैब: सेल वाले सारे प्रोडक्ट, सबसे बड़ी छूट पहले
• कैटेगरी, ब्रांड या बजट से खरीदें
• कार्ट में दिखता है कि आप कितना बचा रहे हैं
• UPI, कार्ड, नेटबैंकिंग या कैश ऑन डिलीवरी
• बिज़नेस के लिए GST इनवॉइस
• ऑर्डर ट्रैक करें, डिस्पैच से पहले कैंसल करें, डिलीवरी के 30 दिन में रिटर्न
• पुराने ऑर्डर एक टैप में दोबारा मंगाएँ
• मदद के लिए WhatsApp या sales@kspelectronics.in
```

### te-IN: short description (80)
```text
3D ప్రింటర్లు, Raspberry Pi, Arduino, ESP32. హైదరాబాద్‌లో అదే రోజు డెలివరీ.
```

### te-IN: full description (4000)
```text
KSP Electronics, హైదరాబాద్ నుండి 3D ప్రింటర్లు, ఫిలమెంట్, Raspberry Pi, Arduino, ESP32 బోర్డులు, సెన్సార్లు మరియు ఎలక్ట్రానిక్ కాంపోనెంట్లు కొనండి. హైదరాబాద్‌లో అదే రోజు డెలివరీ, భారతదేశం అంతటా డెలివరీ. ప్రతి ధరలో GST కలిపి ఉంటుంది.

ఏమి దొరుకుతాయి
• Bambu Lab, Creality, Elegoo, Snapmaker 3D ప్రింటర్లు మరియు విడి భాగాలు
• PLA, PETG, ABS, TPU ఫిలమెంట్ మరియు రెసిన్
• Raspberry Pi బోర్డులు, కిట్లు, యాక్సెసరీలు
• Arduino, ESP32, ESP8266 డెవలప్‌మెంట్ బోర్డులు
• సెన్సార్లు, మాడ్యూల్స్, రిలేలు, డిస్‌ప్లేలు, మోటార్ డ్రైవర్లు
• ఇంజనీరింగ్ ప్రాజెక్ట్ కిట్లు, రోబోటిక్స్, IoT భాగాలు

యాప్‌లో ఎందుకు కొనాలి
• Deals ట్యాబ్: సేల్‌లో ఉన్నవన్నీ, ఎక్కువ తగ్గింపు ముందు
• కేటగిరీ, బ్రాండ్ లేదా బడ్జెట్ ప్రకారం షాపింగ్
• కార్ట్‌లో మీరు ఎంత ఆదా చేస్తున్నారో కనిపిస్తుంది
• UPI, కార్డులు, నెట్‌బ్యాంకింగ్ లేదా క్యాష్ ఆన్ డెలివరీ
• వ్యాపారాలకు GST ఇన్‌వాయిస్
• ఆర్డర్ ట్రాక్ చేయండి, డిస్పాచ్‌కు ముందు క్యాన్సిల్ చేయండి, డెలివరీ తర్వాత 30 రోజుల్లో రిటర్న్
• పాత ఆర్డర్‌ను ఒక్క ట్యాప్‌తో మళ్ళీ ఆర్డర్ చేయండి
• సహాయం కోసం WhatsApp లేదా sales@kspelectronics.in
```

---

## 8. Search (ASO) notes

Google Play has no keyword field. It ranks on the title, the short description and the full description, so the words buyers type are already in those, written as normal sentences: 3D printer, filament, resin, Bambu Lab, Creality, Elegoo, Raspberry Pi, Arduino, ESP32, ESP8266, sensors, development board, engineering project, robotics, IoT, electronic components, Hyderabad, GST, UPI, cash on delivery.

Rules that get listings rejected, all avoided above:
- no "best", "#1", "top" or "free" claims in the title, and no prices or offers in the title or icon
- no emoji or ALL CAPS in the title
- no other apps' names, and no list of unrelated keywords
- screenshots that show the real app

After launch:
- Every two weeks, read the search terms that bring installs in Play Console (Statistics and Store listing acquisition reports), and move the ones people actually use into the short description.
- Reply to every review in the Play Console.
- Run a *Store listing experiment* on the short description or the first screenshot once the app has about 1,000 visitors a week.
