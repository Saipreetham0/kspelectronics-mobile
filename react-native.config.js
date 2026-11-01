// Razorpay's native SDK (react-native-customui) is used only for Apple Pay on iOS (src/applePay.ts): Android doesn't link it, so the Android app is unchanged.
module.exports = {
  dependencies: {
    'react-native-customui': { platforms: { android: null } },
  },
};
