import { SITE_URL } from './config';

// The shop's policy pages on the website, opened from the account screen, the sign-up form and checkout.
export const POLICIES = [
  { label: 'Terms and conditions', url: `${SITE_URL}/terms-conditions/` },
  { label: 'Privacy policy', url: `${SITE_URL}/privacy-policy/` },
  { label: 'Refund and returns', url: `${SITE_URL}/refund_returns/` },
  { label: 'Shipping and delivery', url: `${SITE_URL}/shipping-policies/` },
] as const;
