import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/Text';
import { NATIVE } from '@/native';

// Diwali 2026 is on 8 November: the festive look runs from 20 October to 15 November. EXPO_PUBLIC_DIWALI=on|off forces it either way.
export const diwaliOn = () => {
  const f = process.env.EXPO_PUBLIC_DIWALI;
  if (f === 'on') return true;
  if (f === 'off') return false;
  const d = new Date();
  return d >= new Date(2026, 9, 20) && d < new Date(2026, 10, 16);
};

const GLYPHS = ['✨', '🪔', '✨', '🎆', '✨', '🪔', '⭐', '✨', '🎇', '✨', '🪔', '✨'];

function Spark({ glyph, x, delay, dur, size, h }: { glyph: string; x: number; delay: number; dur: number; size: number; h: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: NATIVE }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
    ]));
    a.start();
    return () => a.stop();
  }, [t, delay, dur]);
  return (
    <Animated.Text style={{ position: 'absolute', left: x, top: -40, fontSize: size, opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 0.9, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, h + 60] }) }, { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -8] }) }, { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) }] }}>{glyph}</Animated.Text>
  );
}

// Sparkles and diyas drifting down over the header. Touches pass straight through; it stays still for people who turned on "reduce motion".
export function DiwaliFx({ area = 230 }: { area?: number }) {
  const { width } = useWindowDimensions();
  const [still, setStill] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {}); }, []);
  const sparks = useMemo(() => GLYPHS.map((glyph, n) => ({ glyph, x: ((n * 97) % 100) / 100 * (width - 24), delay: n * 650, dur: 7000 + (n % 5) * 1400, size: glyph === '🪔' ? 22 : 16 + (n % 3) * 4 })), [width]);
  if (still) return null;
  // Only the top `area` points of the screen (the header): sparks over product photos and prices made them harder to read.
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: area, overflow: 'hidden' }}>{sparks.map((p, n) => <Spark key={n} {...p} h={area} />)}</View>;
}

// A saffron-and-gold greeting strip.
export function DiwaliStrip() {
  return (
    <LinearGradient colors={['#ff9f1c', '#ffbf47', '#ff9f1c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.strip} accessibilityRole="text" accessibilityLabel="Happy Diwali from KSP Electronics">
      <Text style={s.t}>🪔  Happy Diwali from KSP Electronics  ✨</Text>
    </LinearGradient>
  );
}
const s = StyleSheet.create({
  strip: { paddingVertical: 7, alignItems: 'center' },
  t: { color: '#5b2300', fontWeight: '800', fontSize: 13 },
});
