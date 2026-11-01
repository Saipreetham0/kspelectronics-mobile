import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { NATIVE } from '@/native';

// Keep the native splash screen visible while JS loads
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

type SplashScreenProps = {
  isAppReady: boolean;
  onFinish?: () => void;
};

export default function AppSplashScreen({ isAppReady, onFinish }: SplashScreenProps) {
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [forceReady, setForceReady] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // On native platforms (Android/iOS): the single native OS splash screen covers app launch.
  // When the app is ready, hide the native splash and trigger onFinish.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (isAppReady || forceReady) {
        ExpoSplashScreen.hideAsync().catch(() => {});
        onFinish?.();
      }
    }
  }, [isAppReady, forceReady, onFinish]);

  // Safety fallback: never allow splash screen to hang indefinitely if fonts or assets stall
  useEffect(() => {
    const maxTimer = setTimeout(() => {
      setForceReady(true);
      setMinTimePassed(true);
      if (Platform.OS !== 'web') {
        ExpoSplashScreen.hideAsync().catch(() => {});
        onFinish?.();
      }
    }, 3500);

    return () => clearTimeout(maxTimer);
  }, [onFinish]);

  // Web only: animate logo and fade out when ready
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: NATIVE,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: NATIVE,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if ((isAppReady || forceReady) && minTimePassed) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: NATIVE,
        easing: Easing.in(Easing.ease),
      }).start(() => {
        onFinish?.();
      });
    }
  }, [isAppReady, forceReady, minTimePassed, containerOpacity, onFinish]);

  // Native uses the single native splash screen from Android/iOS.
  // Returning null avoids displaying a duplicate second splash screen in JS.
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Animated.View style={[s.container, { opacity: containerOpacity }]}>
      <Animated.View
        style={[
          s.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../../assets/ksp-logo.png')}
          style={s.logo}
          resizeMode="contain"
          accessibilityLabel="KSP Electronics"
        />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: '82%',
    maxWidth: 340,
    aspectRatio: 2040 / 364, // the wordmark's own proportions, so it is as wide as the box allows
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
