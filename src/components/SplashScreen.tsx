import { useEffect } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible while JS loads
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

// The OS splash screen covers app launch; this hides it once the app is ready (or after 3.5 s, so it never hangs on slow fonts or assets).
// It draws nothing itself, so there is never a second, JS-drawn splash.
export default function AppSplashScreen({ isAppReady, onFinish }: { isAppReady: boolean; onFinish?: () => void }) {
  useEffect(() => {
    const done = () => { ExpoSplashScreen.hideAsync().catch(() => {}); onFinish?.(); };
    if (isAppReady) { done(); return; }
    const t = setTimeout(done, 3500);
    return () => clearTimeout(t);
  }, [isAppReady, onFinish]);
  return null;
}
