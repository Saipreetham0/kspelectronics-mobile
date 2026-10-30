import { alternatives } from '../src/searchFallback';

describe('search fallback', () => {
  test('a long phrase loosens to its words', () => { const alt = alternatives('raspberry pi 5 kit'); expect(alt[0]).toBe('raspberry pi 5'); expect(alt).toContain('raspberry'); });
  test('a typo near the end keeps the start of the word', () => expect(alternatives('arduinoo')).toContain('arduin'));
  test('a plural loses its s', () => expect(alternatives('sensors')).toContain('sensor'));
  test('never offers the same text or fragments under 3 letters', () => { expect(alternatives('esp')).toEqual([]); expect(alternatives('pi')).toEqual([]); });
});
