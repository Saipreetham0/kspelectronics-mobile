import { decodeHtml, inr, minorToInr, withTax } from '../src/format';

describe('money', () => {
  test('Indian digit grouping', () => { expect(inr(1234567)).toBe('₹12,34,567'); expect(inr(999)).toBe('₹999'); expect(inr(1499.5)).toBe('₹1,499.50'); });
  test('minor units to rupees', () => expect(minorToInr('75998', 2)).toBe('₹759.98'));
  test('GST is added to the amount WooCommerce reports without it', () => { expect(withTax('10000', '1800')).toBe(11800); expect(withTax(undefined, null)).toBe(0); });
});
describe('WooCommerce text', () => {
  test('entities and tags', () => expect(decodeHtml('Raspberry Pi &amp; <b>kit</b> &#8211; 4GB')).toBe('Raspberry Pi & kit – 4GB'));
});
