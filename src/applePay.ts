import { Platform } from 'react-native';

// Apple Pay through Razorpay's native SDK (react-native-customui), iPhone only. It stays off, and the SDK is never loaded, until both:
//   1. the build carries EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID (the Merchant ID registered with Apple and set up with Razorpay), and
//   2. the store turns on the `applepay` flag in /api/app-config (a switch to turn it off again without a release).
// Payment is confirmed exactly like the web checkout: the store verifies Razorpay's signature (/api/checkout/razorpay/verify).
export const MERCHANT_ID = process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID ?? '';

type Sdk = {
  initRazorpay(key: string): unknown;
  canMakePayment(): Promise<boolean>;
  open(o: object): Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
};
let sdk: Sdk | null | undefined;
// Loaded on first use, on iOS only: the SDK touches native code as soon as it is imported, and Android does not link it.
function load(): Sdk | null {
  if (sdk !== undefined) return sdk;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily on iOS only (see above)
  try { sdk = Platform.OS === 'ios' && MERCHANT_ID ? (require('react-native-customui').default as Sdk) : null; } catch { sdk = null; }
  return sdk;
}

const ready = new Set<string>();
// Can this customer pay with Apple Pay for this merchant? False on Android, without a Merchant ID, or with no accepted card in Wallet.
export async function canApplePay(keyId: string): Promise<boolean> {
  const r = load();
  if (!r || !keyId) return false;
  try {
    if (!ready.has(keyId)) { r.initRazorpay(keyId); ready.add(keyId); } // never awaited: Razorpay's promise for it never settles
    return await r.canMakePayment();
  } catch { return false; }
}

export type ApplePayResult =
  | { ok: true; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { ok: false; cancelled: boolean; message: string };

// Opens Apple's payment sheet. Call it only from a tap, once at a time (a second sheet fails with SHEET_PRESENTATION_FAILED).
export async function payWithApplePay(o: { keyId: string; orderId: string; amount: number; currency: string; email: string; contact: string; ref: string }): Promise<ApplePayResult> {
  const r = load();
  if (!r) return { ok: false, cancelled: false, message: 'Apple Pay is not available on this phone.' };
  try {
    const d = await r.open({
      key_id: o.keyId, order_id: o.orderId, amount: String(o.amount), currency: o.currency,
      email: o.email.slice(0, 40), contact: o.contact.replace(/[^\d+]/g, '').slice(-15), // Razorpay's limits: 40 and 15 characters
      method: 'card', app: { name: 'apple_pay', apple_pay: { merchant_identifier: MERCHANT_ID } },
      notes: { orderId: o.ref },
    });
    return { ok: true, ...d };
  } catch (e) {
    const err = e as { error?: { code?: string; description?: string }; description?: string };
    return { ok: false, cancelled: err.error?.code === 'PAYMENT_CANCELLED', message: err.error?.description ?? err.description ?? 'Apple Pay could not complete this payment.' };
  }
}
