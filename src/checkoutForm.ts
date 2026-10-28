// Same rules as the website's lib/checkout-form.ts and the server routes. Keep them in sync.
export type Addr = { firstName: string; lastName: string; address: string; city: string; state: string; pincode: string };
export type CheckoutForm = Addr & { email: string; phone: string; notes: string; company: string; gstin: string; sameBilling: boolean; billing: Addr; drop?: { lat: number; lng: number } };

export const emptyAddr: Addr = { firstName: '', lastName: '', address: '', city: '', state: 'TS', pincode: '' };
export const emptyForm: CheckoutForm = { ...emptyAddr, email: '', phone: '', notes: '', company: '', gstin: '', sameBilling: true, billing: { ...emptyAddr } };

const addrRules: Record<keyof Addr, (v: string) => string> = {
  firstName: (v) => (v.trim() ? '' : 'Required'),
  lastName: (v) => (v.trim() ? '' : 'Required'),
  address: (v) => (v.trim().length >= 5 ? '' : 'Enter your full address'),
  city: (v) => (v.trim() ? '' : 'Required'),
  state: (v) => (v ? '' : 'Choose a state'),
  pincode: (v) => (/^\d{6}$/.test(v) ? '' : 'Enter a 6-digit pincode'),
};

export function validate(f: CheckoutForm): Record<string, string> {
  const e: Record<string, string> = {};
  const set = (k: string, m: string) => { if (m) e[k] = m; };
  set('email', /^\S+@\S+\.\S+$/.test(f.email) ? '' : 'Enter a valid email address');
  set('phone', /^(\+91)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number');
  for (const k of Object.keys(addrRules) as (keyof Addr)[]) set(k, addrRules[k](f[k]));
  if (!f.sameBilling) for (const k of Object.keys(addrRules) as (keyof Addr)[]) set(`b.${k}`, addrRules[k](f.billing[k]));
  const g = f.gstin.trim();
  set('gstin', !g || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(g) ? '' : 'Enter a valid 15-character GSTIN');
  return e;
}

export const IN_STATES: [string, string][] = [
  ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'], ['CT', 'Chhattisgarh'], ['GA', 'Goa'],
  ['GJ', 'Gujarat'], ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'], ['JH', 'Jharkhand'], ['KA', 'Karnataka'],
  ['KL', 'Kerala'], ['LA', 'Ladakh'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'], ['MN', 'Manipur'], ['ML', 'Meghalaya'],
  ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OR', 'Odisha'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
  ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'], ['UK', 'Uttarakhand'], ['UP', 'Uttar Pradesh'], ['WB', 'West Bengal'],
  ['AN', 'Andaman and Nicobar Islands'], ['CH', 'Chandigarh'], ['DN', 'Dadra and Nagar Haveli and Daman and Diu'], ['DL', 'Delhi'],
  ['LD', 'Lakshadweep'], ['PY', 'Puducherry'],
];
