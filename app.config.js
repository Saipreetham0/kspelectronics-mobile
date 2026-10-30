// app.json plus the build-time values: Google Maps keys, crash reporting, push and over-the-air updates.
// Set GOOGLE_MAPS_ANDROID_KEY / GOOGLE_MAPS_IOS_KEY in the build environment (EAS environment variables, or .env for a local build):
// restrict them in Google Cloud to this app's package name / bundle id and to the "Maps SDK for Android / iOS". There is no key in the code.
// EAS_PROJECT_ID (from `eas init`) turns on over-the-air updates (`eas update`) and push tokens.
module.exports = ({ config }) => {
const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
return {
  ...config,
  plugins: [...(config.plugins ?? []), ['expo-notifications', { color: '#1c61e7' }], '@sentry/react-native'],
  extra: { ...config.extra, eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) } },
  runtimeVersion: { policy: 'appVersion' }, // an update only reaches builds of the same app version
  updates: projectId ? { url: `https://u.expo.dev/${projectId}`, fallbackToCacheTimeout: 0 } : { enabled: false },
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    },
  },
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
      },
    },
  },
};
};
