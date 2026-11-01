# Open the app from the website (Android App Links)

Two parts. Part A makes links open the app directly; part B adds an "Open in app" bar for visitors in a browser. Files are in `docs/web/`.

## A. Links open the app (needs the Play build)
1. Publish the app on Google Play (internal testing is enough).
2. Play Console > Release > Setup > **App signing** > copy the **SHA-256 certificate fingerprint** of the *app signing key* (not the upload key).
3. Put it in `docs/web/assetlinks.json` in place of `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` (colon-separated, upper case, like `AB:CD:...`).
4. Upload the file to WordPress at **`public_html/.well-known/assetlinks.json`** (Hostinger File Manager).
5. Check it: `curl -I https://kspelectronics.in/.well-known/assetlinks.json` must answer **200**, `content-type: application/json`, with **no redirect**. If Cloudflare or LiteSpeed changes it, add a rule to leave `/.well-known/*` alone.
6. Install the Play build. Android verifies at install time; then `kspelectronics.in/product/...`, `/shop...` and `/cart...` links open the app.

The app already claims those three paths (`app.json`, `autoVerify`). To claim more paths, add them there and rebuild.
`store.kspelectronics.in` is not claimed: it is the API address, not a link people share.

## B. "Open in app" bar (works now, before part A)
Paste `docs/web/open-in-app-banner.html` into WordPress with a header/footer plugin (site-wide footer). It shows only in Android browsers,
opens the app on the same page if installed and the Play listing if not, and stays hidden 7 days after it is dismissed.
Optional: upload the app icon to `wp-content/uploads/ksp-app-icon.png` for the bar's icon (it hides itself if the file is missing).

## Testing
- Part B: open a product page in Chrome on Android, tap **Open**.
- Part A: `adb shell pm get-app-links in.kspelectronics.app` should show `kspelectronics.in: verified`.
