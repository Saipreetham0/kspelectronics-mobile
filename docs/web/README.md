# Web Integration Guide for kspelectronics.in

## 1. Digital Asset Links (`assetlinks.json`)

To enable Android App Links (so links like `https://kspelectronics.in/product/...` open directly in the app without showing the browser disambiguation dialog), host `assetlinks.json` at:

```
https://kspelectronics.in/.well-known/assetlinks.json
```

### Requirements:
- HTTP Response Header: `Content-Type: application/json`
- HTTPS status: `200 OK` (no redirects, HTTP to HTTPS must be direct)
- File contents located at `docs/web/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "in.kspelectronics.app",
      "sha256_cert_fingerprints": [
        "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
      ]
    }
  }
]
```

### Finding your Production Fingerprint in Google Play Console:
1. Open [Google Play Console](https://play.google.com/console).
2. Select your app: **KSP Electronics**.
3. In the left menu, navigate to **Release** > **Setup** > **App integrity**.
4. Under the **App signing** tab, locate **App signing key certificate**.
5. Copy the **SHA-256 certificate fingerprint** (e.g. `12:34:56:...`).
6. Add it to the `sha256_cert_fingerprints` array in `assetlinks.json` alongside the debug fingerprint:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "in.kspelectronics.app",
      "sha256_cert_fingerprints": [
        "<YOUR_PLAY_APP_SIGNING_SHA256_HERE>",
        "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
      ]
    }
  }
]
```

---

## 2. "Open in App" Smart Banner (`open-in-app-banner.html`)

Paste the HTML in `docs/web/open-in-app-banner.html` into your WordPress site footer using a plugin such as **WPCode** (`Site Wide Footer`).
- Shows only in mobile Android browsers.
- Automatically deep-links to the currently viewed page if installed.
- Fallback links to the Google Play Store if not installed.

