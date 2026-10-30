const { withAndroidManifest, withStringsXml, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SHORTCUTS_XML_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <shortcut
        android:shortcutId="cart"
        android:enabled="true"
        android:icon="@drawable/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_cart_short"
        android:shortcutLongLabel="@string/shortcut_cart_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="in.kspelectronics.app"
            android:targetClass="in.kspelectronics.app.MainActivity"
            android:data="ksp://cart" />
    </shortcut>
    <shortcut
        android:shortcutId="orders"
        android:enabled="true"
        android:icon="@drawable/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_orders_short"
        android:shortcutLongLabel="@string/shortcut_orders_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="in.kspelectronics.app"
            android:targetClass="in.kspelectronics.app.MainActivity"
            android:data="ksp://reorder" />
    </shortcut>
</shortcuts>
`;

const BITMAP_XML_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher" />
`;

function withAndroidShortcuts(config) {
  // 1. Add strings to strings.xml
  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [
        { $: { name: 'shortcut_cart_short' }, _: 'Cart' },
        { $: { name: 'shortcut_cart_long' }, _: 'View Cart' },
        { $: { name: 'shortcut_orders_short' }, _: 'Orders' },
        { $: { name: 'shortcut_orders_long' }, _: 'Order History' },
      ],
      config.modResults
    );
    return config;
  });

  // 2. Add meta-data to MainActivity in AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    if (!mainActivity['meta-data']) {
      mainActivity['meta-data'] = [];
    }
    const exists = mainActivity['meta-data'].some(
      (item) => item.$['android:name'] === 'android.app.shortcuts'
    );
    if (!exists) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      });
    }
    return config;
  });

  // 3. Write res/xml/shortcuts.xml and res/drawable/ic_launcher.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      const xmlDir = path.join(resDir, 'xml');
      const drawableDir = path.join(resDir, 'drawable');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(drawableDir, { recursive: true });

      fs.writeFileSync(path.join(xmlDir, 'shortcuts.xml'), SHORTCUTS_XML_CONTENT, 'utf8');
      fs.writeFileSync(path.join(drawableDir, 'ic_launcher.xml'), BITMAP_XML_CONTENT, 'utf8');

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidShortcuts;

