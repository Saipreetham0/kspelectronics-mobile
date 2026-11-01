import { isUpiAppUrl, resolveIntentUrl } from '../src/upi';
import { isHttps } from '../src/links';

test('an intent link becomes its UPI scheme, and only UPI apps are allowed', () => {
  const r = resolveIntentUrl('intent://pay?pa=a@b&pn=KSP#Intent;scheme=phonepe;package=com.phonepe.app;end');
  expect(r).toBe('phonepe://pay?pa=a@b&pn=KSP');
  expect(isUpiAppUrl(r)).toBe(true);
  expect(isUpiAppUrl('upi://pay?pa=a@b')).toBe(true);
  for (const bad of ['tel:100', 'sms:100', 'file:///etc/hosts', 'javascript:alert(1)', 'intent://x#Intent;scheme=tel;end'])
    expect(isUpiAppUrl(resolveIntentUrl(bad))).toBe(false);
});

test('store links must be https', () => {
  expect(isHttps('https://track.example/1')).toBe(true);
  for (const bad of ['http://x.in', 'tel:1', '', null, undefined, 'javascript:1']) expect(isHttps(bad as string)).toBe(false);
});
