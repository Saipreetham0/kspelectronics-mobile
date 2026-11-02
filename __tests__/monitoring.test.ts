import { initMonitoring, captureError, wrapRoot } from '../src/monitoring';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn((c) => c),
}));

describe('monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes without throwing', () => {
    expect(() => initMonitoring()).not.toThrow();
  });

  it('captures errors safely without throwing', () => {
    expect(() => captureError(new Error('Test non-fatal error'))).not.toThrow();
    expect(() => captureError('String error message')).not.toThrow();
    expect(() => captureError({ message: 'Custom object' })).not.toThrow();
  });

  it('wrapRoot returns component', () => {
    const DummyComponent = () => null;
    const wrapped = wrapRoot(DummyComponent);
    expect(wrapped).toBeDefined();
  });
});
