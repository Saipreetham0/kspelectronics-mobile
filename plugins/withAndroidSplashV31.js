const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const STYLES_V31_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
    <item name="android:windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
    <item name="android:windowSplashScreenBehavior">icon_preferred</item>
  </style>
</resources>
`;

function withAndroidSplashV31(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const v31Dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/values-v31');
      if (!fs.existsSync(v31Dir)) {
        fs.mkdirSync(v31Dir, { recursive: true });
      }
      const stylesPath = path.join(v31Dir, 'styles.xml');
      fs.writeFileSync(stylesPath, STYLES_V31_XML, 'utf8');
      return cfg;
    },
  ]);
}

module.exports = withAndroidSplashV31;

