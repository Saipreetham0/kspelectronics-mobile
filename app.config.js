// app.json plus the Google Maps keys for built apps (Expo Go uses its own). Set GOOGLE_MAPS_ANDROID_KEY / GOOGLE_MAPS_IOS_KEY in the build environment:
// restrict them in Google Cloud to this app's package name / bundle id and to the "Maps SDK for Android / iOS".
module.exports = ({ config }) => ({
  ...config,
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
        apiKey:
          process.env.GOOGLE_MAPS_ANDROID_KEY ||
          process.env.GOOGLE_MAPS_API_KEY ||
          'AIzaSyCje2NFlgu_I0coVOLdfLjjy-5wjtbUlPo',
      },
    },
  },
});
