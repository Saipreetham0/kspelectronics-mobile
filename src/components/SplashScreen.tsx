import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
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

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native OS splash screen once this component is mounted
    ExpoSplashScreen.hideAsync().catch(() => {});

    // Subtle, high-end entrance animation for the logo
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

    // Minimum display time for brand impression
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 900);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale]);

  // Fade out cleanly once app is ready
  useEffect(() => {
    if (isAppReady && minTimePassed) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: NATIVE,
        easing: Easing.in(Easing.ease),
      }).start(() => {
        onFinish?.();
      });
    }
  }, [isAppReady, minTimePassed, containerOpacity, onFinish]);

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
    width: '75%',
    maxWidth: 300,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
