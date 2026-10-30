import { isHyderabad } from '../src/location';

const at = (city: string) => ({ pin: '500001', area: 'x', city, state: 'Telangana', stateCode: 'TS' });
describe('same-day delivery area', () => {
  test('Hyderabad and its districts', () => { expect(isHyderabad(at('Hyderabad'))).toBe(true); expect(isHyderabad(at('Ranga Reddy'))).toBe(true); expect(isHyderabad(at('Medchal'))).toBe(true); });
  test('elsewhere, and no location, are not', () => { expect(isHyderabad(at('Pune'))).toBe(false); expect(isHyderabad(null)).toBe(false); });
});
