import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/store';
import { WishlistProvider } from '@/wishlist';
import { BoughtProvider } from '@/bought';
import { FlyProvider } from '@/fly';
import OfflineBanner from '@/components/OfflineBanner';
import { Button, Center } from '@/components/ui';
import { Text } from '@/components/Text';
import { c } from '@/theme';

import { useState } from 'react';
import AppSplashScreen from '@/components/SplashScreen';

// Expo Router shows this in place of the red error screen when a screen crashes while rendering.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Center>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 6 }}>Something went wrong</Text>
      <Text style={{ color: c.muted, textAlign: 'center', marginBottom: 18 }}>{__DEV__ ? error.message : 'Please try again. If it keeps happening, restart the app.'}</Text>
      <Button title="Try again" onPress={retry} />
    </Center>
  );
}

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [showSplash, setShowSplash] = useState(true);

  const isReady = Boolean(fontsReady || fontError);

  return (
    <SafeAreaProvider>
      <StoreProvider><WishlistProvider><BoughtProvider><FlyProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        {/* Phone-width column: on the web preview or a tablet the app stays centred instead of stretching edge to edge. */}
        <View style={{ flex: 1, backgroundColor: '#eef0f4' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: c.bg }}>
            <Stack screenOptions={{ headerTintColor: c.text, headerTitleStyle: { fontFamily: 'Inter_700Bold' }, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
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
            </Stack>
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
