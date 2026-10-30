import { tenDigits } from '../src/phone';

describe('mobile numbers', () => {
  test('country code, spaces and a leading 0 are dropped', () => { expect(tenDigits('+91 98765 43210')).toBe('9876543210'); expect(tenDigits('09876543210')).toBe('9876543210'); });
  test('typing stops at ten digits', () => expect(tenDigits('98765432101234')).toBe('9876543210'));
  test('letters are ignored', () => expect(tenDigits('98a76b')).toBe('9876'));
});
