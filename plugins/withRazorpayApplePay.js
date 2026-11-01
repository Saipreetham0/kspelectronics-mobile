// Build-time setup for Apple Pay on iOS (see src/applePay.ts). Does nothing unless a Merchant ID is given:
//  - the Apple Pay entitlement with that Merchant ID (it must be the one passed to Razorpay at runtime), and
//  - Razorpay's opt-in Apple Pay pod.
const { withEntitlementsPlist, withPodfile } = require('expo/config-plugins');

const POD = "  pod 'razorpay-applepay-pod', '~> 1.0.1'";

module.exports = function withRazorpayApplePay(config, { merchantId } = {}) {
  if (!merchantId) return config;
  config = withEntitlementsPlist(config, (c) => {
    const key = 'com.apple.developer.in-app-payments';
    c.modResults[key] = Array.from(new Set([...(c.modResults[key] ?? []), merchantId]));
    return c;
  });
  return withPodfile(config, (c) => {
    if (!c.modResults.contents.includes('razorpay-applepay-pod')) {
      c.modResults.contents = c.modResults.contents.replace(/^(\s*use_expo_modules!.*)$/m, `$1\n${POD}`);
    }
    return c;
  });
};
