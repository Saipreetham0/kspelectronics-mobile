import { resolveIntentUrl } from '../src/upi';

describe('Razorpay Android Intent URL Resolver', () => {
  test('passes regular https and upi URLs unchanged', () => {
    expect(resolveIntentUrl('https://checkout.razorpay.com')).toBe('https://checkout.razorpay.com');
    expect(resolveIntentUrl('upi://pay?pa=merchant@icici&am=100')).toBe('upi://pay?pa=merchant@icici&am=100');
  });

  test('extracts scheme and path from Android intent:// URIs', () => {
    const raw = 'intent://pay?pa=ksp@icici&am=500#Intent;scheme=upi;package=net.one97.paytm;end';
    expect(resolveIntentUrl(raw)).toBe('upi://pay?pa=ksp@icici&am=500');
  });

  test('handles custom schemes in intent URIs', () => {
    const phonepeIntent = 'intent://pay?pa=ksp@ybl#Intent;scheme=phonepe;package=com.phonepe.app;end';
    expect(resolveIntentUrl(phonepeIntent)).toBe('phonepe://pay?pa=ksp@ybl');
  });

  test('defaults to upi scheme if scheme is not explicitly stated in intent', () => {
    const intentNoScheme = 'intent://pay?pa=ksp@upi#Intent;package=com.google.android.apps.nbu.paisa.user;end';
    expect(resolveIntentUrl(intentNoScheme)).toBe('upi://pay?pa=ksp@upi');
  });
});
