// Converts Android intent:// URIs (common from Razorpay checkout for PhonePe, Paytm, CRED, GPay) into direct launchable schemes
export function resolveIntentUrl(url: string): string {
  if (!url.startsWith('intent://') && !url.startsWith('intent:')) return url;
  try {
    const schemeMatch = url.match(/scheme=([^;]+)/);
    const scheme = schemeMatch ? schemeMatch[1] : 'upi';
    const body = url.replace(/^intent:\/\/?/, '');
    const clean = body.split('#Intent')[0];
    return `${scheme}://${clean.replace(/^\/+/, '')}`;
  } catch {
    return url;
  }
}

// The payment page may hand off to a UPI app, and only to one: a tel:, sms:, file: or any other scheme it asks for is ignored.
const UPI_APPS = new Set(['upi', 'tez', 'gpay', 'phonepe', 'paytmmp', 'paytm', 'credpay', 'cred', 'bhim', 'amazonpay', 'mobikwik', 'freecharge', 'samsungpay', 'whatsapp']);
export const isUpiAppUrl = (url: string) => UPI_APPS.has((url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? '').toLowerCase());
