import { Stack, usePathname } from 'expo-router';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/store';
import { WishlistProvider } from '@/wishlist';
import { BoughtProvider } from '@/bought';
import { FlyProvider } from '@/fly';
import OfflineBanner from '@/components/OfflineBanner';
import Announcement from '@/components/Announcement';
import { Button, Center, Spinner } from '@/components/ui';
import { Text } from '@/components/Text';
import { c } from '@/theme';

import { useEffect, useState } from 'react';
import AppSplashScreen from '@/components/SplashScreen';
import { captureError, initMonitoring, wrapRoot } from '@/monitoring';
import { track } from '@/analytics';
import { onNotificationTap, registerPush } from '@/push';
import { loadAppConfig, storeUrl, updateRequired, useAppConfig } from '@/appConfig';
import { Linking } from 'react-native';

initMonitoring();
loadAppConfig();

// Expo Router shows this in place of the red error screen when a screen crashes while rendering.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => { captureError(error); }, [error]);
  return (
    <Center>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Something went wrong</Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 18 }}>{__DEV__ ? error.message : 'Please try again. If it keeps happening, restart the app.'}</Text>
      <Button title="Try again" onPress={retry} />
    </Center>
  );
}

// The login screen comes first, but can be skipped: until the shopper signs in or chooses "continue without an account", only the login screen exists; after that, everything else does.
// Until the saved login is restored, a spinner (no flash of the login form).
function RootStack() {
  const { ready, user, guest } = useStore();
  const cfg = useAppConfig();
  const inApp = Boolean(user) || guest;
  const path = usePathname();
  useEffect(() => { if (ready) track('screen', { path: path.replace(/\/\d+/g, '/:id') }); }, [path, ready]); // which screens are used, never which order or product
  useEffect(() => onNotificationTap(), []);
  useEffect(() => { if (user) registerPush(false); }, [user]); // already allowed: keep the store's token current
  if (!ready) return <Spinner />;
  // The store can retire old versions (minVersion in /api/app-config): they are asked to update instead of running against an API that moved on.
  if (updateRequired(cfg)) return (
    <Center>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Please update the app</Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 18 }}>{cfg.message || 'This version is no longer supported. Update to keep shopping.'}</Text>
      <Button title="Update now" onPress={() => Linking.openURL(storeUrl).catch(() => {})} />
    </Center>
  );
  return (
    <Stack screenOptions={{ headerTintColor: c.text, headerTitleStyle: { fontFamily: 'Inter_700Bold' }, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!inApp}><Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} /></Stack.Protected>
      <Stack.Protected guard={inApp}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {/* A product rises in from the bottom while fading, then its sections stagger in (see the product screen). */}
              <Stack.Screen name="product/[slug]" options={{ title: '', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen name="pay" options={{ title: 'Secure payment', presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="order/[id]" options={{ title: 'Order' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile and security' }} />
          <Stack.Screen name="help" options={{ title: 'Help and support' }} />
          <Stack.Screen name="order-failed" options={{ title: 'Payment', headerBackVisible: false, animation: 'fade' }} />
          <Stack.Screen name="order-success" options={{ title: 'Order placed', headerBackVisible: false, animation: 'fade' }} />
              <Stack.Screen name="orders" options={{ title: 'My orders' }} />
              <Stack.Screen name="track" options={{ title: 'Track order' }} />
              <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
              <Stack.Screen name="offers" options={{ title: 'Offers' }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  const [fontsReady, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [showSplash, setShowSplash] = useState(true);

  const isReady = Boolean(fontsReady || fontError);

  return (
    <SafeAreaProvider>
      <StoreProvider><WishlistProvider><BoughtProvider><FlyProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Announcement />
        {/* Phone-width column: on the web preview or a tablet the app stays centred instead of stretching edge to edge. */}
        <View style={{ flex: 1, backgroundColor: '#eef0f4' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: c.bg }}>
            {/* Not before the fonts are in: the app now opens from saved data at once, and text measured in a fallback font is clipped when Inter arrives. The splash covers this moment. */}
            {isReady ? <RootStack /> : null}
          </View>
        </View>

        {showSplash && (
          <AppSplashScreen
            isAppReady={isReady}
            onFinish={() => setShowSplash(false)}
          />
        )}
      </FlyProvider></BoughtProvider></WishlistProvider></StoreProvider>
    </SafeAreaProvider>
  );
}

export default wrapRoot(RootLayout);
