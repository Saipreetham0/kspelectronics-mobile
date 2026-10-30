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
