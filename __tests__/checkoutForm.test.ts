import { emptyForm, validate } from '../src/checkoutForm';

const ok = { ...emptyForm, firstName: 'A', lastName: 'B', email: 'a@b.in', phone: '9876543210', address: '12 Main Road', city: 'Hyderabad', state: 'TS', pincode: '500001' };

describe('checkout form rules', () => {
  test('a complete form has no errors', () => expect(validate(ok)).toEqual({}));
  test('phone accepts +91 and spaces, rejects a number not starting 6-9', () => {
    expect(validate({ ...ok, phone: '+91 98765 43210' }).phone).toBeUndefined();
    expect(validate({ ...ok, phone: '1234567890' }).phone).toBeDefined();
  });
  test('pincode must be six digits', () => {
    expect(validate({ ...ok, pincode: '5000' }).pincode).toBeDefined();
    expect(validate({ ...ok, pincode: '500001' }).pincode).toBeUndefined();
  });
  test('GSTIN is optional but checked when given', () => {
    expect(validate({ ...ok, gstin: '' }).gstin).toBeUndefined();
    expect(validate({ ...ok, gstin: '36AABCU9603R1ZM' }).gstin).toBeUndefined();
    expect(validate({ ...ok, gstin: 'NOTAGSTIN' }).gstin).toBeDefined();
  });
  test('billing address is checked only when it differs from delivery', () => {
    expect(validate({ ...ok, sameBilling: true })['b.address']).toBeUndefined();
    expect(validate({ ...ok, sameBilling: false })['b.address']).toBeDefined();
  });
});
