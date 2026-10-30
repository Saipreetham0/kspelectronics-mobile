import { isNewer, updateRequired } from '../src/appConfig';

describe('versions', () => {
  test('compared number by number', () => { expect(isNewer('1.10.0', '1.9.0')).toBe(true); expect(isNewer('1.0.0', '1.0.0')).toBe(false); expect(isNewer('1.0', '1.0.1')).toBe(false); expect(isNewer('2', '1.9.9')).toBe(true); });
  test('an update is required only when the minimum is newer than this app', () => {
    expect(updateRequired({})).toBe(false);
    expect(updateRequired({ minVersion: '99.0.0' })).toBe(true);
    expect(updateRequired({ minVersion: '0.0.0' })).toBe(false);
  });
});
