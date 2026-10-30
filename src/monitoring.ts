import * as Sentry from '@sentry/react-native';

// Crash and error reports go to Sentry once EXPO_PUBLIC_SENTRY_DSN is set (a build-time value; without it nothing is sent).
// No personal data is attached: no email, name, address or cart contents. Release builds only, so development noise stays out.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const monitoringOn = Boolean(DSN) && !__DEV__;

export function initMonitoring() {
  if (!monitoringOn) return;
  Sentry.init({ dsn: DSN, sendDefaultPii: false, tracesSampleRate: 0.1, enableAutoSessionTracking: true });
}
export const captureError = (e: unknown) => { if (monitoringOn) Sentry.captureException(e); };
export const wrapRoot = <T extends React.ComponentType<never>>(c: T): T => (monitoringOn ? (Sentry.wrap(c as never) as unknown as T) : c);
